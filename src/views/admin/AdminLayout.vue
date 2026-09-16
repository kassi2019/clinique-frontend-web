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
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="{ name: item.to }"
          class="nav-link"
          active-class="active"
        >
          <span class="nav-icon">{{ item.icon }}</span> {{ item.label }}
        </router-link>
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const initiales = computed(() => {
  const p = auth.user?.personnel
  if (!p) return '🏥'
  return `${(p.prenom?.[0] ?? '').toUpperCase()}${(p.nom?.[0] ?? '').toUpperCase()}`
})

const navItems = [
  { to: 'admin-clinique', label: 'Clinique', icon: '🏥' },
  { to: 'admin-personnel', label: 'Personnel', icon: '👤' },
  { to: 'admin-utilisateurs', label: 'Utilisateurs', icon: '🔐' },
  { to: 'admin-roles', label: 'Rôles & habilitations', icon: '🛡️' },
  { to: 'admin-services', label: 'Services', icon: '🏥' },
  { to: 'admin-prestations', label: 'Prestations & tarifs', icon: '💲' },
  { to: 'admin-medicaments', label: 'Médicaments', icon: '💊' },
  { to: 'admin-parametres', label: 'Paramètres', icon: '🎨' },
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
