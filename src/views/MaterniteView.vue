<template>
  <div class="maternite-page">
    <!-- En-tête -->
    <header class="maternite-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">🤰</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Maternité — CPN, accouchements et suivi</span>
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

    <main class="maternite-content">
      <!-- Onglets -->
      <nav class="tabs-nav">
        <button class="tab-btn" :class="{ active: onglet === 'grossesses' }" @click="onglet = 'grossesses'; chargerGrossesses()">
          🤰 Grossesses
        </button>
        <button class="tab-btn" :class="{ active: onglet === 'accouchements' }" @click="onglet = 'accouchements'; chargerAccouchements()">
          👶 Accouchements
        </button>
      </nav>

      <!-- ============ GROSSESSES (liste des patientes) ============ -->
      <section v-if="onglet === 'grossesses' && !grossesseCourante" class="card">
        <div class="card-header">
          <h2>Patientes en suivi — sélectionnez une patiente pour le traitement CPN</h2>
          <button class="btn btn-primary btn-sm" @click="ouvrirNouvelleGrossesse">＋ Nouvelle grossesse</button>
        </div>
        <div class="toolbar">
          <input
            v-model="recherche"
            class="search-input"
            type="text"
            placeholder="Rechercher par nom, code patient ou N° GRO…"
            @input="onRecherche"
          />
          <select v-model="filtreStatut" class="search-input" style="max-width: 180px; flex: none" @change="page = 1; chargerGrossesses()">
            <option value="EN_COURS">En suivi (en cours)</option>
            <option value="">Tous les statuts</option>
            <option value="ACCOUCHEE">Accouchée</option>
            <option value="TERMINEE">Terminée</option>
          </select>
        </div>

        <div v-if="chargement" class="empty-state">Chargement…</div>
        <div v-else-if="grossesses.length === 0" class="empty-state">Aucune grossesse enregistrée.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patiente</th>
                <th>N° GRO</th>
                <th>DDR</th>
                <th>DPA</th>
                <th>Visites</th>
                <th>Prochaine visite</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in grossesses" :key="g.id">
                <td>
                  <strong>{{ g.patient.nom }} {{ g.patient.prenom }}</strong>
                  <span class="text-muted"> · {{ g.patient.code }}</span>
                  <span v-if="g.patient.age" class="text-muted"> · {{ g.patient.age }} ans</span>
                </td>
                <td>{{ g.numero }}</td>
                <td>{{ formatDate(g.ddr) }}</td>
                <td>{{ formatDate(g.dpa) }}</td>
                <td>{{ g._count?.visites ?? 0 }}</td>
                <td>{{ g.prochaineVisite ? formatDate(g.prochaineVisite) : '—' }}</td>
                <td>
                  <span class="badge" :class="g.statut === 'EN_COURS' ? 'badge-success' : g.statut === 'ACCOUCHEE' ? 'badge-warning' : 'badge-muted'">
                    {{ labelStatut(g.statut) }}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    <button class="btn btn-primary btn-sm" @click="ouvrirGrossesse(g)">🩺 Traitement</button>
                    <button class="btn btn-outline btn-sm" @click="ouvrirModifGrossesse(g)">✏️ Modifier</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationBar
          :page="page"
          :per-page="perPage"
          :total="total"
          :total-pages="totalPages"
          @change="changerPage"
          @per-page="changerPerPage"
        />
      </section>

      <!-- ============ FICHE GROSSESSE ============ -->
      <template v-if="onglet === 'grossesses' && grossesseCourante">
        <section class="card">
          <div class="fiche-info">
            <div class="fiche-ligne"><span class="fiche-label">Patiente</span><strong>{{ grossesseCourante.patient.nom }} {{ grossesseCourante.patient.prenom }}</strong></div>
            <div class="fiche-ligne"><span class="fiche-label">Code</span><span class="code-chip">{{ grossesseCourante.patient.code }}</span></div>
            <div class="fiche-ligne"><span class="fiche-label">Grossesse</span><strong>{{ grossesseCourante.numero }}</strong></div>
            <div class="fiche-ligne"><span class="fiche-label">DDR / DPA</span><span>{{ formatDate(grossesseCourante.ddr) }} → {{ formatDate(grossesseCourante.dpa) }}</span></div>
            <div class="fiche-ligne"><span class="fiche-label">Gravidité / Parité</span><span>{{ grossesseCourante.gravidite ?? '—' }} / {{ grossesseCourante.parite ?? '—' }}</span></div>
          </div>
          <button class="btn btn-outline btn-sm" @click="grossesseCourante = null">✕ Retour à la liste</button>
        </section>

        <section class="card">
          <div class="card-header">
            <h2>Visites CPN ({{ grossesseCourante.visites.length }})</h2>
            <button
              class="btn btn-primary btn-sm"
              :disabled="grossesseCourante.statut !== 'EN_COURS'"
              @click="ouvrirNouvelleVisite"
            >
              ＋ Nouvelle visite CPN
            </button>
          </div>
          <div v-if="grossesseCourante.visites.length === 0" class="empty-state">Aucune visite enregistrée.</div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Visite</th>
                  <th>Date</th>
                  <th>Âge gestationnel</th>
                  <th>Poids</th>
                  <th>TA</th>
                  <th>HU</th>
                  <th>BCF</th>
                  <th>Prochaine visite</th>
                  <th>Par</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in grossesseCourante.visites" :key="v.id">
                  <td><strong>CPN{{ v.numero }}</strong></td>
                  <td>{{ formatDate(v.date) }}</td>
                  <td>{{ v.ageGestationnelSA || '—' }}</td>
                  <td>{{ v.poids ? v.poids + ' kg' : '—' }}</td>
                  <td>{{ v.tensionGauche || '—' }}</td>
                  <td>{{ v.hauteurUterine || '—' }}</td>
                  <td>{{ v.bcf || '—' }}</td>
                  <td>{{ v.prochaineVisite ? formatDate(v.prochaineVisite) : '—' }}</td>
                  <td class="text-muted">{{ nomAgent(v.agent) }}</td>
                  <td><button class="btn btn-outline btn-sm" @click="ouvrirModifVisite(v)">✏️</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <h2>Accouchement</h2>
            <button
              v-if="!grossesseCourante.accouchement"
              class="btn btn-primary btn-sm"
              @click="ouvrirNouvelAccouchement"
            >
              ＋ Enregistrer l'accouchement
            </button>
            <button v-else class="btn btn-outline btn-sm" @click="ouvrirNouvelAccouchement">✏️ Modifier</button>
          </div>
          <div v-if="!grossesseCourante.accouchement" class="empty-state">Accouchement non encore enregistré.</div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr><th>Date / heure</th><th>Voie</th><th>Terme</th><th>Sexe</th><th>Poids</th><th>APGAR</th><th>Issue mère</th><th>Issue enfant</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ formatDateHeure(grossesseCourante.accouchement.dateHeure) }}</td>
                  <td><span class="badge" :class="grossesseCourante.accouchement.voie === 'CESARIENNE' ? 'badge-warning' : 'badge-success'">{{ grossesseCourante.accouchement.voie === 'CESARIENNE' ? 'Césarienne' : 'Voie basse' }}</span></td>
                  <td>{{ grossesseCourante.accouchement.termeSA || '—' }}</td>
                  <td>{{ grossesseCourante.accouchement.sexeEnfant === 'M' ? 'Masculin' : grossesseCourante.accouchement.sexeEnfant === 'F' ? 'Féminin' : '—' }}</td>
                  <td>{{ grossesseCourante.accouchement.poidsEnfant ? grossesseCourante.accouchement.poidsEnfant + ' kg' : '—' }}</td>
                  <td>{{ grossesseCourante.accouchement.apgar || '—' }}</td>
                  <td>{{ grossesseCourante.accouchement.issueMere || '—' }}</td>
                  <td>{{ grossesseCourante.accouchement.issueEnfant || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="grossesseCourante.accouchement.complications" class="text-muted">
              Complications : {{ grossesseCourante.accouchement.complications }}
            </p>
          </div>
        </section>
      </template>

      <!-- ============ ACCOUCHEMENTS ============ -->
      <section v-else class="card">
        <div class="card-header"><h2>Accouchements enregistrés</h2></div>
        <div class="toolbar">
          <input
            v-model="rechercheAcc"
            class="search-input"
            type="text"
            placeholder="Rechercher par nom ou code patient…"
            @input="onRechercheAcc"
          />
        </div>
        <div v-if="chargementAcc" class="empty-state">Chargement…</div>
        <div v-else-if="accouchements.length === 0" class="empty-state">Aucun accouchement enregistré.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr><th>Date / heure</th><th>Patiente</th><th>Voie</th><th>Sexe</th><th>Poids</th><th>Issue enfant</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="a in accouchements" :key="a.id">
                <td>{{ formatDateHeure(a.dateHeure) }}</td>
                <td>
                  <strong>{{ a.grossesse.patient.nom }} {{ a.grossesse.patient.prenom }}</strong>
                  <span class="text-muted"> ({{ a.grossesse.numero }})</span>
                </td>
                <td><span class="badge" :class="a.voie === 'CESARIENNE' ? 'badge-warning' : 'badge-success'">{{ a.voie === 'CESARIENNE' ? 'Césarienne' : 'Voie basse' }}</span></td>
                <td>{{ a.sexeEnfant === 'M' ? 'M' : a.sexeEnfant === 'F' ? 'F' : '—' }}</td>
                <td>{{ a.poidsEnfant ? a.poidsEnfant + ' kg' : '—' }}</td>
                <td>{{ a.issueEnfant || '—' }}</td>
                <td><button class="btn btn-outline btn-sm" @click="ouvrirAccouchement(a)">✏️ Modifier</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <PaginationBar
          :page="pageAcc"
          :per-page="perPageAcc"
          :total="totalAcc"
          :total-pages="totalPagesAcc"
          @change="(p) => { pageAcc = p; chargerAccouchements() }"
          @per-page="(n) => { perPageAcc = n; pageAcc = 1; chargerAccouchements() }"
        />
      </section>
    </main>

    <!-- Modale : nouvelle / modification grossesse -->
    <div v-if="modaleGrossesse" class="modal-backdrop">
      <div class="modal">
        <h2>{{ formGrossesse.id ? '✏️ Modifier la grossesse' : '＋ Nouvelle grossesse' }}</h2>
        <p v-if="erreurGrossesse" class="alert alert-error">{{ erreurGrossesse }}</p>
        <form @submit.prevent="enregistrerGrossesse">
          <template v-if="!formGrossesse.id">
            <div class="field">
              <label>Patiente * (recherche par nom ou code)</label>
              <input v-model.trim="recherchePatiente" placeholder="Ex : KOUAME ou P-9N7Z5A" @input="onRecherchePatiente" />
              <div v-if="resultatsPatientes.length" class="patient-results">
                <button
                  v-for="pt in resultatsPatientes"
                  :key="pt.id"
                  type="button"
                  class="patient-item"
                  :class="{ actif: formGrossesse.patientId === pt.id }"
                  @click="formGrossesse.patientId = pt.id"
                >
                  {{ pt.nom }} {{ pt.prenom }} · {{ pt.code }} · {{ pt.age || '?' }} ans
                </button>
              </div>
              <span v-if="patienteChoisie" class="badge badge-success">✓ {{ patienteChoisie.nom }} {{ patienteChoisie.prenom }}</span>
            </div>
          </template>
          <div class="form-row">
            <div class="field">
              <label>DDR (date des dernières règles) *</label>
              <input v-model="formGrossesse.ddr" type="date" required />
              <small class="text-muted">La DPA est calculée automatiquement : DDR + 280 jours.</small>
            </div>
            <div class="field">
              <label>Gravidité (nb de grossesses)</label>
              <input v-model.number="formGrossesse.gravidite" type="number" min="1" />
            </div>
            <div class="field">
              <label>Parité (nb d'accouchements)</label>
              <input v-model.number="formGrossesse.parite" type="number" min="0" />
            </div>
          </div>
          <div class="field">
            <label>Antécédents obstétricaux</label>
            <textarea v-model.trim="formGrossesse.antecedentsObstetricaux" rows="2" placeholder="Césarienne, HTA gravidique, fausses couches…"></textarea>
          </div>
          <div class="field">
            <label>Facteurs de risque</label>
            <textarea v-model.trim="formGrossesse.facteursRisque" rows="2"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="modaleGrossesse = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">💾 Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modale : visite CPN -->
    <div v-if="modaleVisite" class="modal-backdrop">
      <div class="modal modal-lg">
        <h2>{{ formVisite.id ? '✏️ Modifier la visite' : `＋ Nouvelle visite CPN (CPN${grossesseCourante.visites.length + 1})` }}</h2>
        <form @submit.prevent="enregistrerVisite">
          <div class="form-row">
            <div class="field">
              <label>Date *</label>
              <input v-model="formVisite.date" type="date" required />
            </div>
            <div class="field">
              <label>Âge gestationnel (SA)</label>
              <input v-model.trim="formVisite.ageGestationnelSA" placeholder="Ex : 16 SA + 3 j" />
            </div>
            <div class="field">
              <label>Poids (kg)</label>
              <input v-model.number="formVisite.poids" type="number" step="0.1" min="0" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>TA gauche</label>
              <input v-model.trim="formVisite.tensionGauche" placeholder="12/8" />
            </div>
            <div class="field">
              <label>TA droite</label>
              <input v-model.trim="formVisite.tensionDroite" placeholder="12/8" />
            </div>
            <div class="field">
              <label>Hauteur utérine (cm)</label>
              <input v-model.trim="formVisite.hauteurUterine" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>BCF (bruits du cœur fœtal)</label>
              <input v-model.trim="formVisite.bcf" placeholder="140 bpm" />
            </div>
            <div class="field">
              <label>Mouvements actifs</label>
              <select v-model="formVisite.mouvementsActifs">
                <option value="">—</option>
                <option value="Oui">Oui</option>
                <option value="Non">Non</option>
              </select>
            </div>
            <div class="field">
              <label>Œdèmes</label>
              <select v-model="formVisite.oedemes">
                <option value="">—</option>
                <option value="Oui">Oui</option>
                <option value="Non">Non</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Albumine</label>
              <input v-model.trim="formVisite.albumine" />
            </div>
            <div class="field">
              <label>Sucre</label>
              <input v-model.trim="formVisite.sucre" />
            </div>
            <div class="field">
              <label>Présentation</label>
              <input v-model.trim="formVisite.presentation" placeholder="Céphalique, siège…" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>TV (toucher vaginal)</label>
              <input v-model.trim="formVisite.tv" />
            </div>
            <div class="field">
              <label>Prochaine visite</label>
              <input v-model="formVisite.prochaineVisite" type="date" />
            </div>
          </div>
          <div class="field">
            <label>Conseils donnés</label>
            <textarea v-model.trim="formVisite.conseils" rows="2" placeholder="Fer, acide folique, MILDA, VAT…"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="modaleVisite = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">💾 Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modale : accouchement -->
    <div v-if="modaleAccouchement" class="modal-backdrop">
      <div class="modal modal-lg">
        <h2>👶 Accouchement — {{ grossesseCourante?.patient.nom }} {{ grossesseCourante?.patient.prenom }}</h2>
        <form @submit.prevent="enregistrerAccouchement">
          <div class="form-row">
            <div class="field">
              <label>Date et heure *</label>
              <input v-model="formAccouchement.dateHeure" type="datetime-local" required />
            </div>
            <div class="field">
              <label>Voie</label>
              <select v-model="formAccouchement.voie">
                <option value="VOIE_BASSE">Voie basse</option>
                <option value="CESARIENNE">Césarienne</option>
              </select>
            </div>
            <div class="field">
              <label>Terme (SA)</label>
              <input v-model.trim="formAccouchement.termeSA" placeholder="Ex : 39 SA" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Sexe de l'enfant</label>
              <select v-model="formAccouchement.sexeEnfant">
                <option value="">—</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div class="field">
              <label>Poids (kg)</label>
              <input v-model.number="formAccouchement.poidsEnfant" type="number" step="0.01" min="0" placeholder="3,2" />
            </div>
            <div class="field">
              <label>APGAR</label>
              <input v-model.trim="formAccouchement.apgar" placeholder="8/10 à 5 min" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Issue mère</label>
              <select v-model="formAccouchement.issueMere">
                <option value="">—</option>
                <option value="Vivante">Vivante</option>
                <option value="Décédée">Décédée</option>
                <option value="Transférée">Transférée</option>
              </select>
            </div>
            <div class="field">
              <label>Issue enfant</label>
              <select v-model="formAccouchement.issueEnfant">
                <option value="">—</option>
                <option value="Né vivant">Né vivant</option>
                <option value="Mort-né">Mort-né</option>
                <option value="Transféré">Transféré</option>
              </select>
            </div>
            <div class="field">
              <label>Lieu</label>
              <input v-model.trim="formAccouchement.lieu" placeholder="Salle d'accouchement, bloc…" />
            </div>
          </div>
          <div class="field">
            <label>Complications</label>
            <textarea v-model.trim="formAccouchement.complications" rows="2"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="modaleAccouchement = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">💾 Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'
import PaginationBar from '../components/PaginationBar.vue'
import { toastError, toastSuccess } from '../utils/notifications'

const auth = useAuthStore()
const router = useRouter()

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')
const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// Onglets
const onglet = ref('grossesses')

// Grossesses
const grossesses = ref([])
const grossesseCourante = ref(null)
const recherche = ref('')
const filtreStatut = ref('EN_COURS') // liste des patientes en suivi par défaut
const page = ref(1)
const perPage = ref(10)
const total = ref(0)
const totalPages = ref(1)
const chargement = ref(false)
let timerRecherche = null

// Accouchements
const accouchements = ref([])
const rechercheAcc = ref('')
const pageAcc = ref(1)
const perPageAcc = ref(10)
const totalAcc = ref(0)
const totalPagesAcc = ref(1)
const chargementAcc = ref(false)
let timerRechercheAcc = null

// Modales
const modaleGrossesse = ref(false)
const modaleVisite = ref(false)
const modaleAccouchement = ref(false)
const saving = ref(false)
const erreurGrossesse = ref('')
const formGrossesse = reactive({})
const formVisite = reactive({})
const formAccouchement = reactive({})
const recherchePatiente = ref('')
const resultatsPatientes = ref([])
let timerPatiente = null

const patienteChoisie = computed(() =>
  resultatsPatientes.value.find((p) => p.id === formGrossesse.patientId) ?? null,
)

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—'
}

function formatDateHeure(d) {
  return d ? new Date(d).toLocaleString('fr-FR') : '—'
}

function labelStatut(s) {
  if (s === 'EN_COURS') return 'En cours'
  if (s === 'ACCOUCHEE') return 'Accouchée'
  return 'Terminée'
}

function nomAgent(a) {
  if (!a) return '—'
  return `${a.personnel?.prenom ?? ''} ${a.personnel?.nom ?? ''}`.trim() || a.matricule
}

// ── Grossesses ──
async function chargerGrossesses() {
  chargement.value = true
  try {
    const { data } = await http.get('/maternite/grossesses', {
      params: {
        cliniqueId: cliniqueId.value,
        search: recherche.value || undefined,
        statut: filtreStatut.value || undefined,
        page: page.value,
        perPage: perPage.value,
      },
    })
    grossesses.value = data.data ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 1
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger les grossesses.')
  } finally {
    chargement.value = false
  }
}

function onRecherche() {
  clearTimeout(timerRecherche)
  timerRecherche = setTimeout(() => {
    page.value = 1
    chargerGrossesses()
  }, 300)
}

function changerPage(p) {
  page.value = p
  chargerGrossesses()
}

function changerPerPage(n) {
  perPage.value = n
  page.value = 1
  chargerGrossesses()
}

async function ouvrirGrossesse(g) {
  try {
    const { data } = await http.get(`/maternite/grossesses/${g.id}`)
    grossesseCourante.value = data
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger la grossesse.')
  }
}

function ouvrirNouvelleGrossesse() {
  Object.keys(formGrossesse).forEach((k) => delete formGrossesse[k])
  Object.assign(formGrossesse, {
    patientId: null,
    ddr: '',
    gravidite: null,
    parite: null,
    antecedentsObstetricaux: '',
    facteursRisque: '',
  })
  recherchePatiente.value = ''
  resultatsPatientes.value = []
  erreurGrossesse.value = ''
  modaleGrossesse.value = true
}

function ouvrirModifGrossesse(g) {
  Object.keys(formGrossesse).forEach((k) => delete formGrossesse[k])
  Object.assign(formGrossesse, {
    id: g.id,
    ddr: g.ddr ? g.ddr.slice(0, 10) : '',
    gravidite: g.gravidite,
    parite: g.parite,
    antecedentsObstetricaux: g.antecedentsObstetricaux ?? '',
    facteursRisque: g.facteursRisque ?? '',
  })
  erreurGrossesse.value = ''
  modaleGrossesse.value = true
}

function onRecherchePatiente() {
  clearTimeout(timerPatiente)
  const q = recherchePatiente.value.trim()
  if (q.length < 2) {
    resultatsPatientes.value = []
    return
  }
  timerPatiente = setTimeout(async () => {
    try {
      const { data } = await http.get('/accueil/patients', {
        params: { search: q, cliniqueId: cliniqueId.value },
      })
      resultatsPatientes.value = data
    } catch {
      resultatsPatientes.value = []
    }
  }, 300)
}

async function enregistrerGrossesse() {
  if (!formGrossesse.id && !formGrossesse.patientId) {
    erreurGrossesse.value = 'Sélectionnez une patiente.'
    return
  }
  if (!formGrossesse.ddr) {
    erreurGrossesse.value = 'La DDR est obligatoire.'
    return
  }
  saving.value = true
  try {
    if (formGrossesse.id) {
      await http.patch(`/maternite/grossesses/${formGrossesse.id}`, formGrossesse)
      toastSuccess('Grossesse modifiée.')
    } else {
      await http.post('/maternite/grossesses', {
        cliniqueId: cliniqueId.value,
        patientId: formGrossesse.patientId,
        ddr: formGrossesse.ddr,
        gravidite: formGrossesse.gravidite,
        parite: formGrossesse.parite,
        antecedentsObstetricaux: formGrossesse.antecedentsObstetricaux || undefined,
        facteursRisque: formGrossesse.facteursRisque || undefined,
      })
      toastSuccess('Grossesse créée.')
    }
    modaleGrossesse.value = false
    await chargerGrossesses()
  } catch (e) {
    erreurGrossesse.value = e.response?.data?.message || 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

// ── Visites CPN ──
function ouvrirNouvelleVisite() {
  Object.keys(formVisite).forEach((k) => delete formVisite[k])
  Object.assign(formVisite, {
    date: '',
    ageGestationnelSA: '',
    poids: null,
    tensionGauche: '',
    tensionDroite: '',
    hauteurUterine: '',
    bcf: '',
    mouvementsActifs: '',
    oedemes: '',
    albumine: '',
    sucre: '',
    presentation: '',
    tv: '',
    conseils: '',
    prochaineVisite: '',
  })
  modaleVisite.value = true
}

function ouvrirModifVisite(v) {
  Object.keys(formVisite).forEach((k) => delete formVisite[k])
  Object.assign(formVisite, {
    id: v.id,
    date: v.date ? v.date.slice(0, 10) : '',
    ageGestationnelSA: v.ageGestationnelSA ?? '',
    poids: v.poids != null ? Number(v.poids) : null,
    tensionGauche: v.tensionGauche ?? '',
    tensionDroite: v.tensionDroite ?? '',
    hauteurUterine: v.hauteurUterine ?? '',
    bcf: v.bcf ?? '',
    mouvementsActifs: v.mouvementsActifs ?? '',
    oedemes: v.oedemes ?? '',
    albumine: v.albumine ?? '',
    sucre: v.sucre ?? '',
    presentation: v.presentation ?? '',
    tv: v.tv ?? '',
    conseils: v.conseils ?? '',
    prochaineVisite: v.prochaineVisite ? v.prochaineVisite.slice(0, 10) : '',
  })
  modaleVisite.value = true
}

async function enregistrerVisite() {
  if (!formVisite.date) return
  saving.value = true
  try {
    if (formVisite.id) {
      await http.patch(`/maternite/cpn/${formVisite.id}`, formVisite)
      toastSuccess('Visite modifiée.')
    } else {
      await http.post(`/maternite/grossesses/${grossesseCourante.value.id}/cpn`, formVisite)
      toastSuccess('Visite CPN enregistrée.')
    }
    modaleVisite.value = false
    await ouvrirGrossesse({ id: grossesseCourante.value.id })
  } catch (e) {
    toastError(e.response?.data?.message || 'Enregistrement impossible.')
  } finally {
    saving.value = false
  }
}

// ── Accouchements ──
function ouvrirNouvelAccouchement() {
  const a = grossesseCourante.value?.accouchement
  Object.keys(formAccouchement).forEach((k) => delete formAccouchement[k])
  Object.assign(formAccouchement, {
    dateHeure: a?.dateHeure ? new Date(a.dateHeure).toISOString().slice(0, 16) : '',
    voie: a?.voie ?? 'VOIE_BASSE',
    termeSA: a?.termeSA ?? '',
    sexeEnfant: a?.sexeEnfant ?? '',
    poidsEnfant: a?.poidsEnfant != null ? Number(a.poidsEnfant) : null,
    apgar: a?.apgar ?? '',
    issueMere: a?.issueMere ?? '',
    issueEnfant: a?.issueEnfant ?? '',
    complications: a?.complications ?? '',
    lieu: a?.lieu ?? '',
  })
  modaleAccouchement.value = true
}

async function enregistrerAccouchement() {
  if (!formAccouchement.dateHeure) return
  saving.value = true
  try {
    await http.post(`/maternite/grossesses/${grossesseCourante.value.id}/accouchement`, formAccouchement)
    toastSuccess('Accouchement enregistré.')
    modaleAccouchement.value = false
    await ouvrirGrossesse({ id: grossesseCourante.value.id })
  } catch (e) {
    toastError(e.response?.data?.message || 'Enregistrement impossible.')
  } finally {
    saving.value = false
  }
}

async function chargerAccouchements() {
  chargementAcc.value = true
  try {
    const { data } = await http.get('/maternite/accouchements', {
      params: {
        cliniqueId: cliniqueId.value,
        search: rechercheAcc.value || undefined,
        page: pageAcc.value,
        perPage: perPageAcc.value,
      },
    })
    accouchements.value = data.data ?? []
    totalAcc.value = data.total ?? 0
    totalPagesAcc.value = data.totalPages ?? 1
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger les accouchements.')
  } finally {
    chargementAcc.value = false
  }
}

function onRechercheAcc() {
  clearTimeout(timerRechercheAcc)
  timerRechercheAcc = setTimeout(() => {
    pageAcc.value = 1
    chargerAccouchements()
  }, 300)
}

function ouvrirAccouchement(a) {
  // Ouvre la fiche grossesse pour modifier l'accouchement
  ouvrirGrossesse({ id: a.grossesse.id }).then(() => {
    onglet.value = 'grossesses'
    setTimeout(() => ouvrirNouvelAccouchement(), 200)
  })
}

onMounted(() => {
  chargerGrossesses()
})
</script>

<style scoped>
.maternite-page {
  min-height: 100vh;
}

.maternite-header {
  background: linear-gradient(120deg, #0d9488 0%, #0f766e 55%, #115e59 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 6px 24px rgba(13, 71, 67, 0.28);
  color: #fff;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 24px;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  font-size: 28px;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-text strong {
  font-size: 16px;
}

.brand-text span {
  font-size: 12px;
  opacity: 0.85;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-pill {
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 5px 13px;
  font-size: 12px;
}

.btn-back {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
}

.maternite-content {
  padding: 20px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.fiche-info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 28px;
  margin-bottom: 14px;
}

.fiche-ligne {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fiche-label {
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.patient-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.patient-item {
  text-align: left;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.patient-item:hover,
.patient-item.actif {
  background: var(--primary-light);
  border-color: var(--primary);
}
</style>
