import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
  },
  // Module Accueil
  {
    path: '/accueil',
    name: 'accueil',
    component: () => import('../views/AccueilView.vue'),
    meta: { module: 'ACCUEIL' },
  },
  // Module Paramétrage (Administration)
  {
    path: '/parametrage',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { module: 'PARAMETRAGE' },
    children: [
      { path: '', redirect: { name: 'admin-personnel' } },
      {
        path: 'clinique',
        name: 'admin-clinique',
        component: () => import('../views/admin/CliniquesView.vue'),
      },
      {
        path: 'personnel',
        name: 'admin-personnel',
        component: () => import('../views/admin/PersonnelView.vue'),
      },
      {
        path: 'utilisateurs',
        name: 'admin-utilisateurs',
        component: () => import('../views/admin/UtilisateursView.vue'),
      },
      {
        path: 'roles',
        name: 'admin-roles',
        component: () => import('../views/admin/RolesView.vue'),
      },
      {
        path: 'services',
        name: 'admin-services',
        component: () => import('../views/admin/ServicesView.vue'),
      },
      {
        path: 'prestations',
        name: 'admin-prestations',
        component: () => import('../views/admin/PrestationsView.vue'),
      },
      {
        path: 'parametres',
        name: 'admin-parametres',
        component: () => import('../views/admin/ParametresView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Garde d'authentification
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
