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
  // Module Caisse
  {
    path: '/caisse',
    name: 'caisse',
    component: () => import('../views/CaisseView.vue'),
    meta: { module: 'CAISSE' },
  },
  // Module Consultation
  {
    path: '/consultation',
    name: 'consultation',
    component: () => import('../views/ConsultationView.vue'),
    meta: { module: 'CONSULTATION' },
  },
  // Module Pharmacie
  {
    path: '/pharmacie',
    name: 'pharmacie',
    component: () => import('../views/PharmacieView.vue'),
    meta: { module: 'PHARMACIE' },
  },
  // Module Laboratoire
  {
    path: '/laboratoire',
    name: 'laboratoire',
    component: () => import('../views/LaboratoireView.vue'),
    meta: { module: 'LABORATOIRE' },
  },
  // Module Imagerie
  {
    path: '/imagerie',
    name: 'imagerie',
    component: () => import('../views/ImagerieView.vue'),
    meta: { module: 'IMAGERIE' },
  },
  // Module Hospitalisation
  {
    path: '/hospitalisation',
    name: 'hospitalisation',
    component: () => import('../views/HospitalisationView.vue'),
    meta: { module: 'HOSPITALISATION' },
  },
  // Module Maternité (CPN, accouchements et suivi)
  {
    path: '/maternite',
    name: 'maternite',
    component: () => import('../views/MaterniteView.vue'),
    meta: { module: 'MATERNITE' },
  },
  // Module Soins (prescriptions et réalisation des soins)
  {
    path: '/soins',
    name: 'soins',
    component: () => import('../views/SoinsView.vue'),
    meta: { module: 'SOINS' },
  },
  // Module Rapports (rapport mensuel officiel SIG)
  {
    path: '/rapports',
    name: 'rapports',
    component: () => import('../views/RapportsView.vue'),
    meta: { module: 'RAPPORTS' },
  },
  // Module Statistiques
  {
    path: '/statistiques',
    name: 'statistiques',
    component: () => import('../views/StatistiquesView.vue'),
    meta: { module: 'STATISTIQUES' },
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
      {
        path: 'medicaments',
        name: 'admin-medicaments',
        component: () => import('../views/admin/MedicamentsView.vue'),
      },
      {
        path: 'chambres',
        name: 'admin-chambres',
        component: () => import('../views/admin/ChambresView.vue'),
      },
      {
        path: 'assurances',
        name: 'admin-assurances',
        component: () => import('../views/admin/AssurancesView.vue'),
      },
      {
        path: 'listes/:code',
        name: 'admin-listes',
        component: () => import('../views/admin/ListesParametresView.vue'),
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
