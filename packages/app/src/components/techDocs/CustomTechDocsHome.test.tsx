import React from 'react';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { CustomTechDocsHome } from './CustomTechDocsHome';
import { useOutlet } from 'react-router-dom';
import { catalogApiRef, starredEntitiesApiRef, MockStarredEntitiesApi } from '@backstage/plugin-catalog-react';


jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useOutlet: jest.fn().mockReturnValue('Route Children'),
}));


const catalogApi = {
    getEntityFacets: async () => ({
        facets: { 'relations.ownedBy': [] },
    })
}

const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
        <TestApiProvider
            apis={[
                [starredEntitiesApiRef, new MockStarredEntitiesApi()],
                [catalogApiRef, catalogApi]
            ]}
        >
            {children}
        </TestApiProvider>
    );
};

describe('CustomTechDocsHome', () => {

    it('renders the custom TechDocs home page', async () => {
        (useOutlet as jest.Mock).mockReturnValueOnce(null);
        const groups = [{
            title: 'Test Group',
            filterPredicate: 'test',
        }];
        const { getByText } = await renderInTestApp(<Wrapper><CustomTechDocsHome groups={groups} /></Wrapper>);

        expect(getByText('Documentation available in Backstage')).toBeInTheDocument();
    });
});