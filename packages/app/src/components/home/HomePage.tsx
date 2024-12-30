import {
  HomePageStarredEntities,
  HomePageRandomJoke,
  CustomHomepageGrid,
  HomePageTopVisited, HomePageToolkit, TemplateBackstageLogoIcon, ComponentAccordion, HomePageRecentlyVisited,
} from '@backstage/plugin-home';
  import { HomePageSearchBar } from '@backstage/plugin-search';
  import React from 'react';
import { makeStyles } from "@material-ui/core";
import { NewAnnouncementBanner } from '@k-phoen/backstage-plugin-announcements';



const useStyles = makeStyles(theme => ({
  searchBar: {
    display: 'flex',
    maxWidth: '60vw',
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
    padding: '8px 0',
    borderRadius: '50px',
    margin: 'auto',
  },
  searchBarOutline: {
    borderStyle: 'none',
  },
}));


// Note: react-grid-layout is used under the hood to render the grid, and is currently version
// pinned to 1.3.4: https://github.com/backstage/backstage/issues/20712
export const ComposableHomeComponent = () => {
    const classes = useStyles();

  const ExpandedComponentAccordion = (props: any) => (
    <ComponentAccordion expanded {...props} />
  );

    // This is the default configuration that is shown to the user
    // when first arriving to the homepage.
    const defaultConfig = [
      {
        component: 'HomePageSearchBar',
        x: 0,
        y: 0,
        width: 12,
        height: 5,
      },
      {
        component: 'NewAnnouncementBanner',
        x: 0,
        y: 12,
        width: 20,
        height: 1,
      },
      {
        component: 'HomePageRandomJoke',
        x: 0,
        y: 5,
        width: 6,
        height: 16,
      },
      {
        component: 'HomePageStarredEntities',
        x: 6,
        y: 5,
        width: 6,
        height: 12,
      },
      {
        component: 'HomePageTopVisited',
        x: 0,
        y: 12,
        width: 4,
        height: 20,
      },
    ];

    const defaultTools = Array(8).fill({
    url: '#',
    label: 'link',
    icon: <TemplateBackstageLogoIcon />,
  })


    return (
      <CustomHomepageGrid config={defaultConfig} rowHeight={10}>
         {/* Insert the allowed widgets inside the grid. User can add, organize and
         remove the widgets as they want.   */}
        <HomePageSearchBar
          classes={{ root: classes.searchBar }}
          InputProps={{ classes: { notchedOutline: classes.searchBarOutline } }}
          placeholder="Search"
        />
        <NewAnnouncementBanner variant='block'/>
        <HomePageRandomJoke />
        <HomePageStarredEntities />
        <HomePageTopVisited />
        <HomePageToolkit tools={defaultTools} Renderer={ExpandedComponentAccordion} />
        <HomePageRecentlyVisited />
      </CustomHomepageGrid>
    );
  };