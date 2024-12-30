import fetch from 'node-fetch';
import {
  FactRetriever,
  FactRetrieverContext,
  TechInsightFact,
} from '@backstage-community/plugin-tech-insights-node';
import { CatalogApi, CatalogClient } from '@backstage/catalog-client';
import {
  ScmIntegrations,
  DefaultGithubCredentialsProvider,
} from '@backstage/integration';

// Interface structure for GitHub API responses
interface GitHubBranchProtectionResponse {
  required_status_checks: {
    contexts: string[];
  } | null;
  allow_force_pushes: {
    enabled: boolean;
  } | null;
  enforce_admins: {
    enabled: boolean;
  };
  required_pull_request_reviews: {
    required_approving_review_count: number;
  } | null;
  restrictions: null | object;
}
interface GitHubBranch {
  name: string;
}
const fetchGitHubData = async <T>(url: string, token: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Failed to fetch GitHub data: ${response.statusText} - ${responseText}`,
    );
  }
  try {
    return JSON.parse(responseText) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${responseText}`);
  }
};
const verifyTokenAndAccess = async (
  token: string,
  owner: string,
  repo: string,
): Promise<void> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    },
  );
  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Token verification failed: ${response.statusText} - ${responseText}`,
    );
  }
};
const fetchAllBranches = async (
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubBranch[]> => {
  let branches: GitHubBranch[] = [];
  let page = 1;
  const perPage = 100;
  // Without handling pagination, branches fetched are limited to 30
  // The limited list might not include main/master
  /* eslint-disable no-constant-condition */
  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/branches?per_page=${perPage}&page=${page}`;
    const fetchedBranches = await fetchGitHubData<GitHubBranch[]>(url, token);
    branches = branches.concat(fetchedBranches);
    if (fetchedBranches.length < perPage) break;
    page++;
  }
  /* eslint-enable no-constant-condition */
  return branches;
};
const checkBranchProtection = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<GitHubBranchProtectionResponse | null> => {
  const url = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`;
  try {
    return await fetchGitHubData<GitHubBranchProtectionResponse>(url, token);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Branch not protected')
    ) {
      return null; // Branch exists but is not protected
    }
    throw error;
  }
};
export const gitHubFactRetriever: FactRetriever = {
  id: 'gitHubFactRetriever',
  version: '0.1.0',
  entityFilter: [{ kind: 'component', 'spec.type': 'service' }],
  schema: {
    gitHubProtectedBranches: {
      type: 'boolean',
      description: 'Checks if the main or master branch is protected',
    },
    gitHubPrApprovalRequired: {
      type: 'boolean',
      description: 'Checks if PRs require approval',
    },
    gitHubNoForcePush: {
      type: 'boolean',
      description: 'Checks if force-push is disallowed on protected branches',
    },
    gitHubCiChecksExist: {
      type: 'boolean',
      description: 'Checks for CI testing with GitHub Actions',
    },
  },
  handler: async (ctx: FactRetrieverContext): Promise<TechInsightFact[]> => {
    const { config } = ctx;
    const integrations = ScmIntegrations.fromConfig(config);
    const credentialsProvider =
      DefaultGithubCredentialsProvider.fromIntegrations(integrations);
    const catalogApi: CatalogApi = new CatalogClient({
      discoveryApi: ctx.discovery,
    });
    const entities = await catalogApi.getEntities({ filter: ctx.entityFilter });
    const facts = await Promise.all(
      entities.items.map(async entity => {
        const repoUrl =
          entity.metadata.annotations?.['github.com/project-slug'];
        if (!repoUrl) {
          // Return default facts if repository URL is not available
          return {
            entity: {
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
              name: entity.metadata.name,
            },
            facts: {
              gitHubProtectedBranches: false,
              gitHubPrApprovalRequired: false,
              gitHubNoForcePush: false,
              gitHubCiChecksExist: false,
            },
          };
        }
        const [owner, repo] = repoUrl.split('/');
        if (!owner || !repo) {
          // Return default facts if repository URL is invalid
          return {
            entity: {
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
              name: entity.metadata.name,
            },
            facts: {
              gitHubProtectedBranches: false,
              gitHubPrApprovalRequired: false,
              gitHubNoForcePush: false,
              gitHubCiChecksExist: false,
            },
          };
        }
        const credentials = await credentialsProvider.getCredentials({
          url: `https://github.com/${owner}/${repo}`,
        });
        const token = credentials.token;
        if (!token) {
          throw new Error(`Failed to get token for ${owner}/${repo}`);
        }
        try {
          await verifyTokenAndAccess(token, owner, repo);
        } catch (error) {
          if (error instanceof Error) {
            console.error(
              `Token verification failed for ${owner}/${repo}:`,
              error.message,
            );
          }
          return {
            entity: {
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
              name: entity.metadata.name,
            },
            facts: {
              gitHubProtectedBranches: false,
              gitHubPrApprovalRequired: false,
              gitHubNoForcePush: false,
              gitHubCiChecksExist: false,
            },
          };
        }
        let branches: GitHubBranch[];
        try {
          branches = await fetchAllBranches(token, owner, repo);
        } catch (error) {
          if (error instanceof Error) {
            console.error(
              `Error fetching branches for ${owner}/${repo}:`,
              error.message,
            );
          }
          return {
            entity: {
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
              name: entity.metadata.name,
            },
            facts: {
              gitHubProtectedBranches: false,
              gitHubPrApprovalRequired: false,
              gitHubNoForcePush: false,
              gitHubCiChecksExist: false,
            },
          };
        }
        const mainBranch = branches.find(branch => branch.name === 'main');
        const masterBranch = branches.find(branch => branch.name === 'master');
        let branchProtection: GitHubBranchProtectionResponse | null = null;
        if (mainBranch) {
          branchProtection = await checkBranchProtection(
            token,
            owner,
            repo,
            'main',
          );
        }
        if (!branchProtection && masterBranch) {
          branchProtection = await checkBranchProtection(
            token,
            owner,
            repo,
            'master',
          );
        }
        if (!branchProtection) {
          // If neither branch is protected, return default facts
          return {
            entity: {
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
              name: entity.metadata.name,
            },
            facts: {
              gitHubProtectedBranches: false,
              gitHubPrApprovalRequired: false,
              gitHubNoForcePush: false,
              gitHubCiChecksExist: false,
            },
          };
        }
        return {
          entity: {
            namespace: entity.metadata.namespace || 'default',
            kind: entity.kind,
            name: entity.metadata.name,
          },
          facts: {
            gitHubProtectedBranches: true,
            gitHubPrApprovalRequired:
              branchProtection.required_pull_request_reviews
                ? branchProtection.required_pull_request_reviews
                    .required_approving_review_count > 0
                : false,
            gitHubNoForcePush: branchProtection.allow_force_pushes
              ? !branchProtection.allow_force_pushes.enabled
              : false,
            gitHubCiChecksExist: branchProtection.required_status_checks
              ? branchProtection.required_status_checks.contexts.includes('ci')
              : false,
          },
        };
      }),
    );
    return facts.filter(fact => fact !== null) as TechInsightFact[];
  },
};
// export const githubRegistration = createFactRetrieverRegistration({
//   cadence: '0 * * * *',
//   factRetriever: gitHubFactRetriever,
//   lifecycle: { timeToLive: { months: 6 } },
// });
