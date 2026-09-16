<template>
  <div ref="racine" class="select-search" :class="{ open: ouvert }">
    <div class="select-search-field" @click="basculer">
      <span v-if="labelChoisi" class="select-search-value">{{ labelChoisi }}</span>
      <span v-else class="select-search-placeholder">{{ placeholder }}</span>
      <span class="select-search-arrow">▾</span>
    </div>
    <div v-if="ouvert" class="select-search-dropdown">
      <input
        ref="inputRecherche"
        v-model="filtre"
        class="select-search-input"
        type="text"
        placeholder="Saisir pour rechercher…"
        @keydown.down.prevent="descendre"
        @keydown.up.prevent="monter"
        @keydown.enter.prevent="choisirIndex"
        @keydown.esc="ouvert = false"
      />
      <ul class="select-search-options">
        <li v-if="optionsFiltrees.length === 0" class="select-search-vide">
          Aucun résultat
        </li>
        <li
          v-for="(o, i) in optionsFiltrees"
          :key="o.value ?? 'vide'"
          class="select-search-option"
          :class="{ actif: i === indexActif }"
          @mouseenter="indexActif = i"
          @click="choisir(o)"
        >
          {{ o.label }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String, null], default: null },
  options: { type: Array, default: () => [] }, // [{ value, label }]
  placeholder: { type: String, default: '— Choisir —' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const racine = ref(null)
const inputRecherche = ref(null)
const ouvert = ref(false)
const filtre = ref('')
const indexActif = ref(0)

/** Normalise pour une recherche insensible aux accents et à la casse. */
function normaliser(t) {
  return (t ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

const optionsFiltrees = computed(() => {
  const f = normaliser(filtre.value)
  if (!f) return props.options
  return props.options.filter((o) => normaliser(o.label).includes(f))
})

const labelChoisi = computed(() => {
  const o = props.options.find((x) => x.value === props.modelValue)
  return o ? o.label : ''
})

function basculer() {
  ouvert.value = !ouvert.value
  if (ouvert.value) {
    filtre.value = ''
    indexActif.value = 0
    nextTick(() => inputRecherche.value?.focus())
  }
}

function choisir(o) {
  emit('update:modelValue', o.value)
  emit('change', o.value)
  ouvert.value = false
  filtre.value = ''
}

function choisirIndex() {
  const o = optionsFiltrees.value[indexActif.value]
  if (o) choisir(o)
}

function descendre() {
  indexActif.value = Math.min(indexActif.value + 1, optionsFiltrees.value.length - 1)
}

function monter() {
  indexActif.value = Math.max(indexActif.value - 1, 0)
}

function onClicExterieur(e) {
  if (racine.value && !racine.value.contains(e.target)) {
    ouvert.value = false
  }
}

onMounted(() => document.addEventListener('click', onClicExterieur))
onUnmounted(() => document.removeEventListener('click', onClicExterieur))
</script>

<style scoped>
.select-search {
  position: relative;
  font-size: 14px;
}
.select-search-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
  min-height: 38px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.select-search.open .select-search-field {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(13, 116, 144, 0.15);
}
.select-search-value {
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.select-search-placeholder {
  color: #94a3b8;
}
.select-search-arrow {
  color: var(--text-muted);
  font-size: 11px;
  flex-shrink: 0;
}
.select-search-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 60;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.select-search-input {
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-bottom: 1px solid var(--border);
  font-size: 13.5px;
  font-family: inherit;
  outline: none;
  background: var(--bg);
}
.select-search-options {
  list-style: none;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  padding: 0;
}
.select-search-option {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  font-size: 13.5px;
}
.select-search-option:last-child {
  border-bottom: none;
}
.select-search-option:hover,
.select-search-option.actif {
  background: var(--primary-light);
  color: var(--primary-dark);
}
.select-search-vide {
  padding: 10px 12px;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
