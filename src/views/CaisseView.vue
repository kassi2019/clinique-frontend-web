<template>
  <div class="caisse-page">
    <!-- En-tête -->
    <header class="caisse-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">💰</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Caisse — paiement des prestations</span>
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

    <main class="caisse-content">
      <!-- Recherche unique (§6.1) -->
      <section class="card search-card">
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
          <li v-for="p in resultats" :key="p.id" @click="choisirPassage(p)">
            <strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong>
            <span>{{ p.numeroOrdre }} · code {{ p.patient.code }} · {{ p.service?.nom }} · {{ labelStatut(p.statut) }}</span>
          </li>
        </ul>
      </section>

      <!-- Fiche patient courante -->
      <section v-if="passageCourant" class="card fiche-card">
        <div class="fiche-info">
          <div class="fiche-ligne">
            <span class="fiche-label">Patient</span>
            <strong>{{ passageCourant.patient.nom }} {{ passageCourant.patient.prenom }}</strong>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">Code patient</span>
            <span class="code-chip">{{ passageCourant.patient.code }}</span>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">N° d'ordre</span>
            <strong>{{ passageCourant.numeroOrdre }}</strong>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">Service</span>
            <span>{{ passageCourant.service?.nom }}</span>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">Statut</span>
            <span class="badge" :class="badgeStatut(passageCourant.statut)">{{ labelStatut(passageCourant.statut) }}</span>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" @click="passageCourant = null; resultats = []; recherche = ''">
          ✕ Changer de patient
        </button>
      </section>

      <div v-if="passageCourant" class="caisse-grid">
        <!-- ============ Prestations à régler ============ -->
        <section class="card">
          <div class="card-header">
            <h2>Prestations à régler</h2>
            <button class="btn btn-outline btn-sm" @click="ouvrirAjout">+ Ajouter une prestation</button>
          </div>

          <div v-if="detailLoading" class="empty-state">Chargement…</div>
          <div v-else-if="!detail || detail.prestations.length === 0" class="empty-state">
            Aucune prestation pour ce passage.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width: 36px"></th>
                  <th>Prestation</th>
                  <th>Service</th>
                  <th>Montant (FCFA)</th>
                  <th>État</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="l in detail.prestations"
                  :key="l.id"
                  :class="{
                    'ligne-payee': l.statut === 'PAYEE' || l.statut === 'ANNULEE',
                    'ligne-non-prescrite': l.statut === 'NON_PRESCRITE' || l.statut === 'EXTERNE',
                  }"
                >
                  <td>
                    <input
                      v-if="l.statut === 'EN_ATTENTE'"
                      type="checkbox"
                      :checked="lignesCochees.has(l.id)"
                      @change="toggleLigne(l.id, $event.target.checked)"
                    />
                  </td>
                  <td>{{ l.libelle }}</td>
                  <td>{{ l.service?.nom || '—' }}</td>
                  <td>{{ l.statut === 'EXTERNE' ? '—' : l.montant.toLocaleString('fr-FR') }}</td>
                  <td>
                    <span
                      v-if="l.statut === 'NON_PRESCRITE'"
                      class="badge badge-muted"
                      title="Cette prestation doit d'abord être prescrite par le médecin"
                    >
                      Pas encore prescrite
                    </span>
                    <span
                      v-else-if="l.statut === 'EXTERNE'"
                      class="badge badge-muted"
                      title="Examen réalisé hors clinique — non facturable"
                    >
                      Externe (non facturable)
                    </span>
                    <span
                      v-else
                      class="badge"
                      :class="l.statut === 'PAYEE' ? 'badge-success' : l.statut === 'ANNULEE' ? 'badge-danger' : 'badge-warning'"
                    >
                      {{ l.statut === 'PAYEE' ? 'Payée' : l.statut === 'ANNULEE' ? 'Annulée' : 'En attente' }}
                    </span>
                  </td>
                  <td>
                    <button
                      v-if="l.statut === 'EN_ATTENTE'"
                      class="btn btn-danger btn-sm"
                      title="Retirer"
                      @click="retirerLigne(l)"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Récapitulatif + encaissement -->
          <div class="recap">
            <div class="recap-lignes">
              <div class="recap-item">
                <span>Sous-total</span>
                <strong>{{ sousTotal.toLocaleString('fr-FR') }} FCFA</strong>
              </div>
              <div class="recap-item recap-total">
                <span>Total à payer</span>
                <strong>{{ sousTotal.toLocaleString('fr-FR') }} FCFA</strong>
              </div>
            </div>
            <div class="encaissement">
              <select v-model="modePaiement" class="mode-select">
                <option value="ESPECES">💵 Espèces</option>
                <option value="MOBILE_MONEY">📱 Mobile Money</option>
                <option value="CARTE">💳 Carte bancaire</option>
              </select>
              <button
                class="btn btn-primary btn-encaisser"
                :disabled="encaissementEnCours || lignesCochees.size === 0"
                @click="encaisser"
              >
                {{ encaissementEnCours ? 'Encaissement…' : '💵 Encaisser' }}
              </button>
            </div>
          </div>
        </section>

        <!-- ============ Historique des paiements ============ -->
        <section class="card">
          <div class="card-header">
            <h2>Historique des paiements</h2>
          </div>
          <div v-if="!detail || detail.paiements.length === 0" class="empty-state">
            Aucun paiement enregistré pour ce passage.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N° reçu</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Mode</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in detail.paiements" :key="p.id">
                  <td><strong>{{ p.numeroRecu }}</strong></td>
                  <td>{{ formatDateHeure(p.createdAt) }}</td>
                  <td>{{ p.montantTotal.toLocaleString('fr-FR') }} FCFA</td>
                  <td>{{ labelMode(p.modePaiement) }}</td>
                  <td>
                    <span class="badge" :class="p.statut === 'VALIDE' ? 'badge-success' : 'badge-danger'">
                      {{ p.statut === 'VALIDE' ? 'Validé' : 'Annulé' }}
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      <button
                        v-if="p.statut === 'VALIDE'"
                        class="btn btn-outline btn-sm"
                        @click="imprimerRecu(p.id)"
                      >
                        🖨️ Reçu
                      </button>
                      <button
                        v-if="p.statut === 'VALIDE' && estAdmin"
                        class="btn btn-danger btn-sm"
                        @click="annulerPaiement(p)"
                      >
                        Annuler
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>

    <!-- ============ Modale : ajout de prestation ============ -->
    <div v-if="ajoutVisible" class="modal-backdrop">
      <div class="modal">
        <h2>Ajouter une prestation</h2>
        <p v-if="ajoutError" class="alert alert-error">{{ ajoutError }}</p>
        <form @submit.prevent="confirmerAjout">
          <div class="field">
            <label>Filtrer par service</label>
            <SelectSearch
              v-model="ajoutFiltreService"
              :options="optionsServices"
              placeholder="Tous les services"
            />
          </div>
          <div class="field">
            <label>Prestation *</label>
            <SelectSearch
              v-model="ajoutPrestationId"
              :options="optionsPrestationsFiltrees"
              placeholder="— Choisir —"
            />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="ajoutVisible = false">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="ajoutEnCours">
              {{ ajoutEnCours ? 'Ajout…' : 'Ajouter' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ Modale : paiement effectué ============ -->
    <div v-if="paiementEffectue" class="modal-backdrop">
      <div class="modal modal-ticket">
        <h2>✓ Paiement enregistré</h2>
        <div class="code-display">
          <span>Reçu</span>
          <strong>{{ paiementEffectue.paiement.numeroRecu }}</strong>
          <small>
            {{ paiementEffectue.patient?.nom }} {{ paiementEffectue.patient?.prenom }} —
            Total : {{ paiementEffectue.paiement.montantTotal.toLocaleString('fr-FR') }} FCFA
          </small>
        </div>
        <p v-if="paiementEffectue.impression && !paiementEffectue.impression.ok" class="alert alert-error">
          Impression auto : {{ paiementEffectue.impression.message }}
        </p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="paiementEffectue = null">Fermer</button>
          <button class="btn btn-outline" @click="imprimerRecuNavigateur">🖥️ Imprimer (navigateur)</button>
          <button class="btn btn-primary" @click="imprimerRecu(paiementEffectue.paiement.id)">
            🖨️ Imprimer (imprimante)
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Reçu imprimable (navigateur) ============ -->
    <div v-if="recuVisuel" id="recu-print">
      <div class="recu">
        <div class="recu-head">
          <h1>{{ cliniqueNom }}</h1>
        </div>
        <div class="recu-sep"></div>
        <h2 class="recu-title">REÇU DE PAIEMENT</h2>
        <div class="recu-numero">{{ recuVisuel.numeroRecu }}</div>
        <div class="recu-sep"></div>
        <div class="recu-infos">
          <div><strong>Patient : {{ recuVisuel.patient?.nom }} {{ recuVisuel.patient?.prenom }}</strong></div>
          <div>Code : {{ recuVisuel.patient?.code }} · N° ordre : {{ recuVisuel.passage?.numeroOrdre }}</div>
        </div>
        <div class="recu-sep"></div>
        <table class="recu-table">
          <tr v-for="l in recuVisuel.lignes" :key="l.id">
            <td>{{ l.libelle }}</td>
            <td class="recu-montant">{{ l.montant.toLocaleString('fr-FR') }} F</td>
          </tr>
        </table>
        <div class="recu-sep"></div>
        <div class="recu-total">TOTAL : {{ recuVisuel.montantTotal.toLocaleString('fr-FR') }} FCFA</div>
        <div class="recu-infos">
          <div>Mode : {{ labelMode(recuVisuel.modePaiement) }}</div>
          <div>{{ formatDateHeure(recuVisuel.createdAt) }}</div>
        </div>
        <div class="recu-sep"></div>
        <div class="recu-foot">Merci de votre visite</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Swal from 'sweetalert2'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import http from '../api/http'
import { toastError, toastSuccess } from '../utils/notifications'
import SelectSearch from '../components/SelectSearch.vue'

const auth = useAuthStore()
const router = useRouter()

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')
const estAdmin = computed(() => auth.user?.role?.code === 'ADMINISTRATEUR')

const todayLabel = computed(() =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
)

const STATUTS = {
  CREE: { label: 'Créé', cls: 'badge-muted' },
  EN_ATTENTE_PAIEMENT: { label: 'En attente de paiement', cls: 'badge-warning' },
  ACTIF: { label: 'Actif', cls: 'badge-success' },
  UTILISE: { label: 'Utilisé', cls: 'badge-muted' },
  CLOTURE: { label: 'Clôturé', cls: 'badge-muted' },
  EXPIRE: { label: 'Expiré', cls: 'badge-danger' },
}
const badgeStatut = (s) => STATUTS[s]?.cls || 'badge-muted'
const labelStatut = (s) => STATUTS[s]?.label || s

const MODES = {
  ESPECES: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  CARTE: 'Carte bancaire',
}
const labelMode = (m) => MODES[m] || m

// Recherche + passage courant
const recherche = ref('')
const resultats = ref([])
const passageCourant = ref(null)
let rechercheTimer = null

// Détail du passage
const detail = ref(null)
const detailLoading = ref(false)
const lignesCochees = ref(new Set())
const modePaiement = ref('ESPECES')
const encaissementEnCours = ref(false)

// Ajout de prestation
const ajoutVisible = ref(false)
const ajoutPrestationId = ref(null)
const ajoutFiltreService = ref(null)
const ajoutEnCours = ref(false)
const ajoutError = ref('')
const prestations = ref([])
const services = ref([])

// Paiement effectué + reçu visuel
const paiementEffectue = ref(null)
const recuVisuel = ref(null)

const sousTotal = computed(() => {
  if (!detail.value) return 0
  return detail.value.prestations
    .filter((l) => l.statut === 'EN_ATTENTE' && lignesCochees.value.has(l.id))
    .reduce((s, l) => s + l.montant, 0)
})

const prestationsFiltrees = computed(() => {
  if (!ajoutFiltreService.value) return prestations.value
  return prestations.value.filter((p) => p.serviceId === ajoutFiltreService.value)
})

const optionsServices = computed(() => [
  { value: null, label: 'Tous les services' },
  ...services.value.map((s) => ({ value: s.id, label: s.nom })),
])

const optionsPrestationsFiltrees = computed(() =>
  prestationsFiltrees.value.map((p) => ({
    value: p.id,
    label: `${p.libelle} — ${p.montant.toLocaleString('fr-FR')} FCFA`,
  })),
)

function onRecherche() {
  clearTimeout(rechercheTimer)
  rechercheTimer = setTimeout(async () => {
    if (recherche.value.trim().length < 2) {
      resultats.value = []
      return
    }
    try {
      const { data } = await http.get('/caisse/recherche', {
        params: { search: recherche.value, cliniqueId: cliniqueId.value },
      })
      resultats.value = data
    } catch {
      resultats.value = []
    }
  }, 300)
}

async function choisirPassage(p) {
  passageCourant.value = p
  resultats.value = []
  recherche.value = ''
  lignesCochees.value = new Set()
  await chargerDetail()
}

async function chargerDetail() {
  if (!passageCourant.value) return
  detailLoading.value = true
  try {
    const { data } = await http.get(`/caisse/passages/${passageCourant.value.id}`)
    detail.value = data
    passageCourant.value = {
      ...passageCourant.value,
      statut: data.statut,
      patient: data.patient,
      service: data.service,
    }
    // Pré-cocher les prestations en attente
    lignesCochees.value = new Set(
      data.prestations.filter((l) => l.statut === 'EN_ATTENTE').map((l) => l.id),
    )
  } catch (e) {
    toastError('Impossible de charger le passage.')
  } finally {
    detailLoading.value = false
  }
}

function toggleLigne(id, coche) {
  if (coche) {
    lignesCochees.value = new Set([...lignesCochees.value, id])
  } else {
    const n = new Set(lignesCochees.value)
    n.delete(id)
    lignesCochees.value = n
  }
}

async function ouvrirAjout() {
  ajoutVisible.value = true
  ajoutPrestationId.value = null
  ajoutError.value = ''
  try {
    const { data } = await http.get('/prestations', { params: { perPage: 0 } })
    prestations.value = data.data.filter((p) => p.actif)
  } catch {
    prestations.value = []
  }
}

async function confirmerAjout() {
  if (!ajoutPrestationId.value || !passageCourant.value) return
  ajoutEnCours.value = true
  ajoutError.value = ''
  try {
    await http.post(`/caisse/passages/${passageCourant.value.id}/prestations`, {
      prestationId: ajoutPrestationId.value,
    })
    ajoutVisible.value = false
    toastSuccess('Prestation ajoutée.')
    await chargerDetail()
  } catch (e) {
    ajoutError.value = e.response?.data?.message || 'Erreur lors de l\'ajout.'
  } finally {
    ajoutEnCours.value = false
  }
}

async function retirerLigne(l) {
  const reponse = await Swal.fire({
    title: `Retirer « ${l.libelle} » ?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui, retirer',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.delete(`/caisse/prestations/${l.id}`)
    toastSuccess('Prestation retirée.')
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors du retrait.')
  }
}

async function encaisser() {
  if (!passageCourant.value || lignesCochees.value.size === 0) return
  encaissementEnCours.value = true
  try {
    const { data } = await http.post(
      `/caisse/passages/${passageCourant.value.id}/encaisser`,
      {
        lignesIds: [...lignesCochees.value],
        modePaiement: modePaiement.value,
      },
    )
    paiementEffectue.value = data
    recuVisuel.value = {
      ...data.paiement,
      lignes: data.lignes,
      patient: data.patient,
      passage: data.passage,
    }
    if (data.impression?.ok) {
      toastSuccess(`Reçu imprimé : ${data.impression.message}`)
    }
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'encaissement.')
  } finally {
    encaissementEnCours.value = false
  }
}

async function imprimerRecu(paiementId) {
  try {
    const { data } = await http.post(`/impression/paiements/${paiementId}`)
    if (data.ok) {
      toastSuccess(data.message)
    } else {
      toastError(data.message)
    }
  } catch (e) {
    toastError(`Erreur d'impression : ${e.response?.data?.message || e.message}`)
  }
}

function imprimerRecuNavigateur() {
  window.print()
}

async function annulerPaiement(p) {
  const { value: motif } = await Swal.fire({
    title: `Annuler le paiement ${p.numeroRecu} ?`,
    text: 'Les prestations reviendront « en attente ». Indiquez le motif :',
    input: 'text',
    inputPlaceholder: 'Ex : erreur de saisie, patient mécontent…',
    showCancelButton: true,
    confirmButtonText: 'Annuler le paiement',
    cancelButtonText: 'Retour',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    inputValidator: (v) => (!v || v.trim().length < 3 ? 'Motif obligatoire (3 caractères min.)' : null),
  })
  if (!motif) return
  try {
    await http.post(`/caisse/paiements/${p.id}/annuler`, { motif })
    toastSuccess('Paiement annulé.')
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'annulation.')
  }
}

function formatDateHeure(d) {
  return new Date(d).toLocaleString('fr-FR')
}

onMounted(async () => {
  try {
    const { data } = await http.get('/services', { params: { perPage: 0 } })
    services.value = data.data
  } catch {
    // liste vide si l'API ne répond pas
  }
})

onUnmounted(() => {
  clearTimeout(rechercheTimer)
})
</script>

<style scoped>
.caisse-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
  display: flex;
  flex-direction: column;
}

/* ---------- Header ---------- */
.caisse-header {
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
  color: #fff;
  font-size: 16px;
  font-weight: 800;
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

/* ---------- Contenu ---------- */
.caisse-content {
  flex: 1;
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 20px 24px;
}

.search-card {
  margin-bottom: 16px;
}

.resultats {
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 220px;
  overflow-y: auto;
}
.resultats li {
  padding: 10px 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border);
}
.resultats li:last-child {
  border-bottom: none;
}
.resultats li:hover {
  background: var(--primary-light);
}
.resultats span {
  font-size: 12px;
  color: var(--text-muted);
}

.fiche-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  background: #f0fdfa;
  border-color: #c9ece5;
}
.fiche-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
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

