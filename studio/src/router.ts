import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'overview',
      component: () => import('./views/OverviewView.vue'),
      meta: {
        titleKey: 'routes.overview.title',
        descriptionKey: 'routes.overview.description',
      },
    },
    {
      path: '/registry',
      name: 'registry',
      component: () => import('./views/RegistryView.vue'),
      meta: {
        titleKey: 'routes.registry.title',
        descriptionKey: 'routes.registry.description',
      },
    },
    {
      path: '/workbench',
      name: 'workbench',
      component: () => import('./views/WorkbenchView.vue'),
      meta: {
        titleKey: 'routes.workbench.title',
        descriptionKey: 'routes.workbench.description',
      },
    },
    {
      path: '/insights',
      name: 'insights',
      component: () => import('./views/InsightsView.vue'),
      meta: {
        titleKey: 'routes.insights.title',
        descriptionKey: 'routes.insights.description',
      },
    },
    {
      path: '/ops',
      name: 'ops',
      component: () => import('./views/OpsView.vue'),
      meta: {
        titleKey: 'routes.ops.title',
        descriptionKey: 'routes.ops.description',
      },
    },
  ],
});
