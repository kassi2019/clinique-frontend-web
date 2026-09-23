<template>
  <div class="login-page">
    <!-- Partie image -->
    <div
      class="login-side"
      :class="{ 'no-image': !loginImage }"
      :style="sideStyle"
    >
      <div class="side-overlay"></div>
      <!-- <div class="side-badge">🏥</div> -->

      <!-- Visuel par défaut si aucune image n'est paramétrée -->
      <div v-if="!loginImage" class="side-illustration" aria-hidden="true">
        <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="28" r="4" />
          <circle cx="178" cy="34" r="3" />
          <circle cx="24" cy="118" r="3" />
          <path
            d="M12 72 H64 L78 34 L96 108 L110 72 H188"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M100 44 v56 M72 72 h56"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            opacity="0.7"
          />
        </svg>
      </div>

      <div class="side-caption">
        <h1>{{ cliniqueNom || 'Gestion Clinique' }}</h1>
        <!-- <p>
          Application intégrée de gestion et de suivi
          des activités de la clinique
        </p> -->
      </div>
    </div>

    <!-- Partie formulaire -->
    <div class="login-form-side">
      <div class="login-card">
        <div class="login-head">
          <div class="login-logo">
            <img :src="logoClinique" alt="Logo de la clinique" />
          </div>
          <h2>Connexion</h2>
          <p>Identifiez-vous avec votre matricule pour accéder à vos modules.</p>
        </div>

        <form @submit.prevent="onSubmit">
          <div class="field">
            <label for="matricule">Matricule</label>
            <input
              id="matricule"
              v-model.trim="matricule"
              type="text"
              autocomplete="username"
              placeholder="Ex : M001"
              required
              autofocus
            />
          </div>
          <div class="field">
            <label for="motDePasse">Mot de passe</label>
            <input
              id="motDePasse"
              v-model="motDePasse"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          <p v-if="error" class="alert alert-error">{{ error }}</p>

          <button class="btn-login" type="submit" :disabled="loading">
            {{ loading ? 'Connexion…' : 'Se connecter' }}
          </button>

          <button type="button" class="btn-forgot" @click="motDePasseOublie">
            Mot de passe oublié ?
          </button>
        </form>
      </div>

      <p class="login-footer">© {{ year }} — {{ cliniqueNom || 'Gestion Clinique' }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import http from '../api/http'
import logoClinique from '../assets/logoclinique.jpeg'
import { toastInfo } from '../utils/notifications'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const matricule = ref('')
const motDePasse = ref('')
const loading = ref(false)
const error = ref('')

// Configuration publique (nom de la clinique + image paramétrée)
const cliniqueNom = ref('')
const loginImage = ref(null)

const year = new Date().getFullYear()

const sideStyle = computed(() =>
  loginImage.value ? { backgroundImage: `url("${loginImage.value}")` } : {},
)

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(matricule.value, motDePasse.value)
    router.push(route.query.redirect || { name: 'home' })
  } catch (e) {
    error.value =
      e.response?.status === 401
        ? 'Matricule ou mot de passe incorrect.'
        : 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.'
  } finally {
    loading.value = false
  }
}

// Aucun envoi d'e-mail n'est configuré : le mot de passe est réinitialisé
// par un administrateur depuis le module Paramétrage.
function motDePasseOublie() {
  toastInfo(
    "Mot de passe oublié ? Contactez un administrateur : il réinitialise votre mot de passe depuis Paramétrage → Utilisateurs → « Réinitialiser le mot de passe ».",
  )
}

onMounted(async () => {
  try {
    const { data } = await http.get('/auth/config-public')
    cliniqueNom.value = data.clinique?.nom ?? ''
    loginImage.value = data.loginImage
  } catch {
    // visuel par défaut si l'API ne répond pas
  }
})
</script>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
}

/* ---------- Partie image ---------- */
.login-side {
  position: relative;
  flex: 1.15;
  display: flex;
  align-items: flex-end;
  padding: 48px;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}
