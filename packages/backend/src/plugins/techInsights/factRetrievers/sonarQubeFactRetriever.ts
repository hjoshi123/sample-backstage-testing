import fetch from 'node-fetch';
import {
  FactRetrieverContext,
  FactRetriever,
  TechInsightFact,
} from '@backstage-community/plugin-tech-insights-node';
import { CatalogApi, CatalogClient } from '@backstage/catalog-client';

//  Interface to define the structure of SonarQube API response
interface SonarQubeApiResponse {
  component: {
    measures: Array<{
      metric: string;
      value: string;
    }>;
  };
}

//  Function to create a TechInsightFact object with project existence and coverage data
const createFact = (
  entity: any,
  projectExists: boolean,
  coverage: number,
): TechInsightFact => ({
  entity: {
    namespace: entity.metadata.namespace || 'default',
    kind: entity.kind,
    name: entity.metadata.name,
  },
  facts: {
    sonarQubeProjectExists: projectExists,
    sonarQubeCoverage: coverage,
  },
});

//  Function to fetch code coverage from SonarQube API
export async function fetchSonarQubeCoverage(
  apiUrl: string,
  projectKey: string,
  token: string,
): Promise<number> {
  const authHeader = `Basic ${Buffer.from(`${token}:`).toString('base64')}`;
  const response = await fetch(
    `${apiUrl}/api/measures/component?component=${projectKey}&metricKeys=coverage`,
    {
      headers: { Authorization: authHeader },
    },
  );
  if (!response.ok) {
    throw new Error(`Response not ok: ${response.statusText}`);
  }
  const json = (await response.json()) as SonarQubeApiResponse;
  const coverage =
    json.component.measures.find((m: any) => m.metric === 'coverage')?.value ||
    '0';
  return parseFloat(coverage);
}

export const sonarQubeFactRetriever: FactRetriever = {
  id: 'sonarQubeFactRetriever',
  version: '0.1.0',
  entityFilter: [{ kind: 'component', 'spec.type': 'service' }],
  schema: {
    sonarQubeProjectExists: {
      type: 'boolean',
      description: 'Checks if the project exists in SonarQube',
    },
    sonarQubeCoverage: {
      type: 'float',
      description: 'Code coverage percentage from SonarQube',
    },
  },

  //  To process entities and fetch their SonarQube coverage data
  handler: async (ctx: FactRetrieverContext): Promise<TechInsightFact[]> => {
    const { config, discovery, entityFilter } = ctx;
    const SONARQUBE_API_URL = config.getString('sonarqube.baseUrl');
    const SONARQUBE_TOKEN = config.getString('sonarqube.apiKey');
    const catalogApi: CatalogApi = new CatalogClient({
      discoveryApi: discovery,
    });
    const entities = await catalogApi.getEntities({ filter: entityFilter });
    const facts = await Promise.all(
      entities.items.map(async entity => {
        if (!entity || !entity.metadata.annotations) return null;
        const projectKey =
          entity.metadata.annotations['sonarqube.org/project-key'];
        if (!projectKey) {
          return null;
        }
        try {
          const coverage = await fetchSonarQubeCoverage(
            SONARQUBE_API_URL,
            projectKey,
            SONARQUBE_TOKEN,
          );
          return createFact(entity, true, coverage);
        } catch (error) {
          return createFact(entity, false, 0);
        }
      }),
    );
    return facts.filter((fact): fact is TechInsightFact => fact !== null);
  },
};
