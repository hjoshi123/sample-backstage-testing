import fetch from 'node-fetch';
import {
  FactRetrieverContext,
  FactRetriever,
  TechInsightFact,
} from '@backstage-community/plugin-tech-insights-node';
import { CatalogApi, CatalogClient } from '@backstage/catalog-client';

// Define interfaces for PagerDuty API responses
interface PagerDutyServiceResponse {
  service: {
    id: string;
    name: string;
    on_call_now: Array<any>;
  };
}
interface PagerDutyScheduleResponse {
  schedules: Array<{
    id: string;
    name: string;
  }>;
}

// Utility function to fetch data from PagerDuty API with explicit return type
const fetchPagerDutyData = async <T>(
  apiUrl: string,
  apiKey: string,
  endpoint: string,
): Promise<T> => {
  const authHeader = `Token token=${apiKey}`;
  const response = await fetch(`${apiUrl}/${endpoint}`, {
    headers: { Authorization: authHeader },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch PagerDuty data: ${response.statusText}`);
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Expected JSON response but received non-JSON.');
  }
  return await response.json() as Promise<T>;
};

export const pagerDutyFactRetriever: FactRetriever = {
  id: 'pagerDutyFactRetriever',
  version: '0.1.0',
  entityFilter: [{ kind: 'component', 'spec.type': 'service' }],
  schema: {
    pagerDutyServiceExists: {
      type: 'boolean',
      description: 'Checks if the service exists in PagerDuty',
    },
    pagerDutyHasSchedule: {
      type: 'boolean',
      description: 'Checks if there is a schedule associated with the service',
    },
    pagerDutyHasOnCall: {
      type: 'boolean',
      description: 'Checks if there is someone on-call for the service',
    },
  },

  handler: async (ctx: FactRetrieverContext): Promise<TechInsightFact[]> => {
    const { config, entityFilter } = ctx;
    const PAGERDUTY_API_URL = config.getString('pagerDuty.baseUrl');
    const PAGERDUTY_API_KEY = config.getString('pagerDuty.apiToken');
    const catalogApi: CatalogApi = new CatalogClient({
      discoveryApi: ctx.discovery,
    });
    const entities = await catalogApi.getEntities({ filter: entityFilter });
    const facts = await Promise.all(
      entities.items.map(async entity => {
        const pagerDutyId =
          entity.metadata.annotations?.['pagerduty.com/service-id'];
        if (!pagerDutyId) {
          return null;
        }
        try {
          // Check for service existence and on-call availability
          const serviceResponse =
            await fetchPagerDutyData<PagerDutyServiceResponse>(
              PAGERDUTY_API_URL,
              PAGERDUTY_API_KEY,
              `service_directory/${encodeURIComponent(pagerDutyId)}`,
            );

          const hasOnCall = serviceResponse.service.on_call_now.length > 0;
          const serviceExists = !!serviceResponse.service;

          // Fetch schedules for the service
          const schedules = await fetchPagerDutyData<PagerDutyScheduleResponse>(
            PAGERDUTY_API_URL,
            PAGERDUTY_API_KEY,
            `schedules?query=${encodeURIComponent(pagerDutyId)}`,
          );
          const hasSchedule = schedules.schedules.length > 0;
          return {
            entity: {
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
              name: entity.metadata.name,
            },
            facts: {
              pagerDutyServiceExists: serviceExists,
              pagerDutyHasSchedule: hasSchedule,
              pagerDutyHasOnCall: hasOnCall,
            },
          };
        } catch (error) {
          console.error(
            `Error fetching PagerDuty data for entity ${entity.metadata.name}:`,
            error,
          );
          return null;
        }
      }),
    );
    return facts.filter(fact => fact !== null) as TechInsightFact[];
  },
};
