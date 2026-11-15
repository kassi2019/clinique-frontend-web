<template>
  <!--
    Filtres communs des listes et rapports : heure de début, heure de fin et
    utilisateur (chacun facultatif, combinables avec les dates de l'écran).
    S'insère directement dans une barre de filtres (.toolbar / .periode-bar).
  -->
  <label class="champ-filtre">
    <span class="champ-libelle">Heure début</span>
    <input
      :value="heureDebut"
      type="time"
      class="search-input champ-heure"
      title="Vide = 00:00"
      @change="maj('update:heureDebut', $event.target.value)"
    />
  </label>
  <label class="champ-filtre">
    <span class="champ-libelle">Heure fin</span>
    <input
      :value="heureFin"
      type="time"
      class="search-input champ-heure"
      title="Vide = 23:59"
      @change="maj('update:heureFin', $event.target.value)"
    />
  </label>
  <label v-if="avecUtilisateur" class="champ-filtre">
    <span class="champ-libelle">{{ libelleUtilisateur }}</span>
    <select
      :value="utilisateurId"
      class="search-input champ-utilisateur"
      @change="maj('update:utilisateurId', $event.target.value)"
    >
      <option value="">Tous</option>
      <option v-for="u in liste" :key="u.id" :value="String(u.id)">{{ u.nom }}</option>
    </select>
  </label>
  <button
    v-if="heureDebut || heureFin || (avecUtilisateur && utilisateurId)"
    type="button"
    class="btn btn-outline btn-sm champ-effacer"
    title="Effacer les heures et l'utilisateur"
    @click="effacer"
  >
    ✖ Effacer
  </button>
</template>

<script>
// Liste des utilisateurs partagée entre tous les écrans (chargée une seule fois)
let cache = null
</script>

<script setup>
import { computed, onMounted, ref } from 'vue'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'
import { toastError } from '../utils/notifications'

const props = defineProps({
  heureDebut: { type: String, default: '' },
  heureFin: { type: String, default: '' },
  utilisateurId: { type: String, default: '' },
  /** false = pas de liste « Utilisateur » (écran sans notion d'auteur) */
  avecUtilisateur: { type: Boolean, default: true },
  libelleUtilisateur: { type: String, default: 'Utilisateur' },
  /** Liste imposée [{ id, nom }] ; sinon tous les utilisateurs de la clinique */
  utilisateurs: { type: Array, default: null },
  /** true si les dates couvrent un seul jour (contrôle heure fin > heure début) */
  memeJour: { type: Boolean, default: true },
})
const emit = defineEmits(['update:heureDebut', 'update:heureFin', 'update:utilisateurId', 'change'])

const auth = useAuthStore()
const chargee = ref([])
const liste = computed(() => props.utilisateurs ?? chargee.value)

async function charger() {
  if (!props.avecUtilisateur || props.utilisateurs) return
  const cliniqueId = auth.user?.clinique?.id
  try {
    if (!cache) {
      cache = http
        .get('/utilisateurs-options', { params: { cliniqueId: cliniqueId ?? undefined } })
        .then(({ data }) => (Array.isArray(data) ? data : []))
    }
    chargee.value = await cache
  } catch {
    cache = null
    chargee.value = []
  }
}

function maj(evenement, valeur) {
  emit(evenement, valeur ?? '')
  // Laisse le v-model se mettre à jour avant de recharger la liste
  setTimeout(() => {
    const hd = evenement === 'update:heureDebut' ? valeur : props.heureDebut
    const hf = evenement === 'update:heureFin' ? valeur : props.heureFin
    if (props.memeJour && hd && hf && hf < hd) {
      toastError("L'heure de fin doit être après l'heure de début.")
      return
    }
    emit('change')
  })
}

function effacer() {
  emit('update:heureDebut', '')
  emit('update:heureFin', '')
  emit('update:utilisateurId', '')
  setTimeout(() => emit('change'))
}

onMounted(charger)
</script>

<style scoped>
.champ-heure {
  max-width: 115px;
  flex: none;
}
.champ-utilisateur {
  max-width: 220px;
  min-width: 150px;
  flex: none;
}
.champ-effacer {
  align-self: flex-end;
}
</style>
