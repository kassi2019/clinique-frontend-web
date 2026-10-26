<template>
  <div ref="racine" class="date-saisie" :class="{ invalide }" :style="$attrs.style">
    <!--
      Saisie rapide au clavier : on tape seulement les chiffres (« 12031985 » ou « 120385 »),
      les « / » se placent tout seuls. Le bouton 📅 ouvre un panneau en 3 parties :
      années en haut, mois au milieu, jours en bas (une date en 3 ou 4 clics).
    -->
    <input
      ref="champ"
      v-bind="attrsChamp"
      :value="texte"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      :placeholder="mensuel ? 'MM/AAAA' : 'JJ/MM/AAAA'"
      :maxlength="mensuel ? 7 : 10"
      @input="onInput"
      @blur="onBlur"
      @keydown.esc="fermer"
    />
    <button type="button" class="date-saisie-cal" title="Ouvrir le calendrier" tabindex="-1" @click="basculer">
      📅
    </button>

    <Teleport to="body">
      <div v-if="ouvert" ref="panneau" class="ds-panneau" :style="stylePanneau" @keydown.esc="fermer">
        <!-- ── 1. Années : décennie puis année ── -->
        <section class="ds-bloc">
          <div class="ds-titre">Année</div>
          <div class="ds-decennies">
            <button
              v-for="d in decennies"
              :key="d"
              type="button"
              class="ds-btn ds-decennie"
              :class="{ courante: d === decennie }"
              :title="`Années ${d} à ${d + 9}`"
              @click="decennie = d"
            >
              {{ d }}–{{ String(d + 9).slice(2) }}
            </button>
          </div>
          <div class="ds-grille ds-annees">
            <button
              v-for="a in anneesDecennie"
              :key="a"
              type="button"
              class="ds-btn"
              :class="{ actif: a === annee }"
              :disabled="!anneePossible(a)"
              @click="annee = a"
            >
              {{ a }}
            </button>
          </div>
        </section>

        <!-- ── 2. Mois ── -->
        <section class="ds-bloc">
          <div class="ds-titre">Mois</div>
          <div class="ds-grille ds-mois">
            <button
              v-for="(nom, i) in MOIS"
              :key="nom"
              type="button"
              class="ds-btn"
              :class="{ actif: i + 1 === mois }"
              :disabled="!moisPossible(i + 1)"
              @click="choisirMois(i + 1)"
            >
              {{ nom }}
            </button>
          </div>
        </section>

        <!-- ── 3. Jours : un clic enregistre la date ── -->
        <section v-if="!mensuel" class="ds-bloc">
          <div class="ds-titre">
            Jour <span class="ds-rappel">{{ MOIS_LONGS[mois - 1] }} {{ annee }}</span>
          </div>
          <div class="ds-grille ds-jours">
            <span v-for="(j, i) in JOURS_SEMAINE" :key="'s' + i" class="ds-entete">{{ j }}</span>
            <span v-for="n in decalage" :key="'vide' + n"></span>
            <button
              v-for="j in nbJours"
              :key="j"
              type="button"
              class="ds-btn"
              :class="{ actif: estChoisi(j), aujourdhui: estAujourdhui(j) }"
              :disabled="!jourPossible(j)"
              @click="choisirJour(j)"
            >
              {{ j }}
            </button>
          </div>
        </section>

        <div class="ds-pied">
          <button v-if="!naissance && datePossible(isoDuJour())" type="button" class="ds-lien" @click="choisirAujourdhui">
            {{ mensuel ? 'Ce mois-ci' : "Aujourd'hui" }}
          </button>
          <button v-if="modelValue" type="button" class="ds-lien" @click="effacer">Effacer</button>
          <button type="button" class="ds-lien ds-fermer" @click="fermer">Fermer</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, useAttrs, watch } from 'vue'

