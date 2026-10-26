<template>
  <!--
    Case « Apposer ma signature et mon cachet », placée à côté du bouton Imprimer.
    Proposée seulement au prescripteur du document, s'il a enregistré sa signature ou son cachet.
  -->
  <label v-if="proposee" class="case-signature" title="Votre choix est mémorisé sur ce poste">
    <input type="checkbox" :checked="store.apposer" @change="(e) => store.choisirApposer(e.target.checked)" />
    ✍️ Apposer ma signature et mon cachet
  </label>
  <span
    v-else-if="store.charge && store.estPrescripteur(prescripteurId) && !store.disponible"
    class="case-signature-aide"
  >
    ✍️ Enregistrez votre signature (« Ma signature » sur l'écran des modules) pour l'apposer ici.
  </span>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useSignatureStore } from '../stores/signature'

const props = defineProps({
  prescripteurId: { type: Number, default: null },
})

const store = useSignatureStore()
const proposee = computed(() => store.disponible && store.estPrescripteur(props.prescripteurId))

onMounted(() => store.charger())
</script>

<style scoped>
.case-signature {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.case-signature input {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
}
.case-signature-aide {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
