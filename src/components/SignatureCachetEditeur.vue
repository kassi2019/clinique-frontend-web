<template>
  <!--
    Signature et cachet d'un prescripteur : on importe une photo ou un scan (papier blanc),
    le fond devient transparent et l'image est recadrée automatiquement.
    Sans personnelId : le compte connecté gère sa propre signature (« ✍️ Ma signature »).
  -->
  <div class="sig-editeur">
    <p v-if="chargement" class="text-muted">Chargement…</p>
    <template v-else>
      <div v-for="c in CHAMPS" :key="c.cle" class="sig-carte">
        <div class="sig-carte-titre">{{ c.titre }}</div>
        <div class="sig-apercu" :class="{ vide: !images[c.cle] }">
          <img v-if="images[c.cle]" :src="images[c.cle]" :alt="c.titre" />
          <span v-else>Aucune image</span>
        </div>
        <p class="sig-aide">{{ c.aide }}</p>
        <div class="sig-actions">
          <label class="btn btn-outline btn-sm" :class="{ desactive: enCours }">
            📷 {{ images[c.cle] ? 'Remplacer' : 'Importer une image' }}
            <input type="file" accept="image/*" hidden :disabled="enCours" @change="(e) => importer(c.cle, e)" />
          </label>
          <button
            v-if="images[c.cle]"
            type="button"
            class="btn btn-outline btn-sm btn-retirer"
            :disabled="enCours"
            @click="retirer(c.cle)"
          >
            🗑️ Retirer
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import http from '../api/http'
import { useSignatureStore } from '../stores/signature'
import { useAuthStore } from '../stores/auth'
import { confirmer, toastError, toastSuccess } from '../utils/notifications'
import { preparerImageSignature } from '../utils/imageSignature'

const props = defineProps({
  personnelId: { type: Number, default: null }, // null = le compte connecté
})
const emit = defineEmits(['maj'])

const CHAMPS = [
  {
    cle: 'signature',
    titre: '✍️ Signature',
    aide: 'Signez à l’encre foncée sur une feuille blanche, puis photographiez ou scannez la signature.',
    largeur: 600,
  },
  {
    cle: 'cachet',
    titre: '🔵 Cachet',
    aide: 'Tamponnez le cachet sur une feuille blanche, puis photographiez-le bien à plat.',
    largeur: 500,
  },
]

const images = reactive({ signature: null, cachet: null })
const chargement = ref(true)
const enCours = ref(false)
const signatureStore = useSignatureStore()
const auth = useAuthStore()

const route = () => (props.personnelId ? `/personnel/${props.personnelId}/signature` : '/ma-signature')

async function charger() {
  chargement.value = true
  try {
    const { data } = await http.get(route())
    images.signature = data.signature
    images.cachet = data.cachet
  } catch (e) {
    toastError(e.response?.data?.message || 'Signature indisponible.')
  } finally {
    chargement.value = false
  }
}

async function enregistrer(cle, valeur, message) {
  enCours.value = true
  try {
    const { data } = await http.put(route(), { [cle]: valeur })
    images.signature = data.signature
    images.cachet = data.cachet
    // Sa propre signature (ou celle de sa fiche modifiée par l'admin) : l'impression en tient compte aussitôt
    if (!props.personnelId || props.personnelId === auth.user?.personnel?.id) signatureStore.definir(data)
    toastSuccess(message)
    emit('maj', data)
  } catch (e) {
    toastError(e.response?.data?.message || 'Enregistrement impossible.')
  } finally {
    enCours.value = false
  }
}

async function importer(cle, e) {
  const fichier = e.target.files?.[0]
  e.target.value = ''
  if (!fichier) return
  let image
  try {
    image = await preparerImageSignature(fichier, { largeurMax: CHAMPS.find((c) => c.cle === cle).largeur })
  } catch (err) {
    toastError(err.message)
    return
  }
  await enregistrer(cle, image, cle === 'signature' ? 'Signature enregistrée.' : 'Cachet enregistré.')
}

async function retirer(cle) {
  const ok = await confirmer({
    titre: cle === 'signature' ? 'Retirer la signature ?' : 'Retirer le cachet ?',
    texte: 'Elle ne sera plus proposée à l’impression des documents.',
    boutonOui: 'Retirer',
    danger: true,
  })
  if (!ok) return
  await enregistrer(cle, null, cle === 'signature' ? 'Signature retirée.' : 'Cachet retiré.')
}

onMounted(charger)
</script>

<style scoped>
.sig-editeur {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}
.sig-carte {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sig-carte-titre {
  font-weight: 700;
}
/* Damier : on voit que le fond est bien transparent */
.sig-apercu {
  height: 120px;
  border-radius: 8px;
  border: 1px dashed var(--border-champ);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
    linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
    linear-gradient(-45deg, transparent 75%, #f1f5f9 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}
.sig-apercu img {
  max-width: 92%;
  max-height: 104px;
  object-fit: contain;
}
.sig-apercu.vide span {
  color: var(--text-muted);
  font-size: 13px;
}
.sig-aide {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}
.sig-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.sig-actions label {
  cursor: pointer;
}
.sig-actions .desactive {
  opacity: 0.5;
  pointer-events: none;
}
.btn-retirer {
  color: #b91c1c;
}
</style>
