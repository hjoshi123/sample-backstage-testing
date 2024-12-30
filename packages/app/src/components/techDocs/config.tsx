import { Entity as CatalogEntity } from '@backstage/catalog-model';
import { PanelType } from '@backstage/plugin-techdocs';

export const techDocsTabsConfig = [
  {
    label: 'Recommended Documentation',
    panels: [
      {
        title: 'Golden Path',
        description: 'Documentation about standards to follow',
        panel: 'DocsCardGrid' as PanelType,
        filterPredicate: (entity: CatalogEntity | undefined) =>
          entity?.metadata?.tags?.includes('recommended') ?? false,
      },
    ],
  },
];
