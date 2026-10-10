<template>
  <div ref="racine" class="select-search" :class="{ open: ouvert, multiple }">
    <div class="select-search-field" @click="basculer">
      <span v-if="labelChoisi" class="select-search-value">{{ labelChoisi }}</span>
      <span v-else class="select-search-placeholder">{{ placeholder }}</span>
      <span class="select-search-arrow">{{ ouvert ? '▴' : '▾' }}</span>
    </div>
    <!--
      La liste s'affiche au-dessus de toute la page (téléportée dans <body>) :
      elle n'est plus coupée par une modale, un cadre ou un en-tête fixe, et
      s'ouvre vers le haut quand la place manque en bas de l'écran.
    -->
    <Teleport to="body">
      <div
        v-if="ouvert"
        ref="panneau"
        class="select-search-dropdown"
        :class="{ 'vers-le-haut': versLeHaut }"
        :style="stylePanneau"
      >
        <input
          ref="inputRecherche"
          v-model="filtre"
          class="select-search-input"
          :class="{ 'search-raw': brut }"
          type="text"
          :placeholder="libre ? 'Rechercher ou saisir une nouvelle valeur…' : 'Saisir pour rechercher…'"
          @keydown.down.prevent="descendre"
          @keydown.up.prevent="monter"
          @keydown.enter.prevent="choisirIndex"
          @keydown.esc="fermer"
          @keydown.tab="fermer"
        />
        <ul ref="liste" class="select-search-options" :style="{ maxHeight: hauteurListe + 'px' }">
          <li
            v-if="valeurLibre"
            class="select-search-option select-search-ajout"
            :class="{ actif: indexActif === optionsFiltrees.length }"
            :data-index="optionsFiltrees.length"
            @mouseenter="indexActif = optionsFiltrees.length"
            @click="choisir({ value: valeurLibre, label: valeurLibre })"
          >
            ＋ Ajouter « {{ valeurLibre }} »
          </li>
          <li v-if="optionsFiltrees.length === 0 && !valeurLibre" class="select-search-vide">
            Aucun résultat
          </li>
          <li
            v-for="(o, i) in optionsFiltrees"
            :key="o.value ?? 'vide'"
            class="select-search-option"
            :class="{ actif: i === indexActif, choisi: estChoisi(o) }"
            :data-index="i"
            @mouseenter="indexActif = i"
            @click="choisir(o)"
          >
            <input
              v-if="multiple"
              type="checkbox"
              class="select-search-case"
              :checked="estChoisi(o)"
              tabindex="-1"
              @click.prevent
            />
            <span v-else class="select-search-coche">{{ estChoisi(o) ? '✓' : '' }}</span>
            <span class="select-search-libelle">{{ o.label }}</span>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String, Array, null], default: null },
  options: { type: Array, default: () => [] }, // [{ value, label }]
  placeholder: { type: String, default: '— Choisir —' },
  // Saisie libre : propose « ＋ Ajouter » quand la valeur tapée n'existe pas dans la liste
  libre: { type: Boolean, default: false },
  // Pas de mise en majuscules automatique de la saisie (valeurs médicales)
  brut: { type: Boolean, default: false },
  // Choix multiple : cases à cocher dans la liste, modelValue = tableau de valeurs
  multiple: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])

const racine = ref(null)
const panneau = ref(null)
const liste = ref(null)
const inputRecherche = ref(null)
const ouvert = ref(false)
const filtre = ref('')
const indexActif = ref(0)

// Position du panneau (coordonnées écran, recalculées au défilement)
const stylePanneau = ref({})
const versLeHaut = ref(false)
const hauteurListe = ref(260)

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

const valeursChoisies = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue : [],
)

function estChoisi(o) {
  return props.multiple ? valeursChoisies.value.includes(o.value) : o.value === props.modelValue
}

const labelChoisi = computed(() => {
  if (props.multiple) {
    return valeursChoisies.value
      .map((v) => props.options.find((x) => x.value === v)?.label ?? String(v))
      .join(' ; ')
  }
  const o = props.options.find((x) => x.value === props.modelValue)
  if (o) return o.label
  // Valeur libre déjà enregistrée (absente de la liste)
  return props.libre && props.modelValue ? String(props.modelValue) : ''
})

/** Texte tapé proposé en ajout (mode libre) s'il ne correspond exactement à aucune option. */
const valeurLibre = computed(() => {
  if (!props.libre) return ''
  const t = filtre.value.trim()
  if (!t) return ''
  const n = normaliser(t)
  return props.options.some((o) => normaliser(o.label) === n) ? '' : t
})

