import React from 'react';

import { Content } from '@backstage/core-components';
import {
  CatalogFilterLayout,
  EntityOwnerPicker,
  EntityTagPicker,
  UserListPicker,
  EntityListProvider,
} from '@backstage/plugin-catalog-react';
import {
  TechDocsPageWrapper,
  TechDocsPicker,
} from '@backstage/plugin-techdocs';
import { Entity } from '@backstage/catalog-model';

import { EntityListDocsGrid } from '@backstage/plugin-techdocs';

export type CustomTechDocsHomeProps = {
  groups?: Array<{
    title: React.ReactNode;
    filterPredicate: ((entity: Entity) => boolean) | string;
  }>;
};

export const CustomTechDocsHome = ({ groups }: CustomTechDocsHomeProps) => {
  return (
    <TechDocsPageWrapper>
      <Content>
        <EntityListProvider>
          <CatalogFilterLayout>
            <CatalogFilterLayout.Filters>
              <TechDocsPicker />
              <UserListPicker initialFilter="all" />
              <EntityOwnerPicker />
              <EntityTagPicker />
            </CatalogFilterLayout.Filters>
            <CatalogFilterLayout.Content>
              <EntityListDocsGrid groups={groups} />
            </CatalogFilterLayout.Content>
          </CatalogFilterLayout>
        </EntityListProvider>
      </Content>
    </TechDocsPageWrapper>
  );
};