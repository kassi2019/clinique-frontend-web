<template>
  <div class="hospitalisation-page">
    <!-- En-tête -->
    <header class="hospitalisation-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">🛏️</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Hospitalisation — admissions, chambres, lits et sorties</span>
          </div>
        </div>
        <div class="header-actions">
          <span class="date-pill">{{ todayLabel }}</span>
          <button class="btn btn-outline btn-sm btn-back" @click="router.push({ name: 'home' })">
            ← Modules
          </button>
        </div>
      </div>
    </header>

    <main class="hospitalisation-content">
      <!-- Onglets -->
      <nav class="tabs-nav">
        <button class="tab-btn" :class="{ active: onglet === 'admissions' }" @click="onglet = 'admissions'">
          Admissions
        </button>
        <button
          class="tab-btn"
          :class="{ active: onglet === 'occupation' }"
          @click="onglet = 'occupation'; chargerLits()"
        >
          Occupation
        </button>
        <button
          class="tab-btn"
          :class="{ active: onglet === 'historique' }"
          @click="onglet = 'historique'; chargerHistorique()"
        >
          Historique
        </button>
      </nav>

      <!-- ============ ADMISSIONS ============ -->
      <section v-if="onglet === 'admissions'" class="card">
        <div class="card-header"><h2>Admissions (§13)</h2></div>
        <div class="toolbar">
          <input
            v-model="recherche"
            class="search-input"
            type="text"
            placeholder="Rechercher par code patient, nom ou N° d'ordre…"
            @input="onRecherche"
          />
        </div>

        <ul v-if="resultats.length && !passageCourant" class="resultats">
          <li v-for="p in resultats" :key="p.id">
            <div class="resultat-item">
              <div>
                <strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong>
                <span>{{ p.numeroOrdre }} · code {{ p.patient.code }}</span>
                <span class="text-muted">Prescription : {{ p.consultation?.hospitalisationDuree || 'durée non précisée' }}</span>
              </div>
              <button class="btn btn-primary btn-sm" @click="choisirPassage(p)">Choisir</button>
            </div>
          </li>
        </ul>
        <div
          v-if="!passageCourant && !resultats.length && recherche.trim().length >= 2"
          class="empty-state"
        >
          Aucun passage trouvé avec une prescription d'hospitalisation.
        </div>

        <div v-if="passageCourant" class="passage-detail">
          <div class="fiche-info">
            <div class="fiche-ligne">
              <span class="fiche-label">Patient</span>
              <strong>{{ detail?.passage.patient.nom }} {{ detail?.passage.patient.prenom }}</strong>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">Code</span>
              <span class="code-chip">{{ detail?.passage.patient.code }}</span>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">N° d'ordre</span>
              <strong>{{ detail?.passage.numeroOrdre }}</strong>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">Médecin</span>
              <span>Dr {{ detail?.passage.consultation?.medecin?.personnel?.nom || '—' }}</span>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">Durée prévue</span>
              <span>{{ detail?.passage.consultation?.hospitalisationDuree || '—' }}</span>
            </div>
            <button class="btn btn-outline btn-sm btn-quitter" @click="quitterPassage">
              ✕ Autre passage
            </button>
          </div>

          <div v-if="detail?.passage.sejour" class="alert alert-success">
            🛏️ Séjour en cours : lit
            <strong>{{ detail.passage.sejour.lit?.chambre?.numero }}-{{ detail.passage.sejour.lit?.numero }}</strong>
            — entré le {{ formatDateHeure(detail.passage.sejour.dateEntree) }}
          </div>
          <template v-else>
            <h3 class="section-title">Attribution du lit</h3>
            <div class="admission-row">
              <div class="admission-select">
                <SelectSearch
                  v-model="litChoisi"
                  :options="optionsLitsLibres"
                  placeholder="— Choisir un lit disponible —"
                />
              </div>
              <button
                class="btn btn-primary"
                :disabled="!litChoisi || admissionEnCours"
                @click="admettre"
              >
                {{ admissionEnCours ? 'Admission…' : '🛏️ Admettre' }}
              </button>
            </div>
            <p class="small-note text-muted">
              Le paiement du séjour se fera à la sortie (tarif journalier × jours réels).
            </p>
          </template>

          <!-- Historique du patient -->
          <h3 class="section-title">Historique des séjours du patient</h3>
          <div v-if="historiquePatient.length === 0" class="text-muted small-note">
            Aucun séjour antérieur.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Entrée</th>
                  <th>Sortie</th>
                  <th>Lit</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in historiquePatient" :key="s.id">
                  <td>{{ formatDateHeure(s.dateEntree) }}</td>
                  <td>{{ s.dateSortie ? formatDateHeure(s.dateSortie) : '—' }}</td>
                  <td>{{ s.lit?.chambre?.numero }}-{{ s.lit?.numero }}</td>
                  <td>
                    <span class="badge" :class="s.statut === 'EN_COURS' ? 'badge-warning' : 'badge-success'">
                      {{ s.statut === 'EN_COURS' ? 'En cours' : 'Sorti' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ============ OCCUPATION ============ -->
      <section v-else-if="onglet === 'occupation'" class="card">
        <div class="card-header">
          <h2>Occupation des chambres et lits (temps réel)</h2>
          <span class="badge badge-success">{{ nbLitsLibres }} lit(s) libre(s)</span>
          <span class="badge badge-danger">{{ nbLitsOccupes }} lit(s) occupé(s)</span>
          <span class="badge badge-muted">Taux : {{ tauxOccupation }} %</span>
        </div>

        <div v-if="lits.length === 0" class="empty-state">
          Aucune chambre paramétrée — ajoutez-les dans Paramétrage → Chambres & lits.
        </div>
        <div v-else class="chambres-grid">
          <div v-for="c in chambresAvecLits" :key="c.id" class="chambre-card">
            <div class="chambre-titre">
              Chambre {{ c.numero }}
              <span v-if="c.typeChambre?.libelle" class="text-muted">({{ c.typeChambre.libelle }})</span>
              <span v-if="c.tarifJournalier" class="chambre-tarif">
                {{ Number(c.tarifJournalier).toLocaleString('fr-FR') }} F/nuit
              </span>
            </div>
            <div class="lits-grid">
              <div
                v-for="l in c.lits"
                :key="l.id"
                class="lit-card"
                :class="l.occupe ? 'lit-occupe' : 'lit-libre'"
              >
                <strong>{{ c.numero }}-{{ l.numero }}</strong>
                <span v-if="l.occupe" class="lit-patient">
                  {{ l.sejour?.patient?.nom }} {{ l.sejour?.patient?.prenom }}
                </span>
                <span v-else class="lit-libre-label">Libre</span>
              </div>
            </div>
          </div>
        </div>

        <h3 class="section-title">Séjours en cours</h3>
        <div v-if="sejoursEnCours.length === 0" class="text-muted small-note">
          Aucun patient hospitalisé actuellement.
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Lit</th>
                <th>Entrée</th>
                <th>Durée prévue</th>
                <th>Jours</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sejoursEnCours" :key="s.id">
                <td><strong>{{ s.patient.nom }} {{ s.patient.prenom }}</strong> ({{ s.patient.code }})</td>
                <td>{{ s.lit?.chambre?.numero }}-{{ s.lit?.numero }}</td>
                <td>{{ formatDateHeure(s.dateEntree) }}</td>
                <td>{{ s.dureePrevue || '—' }}</td>
                <td>{{ joursDepuis(s.dateEntree) }}</td>
                <td>
                  <div class="actions">
                    <button class="btn btn-outline btn-sm" @click="ouvrirSuivi(s)">📝 Suivi</button>
                    <button class="btn btn-danger btn-sm" @click="ouvrirSortie(s)">🚪 Sortie</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ============ HISTORIQUE ============ -->
      <section v-else class="card">
        <div class="card-header"><h2>Historique des hospitalisations (§13)</h2></div>
        <div class="toolbar">
          <input
            v-model="jourFiltre"
            type="date"
            class="search-input"
            style="max-width: 170px; flex: none"
            @change="chargerHistorique"
          />
          <input
            v-model="rechercheHisto"
            class="search-input"
            type="text"
            placeholder="Rechercher par patient ou N° d'ordre…"
            @input="onRechercheHisto"
          />
          <select v-model="statutFiltre" class="search-input" style="max-width: 150px; flex: none" @change="chargerHistorique">
            <option value="">Tous statuts</option>
            <option value="EN_COURS">En cours</option>
            <option value="SORTI">Sortis</option>
          </select>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entrée</th>
                <th>Patient</th>
                <th>N° d'ordre</th>
                <th>Lit</th>
                <th>Sortie</th>
                <th>Facture</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in historique.data" :key="s.id">
                <td>{{ formatDateHeure(s.dateEntree) }}</td>
                <td>
                  <strong>{{ s.patient.nom }} {{ s.patient.prenom }}</strong>
                  <span class="text-muted"> (code {{ s.patient.code }})</span>
                </td>
                <td>{{ s.passage?.numeroOrdre || '—' }}</td>
                <td>{{ s.lit?.chambre?.numero }}-{{ s.lit?.numero }}</td>
                <td>{{ s.dateSortie ? formatDateHeure(s.dateSortie) : '—' }}</td>
                <td>
                  <template v-if="s.statut === 'SORTI'">
                    {{ s.nbJoursFactures }} j × {{ (s.montantJournalier ?? 0).toLocaleString('fr-FR') }} F
                    <span v-if="s.ligneCaisse" class="badge" :class="s.ligneCaisse.statut === 'PAYEE' ? 'badge-success' : 'badge-warning'">
                      {{ s.ligneCaisse.statut === 'PAYEE' ? 'Payée' : 'À payer' }}
                    </span>
                  </template>
                  <span v-else class="text-muted">—</span>
                </td>
                <td>
                  <span class="badge" :class="s.statut === 'EN_COURS' ? 'badge-warning' : 'badge-success'">
                    {{ s.statut === 'EN_COURS' ? 'En cours' : 'Sorti' }}
                  </span>
                </td>
              </tr>
              <tr v-if="historique.data.length === 0">
                <td colspan="7" class="empty-state">Aucun séjour enregistré ce jour.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationBar
          v-if="historique.total > historique.perPage"
          :page="historique.page"
          :per-page="historique.perPage"
          :total="historique.total"
          :total-pages="historique.totalPages"
          @change="changerPage"
          @per-page="changerPerPage"
        />
      </section>
    </main>

    <!-- ============ Modale : suivi du séjour ============ -->
    <div v-if="suiviSejour" class="modal-backdrop">
      <div class="modal">
        <h2>📝 Suivi — {{ suiviSejour.patient.nom }} {{ suiviSejour.patient.prenom }}</h2>
        <p class="text-muted">Lit {{ suiviSejour.lit?.chambre?.numero }}-{{ suiviSejour.lit?.numero }} · entré le {{ formatDateHeure(suiviSejour.dateEntree) }}</p>
        <div class="field">
          <label>Observations</label>
          <textarea v-model="suiviForm.observations" rows="5" placeholder="Évolution, soins administrés, consignes…"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="suiviSejour = null">Annuler</button>
          <button class="btn btn-primary" :disabled="saving" @click="enregistrerSuivi">
            💾 Enregistrer le suivi
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Modale : sortie ============ -->
    <div v-if="sortieSejour" class="modal-backdrop">
      <div class="modal">
        <h2>🚪 Sortie — {{ sortieSejour.patient.nom }} {{ sortieSejour.patient.prenom }}</h2>
        <p class="text-muted">
          Entré le {{ formatDateHeure(sortieSejour.dateEntree) }} · {{ joursDepuis(sortieSejour.dateEntree) }} jour(s) de séjour.
          La facture sera créée à la caisse (tarif journalier × jours réels).
        </p>
        <div class="form-row">
          <div class="field">
            <label>Date de sortie</label>
            <input v-model="sortieForm.dateSortie" type="datetime-local" />
          </div>
          <div class="field">
            <label>Motif de sortie *</label>
            <select v-model="sortieForm.sortieMotif">
              <option value="">— Choisir —</option>
              <option value="EXEAT">Exéat</option>
              <option value="TRANSFERT">Transfert</option>
              <option value="DECES">Décès</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="sortieSejour = null">Annuler</button>
          <button
            class="btn btn-danger"
            :disabled="saving || !sortieForm.sortieMotif"
            @click="confirmerSortie"
          >
            🚪 Enregistrer la sortie
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import http from '../api/http'
import PaginationBar from '../components/PaginationBar.vue'
import SelectSearch from '../components/SelectSearch.vue'
import { useAuthStore } from '../stores/auth'
import { toastError, toastSuccess } from '../utils/notifications'

const auth = useAuthStore()
const router = useRouter()

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')

const todayLabel = computed(() =>
  new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
)

const onglet = ref('admissions')

// ---- Admissions ----
const recherche = ref('')
const resultats = ref([])
const passageCourant = ref(null)
const detail = ref(null)
let timerRecherche = null
const litChoisi = ref(null)
const admissionEnCours = ref(false)
const lits = ref([])
const saving = ref(false)

// ---- Occupation ----
let refreshTimer = null

// ---- Historique ----
const jourFiltre = ref(new Date().toISOString().slice(0, 10))
const rechercheHisto = ref('')
const statutFiltre = ref('')
const historique = ref({ data: [], total: 0, page: 1, perPage: 10, totalPages: 0 })
const page = ref(1)
const perPage = ref(10)
let timerRechercheHisto = null

// ---- Modales ----
const suiviSejour = ref(null)
const suiviForm = reactive({ observations: '' })
const sortieSejour = ref(null)
const sortieForm = reactive({ dateSortie: '', sortieMotif: '' })

const historiquePatient = computed(() => detail.value?.historique ?? [])

const chambresAvecLits = computed(() => {
  const map = new Map()
  for (const l of lits.value) {
    if (!map.has(l.chambre.id)) map.set(l.chambre.id, { ...l.chambre, lits: [] })
    map.get(l.chambre.id).lits.push(l)
  }
  return [...map.values()]
})

const optionsLitsLibres = computed(() =>
  lits.value
    .filter((l) => l.actif && l.chambre.actif && !l.occupe)
    .map((l) => ({
      value: l.id,
      label: `${l.label}${l.chambre.typeChambre?.libelle ? ` (${l.chambre.typeChambre.libelle})` : ''}`,
    })),
)

const nbLitsLibres = computed(() => lits.value.filter((l) => !l.occupe).length)
const nbLitsOccupes = computed(() => lits.value.filter((l) => l.occupe).length)
const tauxOccupation = computed(() =>
  lits.value.length === 0 ? 0 : Math.round((nbLitsOccupes.value / lits.value.length) * 100),
)

const sejoursEnCours = computed(() =>
  lits.value.filter((l) => l.occupe && l.sejour).map((l) => l.sejour),
)

function joursDepuis(d) {
  if (!d) return '—'
  const ms = Date.now() - new Date(d).getTime()
  return Math.max(0, Math.floor(ms / (24 * 3600 * 1000)))
}

// ---- Recherche admissions ----
function onRecherche() {
  clearTimeout(timerRecherche)
  timerRecherche = setTimeout(chargerRecherche, 300)
}

async function chargerRecherche() {
  const q = recherche.value.trim()
  if (q.length < 2) {
    resultats.value = []
    return
  }
  try {
    const { data } = await http.get('/hospitalisation/recherche', {
      params: { code: q, cliniqueId: cliniqueId.value },
    })
    resultats.value = data
  } catch (e) {
    toastError(e.response?.data?.message || 'Recherche impossible.')
  }
}

async function choisirPassage(p) {
  passageCourant.value = p
  resultats.value = []
  await chargerDetail()
  await chargerLits()
}

async function chargerDetail() {
  if (!passageCourant.value) return
  try {
    const { data } = await http.get(`/hospitalisation/passages/${passageCourant.value.id}`)
    detail.value = data
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger le passage.')
  }
}

function quitterPassage() {
  passageCourant.value = null
  detail.value = null
  resultats.value = []
  litChoisi.value = null
}

async function chargerLits() {
  try {
    const { data } = await http.get('/hospitalisation/lits', {
      params: { cliniqueId: cliniqueId.value },
    })
    lits.value = data
  } catch {
    /* liste vide */
  }
}

async function admettre() {
  if (!passageCourant.value || !litChoisi.value) return
  const lit = lits.value.find((l) => l.id === litChoisi.value)
  const conf = await Swal.fire({
    title: 'Confirmer l\'admission ?',
    html: `Attribuer le lit <strong>${lit?.label}</strong> à <strong>${detail.value?.passage.patient.nom} ${detail.value?.passage.patient.prenom}</strong> ?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui, admettre',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#0d9488',
    cancelButtonColor: '#64748b',
  })
  if (!conf.isConfirmed) return
  admissionEnCours.value = true
  try {
    await http.post(`/hospitalisation/passages/${passageCourant.value.id}/admissions`, {
      litId: litChoisi.value,
      motif: detail.value?.passage.consultation?.motif || undefined,
    })
    toastSuccess('Patient admis. Le paiement se fera à la sortie.')
    litChoisi.value = null
    await chargerDetail()
    await chargerLits()
  } catch (e) {
    toastError(e.response?.data?.message || 'Admission impossible.')
  } finally {
    admissionEnCours.value = false
  }
}

// ---- Suivi ----
function ouvrirSuivi(s) {
  suiviSejour.value = s
  suiviForm.observations = s.observations ?? ''
}

async function enregistrerSuivi() {
  saving.value = true
  try {
    await http.patch(`/hospitalisation/sejours/${suiviSejour.value.id}`, {
      observations: suiviForm.observations,
    })
    toastSuccess('Suivi enregistré.')
    suiviSejour.value = null
    await chargerLits()
  } catch (e) {
    toastError(e.response?.data?.message || 'Enregistrement impossible.')
  } finally {
    saving.value = false
  }
}

// ---- Sortie ----
function ouvrirSortie(s) {
  sortieSejour.value = s
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  sortieForm.dateSortie = d.toISOString().slice(0, 16)
  sortieForm.sortieMotif = ''
}

async function confirmerSortie() {
  const s = sortieSejour.value
  const conf = await Swal.fire({
    title: 'Confirmer la sortie ?',
    html: `La facture du séjour de <strong>${s.patient.nom} ${s.patient.prenom}</strong> sera créée à la caisse (tarif journalier × jours réels). Le lit sera libéré.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, sortir le patient',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
  })
  if (!conf.isConfirmed) return
  saving.value = true
  try {
    const { data } = await http.post(`/hospitalisation/sejours/${s.id}/sortie`, {
      dateSortie: sortieForm.dateSortie || undefined,
      sortieMotif: sortieForm.sortieMotif,
    })
    toastSuccess(
      `Sortie enregistrée : facture de ${data.nbJoursFactures} jour(s) créée à la caisse.`,
    )
    sortieSejour.value = null
    await chargerLits()
    if (passageCourant.value) await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Sortie impossible.')
  } finally {
    saving.value = false
  }
}

// ---- Historique ----
function onRechercheHisto() {
  clearTimeout(timerRechercheHisto)
  timerRechercheHisto = setTimeout(() => {
    page.value = 1
    chargerHistorique()
  }, 300)
}

async function chargerHistorique() {
  try {
    const { data } = await http.get('/hospitalisation/sejours', {
      params: {
        jour: jourFiltre.value,
        recherche: rechercheHisto.value.trim() || undefined,
        statut: statutFiltre.value || undefined,
        page: page.value,
        perPage: perPage.value,
        cliniqueId: cliniqueId.value,
      },
    })
    historique.value = data
  } catch (e) {
    toastError(e.response?.data?.message || "Impossible de charger l'historique.")
  }
}

function changerPage(p) {
  page.value = p
  chargerHistorique()
}

function changerPerPage(n) {
  perPage.value = n
  page.value = 1
  chargerHistorique()
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateHeure(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  await chargerLits()
  // Occupation en temps réel : rafraîchissement automatique
  refreshTimer = setInterval(() => {
    if (onglet.value === 'occupation') chargerLits()
  }, 15000)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
  clearTimeout(timerRecherche)
  clearTimeout(timerRechercheHisto)
})
</script>

<style scoped>
.hospitalisation-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
  display: flex;
  flex-direction: column;
}
.hospitalisation-header {
  background: linear-gradient(120deg, #0d9488 0%, #0f766e 55%, #115e59 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 6px 24px rgba(13, 71, 67, 0.28);
}
.header-inner {
  max-width: none;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-logo {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 13px;
}
.brand-text {
  display: flex;
  flex-direction: column;
}
.brand-text strong {
  color: #ffffff;
  font-size: 16px;
  letter-spacing: 0.02em;
}
.brand-text span {
  color: rgba(236, 253, 245, 0.75);
  font-size: 12px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.date-pill {
  padding: 5px 13px;
  font-size: 12.5px;
  font-weight: 600;
  color: #ecfdf5;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  text-transform: capitalize;
}
.btn-back {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.45);
}
.btn-back:hover {
  background: rgba(255, 255, 255, 0.16);
}

.hospitalisation-content {
  flex: 1;
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 20px 24px;
}

.tabs-nav {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
  border-bottom: 2px solid #d5eee9;
  flex-wrap: wrap;
}
.tab-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  color: #5f857f;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.tab-btn:hover {
  color: #0f766e;
}
.tab-btn.active {
  color: #0f766e;
  border-bottom-color: #0d9488;
}

.resultats {
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
}
.resultats li {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.resultats li:last-child {
  border-bottom: none;
}
.resultat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.resultat-item > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13.5px;
}

.passage-detail {
  margin-top: 16px;
}
.fiche-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  align-items: flex-end;
  background: #f0fdfa;
  border: 1px solid #c9ece5;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 16px;
}
.fiche-ligne {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13.5px;
}
.fiche-label {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
.code-chip {
  font-family: Consolas, monospace;
  font-weight: 700;
  color: #0f766e;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12.5px;
  width: fit-content;
}
.btn-quitter {
  margin-left: auto;
}

.admission-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.admission-select {
  flex: 1;
  min-width: 280px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f766e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 18px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #ddf1ee;
}
.small-note {
  font-size: 13px;
}

/* Grille d'occupation */
.chambres-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}
.chambre-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  background: #f8fdfb;
}
.chambre-titre {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 8px;
  color: #134e4a;
  display: flex;
  gap: 6px;
  align-items: baseline;
  flex-wrap: wrap;
}
.chambre-tarif {
  font-size: 12px;
  color: #0f766e;
  font-weight: 600;
  margin-left: auto;
}
.lits-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.lit-card {
  flex: 1;
  min-width: 90px;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12.5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lit-libre {
  background: #dcfce7;
  border: 1px solid #86efac;
  color: #166534;
}
.lit-occupe {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}
.lit-patient {
  font-size: 11.5px;
}
.lit-libre-label {
  font-size: 11.5px;
}
</style>
