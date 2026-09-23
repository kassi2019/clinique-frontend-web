<template>
  <div class="home-page">
    <!-- Header pleine largeur -->
    <header class="top-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">🏥</div>
          <div class="brand-text">
            <strong>{{ auth.user?.clinique?.nom || 'Gestion Clinique' }}</strong>
            <span>Application de gestion intégrée</span>
          </div>
        </div>

        <div class="user-block">
          <div class="user-avatar">
            <img v-if="photo" :src="photo" alt="" />
            <span v-else>{{ initiales }}</span>
          </div>
          <div class="user-info">
            <strong>{{ nomComplet }}</strong>
            <span class="role-pill">{{ auth.user?.role?.nom || 'Rôle non défini' }}</span>
          </div>
          <div class="user-divider"></div>
          <button class="btn-logout" @click="ouvrirChangement = true">
            <span>🔑 Mot de passe</span>
          </button>
          <button class="btn-logout" @click="onLogout">
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Contenu -->
    <div class="home-content">
      <!-- Décor d'arrière-plan discret -->
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>

      <div class="modules-grid">
        <button
          v-for="mod in modules"
          :key="mod.code"
          class="module-card"
          :class="{ disabled: !mod.allowed }"
          :disabled="!mod.allowed"
          @click="openModule(mod)"
        >
          <div class="module-icon">{{ mod.icon }}</div>
          <div class="module-label">{{ mod.label }}</div>
          <div class="module-desc">{{ mod.description }}</div>
          <div v-if="!mod.allowed" class="module-lock">🔒 Accès non autorisé</div>
        </button>
      </div>

      <footer class="home-footer">
        © {{ year }} — {{ auth.user?.clinique?.nom || 'Gestion Clinique' }}
      </footer>
    </div>

    <!-- Modale : changer son mot de passe -->
    <div v-if="ouvrirChangement" class="modal-backdrop" @click.self="ouvrirChangement = false">
      <div class="modal">
        <h2>🔑 Changer le mot de passe</h2>
        <form @submit.prevent="changerMotDePasse">
          <div class="field">
            <label>Mot de passe actuel *</label>
            <div class="input-oeil">
              <input v-model="mdp.actuel" :type="voirMdp ? 'text' : 'password'" required autocomplete="current-password" />
              <button type="button" class="btn-oeil" @click="voirMdp = !voirMdp">{{ voirMdp ? '🙈' : '👁️' }}</button>
            </div>
          </div>
          <div class="field">
            <label>Nouveau mot de passe * (6 caractères minimum)</label>
            <div class="input-oeil">
              <input v-model="mdp.nouveau" :type="voirMdp ? 'text' : 'password'" minlength="6" required autocomplete="new-password" />
              <button type="button" class="btn-oeil" @click="voirMdp = !voirMdp">{{ voirMdp ? '🙈' : '👁️' }}</button>
            </div>
          </div>
          <div class="field">
            <label>Confirmer le nouveau mot de passe *</label>
            <div class="input-oeil">
              <input v-model="mdp.confirmation" :type="voirMdp ? 'text' : 'password'" required autocomplete="new-password" />
              <button type="button" class="btn-oeil" @click="voirMdp = !voirMdp">{{ voirMdp ? '🙈' : '👁️' }}</button>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="ouvrirChangement = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="enCours">
              {{ enCours ? 'Enregistrement…' : 'Changer le mot de passe' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import http from '../api/http'
import { toastError, toastSuccess } from '../utils/notifications'

const auth = useAuthStore()
const router = useRouter()

const year = new Date().getFullYear()

const photo = computed(() => auth.user?.personnel?.photo ?? null)

// ── Changement de mot de passe ──
const ouvrirChangement = ref(false)
const enCours = ref(false)
const voirMdp = ref(false)
const mdp = reactive({ actuel: '', nouveau: '', confirmation: '' })

async function changerMotDePasse() {
  if (mdp.nouveau.length < 6) {
    toastError('Le nouveau mot de passe doit contenir au moins 6 caractères.')
    return
  }
  if (mdp.nouveau !== mdp.confirmation) {
    toastError('La confirmation ne correspond pas au nouveau mot de passe.')
    return
  }
  enCours.value = true
  try {
    await http.post('/auth/changer-mot-de-passe', {
      motDePasseActuel: mdp.actuel,
      nouveauMotDePasse: mdp.nouveau,
    })
    toastSuccess('Mot de passe modifié avec succès.')
    ouvrirChangement.value = false
    mdp.actuel = ''
    mdp.nouveau = ''
    mdp.confirmation = ''
  } catch (e) {
    const msg = e.response?.data?.message
    toastError(Array.isArray(msg) ? msg.join('\n') : msg ?? 'Changement impossible.')
  } finally {
    enCours.value = false
  }
}

// Rafraîchit le profil (photo mise à jour par l'administrateur, etc.)
onMounted(() => auth.refreshMe())

// Modules de la clinique (cf. cahier des charges §3 et §16.1)
const MODULES = [
  { code: 'ACCUEIL', label: 'Accueil', icon: '🏥', description: 'Enregistrement des patients et des passages', route: '/accueil' },
  { code: 'CAISSE', label: 'Caisse', icon: '💰', description: 'Paiements, reçus et activation des actes', route: '/caisse' },
  { code: 'CONSULTATION', label: 'Consultation', icon: '🩺', description: 'Dossiers médicaux, diagnostics et prescriptions', route: '/consultation' },
  { code: 'PHARMACIE', label: 'Pharmacie', icon: '💊', description: 'Ordonnances, stocks et consommables', route: '/pharmacie' },
  { code: 'LABORATOIRE', label: 'Laboratoire', icon: '🧪', description: 'Examens, prélèvements et résultats', route: '/laboratoire' },
  { code: 'IMAGERIE', label: 'Imagerie', icon: '🩻', description: 'Échographies et comptes rendus', route: '/imagerie' },
  { code: 'MATERNITE', label: 'Maternité', icon: '🤰', description: 'CPN, accouchements et suivi', route: null },
  { code: 'HOSPITALISATION', label: 'Hospitalisation', icon: '🛏️', description: 'Chambres, lits et séjours', route: '/hospitalisation' },
  { code: 'SOINS', label: 'Soins', icon: '💉', description: 'Prescriptions et réalisation des soins', route: null },
  { code: 'STATISTIQUES', label: 'Statistiques', icon: '📊', description: 'Tableaux de bord et rapports', route: '/statistiques' },
  { code: 'PARAMETRAGE', label: 'Paramétrage', icon: '⚙️', description: 'Personnel, utilisateurs, rôles et référentiels', route: '/parametrage' },
]

const modules = computed(() =>
  MODULES.map((m) => ({ ...m, allowed: auth.canAccess(m.code) })),
)

const initiales = computed(() => {
  const p = auth.user?.personnel
  if (!p) return '🏥'
  return `${(p.prenom?.[0] ?? '').toUpperCase()}${(p.nom?.[0] ?? '').toUpperCase()}`
})

const nomComplet = computed(() => {
  const p = auth.user?.personnel
  return p ? `${p.prenom} ${p.nom}` : ''
})

function openModule(mod) {
  if (mod.route) {
    router.push(mod.route)
  }
}

function onLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.home-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
  overflow-x: hidden;
}

/* ---------- Header pleine largeur ---------- */
.top-header {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  /* Dégradé teal foncé */
  background: linear-gradient(
    120deg,
    #0d9488 0%,
    #0f766e 55%,
    #115e59 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 6px 24px rgba(13, 71, 67, 0.28);
}
.header-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 14px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.brand {
  display: flex;
  align-items: center;
  gap: 13px;
  cursor: pointer;
}
.brand-logo {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 14px;
  box-shadow: 0 5px 14px rgba(6, 44, 44, 0.25);
}
.brand-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.brand-text strong {
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.01em;
}
.brand-text span {
  font-size: 12px;
  color: rgba(236, 253, 245, 0.75);
}

.user-block {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}
.user-info strong {
  font-size: 13.5px;
  font-weight: 700;
  color: #ffffff;
}
.role-pill {
  padding: 2.5px 11px;
  font-size: 11.5px;
  font-weight: 600;
  color: #ecfdf5;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
}
.user-avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #0f766e;
  background: linear-gradient(135deg, #ecfdf5, #ccfbf1);
  border: 2px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 5px 14px rgba(6, 44, 44, 0.3);
}
.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.user-divider {
  width: 1px;
  height: 30px;
  background: rgba(255, 255, 255, 0.28);
}
.btn-logout {
  padding: 8px 15px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  color: #ffffff;
  background: transparent;
  border: 1.5px solid rgba(255, 255, 255, 0.45);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn-logout:hover {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.8);
}

/* ---------- Contenu ---------- */
.home-content {
  position: relative;
  flex: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 28px 20px;
  display: flex;
  flex-direction: column;
}

/* Halos décoratifs */
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
}
.blob-1 {
  width: 480px;
  height: 480px;
  top: -140px;
  right: -120px;
  background: rgba(45, 212, 191, 0.16);
}
.blob-2 {
  width: 380px;
  height: 380px;
  bottom: -160px;
  left: -100px;
  background: rgba(153, 246, 228, 0.18);
}

/* ---------- Grille de modules ---------- */
.modules-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
  gap: 18px;
}
.module-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  text-align: left;
  padding: 22px;
  background: rgba(255, 255, 255, 0.88);
  border: 2px solid #14b8a6;
  border-radius: 16px;
  box-shadow: 0 6px 18px rgba(13, 148, 136, 0.1);
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  font-family: inherit;
  color: var(--text);
  backdrop-filter: blur(4px);
}
.module-card:hover:not(.disabled) {
  transform: translateY(-4px);
  border-color: #0d9488;
  box-shadow: 0 14px 30px rgba(13, 148, 136, 0.22);
}
.module-card.disabled {
  opacity: 0.52;
  cursor: not-allowed;
  background: rgba(248, 250, 250, 0.7);
  border-color: #a7d6cf;
}
.module-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  background: linear-gradient(135deg, #e6fbf7, #d3f4ee);
  border: 1px solid #c9ece5;
  border-radius: 14px;
}
.module-label {
  font-size: 16px;
  font-weight: 700;
  color: #134e4a;
}
.module-desc {
  font-size: 12.5px;
  line-height: 1.5;
  color: #64748b;
}
.module-lock {
  margin-top: 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: #b45309;
}

/* ---------- Pied de page ---------- */
.home-footer {
  position: relative;
  margin-top: auto;
  padding-top: 30px;
  text-align: center;
  font-size: 12.5px;
  color: #94a3b8;
}

@media (max-width: 700px) {
  .header-inner {
    padding: 10px 16px;
    gap: 10px;
  }
  .brand-text span {
    display: none;
  }
  .user-info {
    display: none;
  }
  .home-content {
    padding: 24px 16px 16px;
  }
  .modules-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
  .module-card {
    padding: 16px;
  }
  .module-icon {
    width: 44px;
    height: 44px;
    font-size: 22px;
  }
}
</style>