/** Place le panneau sous le champ (ou au-dessus s'il manque de place en bas). */
function positionner() {
  const champ = racine.value?.querySelector('.select-search-field')
  if (!champ) return
  const r = champ.getBoundingClientRect()
  const marge = 8
  const hauteurRecherche = 44
  const espaceBas = window.innerHeight - r.bottom - marge
  const espaceHaut = r.top - marge
  versLeHaut.value = espaceBas < 220 && espaceHaut > espaceBas
  const espace = versLeHaut.value ? espaceHaut : espaceBas
  hauteurListe.value = Math.max(120, Math.min(300, espace - hauteurRecherche - 8))

  const largeur = Math.min(Math.max(r.width, 240), window.innerWidth - 2 * marge)
  const gauche = Math.min(Math.max(r.left, marge), window.innerWidth - largeur - marge)
  stylePanneau.value = versLeHaut.value
    ? { left: gauche + 'px', width: largeur + 'px', bottom: window.innerHeight - r.top + 4 + 'px' }
    : { left: gauche + 'px', width: largeur + 'px', top: r.bottom + 4 + 'px' }
}

function ouvrir() {
  ouvert.value = true
  filtre.value = ''
  // Positionne la sélection sur la valeur déjà choisie
  const i = props.options.findIndex((o) => estChoisi(o))
  indexActif.value = i >= 0 ? i : 0
  positionner()
  window.addEventListener('scroll', positionner, true)
  window.addEventListener('resize', positionner)
  nextTick(() => {
    inputRecherche.value?.focus()
    rendreVisible()
  })
}

function fermer() {
  ouvert.value = false
  filtre.value = ''
  window.removeEventListener('scroll', positionner, true)
  window.removeEventListener('resize', positionner)
}

function basculer() {
  if (ouvert.value) fermer()
  else ouvrir()
}

function choisir(o) {
  if (props.multiple) {
    // Coche / décoche sans fermer la liste
    const valeurs = estChoisi(o)
      ? valeursChoisies.value.filter((v) => v !== o.value)
      : [...valeursChoisies.value, o.value]
    emit('update:modelValue', valeurs)
    emit('change', valeurs)
    if (o.value === valeurLibre.value) filtre.value = ''
    return
  }
  emit('update:modelValue', o.value)
  emit('change', o.value)
  fermer()
}

function choisirIndex() {
  const o = optionsFiltrees.value[indexActif.value]
  if (o) choisir(o)
  else if (valeurLibre.value) choisir({ value: valeurLibre.value, label: valeurLibre.value })
}

/** Fait défiler la liste pour garder l'option active visible (clavier). */
function rendreVisible() {
  nextTick(() => {
    const el = liste.value?.querySelector(`[data-index="${indexActif.value}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function descendre() {
  const max = optionsFiltrees.value.length - (valeurLibre.value ? 0 : 1)
  indexActif.value = Math.min(indexActif.value + 1, max)
  rendreVisible()
}

function monter() {
  indexActif.value = Math.max(indexActif.value - 1, 0)
  rendreVisible()
}

function onClicExterieur(e) {
  if (!ouvert.value) return
  const dansChamp = racine.value?.contains(e.target)
  const dansPanneau = panneau.value?.contains(e.target)
  if (!dansChamp && !dansPanneau) fermer()
}

onMounted(() => document.addEventListener('click', onClicExterieur))
onUnmounted(() => {
  document.removeEventListener('click', onClicExterieur)
  fermer()
})
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
  border: 1.5px solid var(--border-champ);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
  min-height: 38px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.select-search-field:hover {
  border-color: var(--primary);
}
.select-search.open .select-search-field {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(13, 116, 144, 0.18);
}
.select-search-value {
  color: var(--text);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Choix multiple : tous les examens cochés restent lisibles dans le champ */
.select-search.multiple .select-search-value {
  white-space: normal;
}
.select-search-placeholder {
  color: #64748b;
}
.select-search-arrow {
  color: var(--primary);
  font-size: 12px;
  flex-shrink: 0;
}

/* Panneau affiché au-dessus de toute la page (position écran) */
.select-search-dropdown {
  position: fixed;
  z-index: 3000;
  background: #fff;
  border: 1.5px solid var(--primary);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.28);
  overflow: hidden;
  font-size: 14px;
  text-transform: none;
}
.select-search-input {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid #d5e2df;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  background: #f5faf9;
  box-sizing: border-box;
}
.select-search-options {
  list-style: none;
  overflow-y: auto;
  margin: 0;
  padding: 4px 0;
}
.select-search-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  cursor: pointer;
  color: #1e293b;
  font-size: 14px;
  line-height: 1.35;
}
.select-search-option + .select-search-option {
  border-top: 1px solid #eef3f2;
}
.select-search-coche {
  width: 14px;
  flex-shrink: 0;
  color: var(--primary);
  font-weight: 800;
}
.select-search-case {
  width: 16px;
  height: 16px;
  margin: 0;
  flex-shrink: 0;
  accent-color: var(--primary);
  pointer-events: none;
}
.select-search-libelle {
  flex: 1;
  white-space: normal;
  word-break: break-word;
}
.select-search-option.choisi {
  font-weight: 700;
  color: var(--primary-dark);
}
.select-search-option:hover,
.select-search-option.actif {
  background: var(--primary);
  color: #fff;
}
.select-search-option:hover .select-search-coche,
.select-search-option.actif .select-search-coche {
  color: #fff;
}
.select-search-ajout {
  color: var(--primary);
  font-weight: 700;
  background: #eef8f6;
}
.select-search-vide {
  padding: 10px 12px;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
