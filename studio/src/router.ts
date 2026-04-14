import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'hero',
      component: () => import('./views/HeroView.vue'),
      meta: {
        layout: 'hero',
      },
    },
    {
      path: '/overview',
      name: 'overview',
      component: () => import('./views/OverviewView.vue'),
      meta: {
        layout: 'studio',
        titleKey: 'routes.overview.title',
        descriptionKey: 'routes.overview.description',
      },
    },
    {
      path: '/registry',
      name: 'registry',
      component: () => import('./views/RegistryView.vue'),
      meta: {
        layout: 'studio',
        titleKey: 'routes.registry.title',
        descriptionKey: 'routes.registry.description',
      },
    },
    {
      path: '/workbench',
      name: 'workbench',
      component: () => import('./views/WorkbenchView.vue'),
      meta: {
        layout: 'studio',
        titleKey: 'routes.workbench.title',
        descriptionKey: 'routes.workbench.description',
      },
    },
    {
      path: '/insights',
      name: 'insights',
      component: () => import('./views/InsightsView.vue'),
      meta: {
        layout: 'studio',
        titleKey: 'routes.insights.title',
        descriptionKey: 'routes.insights.description',
      },
    },
    {
      path: '/ops',
      name: 'ops',
      component: () => import('./views/OpsView.vue'),
      meta: {
        layout: 'studio',
        titleKey: 'routes.ops.title',
        descriptionKey: 'routes.ops.description',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/',
    },
  ],
});
