<template>
  <!--
    Date + heure (remplace <input type="datetime-local">) : la date se saisit comme partout
    (JJ/MM/AAAA ou panneau Années / Mois / Jours), l'heure dans une petite case HH:MM.
  -->
  <div class="date-heure" :style="$attrs.style">
    <DateSaisie v-model="date" class="dh-date" :required="$attrs.required" @change="publier" />
    <input
      v-model="heure"
      class="dh-heure"
      type="time"
      :required="$attrs.required"
      aria-label="Heure"
      @change="publier"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import DateSaisie from './DateSaisie.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: '' }, // AAAA-MM-JJTHH:MM (format de datetime-local)
})
const emit = defineEmits(['update:modelValue', 'change'])

const date = ref('')
const heure = ref('')

function heureActuelle() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function publier() {
  // Date choisie sans heure : l'heure actuelle est proposée (modifiable)
  if (date.value && !heure.value) heure.value = heureActuelle()
  const valeur = date.value ? `${date.value}T${heure.value}` : ''
  if (valeur !== (props.modelValue || '')) {
    emit('update:modelValue', valeur)
    emit('change', valeur)
  }
}

watch(
  () => props.modelValue,
  (v) => {
    const m = /^(\d{4}-\d{2}-\d{2})T?(\d{2}:\d{2})?/.exec(v ?? '')
    date.value = m ? m[1] : ''
    heure.value = m ? (m[2] ?? '') : ''
  },
  { immediate: true },
)
</script>

<style scoped>
.date-heure {
  display: flex;
  gap: 6px;
  align-items: center;
}
.dh-date {
  flex: 1 1 auto;
  min-width: 0;
}
.date-heure .dh-heure {
  flex: 0 0 105px;
  min-width: 0;
}
</style>
