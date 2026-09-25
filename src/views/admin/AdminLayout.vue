<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-brand" @click="router.push({ name: 'home' })">
        <span class="sidebar-logo">🏥</span>
        <div>
          <div class="sidebar-title">Gestion Clinique</div>
          <div class="sidebar-subtitle">Paramétrage</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div v-for="item in navItems" :key="item.label">
          <!-- Élément parent avec enfants (menu dépliable) -->
          <button
            class="nav-link nav-parent"
            :class="{ 'nav-parent-ouvert': ouvert(item.label) }"
            @click="basculer(item.label)"
          >
            <span class="nav-icon">{{ item.icon }}</span> {{ item.label }}
            <span class="nav-fleche">{{ ouvert(item.label) ? '▾' : '▸' }}</span>
          </button>
          <div v-if="ouvert(item.label)">
            <router-link
              v-for="enfant in item.children"
              :key="enfant.label"
              :to="enfant.to"
              class="nav-link nav-enfant"
              active-class="active"
            >
              <span class="nav-icon">{{ enfant.icon }}</span> {{ enfant.label }}
            </router-link>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-line">
          <div class="user-avatar">
            <img v-if="auth.user?.personnel?.photo" :src="auth.user.personnel.photo" alt="" />
            <span v-else>{{ initiales }}</span>
          </div>
          <div>
            <strong>{{ auth.user?.personnel?.nom }} {{ auth.user?.personnel?.prenom }}</strong>
            <span class="text-muted">{{ auth.user?.matricule }}</span>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" @click="onLogout">Déconnexion</button>
      </div>
    </aside>

    <main class="admin-main">
      <button class="btn btn-outline btn-sm btn-back-modules" @click="router.push({ name: 'home' })">
        ← Retour aux modules
      </button>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()

/** Groupes dépliables : TOUT PLIÉ au démarrage — c'est l'utilisateur qui déplie. */
const groupesOuverts = ref({})

function ouvert(label) {
  return groupesOuverts.value[label] === true
}

function basculer(label) {
  groupesOuverts.value = { ...groupesOuverts.value, [label]: !ouvert(label) }
}

const initiales = computed(() => {
  const p = auth.user?.personnel
  if (!p) return '🏥'
  return `${(p.prenom?.[0] ?? '').toUpperCase()}${(p.nom?.[0] ?? '').toUpperCase()}`
})

const navItems = [
  {
    label: 'Établissement',
    icon: '🏥',
    children: [
      { to: { name: 'admin-clinique' }, label: 'Clinique', icon: '🏥' },
      { to: { name: 'admin-services' }, label: 'Services', icon: '🏥' },
      { to: { name: 'admin-chambres' }, label: 'Chambres & lits', icon: '🛏️' },
    ],
  },
  {
    label: 'Personnel & accès',
    icon: '👥',
    children: [
      { to: { name: 'admin-listes', params: { code: 'fonctions' } }, label: 'Fonctions', icon: '👔' },
      { to: { name: 'admin-personnel' }, label: 'Personnel', icon: '👤' },
      { to: { name: 'admin-roles' }, label: 'Rôles & habilitations', icon: '🛡️' },
      { to: { name: 'admin-utilisateurs' }, label: 'Utilisateurs', icon: '🔐' },
    ],
  },
  {
    label: 'Actes & produits',
    icon: '💉',
    children: [
      { to: { name: 'admin-prestations' }, label: 'Prestations & tarifs', icon: '💲' },
      { to: { name: 'admin-medicaments' }, label: 'Médicaments', icon: '💊' },
      { to: { name: 'admin-listes', params: { code: 'posologies' } }, label: 'Posologies', icon: '💊' },
      { to: { name: 'admin-listes', params: { code: 'diagnostics' } }, label: 'Diagnostics retenus', icon: '🩺' },
      { to: { name: 'admin-listes', params: { code: 'pathologies' } }, label: 'Pathologies associées', icon: '🦠' },
    ],
  },
  {
    label: 'Assurances & tiers',
    icon: '🛡️',
    children: [
      { to: { name: 'admin-assurances' }, label: 'Assurances', icon: '🛡️' },
      { to: { name: 'admin-listes', params: { code: 'fournisseurs' } }, label: 'Fournisseurs', icon: '🚚' },
      { to: { name: 'admin-listes', params: { code: 'nationalites' } }, label: 'Nationalités', icon: '🌍' },
      { to: { name: 'admin-listes', params: { code: 'residences' } }, label: 'Résidences', icon: '🏠' },
      { to: { name: 'admin-listes', params: { code: 'professions' } }, label: 'Professions', icon: '💼' },
      { to: { name: 'admin-listes', params: { code: 'motifs' } }, label: 'Motifs de consultation', icon: '📋' },
      { to: { name: 'admin-listes', params: { code: 'quartiers' } }, label: 'Quartiers', icon: '🏘️' },
    ],
  },
  {
    label: 'Apparence',
    icon: '🎨',
    children: [{ to: { name: 'admin-parametres' }, label: 'Paramètres', icon: '🎨' }],
  },
]

function onLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}
.admin-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: #0f172a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
}
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid #1e293b;
  cursor: pointer;
}
.sidebar-logo {
  font-size: 26px;
}
.sidebar-title {
  font-weight: 700;
  font-size: 14px;
}
.sidebar-subtitle {
  font-size: 12px;
  color: #94a3b8;
}
.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.12s;
}
.nav-link:hover {
  background: #1e293b;
  color: #fff;
}

/* Menu parent dépliable */
.nav-link.nav-parent {
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  justify-content: space-between;
}

.nav-parent .nav-fleche {
  font-size: 12px;
  color: #94a3b8;
}

/* Enfants indentés */
.nav-link.nav-enfant {
  padding: 8px 12px 8px 40px;
  font-size: 13px;
}
.nav-link.active {
  background: var(--primary);
  color: #fff;
  font-weight: 600;
}
.nav-icon {
  font-size: 16px;
}
.sidebar-footer {
  padding: 14px;
  border-top: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.user-line {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.user-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ccfbf1, #99f6e4);
  border: 1.5px solid #2dd4bf;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
}
.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sidebar-footer .btn {
  width: 100%;
  justify-content: center;
  border-color: #334155;
  color: #cbd5e1;
}
.admin-main {
  flex: 1;
  padding: 28px;
  min-width: 0;
}
.btn-back-modules {
  margin-bottom: 18px;
  color: #0f766e;
  border-color: #bce3db;
}
.btn-back-modules:hover {
  background: #f0fdfa;
}
@media (max-width: 800px) {
  .admin-layout {
    flex-direction: column;
  }
  .admin-sidebar {
    width: 100%;
  }
  .sidebar-nav {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
