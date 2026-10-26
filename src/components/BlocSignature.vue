<template>
  <!--
    Case « Signature et cachet » d'un document imprimé. Si le prescripteur connecté a coché
    « Apposer ma signature et mon cachet », ses images s'impriment ici ; sinon le texte
    habituel (slot) reste, pour signer à la main.
  -->
  <div v-if="visible" class="bloc-signature" :class="{ compact }">
    <img v-if="store.cachet" :src="store.cachet" alt="Cachet" class="bloc-signature-cachet" />
    <img v-if="store.signature" :src="store.signature" alt="Signature" class="bloc-signature-sign" />
  </div>
  <slot v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useSignatureStore } from '../stores/signature'

const props = defineProps({
  prescripteurId: { type: Number, default: null }, // utilisateur prescripteur du document
  compact: { type: Boolean, default: false }, // petite case (fiche, demande d'examens)
})

const store = useSignatureStore()
const visible = computed(() => store.apposer && store.disponible && store.estPrescripteur(props.prescripteurId))
</script>

<style scoped>
/* Cachet et signature superposés, comme un tampon posé sur la signature */
.bloc-signature {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46mm;
  min-height: 24mm;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.bloc-signature img {
  display: block;
  width: auto;
  object-fit: contain;
}
.bloc-signature-cachet {
  max-height: 26mm;
  max-width: 34mm;
  opacity: 0.92;
}
.bloc-signature-sign {
  max-height: 16mm;
  max-width: 40mm;
  margin-left: -14mm; /* chevauche le cachet */
  position: relative;
}
.bloc-signature.compact {
  min-width: 38mm;
  min-height: 18mm;
}
.bloc-signature.compact .bloc-signature-cachet {
  max-height: 20mm;
  max-width: 26mm;
}
.bloc-signature.compact .bloc-signature-sign {
  max-height: 12mm;
  max-width: 32mm;
  margin-left: -10mm;
}
</style>
