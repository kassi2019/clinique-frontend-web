<template>
  <div class="imagerie-page">
    <!-- En-tête -->
    <header class="imagerie-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">🩻</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Imagerie — échographies et comptes rendus</span>
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

    <main class="imagerie-content">
      <!-- Onglets -->
      <nav class="tabs-nav">
        <button class="tab-btn" :class="{ active: onglet === 'examens' }" @click="onglet = 'examens'">
          Examens
        </button>
        <button
          class="tab-btn"
          :class="{ active: onglet === 'historique' }"
          @click="onglet = 'historique'; chargerHistorique()"
        >
          Historique
        </button>
      </nav>

      <!-- ============ EXAMENS ============ -->
      <section v-if="onglet === 'examens'" class="card">
        <div class="card-header"><h2>Réception des examens (§12)</h2></div>
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
                <span class="text-muted">{{ p.nbExamensIma }} examen(s) payé(s)</span>
              </div>
              <button class="btn btn-primary btn-sm" @click="choisirPassage(p)">Choisir</button>
            </div>
          </li>
        </ul>
        <div
          v-if="!passageCourant && !resultats.length && recherche.trim().length >= 2"
          class="empty-state"
        >
          Aucun passage trouvé avec un examen d'imagerie payé.
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
              <span class="fiche-label">Âge / Sexe</span>
              <span>{{ detail?.passage.patient.age ?? '—' }} ans · {{ detail?.passage.patient.sexe ?? '—' }}</span>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">N° d'ordre</span>
              <strong>{{ detail?.passage.numeroOrdre }}</strong>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">Service d'entrée</span>
              <span>{{ detail?.passage.service?.nom }}</span>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">Type</span>
              <span>{{ detail?.passage.typePatient === 'EXTERNE' ? 'Externe' : 'Interne' }}</span>
            </div>
            <div v-if="detail?.passage.referent" class="fiche-ligne">
              <span class="fiche-label">Référent</span>
              <span>{{ detail.passage.referent }}</span>
            </div>
            <div v-if="detail?.passage.prestationDemandee" class="fiche-ligne">
              <span class="fiche-label">Examen demandé</span>
              <span>{{ detail.passage.prestationDemandee }}</span>
            </div>
            <button class="btn btn-outline btn-sm btn-quitter" @click="quitterPassage">
              ✕ Autre passage
            </button>
          </div>

          <h3 class="section-title">Examens payés de ce passage</h3>
          <div v-if="lignesIma.length === 0" class="text-muted small-note">
            Aucun examen d'imagerie payé pour ce passage.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Examen</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in lignesIma" :key="l.id">
                  <td><strong>{{ l.libelle }}</strong></td>
                  <td>
                    <span class="badge" :class="badgeExamen(l.examen)">
                      {{ statutExamenLabel(l.examen) }}
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      <button
                        v-if="!l.examen || l.examen.statut !== 'VALIDE'"
                        class="btn btn-outline btn-sm"
                        @click="ouvrirCr(l)"
                      >
                        📝 Compte rendu
                      </button>
                      <button
                        v-if="l.examen && l.examen.statut === 'RESULTATS' && peutValider"
                        class="btn btn-primary btn-sm"
                        @click="validerExamen(l.examen)"
                      >
                        ✅ Valider
                      </button>
                      <button
                        v-if="l.examen && l.examen.statut === 'VALIDE'"
                        class="btn btn-outline btn-sm"
                        @click="imprimerCr(l.examen)"
                      >
                        🖨️ Compte rendu
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Historique du patient -->
          <h3 class="section-title">Historique des examens du patient</h3>
          <div v-if="historiquePatient.length === 0" class="text-muted small-note">
            Aucun examen antérieur pour ce patient.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>N° d'ordre</th>
                  <th>Examen</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in historiquePatient" :key="e.id">
                  <td>{{ formatDateHeure(e.createdAt) }}</td>
                  <td>{{ e.passage?.numeroOrdre || '—' }}</td>
                  <td>{{ e.libelle }}</td>
                  <td>
                    <span class="badge" :class="badgeExamen(e)">{{ statutExamenLabel(e) }}</span>
                  </td>
                  <td>
                    <button
                      v-if="e.statut === 'VALIDE'"
                      class="btn btn-outline btn-sm"
                      @click="imprimerCr(e)"
                    >
                      🖨️
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ============ HISTORIQUE ============ -->
      <section v-else class="card">
        <div class="card-header"><h2>Historique des examens réalisés (§12)</h2></div>
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
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>N° d'ordre</th>
                <th>Examen</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in historique.data" :key="e.id">
                <td>{{ formatDateHeure(e.createdAt) }}</td>
                <td>
                  <strong>{{ e.patient.nom }} {{ e.patient.prenom }}</strong>
                  <span class="text-muted"> (code {{ e.patient.code }})</span>
                </td>
                <td>{{ e.passage?.numeroOrdre || '—' }}</td>
                <td>{{ e.libelle }}</td>
                <td>
                  <span class="badge" :class="badgeExamen(e)">{{ statutExamenLabel(e) }}</span>
                </td>
                <td>
                  <div class="actions">
                    <button class="btn btn-outline btn-sm" @click="examenVoir = e">👁️ Voir</button>
                    <button
                      v-if="e.statut === 'VALIDE'"
                      class="btn btn-outline btn-sm"
                      @click="imprimerCr(e)"
                    >
                      🖨️
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="historique.data.length === 0">
                <td colspan="6" class="empty-state">Aucun examen enregistré ce jour.</td>
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

    <!-- ============ Modale : compte rendu (4 sections) ============ -->
    <div v-if="modaleCr" class="modal-backdrop">
      <div class="modal modal-lg">
        <h2>📝 Compte rendu — {{ crLigne?.libelle }}</h2>
        <p v-if="detail" class="text-muted">
          Patient : {{ detail.passage.patient.nom }} {{ detail.passage.patient.prenom }} · N° d'ordre
          {{ detail.passage.numeroOrdre }}
        </p>

        <div class="field">
          <label>Indication</label>
          <textarea v-model="crForm.indication" rows="2" placeholder="Motif de l'examen…"></textarea>
        </div>
        <div class="field">
          <label>Technique</label>
          <textarea v-model="crForm.technique" rows="2" placeholder="Voie d'abord, sondes, protocole…"></textarea>
        </div>
        <div class="field">
          <label>Résultat</label>
          <textarea v-model="crForm.resultat" rows="5" placeholder="Description des images et mesures…"></textarea>
        </div>
        <div class="field">
          <label>Conclusion</label>
          <textarea v-model="crForm.conclusion" rows="3" placeholder="Conclusion du compte rendu…"></textarea>
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleCr = false">Annuler</button>
          <button class="btn btn-primary" :disabled="crEnCours" @click="enregistrerCr">
            {{ crEnCours ? 'Enregistrement…' : '💾 Enregistrer le compte rendu' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Modale : voir un examen (historique) ============ -->
    <div v-if="examenVoir" class="modal-backdrop">
      <div class="modal modal-lg">
        <h2>🩻 {{ examenVoir.libelle }}</h2>
        <div class="fiche-info">
          <div class="fiche-ligne">
            <span class="fiche-label">Patient</span>
            <strong>{{ examenVoir.patient.nom }} {{ examenVoir.patient.prenom }}</strong>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">N° d'ordre</span>
            <span>{{ examenVoir.passage?.numeroOrdre || '—' }}</span>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">Statut</span>
            <span class="badge" :class="badgeExamen(examenVoir)">{{ statutExamenLabel(examenVoir) }}</span>
          </div>
        </div>

        <div v-if="examenVoir.indication" class="cr-section">
          <strong>Indication :</strong> {{ examenVoir.indication }}
        </div>
        <div v-if="examenVoir.technique" class="cr-section">
          <strong>Technique :</strong> {{ examenVoir.technique }}
        </div>
        <div v-if="examenVoir.resultat" class="cr-section">
          <strong>Résultat :</strong> {{ examenVoir.resultat }}
        </div>
        <div v-if="examenVoir.conclusion" class="cr-section">
          <strong>Conclusion :</strong> {{ examenVoir.conclusion }}
        </div>
        <div v-if="!examenVoir.indication && !examenVoir.technique && !examenVoir.resultat && !examenVoir.conclusion" class="empty-state">
          Compte rendu non encore saisi.
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" @click="examenVoir = null">Fermer</button>
          <button
            v-if="examenVoir.statut === 'VALIDE'"
            class="btn btn-primary"
            @click="imprimerCr(examenVoir)"
          >
            🖨️ Imprimer le compte rendu
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Aperçu du compte rendu (flottant) ============ -->
    <div v-if="apercuVisible" class="apercu-voile"></div>
    <div v-if="apercuVisible" class="apercu-barre">
      <span>👁️ Aperçu du compte rendu — vérifiez avant d'imprimer</span>
      <div class="apercu-barre-actions">
        <button class="btn btn-primary btn-sm" @click="imprimerNavigateur">🖨️ Imprimer</button>
        <button class="btn btn-outline btn-sm btn-back" @click="apercuVisible = false">
          Fermer
        </button>
      </div>
    </div>

    <!-- ============ Compte rendu A4 (impression navigateur) ============ -->
    <div v-if="cr" id="ima-print" :class="{ 'apercu-flottant': apercuVisible }">
      <div class="ima-a4">
        <div class="ima-a4-head">
          <h1>{{ cliniqueNom }}</h1>
          <p v-if="cliniqueAdresse">{{ cliniqueAdresse }}</p>
        </div>
        <div class="ima-a4-titre">Compte rendu d'examen d'imagerie</div>

        <div class="ima-a4-info">
          <div class="ima-a4-ligne">
            <span class="ima-a4-label">Patient</span>
            <span>
              <strong>{{ cr.patient.nom }} {{ cr.patient.prenom }}</strong>
              <span v-if="cr.patient.age || cr.patient.sexe">
                ({{ cr.patient.age ?? '—' }} ans, {{ cr.patient.sexe ?? '—' }})
              </span>
            </span>
          </div>
          <div class="ima-a4-ligne">
            <span class="ima-a4-label">Code patient</span>
            <span>{{ cr.patient.code }}</span>
          </div>
          <div class="ima-a4-ligne">
            <span class="ima-a4-label">N° d'ordre</span>
            <span>{{ cr.numeroOrdre }}</span>
          </div>
        </div>

        <div class="ima-a4-section">Examen — {{ cr.examen.libelle }}</div>

        <template v-if="cr.examen.indication">
          <div class="ima-a4-section">Indication</div>
          <p class="ima-a4-texte">{{ cr.examen.indication }}</p>
        </template>
        <template v-if="cr.examen.technique">
          <div class="ima-a4-section">Technique</div>
          <p class="ima-a4-texte">{{ cr.examen.technique }}</p>
        </template>
        <template v-if="cr.examen.resultat">
          <div class="ima-a4-section">Résultat</div>
          <p class="ima-a4-texte">{{ cr.examen.resultat }}</p>
        </template>
        <template v-if="cr.examen.conclusion">
          <div class="ima-a4-section">Conclusion</div>
          <p class="ima-a4-texte">{{ cr.examen.conclusion }}</p>
        </template>

        <div class="ima-a4-ligne">
          <span class="ima-a4-label">Validation</span>
          <span v-if="cr.examen.valideLe">
            Validé le {{ formatDateHeure(cr.examen.valideLe) }} par
            {{ nomAgent(cr.examen.validePar) }}
          </span>
          <span v-else>Compte rendu en attente de validation</span>
        </div>

        <div class="ima-a4-sign">
          <div class="ima-a4-sign-date">Fait le {{ formatDate(new Date()) }}</div>
          <div class="ima-a4-sign-doc">
            <p>Le Médecin radiologue</p>
            <div class="ima-a4-cachet">Signature et cachet</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import http from '../api/http'
import PaginationBar from '../components/PaginationBar.vue'
import { useAuthStore } from '../stores/auth'
import { toastError, toastSuccess } from '../utils/notifications'

const auth = useAuthStore()
const router = useRouter()

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')
const cliniqueAdresse = ref('')

const todayLabel = computed(() => {
  const d = new Date()
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

// Habilitation : la validation du compte rendu peut être restreinte par le rôle
const peutValider = computed(() => {
  const mods = auth.user?.role?.modules ?? []
  if (mods.length === 0) return true // rôle sans restriction de modules
  const m = mods.find((x) => x.code === 'IMAGERIE')
  return m ? m.validation !== false : false
})

const onglet = ref('examens')

// ---- Onglet examens ----
const recherche = ref('')
const resultats = ref([])
const passageCourant = ref(null)
const detail = ref(null)
let timerRecherche = null

// ---- Modale compte rendu ----
const modaleCr = ref(false)
const crLigne = ref(null)
const crForm = reactive({ indication: '', technique: '', resultat: '', conclusion: '' })
const crEnCours = ref(false)

// ---- Historique ----
const jourFiltre = ref(new Date().toISOString().slice(0, 10))
const rechercheHisto = ref('')
const historique = ref({ data: [], total: 0, page: 1, perPage: 10, totalPages: 0 })
const page = ref(1)
const perPage = ref(10)
let timerRechercheHisto = null
const examenVoir = ref(null)

// ---- Compte rendu A4 + aperçu ----
const cr = ref(null)
const apercuVisible = ref(false)

/** Prestations IMA payées du passage courant (examen associé rattaché par ligne). */
const lignesIma = computed(() => {
  if (!detail.value) return []
  const examens = detail.value.passage.examens ?? []
  const parPrestation = new Map(examens.map((e) => [e.passagePrestationId, e]))
  return detail.value.passage.prestations
    .filter(
      (l) =>
        l.statut === 'PAYEE' &&
        (l.service?.code === 'IMA' || l.prestation?.type === 'IMAGERIE' || parPrestation.has(l.id)),
    )
    .map((l) => ({ ...l, examen: parPrestation.get(l.id) ?? null }))
})

const historiquePatient = computed(() => detail.value?.historique ?? [])

// ---- Recherche (debounce 300 ms) ----
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
    const { data } = await http.get('/imagerie/recherche', {
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
}

async function chargerDetail() {
  if (!passageCourant.value) return
  try {
    const { data } = await http.get(`/imagerie/passages/${passageCourant.value.id}`)
    detail.value = data
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger le passage.')
  }
}

function quitterPassage() {
  passageCourant.value = null
  detail.value = null
  resultats.value = []
  apercuVisible.value = false
  cr.value = null
}

// ---- Compte rendu (4 sections) ----
function ouvrirCr(ligne) {
  crLigne.value = ligne
  const e = ligne.examen
  crForm.indication = e?.indication ?? ''
  crForm.technique = e?.technique ?? ''
  crForm.resultat = e?.resultat ?? ''
  crForm.conclusion = e?.conclusion ?? ''
  modaleCr.value = true
}

async function enregistrerCr() {
  if (!passageCourant.value || !crLigne.value) return
  crEnCours.value = true
  try {
    await http.post(`/imagerie/passages/${passageCourant.value.id}/examens`, {
      passagePrestationId: crLigne.value.id,
      indication: crForm.indication,
      technique: crForm.technique,
      resultat: crForm.resultat,
      conclusion: crForm.conclusion,
    })
    toastSuccess('Compte rendu enregistré.')
    modaleCr.value = false
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || "Impossible d'enregistrer le compte rendu.")
  } finally {
    crEnCours.value = false
  }
}

// ---- Validation ----
async function validerExamen(examen) {
  const conf = await Swal.fire({
    title: 'Valider le compte rendu ?',
    html: `Le compte rendu de <strong>${examen.libelle}</strong> sera définitivement validé (verrouillé).`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, valider',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#0d9488',
    cancelButtonColor: '#64748b',
  })
  if (!conf.isConfirmed) return
  try {
    await http.post(`/imagerie/examens/${examen.id}/valider`)
    toastSuccess('Compte rendu validé.')
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Validation impossible.')
  }
}

// ---- Impression du compte rendu (aperçu flottant + A4 navigateur) ----
function imprimerCr(examen) {
  const patient =
    detail.value?.passage.patient ?? examen.patient ?? null
  if (!patient) return
  cr.value = {
    examen,
    patient,
    numeroOrdre:
      detail.value?.passage.numeroOrdre ?? examen.passage?.numeroOrdre ?? '—',
  }
  apercuVisible.value = true
  nextTick(() => {
    // l'impression se fait depuis la barre d'aperçu
  })
}

function imprimerNavigateur() {
  window.print()
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
    const { data } = await http.get('/imagerie/examens', {
      params: {
        jour: jourFiltre.value,
        recherche: rechercheHisto.value.trim() || undefined,
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

// ---- Helpers ----
function statutExamenLabel(examen) {
  if (!examen) return 'À traiter'
  if (examen.statut === 'RESULTATS') return 'Résultats saisis'
  return 'Validé'
}

function badgeExamen(examen) {
  if (!examen) return 'badge-muted'
  if (examen.statut === 'RESULTATS') return 'badge-warning'
  return 'badge-success'
}

function nomAgent(u) {
  const p = u?.personnel
  return p ? `${p.prenom} ${p.nom}` : '—'
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
  // Adresse de la clinique pour l'en-tête du compte rendu
  try {
    const { data } = await http.get('/cliniques', { params: { perPage: 0 } })
    const liste = Array.isArray(data) ? data : data.data ?? []
    if (liste.length > 0) cliniqueAdresse.value = liste[0].adresse ?? ''
  } catch {
    /* l'adresse est facultative */
  }
})

onUnmounted(() => {
  clearTimeout(timerRecherche)
  clearTimeout(timerRechercheHisto)
})
</script>

<style scoped>
.imagerie-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
  display: flex;
  flex-direction: column;
}
.imagerie-header {
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

.imagerie-content {
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

/* Modale compte rendu */
.modal-lg {
  max-width: 860px;
}
.cr-section {
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 13.5px;
  white-space: pre-wrap;
}

/* ---------- Aperçu flottant + compte rendu A4 ---------- */
@media screen {
  #ima-print {
    position: fixed;
    left: -10000px;
    top: 0;
  }
  #ima-print.apercu-flottant {
    left: 50% !important;
    transform: translateX(-50%);
    top: 62px;
    z-index: 150;
    max-height: calc(100vh - 82px);
    overflow-y: auto;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
  }
}
.apercu-voile {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  z-index: 140;
}
.apercu-barre {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 160;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  background: #134e4a;
  color: #ecfdf5;
  font-size: 13.5px;
  flex-wrap: wrap;
}
.apercu-barre-actions {
  display: flex;
  gap: 8px;
}
.apercu-barre .btn-back {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.45);
}
.apercu-barre .btn-back:hover {
  background: rgba(255, 255, 255, 0.16);
}

@page {
  size: A4;
  margin: 16mm 14mm;
}
.ima-a4 {
  width: 210mm;
  max-width: 100%;
  margin: 0 auto;
  background: #fff;
  padding: 8mm 10mm;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #111;
  font-size: 11px;
  line-height: 1.35;
}
.ima-a4-head {
  text-align: center;
  margin-bottom: 4px;
}
.ima-a4-head h1 {
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}
.ima-a4-head p {
  font-size: 10.5px;
  margin: 1px 0 0;
  color: #333;
}
.ima-a4-titre {
  text-align: center;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 6px;
  text-decoration: underline;
}
.ima-a4-info {
  margin-bottom: 4px;
}
.ima-a4-ligne {
  display: flex;
  gap: 10px;
  font-size: 11px;
  margin: 3px 0;
  line-height: 1.45;
}
.ima-a4-label {
  font-weight: 700;
  min-width: 110px;
  flex-shrink: 0;
}
.ima-a4-section {
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #111;
  margin: 7px 0 3px;
  padding-bottom: 1px;
}
.ima-a4-texte {
  font-size: 11px;
  margin: 1px 0 3px;
  white-space: pre-wrap;
}
.ima-a4-sign {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
}
.ima-a4-sign-date {
  font-size: 11px;
  align-self: center;
}
.ima-a4-sign-doc {
  text-align: center;
  font-size: 11px;
}
.ima-a4-sign-doc p {
  margin: 0 0 2px;
  font-weight: 600;
}
.ima-a4-cachet {
  border: 1px solid #111;
  border-radius: 6px;
  width: 160px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #555;
  font-style: italic;
}
@media print {
  .ima-a4 {
    width: 100%;
    padding: 0;
    margin: 0;
  }
  .ima-a4-head,
  .ima-a4-titre,
  .ima-a4-info,
  .ima-a4-section,
  .ima-a4-texte,
  .ima-a4-sign {
    page-break-inside: avoid;
  }
}
</style>
