import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-techdocs-backend'));

backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));

backend.add(import('@backstage-community/plugin-sonarqube-backend'));
backend.add(import('@pagerduty/backstage-plugin-backend'));

// search plugin
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-pg'));
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// search collators
backend.add(import('@backstage/plugin-catalog-backend-module-backstage-openapi'));

backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-catalog-backend-module-github-org'));
backend.add(import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-notifications'),);
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));
backend.add(import('@procore-oss/backstage-plugin-announcements-backend'));
backend.add(import('@backstage-community/plugin-tech-insights-backend'));
backend.add(import('./plugins/techInsights/techInsights'));
backend.add(import('@backstage-community/plugin-tech-insights-backend-module-jsonfc'));

backend.add(import('@backstage/plugin-permission-backend'));
backend.add(
    import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);


backend.add(import('@backstage/plugin-scaffolder-backend-module-cookiecutter'));
backend.add(import('@roadiehq/scaffolder-backend-module-utils'));

backend.start();
