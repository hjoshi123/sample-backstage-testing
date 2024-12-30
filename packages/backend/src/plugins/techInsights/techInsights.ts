import { pagerDutyFactRetriever } from "./factRetrievers/pagerDutyFactRetriever";
import { sonarQubeFactRetriever } from "./factRetrievers/sonarQubeFactRetriever";
import { gitHubFactRetriever } from "./factRetrievers/gitHubFactRetriever";
import { techInsightsFactRetrieversExtensionPoint } from '@backstage-community/plugin-tech-insights-node';
import { createBackendModule } from '@backstage/backend-plugin-api';

export default createBackendModule({
  pluginId: 'tech-insights',
  moduleId: 'my-fact-retriever',
  register(reg) {
    reg.registerInit({
      deps: {
        providers: techInsightsFactRetrieversExtensionPoint,
      },
      async init({ providers }) {
        providers.addFactRetrievers({
          gitHubFactRetriever,
          pagerDutyFactRetriever,
          sonarQubeFactRetriever
        });
      },
    });
  },
});
