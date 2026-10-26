<template>
  <div class="soins-page">
    <!-- En-tête -->
    <header class="soins-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">💉</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Soins — prescriptions et réalisation des soins</span>
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

    <main class="soins-content">
      <!-- Onglets -->
      <nav class="tabs-nav">
        <button
          class="tab-btn"
          :class="{ active: onglet === 'file' }"
          @click="onglet = 'file'; chargerFile()"
        >
          File d'attente
        </button>
        <button class="tab-btn" :class="{ active: onglet === 'recherche' }" @click="onglet = 'recherche'">
          Recherche
        </button>
        <button
          class="tab-btn"
          :class="{ active: onglet === 'historique' }"
          @click="onglet = 'historique'; chargerHistorique()"
        >
          Historique
        </button>
      </nav>

      <!-- ============ FILE D'ATTENTE (par ordre d'arrivée) ============ -->
      <section v-if="onglet === 'file'" class="card">
        <div class="card-header">
          <h2>Patients à traiter — par ordre d'arrivée</h2>
          <button class="btn btn-outline btn-sm" @click="chargerFile">🔄 Actualiser</button>
        </div>
        <div v-if="!file.length" class="empty-state">Aucun patient en attente de soins.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>N° d'ordre</th>
                <th>Heure d'arrivée</th>
                <th>Soins</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in file" :key="p.id">
                <td>{{ i + 1 }}</td>
                <td><strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong></td>
                <td>{{ p.numeroOrdre }}</td>
                <td>{{ new Date(p.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}</td>
                <td>{{ p.nbSoins }}</td>
                <td>
                  <button class="btn btn-primary btn-sm" @click="choisirPassage(p)">💉 Traitement</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ============ RECHERCHE ============ -->
      <section v-else-if="onglet === 'recherche'" class="card">
        <div class="card-header"><h2>Réception des soins</h2></div>
        <div class="toolbar">
          <input
            v-model="recherche"
            class="search-input"
            type="text"
            placeholder="Rechercher par code dossier patient, nom ou N° d'ordre…"
            @input="onRecherche"
          />
        </div>

        <ul v-if="resultats.length && !passageCourant" class="resultats">
          <li v-for="p in resultats" :key="p.id">
            <div class="resultat-item">
              <div>
                <strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong>
                <span>{{ p.numeroOrdre }} · code {{ p.patient.code }}</span>
                <span class="text-muted">{{ p.nbSoins }} soin(s) à faire</span>
              </div>
              <button class="btn btn-primary btn-sm" @click="choisirPassage(p)">Choisir</button>
            </div>
          </li>
        </ul>
        <div
          v-if="!passageCourant && !resultats.length && recherche.trim().length >= 2"
          class="empty-state"
        >
          Aucun passage trouvé avec un soin.
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
            <button class="btn btn-outline btn-sm btn-quitter" @click="quitterPassage">
              ✕ Autre passage
            </button>
          </div>

          <!-- Soins prescrits par le médecin : la prescription complète, à suivre telle quelle -->
          <template v-if="prescrits.length">
            <h3 class="section-title">Soins prescrits par le médecin</h3>
            <div
              v-for="s in prescrits"
              :key="s.id"
              class="soin-carte"
              :class="{ 'soin-clos': s.statut !== 'EN_COURS' }"
            >
              <div class="soin-carte-tete">
                <strong class="soin-type">💉 {{ s.typeSoin }}</strong>
                <span class="badge" :class="badgeStatutSoin(s.statut)">{{ libelleStatutSoin(s.statut) }}</span>
                <span class="soin-progression">
                  {{ s.administrations.length }}/{{ s.nbAdministrations }} administration(s)
                </span>
              </div>

              <div v-if="s.lignes.length" class="table-wrap">
                <table class="soin-medics">
                  <thead>
                    <tr>
                      <th>Médicament</th>
                      <th>Quantité par prise</th>
                      <th>Voie</th>
                      <th>Posologie</th>
                      <th>Pharmacie</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="l in s.lignes" :key="l.id">
                      <td><strong>{{ l.medicamentNom }}</strong><span v-if="l.forme" class="text-muted"> ({{ l.forme }})</span></td>
                      <td class="soin-dose">{{ l.dose }} {{ l.unite }}</td>
                      <td>{{ libelleVoie(l.voie) || '—' }}</td>
                      <td>{{ l.posologie || '—' }}</td>
                      <td>
                        <span v-if="(l.prescription?._count.lignes ?? 0) > 0" class="badge badge-success">✓ Délivré</span>
                        <span v-else class="badge badge-warning">À retirer : {{ l.quantitePharmacie }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p class="soin-rythme">
                🕒 <strong>{{ s.foisParJour }} fois par jour</strong> pendant
                <strong>{{ s.dureeJours }} jour(s)</strong>
              </p>
              <p v-if="s.instructions" class="soin-instructions">📝 {{ s.instructions }}</p>
              <p class="text-muted small-note">
                Prescrit par {{ nomAgent(s.medecin) }} le {{ formatDateHeure(s.createdAt) }}
                <span v-if="s.ordonnance"> · ordonnance pharmacie {{ s.ordonnance.numero }}</span>
                <span v-if="s.administrations[0]">
                  · dernière administration : {{ formatDateHeure(s.administrations[0].date) }}
                  par {{ nomAgent(s.administrations[0].agent) }}
                </span>
              </p>
              <button v-if="s.statut === 'EN_COURS'" class="btn btn-primary btn-sm" @click="ouvrirAdministration(s)">
                ✓ Confirmer l'administration ({{ s.administrations.length + 1 }}/{{ s.nbAdministrations }})
              </button>
            </div>
          </template>

          <h3 v-if="lignesSoins.length || !prescrits.length" class="section-title">Soins payés de ce passage</h3>
          <div v-if="lignesSoins.length === 0 && !prescrits.length" class="text-muted small-note">
            Aucun soin pour ce passage.
          </div>
          <div v-else-if="lignesSoins.length" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Soin</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in lignesSoins" :key="l.id">
                  <td><strong>{{ l.libelle }}</strong></td>
                  <td>
                    <span class="badge" :class="badgeSoin(l.soin)">
                      {{ statutSoinLabel(l.soin) }}
                    </span>
                    <span v-if="l.soin" class="text-muted">
                      · {{ l.soin.realisations.length }} réalisation(s)
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-primary btn-sm" @click="ouvrirRealisation(l)">
                        💉 Réaliser
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <template v-if="toutesRealisations.length">
            <h3 class="section-title">Réalisations de ce passage</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Soin</th>
                    <th>Agent</th>
                    <th>Observations</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in toutesRealisations" :key="r.id">
                    <td>{{ formatDateHeure(r.date) }}</td>
                    <td>{{ r.soin?.libelle ?? '—' }}</td>
                    <td>{{ nomAgent(r.agent) }}</td>
                    <td class="obs-cell">{{ r.observations || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </section>

      <!-- ============ HISTORIQUE ============ -->
      <section v-else-if="onglet === 'historique'" class="card">
        <div class="card-header"><h2>Historique des soins réalisés</h2></div>
        <div class="toolbar">
          <DateSaisie
            v-model="jourFiltre"
            class="search-input"
            style="max-width: 170px; flex: none"
            @change="chargerHistorique"
          />
          <input
            v-model="rechercheHisto"
            class="search-input"
            type="text"
            placeholder="Rechercher par patient, soin ou N° d'ordre…"
            @input="onRechercheHisto"
          />
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date réalisation</th>
                <th>Patient</th>
                <th>N° d'ordre</th>
                <th>Soin</th>
                <th>Agent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in historique.data" :key="r.id">
                <td>{{ formatDateHeure(r.date) }}</td>
                <td>
                  <strong>{{ r.soin.patient.nom }} {{ r.soin.patient.prenom }}</strong>
                  <span class="text-muted"> (code {{ r.soin.patient.code }})</span>
                </td>
                <td>{{ r.soin.passage?.numeroOrdre || '—' }}</td>
                <td>{{ r.soin.libelle }}</td>
                <td>{{ nomAgent(r.agent) }}</td>
                <td>
                  <div class="actions">
                    <button class="btn btn-outline btn-sm" @click="realisationVoir = r">👁️ Voir</button>
                  </div>
                </td>
              </tr>
              <tr v-if="historique.data.length === 0">
                <td colspan="6" class="empty-state">Aucun soin réalisé ce jour.</td>
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

    <!-- ============ Modale : réaliser un soin ============ -->
    <div v-if="modaleRealisation" class="modal-backdrop">
      <div class="modal">
        <h2>💉 {{ administrationCible ? 'Administrer' : 'Réaliser' }} — {{ administrationCible?.typeSoin ?? realisationCible?.libelle }}</h2>
        <p v-if="detail" class="text-muted">
          Patient : {{ detail.passage.patient.nom }} {{ detail.passage.patient.prenom }} · N° d'ordre
          {{ detail.passage.numeroOrdre }}
        </p>
        <div v-if="administrationCible" class="soin-recap">
          <strong>À administrer :</strong>
          <ul>
            <li v-for="l in administrationCible.lignes" :key="l.id">
              <strong>{{ l.medicamentNom }}</strong> — {{ l.dose }} {{ l.unite }}
              <span v-if="l.voie">({{ libelleVoie(l.voie) }})</span>
              <span v-if="l.posologie"> · {{ l.posologie }}</span>
            </li>
          </ul>
          <p v-if="administrationCible.instructions">📝 {{ administrationCible.instructions }}</p>
          <p class="text-muted">
            Administration {{ administrationCible.administrations.length + 1 }} sur {{ administrationCible.nbAdministrations }}
          </p>
        </div>

        <div class="field">
          <label>Date et heure de réalisation</label>
          <DateHeureSaisie v-model="realisationForm.date" class="modal-input" />
        </div>

        <div class="field champ-obs">
          <label>Observations</label>
          <textarea
            v-model="realisationForm.observations"
            rows="3"
            placeholder="Observations éventuelles sur la réalisation du soin…"
          ></textarea>
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleRealisation = false">✖ Annuler</button>
          <button class="btn btn-primary" :disabled="realisationEnCours" @click="confirmerRealisation">
            {{ realisationEnCours ? 'Enregistrement…' : administrationCible ? '✓ Confirmer l\'administration' : '💉 Confirmer la réalisation' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Modale : voir une réalisation (historique) ============ -->
    <div v-if="realisationVoir" class="modal-backdrop">
      <div class="modal">
        <h2>💉 {{ realisationVoir.soin.libelle }}</h2>
        <div class="fiche-info">
          <div class="fiche-ligne">
            <span class="fiche-label">Patient</span>
            <strong>{{ realisationVoir.soin.patient.nom }} {{ realisationVoir.soin.patient.prenom }}</strong>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">N° d'ordre</span>
            <span>{{ realisationVoir.soin.passage?.numeroOrdre || '—' }}</span>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">Réalisation</span>
            <span>{{ formatDateHeure(realisationVoir.date) }} par {{ nomAgent(realisationVoir.agent) }}</span>
          </div>
        </div>
        <p v-if="realisationVoir.observations" class="conclusion-voir">
          <strong>Observations :</strong> {{ realisationVoir.observations }}
        </p>
        <p v-else class="text-muted">Aucune observation.</p>

        <div class="modal-actions">
          <button class="btn btn-outline" @click="realisationVoir = null">✖ Fermer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import DateHeureSaisie from '../components/DateHeureSaisie.vue'
import DateSaisie from '../components/DateSaisie.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import http from '../api/http'
import PaginationBar from '../components/PaginationBar.vue'
import { useAuthStore } from '../stores/auth'
import { toastError, toastSuccess } from '../utils/notifications'
import { badgeStatutSoin, libelleStatutSoin, libelleVoie } from '../utils/soins'

const auth = useAuthStore()
const router = useRouter()

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')

const todayLabel = computed(() => {
  const d = new Date()
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const onglet = ref('file')

// ---- File d'attente (par ordre d'arrivée) ----
const file = ref([])

async function chargerFile() {
  try {
    const { data } = await http.get('/soins/file', {
      params: { cliniqueId: cliniqueId.value },
    })
    file.value = data
  } catch {
    file.value = []
  }
}

// ---- Onglet recherche ----
const recherche = ref('')
const resultats = ref([])
const passageCourant = ref(null)
const detail = ref(null)
let timerRecherche = null

// ---- Modale réalisation ----
const modaleRealisation = ref(false)
const realisationCible = ref(null)
const realisationForm = ref({ date: '', observations: '' })
const realisationEnCours = ref(false)

// ---- Historique ----
const jourFiltre = ref(new Date().toISOString().slice(0, 10))
const rechercheHisto = ref('')
const historique = ref({ data: [], total: 0, page: 1, perPage: 10, totalPages: 0 })
const page = ref(1)
const perPage = ref(10)
let timerRechercheHisto = null
const realisationVoir = ref(null)

/** Lignes SOIN payées du passage courant, soin associé rattaché par ligne. */
const lignesSoins = computed(() => {
  if (!detail.value) return []
  const parPrestation = new Map(detail.value.soins.map((s) => [s.passagePrestationId, s]))
  return (detail.value.prestations ?? []).map((l) => ({ ...l, soin: parPrestation.get(l.id) ?? null }))
})

/** Soins prescrits par le médecin : en cours d'abord. */
const prescrits = computed(() =>
  [...(detail.value?.prescrits ?? [])].sort(
    (a, b) => (a.statut === 'EN_COURS' ? 0 : 1) - (b.statut === 'EN_COURS' ? 0 : 1) || a.id - b.id,
  ),
)

/** Toutes les réalisations du passage (soins payés + soins prescrits), les plus récentes d'abord. */
const toutesRealisations = computed(() =>
  [
    ...(detail.value?.soins ?? []).flatMap((s) =>
      (s.realisations ?? []).map((r) => ({ ...r, soin: { libelle: s.libelle } })),
    ),
    ...(detail.value?.prescrits ?? []).flatMap((s) =>
      (s.administrations ?? []).map((a) => ({ ...a, id: `A${a.id}`, soin: { libelle: s.typeSoin } })),
    ),
  ].sort((x, y) => new Date(y.date) - new Date(x.date)),
)

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
    const { data } = await http.get('/soins/recherche', {
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
  onglet.value = 'recherche' // le détail du passage s'affiche dans l'onglet Recherche
  await chargerDetail()
}

async function chargerDetail() {
  if (!passageCourant.value) return
  try {
    const { data } = await http.get(`/soins/passages/${passageCourant.value.id}`)
    detail.value = data
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger le passage.')
  }
}

function quitterPassage() {
  passageCourant.value = null
  detail.value = null
  resultats.value = []
}

// ---- Réalisation d'un soin (date + observations, agent tracé) ----
function maintenantLocale() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// Soin prescrit : une confirmation par administration
const administrationCible = ref(null)

function ouvrirAdministration(s) {
  administrationCible.value = s
  realisationCible.value = null
  realisationForm.value = { date: maintenantLocale(), observations: '' }
  modaleRealisation.value = true
}

function ouvrirRealisation(ligne) {
  administrationCible.value = null
  realisationCible.value = ligne
  realisationForm.value = { date: maintenantLocale(), observations: '' }
  modaleRealisation.value = true
}

async function confirmerRealisation() {
  if (!realisationForm.value.date) {
    toastError('Indiquez la date et l’heure de réalisation.')
    return
  }
  realisationEnCours.value = true
  try {
    if (administrationCible.value) {
      await http.post(`/soins/prescrits/${administrationCible.value.id}/administrer`, {
        date: new Date(realisationForm.value.date).toISOString(),
        observations: realisationForm.value.observations,
      })
      toastSuccess('Administration confirmée (date et agent tracés).')
      modaleRealisation.value = false
      await chargerDetail()
      return
    }
    await http.post(`/soins/passages/${passageCourant.value.id}/realiser`, {
      passagePrestationId: realisationCible.value.id,
      date: new Date(realisationForm.value.date).toISOString(),
      observations: realisationForm.value.observations,
    })
    toastSuccess('Soin réalisé (date et agent tracés).')
    modaleRealisation.value = false
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible d’enregistrer la réalisation.')
  } finally {
    realisationEnCours.value = false
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
    const { data } = await http.get('/soins/realisations', {
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
    toastError(e.response?.data?.message || 'Impossible de charger l’historique.')
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
function statutSoinLabel(soin) {
  if (!soin) return 'À réaliser'
  if (soin.statut === 'EN_ATTENTE') return 'En attente'
  return 'Réalisé'
}

function badgeSoin(soin) {
  if (!soin || soin.statut === 'EN_ATTENTE') return 'badge-muted'
  return 'badge-success'
}

function nomAgent(u) {
  const p = u?.personnel
  return p ? `${p.prenom} ${p.nom}` : '—'
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

onMounted(() => {
  // File d'attente par défaut (liste des patients à traiter)
  chargerFile()
})

onUnmounted(() => {
  clearTimeout(timerRecherche)
  clearTimeout(timerRechercheHisto)
})
</script>

<style scoped>
.soins-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
  display: flex;
  flex-direction: column;
}
.soins-header {
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

.soins-content {
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
.soin-carte {
  border: 1px solid var(--border);
  border-left: 4px solid var(--primary, #2563eb);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 12px;
  background: var(--surface, #fff);
}
.soin-carte.soin-clos {
  border-left-color: var(--border);
  opacity: 0.75;
}
.soin-carte-tete {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.soin-type {
  font-size: 1.05rem;
}
.soin-progression {
  margin-left: auto;
  font-weight: 600;
}
.soin-dose {
  font-weight: 700;
  white-space: nowrap;
}
.soin-rythme,
.soin-instructions {
  margin: 8px 0 4px;
}
.soin-instructions {
  background: #fffbeb;
  border-radius: 6px;
  padding: 6px 10px;
}
.soin-recap {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 10px;
}
.soin-recap ul {
  margin: 4px 0;
  padding-left: 18px;
}
.obs-cell {
  max-width: 320px;
  white-space: pre-wrap;
}

/* Modale réalisation */
.champ-obs {
  margin-top: 14px;
}
.modal-input {
  width: 100%;
  padding: 7px 9px;
  border: 1.5px solid var(--border-champ);
  border-radius: 8px;
  font-size: 13.5px;
  font-family: inherit;
}
.conclusion-voir {
  margin-top: 14px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13.5px;
  white-space: pre-wrap;
}
</style>
