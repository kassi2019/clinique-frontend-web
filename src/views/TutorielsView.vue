<template>
  <div class="tuto-page">
    <header class="tuto-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">🎬</div>
          <div class="brand-text">
            <strong>{{ auth.user?.clinique?.nom || 'Gestion Clinique' }}</strong>
            <span>Tutoriels vidéo — apprendre à utiliser vos modules</span>
          </div>
        </div>
        <button class="btn btn-outline btn-sm btn-back" @click="router.push({ name: 'home' })">← Modules</button>
      </div>
    </header>

    <main class="tuto-content">
      <!-- Lecteur -->
      <section v-if="enCours" class="card lecteur">
        <div class="lecteur-tete">
          <h2>{{ enCours.icone }} {{ enCours.titre }}</h2>
          <button class="btn btn-outline btn-sm" @click="enCours = null">✖ Fermer la vidéo</button>
        </div>
        <video :key="enCours.code" :src="`/videos/${enCours.fichier}`" controls autoplay playsinline></video>
        <p class="text-muted">{{ enCours.description }}</p>
      </section>

      <p class="intro">
        Voici les vidéos des modules qui vous sont attribués. Cliquez sur un module pour lancer sa vidéo.
      </p>
      <div v-if="chargement" class="empty-state">Chargement…</div>
      <div v-else-if="!videos.length" class="empty-state">
        Aucune vidéo disponible pour vos modules pour le moment.
      </div>
      <div v-else class="grille">
        <button
          v-for="v in videos"
          :key="v.code"
          class="tuile"
          :class="{ active: enCours?.code === v.code }"
          @click="ouvrir(v)"
        >
          <span class="tuile-icone">{{ v.icone }}</span>
          <span class="tuile-texte">
            <strong>{{ v.titre }}</strong>
            <small>{{ v.description }}</small>
          </span>
          <span class="tuile-duree">▶ {{ duree(v.duree) }}</span>
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

// Liste publiée avec les vidéos (public/videos/index.json) : ajouter une vidéo ne demande pas de modifier le code
const toutes = ref([])
const chargement = ref(true)
const enCours = ref(null)

// L'utilisateur ne voit que les vidéos des modules attribués à son rôle
// (une vidéo commune à plusieurs modules liste ses modules dans « modules »)
const videos = computed(() =>
  toutes.value.filter((v) => (v.modules ?? [v.module ?? v.code]).some((m) => auth.canAccess(m))),
)

const duree = (s) => `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`

function ouvrir(v) {
  enCours.value = v
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  try {
    const r = await fetch('/videos/index.json', { cache: 'no-cache' })
    toutes.value = r.ok ? await r.json() : []
  } catch {
    toutes.value = []
  } finally {
    chargement.value = false
  }
})
</script>

<style scoped>
.tuto-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
}
.tuto-header {
  background: linear-gradient(120deg, #0d9488 0%, #0f766e 55%, #115e59 100%);
  box-shadow: 0 6px 24px rgba(13, 71, 67, 0.28);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 24px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
}
.brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
  display: grid;
  place-items: center;
  font-size: 22px;
}
.brand-text {
  display: flex;
  flex-direction: column;
}
.brand-text span {
  font-size: 12px;
  opacity: 0.85;
}
.btn-back {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.5);
}
.tuto-content {
  max-width: 1150px;
  margin: 0 auto;
  padding: 24px;
}
.intro {
  color: #475569;
  margin: 4px 0 16px;
}
.lecteur {
  margin-bottom: 22px;
}
.lecteur-tete {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.lecteur-tete h2 {
  margin: 0;
}
.lecteur video {
  width: 100%;
  max-height: 70vh;
  border-radius: 12px;
  background: #000;
}
.grille {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}
.tuile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 2px solid #14b8a6;
  border-radius: 14px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.tuile:hover,
.tuile.active {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(13, 148, 136, 0.18);
}
.tuile.active {
  background: #ecfdf5;
}
.tuile-icone {
  font-size: 30px;
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #ecfdf5;
  flex-shrink: 0;
}
.tuile-texte {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.tuile-texte strong {
  color: #0f3d3a;
  font-size: 16px;
}
.tuile-texte small {
  color: #64748b;
  font-size: 12.5px;
}
.tuile-duree {
  font-size: 12px;
  font-weight: 700;
  color: #0f766e;
  white-space: nowrap;
}
@media (max-width: 640px) {
  .tuto-content {
    padding: 14px;
  }
  .grille {
    grid-template-columns: 1fr;
  }
}
</style>
