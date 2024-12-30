// This was shamelessly copied from the backstage home plugin, but with a small filter on ignoring non-catalog entities
// i.e. the create page, the search page, the root template page, etc
// https://github.com/backstage/backstage/blob/master/plugins/home/src/components/VisitListener.tsx

// Problem: UI shows duplicates for subroutes on the same entity (CI/CD, API, Dependencies pages, etc)
// Solution is to either improve the visitNameImpl function to also incorporate that subroute into the displayed name
// or to filter out the subroute from the pathame so all subrouting under an entity is just the entity itself

import React, { useEffect } from 'react';

import { useLocation } from 'react-router-dom';

import { useApi } from '@backstage/core-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { visitsApiRef } from "@backstage/plugin-home";

/**
 * This function returns an implementation of toEntityRef which is responsible
 * for receiving a pathname and maybe returning an entityRef compatible with the
 * catalog-model.
 * By default, this function uses the url root "/catalog" and the
 * stringifyEntityRef implementation from catalog-model.
 * Example:
 *   const toEntityRef = getToEntityRef();
 *   toEntityRef(\{ pathname: "/catalog/default/component/playback-order" \})
 *   // returns "component:default/playback-order"
 */
const getToEntityRef =
  ({
     rootPath = 'catalog',
     stringifyEntityRefImpl = stringifyEntityRef,
   } = {}) =>
    ({ pathname }: { pathname: string }): string | undefined => {
      const regex = new RegExp(
        `^\/${rootPath}\/(?<namespace>[^\/]+)\/(?<kind>[^\/]+)\/(?<name>[^\/]+)`,
      );
      const result = regex.exec(pathname);
      if (!result || !result?.groups) return undefined;
      const entity = {
        namespace: result.groups.namespace,
        kind: result.groups.kind,
        name: result.groups.name,
      };
      return stringifyEntityRefImpl(entity);
    };

/**
 * @internal
 * This function returns an implementation of visitName which is responsible
 * for receiving a pathname and returning a string (name).
 */
const getVisitName =
  ({ rootPath = 'catalog', document = global.document } = {}) =>
    ({ pathname }: { pathname: string }) => {
      // If it is a catalog entity, get the name from the path
      const regex = new RegExp(
        `^\/${rootPath}\/(?<namespace>[^\/]+)\/(?<kind>[^\/]+)\/(?<name>[^\/]+)`,
      );
      let result = regex.exec(pathname);
      if (result && result?.groups) return result.groups.name;

      // If it is a root pathname, get the name from there
      result = /^\/(?<name>[^\/]+)$/.exec(pathname);
      if (result && result?.groups) return result.groups.name;

      // Fallback to document title
      return document.title;
    };

/**
 * @public
 * Component responsible for listening to location changes and calling
 * the visitsApi to save visits.
 */
export const FilteredVisitListener = ({
                                children,
                                toEntityRef,
                                visitName,
                              }: {
  children?: React.ReactNode;
  toEntityRef?: ({ pathname }: { pathname: string }) => string | undefined;
  visitName?: ({ pathname }: { pathname: string }) => string;
}): JSX.Element => {
  const visitsApi = useApi(visitsApiRef);
  const { pathname } = useLocation();
  const toEntityRefImpl = toEntityRef ?? getToEntityRef();
  const visitNameImpl = visitName ?? getVisitName();

  useEffect(() => {
    if (toEntityRefImpl({ pathname }) !== undefined) {
      const requestId = requestAnimationFrame(() => {
        visitsApi.save({
          visit: {
            name: visitNameImpl({ pathname }),
            pathname,
            entityRef: toEntityRefImpl({ pathname }),
          },
        });
      });
      return () => cancelAnimationFrame(requestId);
    }
    return () => {};
  }, [visitsApi, pathname, toEntityRefImpl, visitNameImpl]);

  return <>{children}</>;
};