.caisse-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 1000px) {
  .caisse-grid {
    grid-template-columns: 1fr;
  }
}

.ligne-payee {
  opacity: 0.6;
}
.ligne-non-prescrite {
  opacity: 0.55;
  background: #fafafa;
}

/* ---------- Récapitulatif ---------- */
.recap {
  margin-top: 16px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.recap-lignes {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.recap-item {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: var(--text-muted);
}
.recap-total {
  font-size: 17px;
  color: #134e4a;
}
.encaissement {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
}
.mode-select {
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: var(--surface);
}
.btn-encaisser {
  padding: 10px 22px;
  font-size: 15px;
}

/* ---------- Modale ticket ---------- */
.modal-ticket {
  text-align: center;
}
.code-display {
  margin: 18px 0;
  padding: 18px;
  background: #ecfdf5;
  border: 1.5px dashed #14b8a6;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.code-display span {
  font-size: 12.5px;
  color: #0f766e;
  font-weight: 600;
}
.code-display strong {
  font-size: 28px;
  letter-spacing: 2px;
  color: #134e4a;
  font-family: Consolas, monospace;
}
.code-display small {
  color: var(--text-muted);
}

/* ---------- Reçu navigateur (impression) ---------- */
@media screen {
  #recu-print {
    position: fixed;
    left: -10000px;
    top: 0;
  }
}
.recu {
  max-width: 320px;
  margin: 24px auto;
  padding: 24px 20px;
  border: 1px solid #134e4a;
  border-radius: 8px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #1e293b;
  text-align: center;
}
.recu-head h1 {
  font-size: 22px;
  color: #134e4a;
  font-weight: 800;
}
.recu-sep {
  border-top: 1.5px dashed #94a3b8;
  margin: 12px 0;
}
.recu-title {
  font-size: 15px;
  letter-spacing: 3px;
  color: #134e4a;
  margin-bottom: 8px;
}
.recu-numero {
  font-size: 20px;
  font-weight: 800;
  font-family: Consolas, monospace;
  color: #134e4a;
}
.recu-table {
  width: 100%;
  font-size: 13px;
  border-collapse: collapse;
  text-align: left;
}
.recu-table td {
  padding: 4px 0;
}
.recu-montant {
  text-align: right;
  font-weight: 600;
  white-space: nowrap;
}
.recu-total {
  font-size: 15px;
  font-weight: 800;
  color: #134e4a;
  text-align: right;
}
.recu-infos {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12.5px;
  text-align: left;
}
.recu-foot {
  font-size: 13px;
  font-weight: 700;
  color: #134e4a;
}
</style>