// class, title, required… vont sur le champ texte ; le style (largeur dans une barre d'outils) sur le cadre
defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: '' }, // AAAA-MM-JJ (format de l'API)
  // Date de naissance : « 85 » → 1985, « 03 » → 2003 (jamais dans le futur) ; sinon toujours 20xx
  naissance: { type: Boolean, default: false },
  min: { type: String, default: '' }, // AAAA-MM-JJ
  max: { type: String, default: '' }, // AAAA-MM-JJ
  // Mois seul (remplace <input type="month">) : valeur AAAA-MM, saisie MM/AAAA, panneau sans les jours
  mensuel: { type: Boolean, default: false },
})
// « change » : comme un <input type="date">, émis quand la date (complète ou vidée) change
const emit = defineEmits(['update:modelValue', 'change'])

const MOIS = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const JOURS_SEMAINE = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const attrs = useAttrs()
const attrsChamp = computed(() => {
  const { style, ...reste } = attrs
  return reste
})

const racine = ref(null)
const champ = ref(null)
const panneau = ref(null)
const texte = ref('')
const invalide = ref(false)

/** AAAA-MM-JJ → JJ/MM/AAAA */
function versTexte(iso) {
  if (props.mensuel) {
    const mm = /^(\d{4})-(\d{2})/.exec(iso ?? '')
    return mm ? `${mm[2]}/${mm[1]}` : ''
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

function isoDe(a, m, j) {
  return `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`
}

function isoDuJour() {
  const d = new Date()
  return isoDe(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/** Date permise : bornes min / max, et jamais dans le futur pour une naissance. */
function datePossible(iso) {
  if (iso < '1900-01-01') return false
  if (props.naissance && iso > isoDuJour()) return false
  if (props.min && iso < props.min) return false
  if (props.max && iso > props.max) return false
  return true
}

/** Chiffres tapés → « JJ/MM/AAAA » partiel, barres placées automatiquement. */
function formater(chiffres) {
  if (chiffres.length <= 2) return chiffres
  if (props.mensuel) return `${chiffres.slice(0, 2)}/${chiffres.slice(2)}`
  if (chiffres.length <= 4) return `${chiffres.slice(0, 2)}/${chiffres.slice(2)}`
  return `${chiffres.slice(0, 2)}/${chiffres.slice(2, 4)}/${chiffres.slice(4)}`
}

/** Chiffres complets (JJMMAA ou JJMMAAAA) → AAAA-MM-JJ, ou '' si la date n'existe pas. */
function versIso(chiffres) {
  if (props.mensuel) {
    // MMAAAA, ou MMAA → 20AA
    if (chiffres.length !== 4 && chiffres.length !== 6) return ''
    const m = Number(chiffres.slice(0, 2))
    const a = Number(chiffres.slice(2)) + (chiffres.length === 4 ? 2000 : 0)
    if (m < 1 || m > 12 || a < 1900) return ''
    return `${a}-${String(m).padStart(2, '0')}`
  }
  if (chiffres.length !== 6 && chiffres.length !== 8) return ''
  const j = Number(chiffres.slice(0, 2))
  const m = Number(chiffres.slice(2, 4))
  let a = Number(chiffres.slice(4))
  if (chiffres.length === 6) {
    const anneeCourte = new Date().getFullYear() % 100
    a += props.naissance && a > anneeCourte ? 1900 : 2000
  }
  const d = new Date(a, m - 1, j)
  if (d.getFullYear() !== a || d.getMonth() !== m - 1 || d.getDate() !== j) return ''
  const iso = isoDe(a, m, j)
  return datePossible(iso) ? iso : ''
}

function emettre(iso) {
  invalide.value = false
  if (iso !== (props.modelValue || '')) {
    emit('update:modelValue', iso)
    emit('change', iso)
  }
  texte.value = versTexte(iso)
}

function onInput(e) {
  const chiffres = e.target.value.replace(/\D/g, '').slice(0, props.mensuel ? 6 : 8)
  texte.value = formater(chiffres)
  e.target.value = texte.value
  invalide.value = false
  if (!chiffres) return emettre('')
  // Date complète sur 8 chiffres : enregistrée aussitôt (l'âge se calcule pendant la frappe)
  if (chiffres.length === (props.mensuel ? 6 : 8)) {
    const iso = versIso(chiffres)
    if (iso) emettre(iso)
    else invalide.value = true
  }
}

/** En quittant le champ : année sur 2 chiffres complétée, date impossible signalée. */
function onBlur() {
  const chiffres = texte.value.replace(/\D/g, '')
  if (!chiffres) return
  const iso = versIso(chiffres)
  if (iso) emettre(iso)
  else invalide.value = true
}

// ── Panneau Années / Mois / Jours ──
const ouvert = ref(false)
const stylePanneau = ref({})
const annee = ref(new Date().getFullYear())
const mois = ref(new Date().getMonth() + 1)
const decennie = ref(0)

const anneeMin = computed(() => {
  if (props.min) return Number(props.min.slice(0, 4))
  return props.naissance ? new Date().getFullYear() - 110 : new Date().getFullYear() - 10
})
const anneeMax = computed(() => {
  if (props.max) return Number(props.max.slice(0, 4))
  return props.naissance ? new Date().getFullYear() : new Date().getFullYear() + 20
})
const decennies = computed(() => {
  const liste = []
  for (let d = Math.floor(anneeMin.value / 10) * 10; d <= anneeMax.value; d += 10) liste.push(d)
  return liste
})
const anneesDecennie = computed(() => Array.from({ length: 10 }, (_, i) => decennie.value + i))

function anneePossible(a) {
  return a >= anneeMin.value && a <= anneeMax.value
}
function moisPossible(m) {
  const dernier = new Date(annee.value, m, 0).getDate()
  return datePossible(isoDe(annee.value, m, dernier)) || datePossible(isoDe(annee.value, m, 1))
}
function jourPossible(j) {
  return datePossible(isoDe(annee.value, mois.value, j))
}

const nbJours = computed(() => new Date(annee.value, mois.value, 0).getDate())
// Nombre de cases vides avant le 1er du mois (semaine commençant le lundi)
const decalage = computed(() => (new Date(annee.value, mois.value - 1, 1).getDay() + 6) % 7)

function estChoisi(j) {
  return props.modelValue === isoDe(annee.value, mois.value, j)
}
function estAujourdhui(j) {
  return isoDuJour() === isoDe(annee.value, mois.value, j)
}

// L'année choisie entraîne sa décennie ; un mois devenu impossible (futur…) est ramené au dernier possible
watch(annee, (a) => {
  decennie.value = Math.floor(a / 10) * 10
  if (!moisPossible(mois.value)) {
    for (let m = 12; m >= 1; m--) if (moisPossible(m)) return (mois.value = m)
  }
})

function choisirJour(j) {
  emettre(isoDe(annee.value, mois.value, j))
  fermer()
  champ.value?.focus()
}
/** Mois : en mode « mois seul », le clic enregistre (pas de jour à choisir). */
function choisirMois(m) {
  mois.value = m
  if (props.mensuel) {
    emettre(isoDe(annee.value, m, 1).slice(0, 7))
    fermer()
  }
}

function choisirAujourdhui() {
  emettre(props.mensuel ? isoDuJour().slice(0, 7) : isoDuJour())
  fermer()
}
function effacer() {
  emettre('')
  fermer()
}

/** Place le panneau sous le champ (ou au-dessus s'il manque de place en bas). */
function positionner() {
  const r = racine.value?.getBoundingClientRect()
  if (!r) return
  const marge = 8
  const largeur = Math.min(340, window.innerWidth - 2 * marge)
  const hauteur = panneau.value?.offsetHeight || 470
  const gauche = Math.min(Math.max(r.left, marge), window.innerWidth - largeur - marge)
  const enBas = window.innerHeight - r.bottom - marge >= hauteur || r.top < hauteur
  const haut = enBas
    ? Math.min(r.bottom + 4, window.innerHeight - hauteur - marge)
    : r.top - hauteur - 4
  stylePanneau.value = { left: gauche + 'px', top: Math.max(marge, haut) + 'px', width: largeur + 'px' }
}

function ouvrir() {
  // Repart de la date saisie ; sinon d'une année probable (30 ans pour une naissance)
  const m = /^(\d{4})-(\d{2})/.exec(props.modelValue ?? '')
  const maintenant = new Date()
  annee.value = m ? Number(m[1]) : props.naissance ? maintenant.getFullYear() - 30 : maintenant.getFullYear()
  annee.value = Math.min(Math.max(annee.value, anneeMin.value), anneeMax.value)
  mois.value = m ? Number(m[2]) : maintenant.getMonth() + 1
  decennie.value = Math.floor(annee.value / 10) * 10
  if (!moisPossible(mois.value)) mois.value = props.naissance ? 1 : mois.value
  ouvert.value = true
  positionner()
  nextTick(positionner)
  window.addEventListener('scroll', positionner, true)
  window.addEventListener('resize', positionner)
  document.addEventListener('mousedown', onClicExterieur)
}

function fermer() {
  if (!ouvert.value) return
  ouvert.value = false
  window.removeEventListener('scroll', positionner, true)
  window.removeEventListener('resize', positionner)
  document.removeEventListener('mousedown', onClicExterieur)
}

function basculer() {
  if (ouvert.value) fermer()
  else ouvrir()
}

function onClicExterieur(e) {
  if (racine.value?.contains(e.target) || panneau.value?.contains(e.target)) return
  fermer()
}

onUnmounted(fermer)

// Valeur fournie de l'extérieur (âge saisi, fiche chargée…) : le texte suit
watch(
  () => props.modelValue,
  (iso) => {
    const actuel = versIso(texte.value.replace(/\D/g, ''))
    if (iso !== actuel) {
      texte.value = versTexte(iso)
      invalide.value = false
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.date-saisie {
  position: relative;
  display: flex;
  align-items: center;
}
.date-saisie input[type='text'] {
  width: 100%;
  min-width: 0; /* .search-input impose 220px : le champ reste dans son cadre */
  padding-right: 40px;
  letter-spacing: 0.5px;
}
.date-saisie.invalide input[type='text'] {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}
.date-saisie-cal {
  position: absolute;
  right: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  line-height: 1;
}

/* ── Panneau Années / Mois / Jours (affiché au-dessus de toute la page) ── */
.ds-panneau {
  position: fixed;
  z-index: 3000;
  background: #fff;
  border: 1.5px solid var(--primary);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.28);
  padding: 10px 12px 8px;
  font-size: 13px;
  text-transform: none;
}
.ds-bloc + .ds-bloc {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e2ebe9;
}
.ds-titre {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--primary);
  margin-bottom: 5px;
}
.ds-rappel {
  margin-left: 6px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-muted, #64748b);
}
.ds-grille {
  display: grid;
  gap: 3px;
}
.ds-decennies {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
  margin-bottom: 5px;
}
.ds-decennies .ds-btn {
  padding: 3px 2px;
  font-size: 12px;
}
.ds-annees {
  grid-template-columns: repeat(5, 1fr);
}
.ds-mois {
  grid-template-columns: repeat(6, 1fr);
}
.ds-jours {
  grid-template-columns: repeat(7, 1fr);
}
.ds-entete {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted, #64748b);
}
.ds-btn {
  border: 1px solid #dbe6e4;
  background: #f8fbfa;
  border-radius: 6px;
  padding: 5px 2px;
  font: inherit;
  color: #1e293b;
  cursor: pointer;
  text-align: center;
}
.ds-btn:hover:not(:disabled) {
  border-color: var(--primary);
  background: #e6f4f1;
}
.ds-btn.actif {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  font-weight: 700;
}
.ds-btn.aujourdhui:not(.actif) {
  border-color: var(--primary);
  font-weight: 700;
}
/* Décennie affichée : surlignage léger (seule l'année choisie est en couleur pleine) */
.ds-btn.ds-decennie.courante {
  background: #e6f4f1;
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 700;
}
.ds-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.ds-pied {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
.ds-lien {
  border: none;
  background: none;
  color: var(--primary);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 0;
}
.ds-fermer {
  color: var(--text-muted, #64748b);
}
</style>
