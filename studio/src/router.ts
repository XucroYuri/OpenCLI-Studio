import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'overview',
      component: () => import('./views/OverviewView.vue'),
      meta: {
        title: 'Overview',
        description: 'Environment, activity, and the broad Studio surface.',
      },
    },
    {
      path: '/registry',
      name: 'registry',
      component: () => import('./views/RegistryView.vue'),
      meta: {
        title: 'Registry',
        description: 'Facet, search, and classify every available CLI command.',
      },
    },
    {
      path: '/workbench',
      name: 'workbench',
      component: () => import('./views/WorkbenchView.vue'),
      meta: {
        title: 'Workbench',
        description: 'Parameterize commands, execute them, and inspect structured output.',
      },
    },
    {
      path: '/insights',
      name: 'insights',
      component: () => import('./views/InsightsView.vue'),
      meta: {
        title: 'Insights',
        description: 'Opinionated recipe pages for hot topics, trends, and topic monitoring.',
      },
    },
    {
      path: '/ops',
      name: 'ops',
      component: () => import('./views/OpsView.vue'),
      meta: {
        title: 'Ops',
        description: 'Doctor, plugin inventory, external CLI status, and local bridge operations.',
      },
    },
  ],
});