.login-side.no-image {
  /* Vert foncé du logo (#112712) décliné en dégradé doux */
  background: linear-gradient(155deg, #2c5228 0%, #1b3a1e 55%, #0f2411 130%);
}
.side-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    185deg,
    rgba(6, 44, 44, 0.08) 0%,
    rgba(6, 44, 44, 0.62) 100%
  );
}
/* Voile plus léger quand une vraie image est affichée, pour préserver sa netteté */
.login-side:not(.no-image) .side-overlay {
  background: linear-gradient(
    185deg,
    rgba(6, 44, 44, 0.02) 35%,
    rgba(6, 44, 44, 0.45) 100%
  );
}
.side-badge {
  position: absolute;
  top: 32px;
  left: 32px;
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  backdrop-filter: blur(6px);
}
.side-illustration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -58%);
  width: 46%;
  max-width: 420px;
  color: rgba(255, 255, 255, 0.22);
}
.side-illustration svg {
  width: 100%;
  height: auto;
}
.side-caption {
  position: relative;
  color: #fff;
  max-width: 1020px;
}
.side-caption h1 {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
  text-shadow: 0 2px 12px rgba(4, 30, 30, 0.35);
}
.side-caption p {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.88);
  text-shadow: 0 1px 8px rgba(4, 30, 30, 0.3);
}

/* ---------- Partie formulaire ---------- */
.login-form-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 40px 24px;
  /* Teinte très douce du vert lime du logo */
  background: linear-gradient(170deg, #ffffff 0%, #f3f8e7 100%);
}
.login-card {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border: 1px solid #e0ecc9;
  border-radius: 18px;
  padding: 38px 34px;
  box-shadow: 0 22px 50px rgba(124, 179, 66, 0.16);
}
.login-head {
  text-align: center;
  margin-bottom: 26px;
}
.login-logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 14px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(27, 58, 30, 0.2);
}
.login-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.login-head h2 {
  font-size: 24px;
  font-weight: 800;
  color: #1b3a1e;
  margin-bottom: 4px;
}
.login-head p {
  font-size: 13.5px;
  color: #64748b;
}

/* Champs adoucis */
.field label {
  color: #4d7c2f;
}
.field input {
  padding: 11px 14px;
  border: 1.5px solid #dde7c8;
  border-radius: 10px;
  background: #fcfefa;
  font-size: 14.5px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field input:focus {
  outline: none;
  border-color: #8bc34a;
  box-shadow: 0 0 0 3.5px rgba(139, 195, 74, 0.18);
}

.btn-login {
  width: 100%;
  padding: 12px;
  margin-top: 6px;
  border: none;
  border-radius: 10px;
  /* Vert lime du logo, adouci */
  background: linear-gradient(135deg, #b5dc5f, #8bc34a);
  color: #1b3a1e;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: filter 0.15s, box-shadow 0.15s;
}

/* Lien « Mot de passe oublié » */
.btn-forgot {
  display: block;
  margin: 12px auto 0;
  background: none;
  border: none;
  color: #5f857f;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.15s;
}

.btn-forgot:hover {
  color: #0f766e;
}
.btn-login:hover:not(:disabled) {
  filter: brightness(1.04);
  box-shadow: 0 8px 20px rgba(124, 179, 66, 0.35);
}
.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  font-size: 12.5px;
  color: #94a3b8;
}

/* ---------- Responsive ---------- */
@media (max-width: 860px) {
  .login-page {
    flex-direction: column;
  }
  .login-side {
    flex: none;
    min-height: 34vh;
    padding: 28px;
    align-items: flex-end;
  }
  .side-badge {
    top: 20px;
    left: 20px;
    width: 44px;
    height: 44px;
    font-size: 22px;
  }
  .side-illustration {
    width: 40%;
    top: 42%;
  }
  .side-caption h1 {
    font-size: 24px;
  }
  .side-caption p {
    font-size: 13px;
  }
  .login-form-side {
    flex: 1;
    padding: 28px 16px;
  }
  .login-card {
    padding: 28px 22px;
  }
}
</style>
