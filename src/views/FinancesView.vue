<template>
  <div class="fin-page">
    <!-- En-tête -->
    <header class="fin-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">💼</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Finances — pointage du personnel et vacations</span>
          </div>
        </div>
        <div class="header-actions">
          <span class="date-pill">{{ todayLabel }}</span>
          <button class="btn btn-outline btn-sm btn-back" @click="router.push({ name: 'home' })">← Modules</button>
        </div>
      </div>
    </header>

    <main class="fin-content">
      <nav class="tabs-nav">
        <button class="tab-btn" :class="{ active: onglet === 'direct' }" @click="onglet = 'direct'">
          🟢 En service maintenant <span class="tab-count">{{ direct.total }}</span>
        </button>
        <button class="tab-btn" :class="{ active: onglet === 'services' }" @click="onglet = 'services'">
          📋 Services du mois
        </button>
        <button class="tab-btn" :class="{ active: onglet === 'tarifs' }" @click="onglet = 'tarifs'">
          💰 Tarifs des agents
        </button>
        <button class="tab-btn" :class="{ active: onglet === 'fiches' }" @click="onglet = 'fiches'">
          🧾 Fiches de vacation
        </button>
      </nav>

      <!-- ═══════════ EN SERVICE MAINTENANT (temps réel) ═══════════ -->
      <section v-if="onglet === 'direct'" class="card">
        <div class="card-header">
          <h2>Qui est en service maintenant ?</h2>
          <div class="header-actions">
            <span class="text-muted small-note">
              Mise à jour automatique toutes les 30 secondes — dernière à {{ heure(direct.maintenant) }}
            </span>
            <button class="btn btn-outline btn-sm" @click="chargerDirect">🔄 Actualiser</button>
          </div>
        </div>
        <div class="kpi-ligne">
          <div class="kpi"><strong>{{ direct.total }}</strong> agent(s) en service</div>
          <div class="kpi kpi-vert"><strong>{{ direct.presents }}</strong> actif(s) sur leur poste</div>
          <div class="kpi kpi-orange"><strong>{{ direct.total - direct.presents }}</strong> poste(s) inactif(s)</div>
        </div>
        <div v-if="!direct.lignes.length" class="empty-state">Personne n'a pris son service pour le moment.</div>
        <div v-else class="cartes-service">
          <div v-for="l in direct.lignes" :key="l.id" class="carte-service" :class="{ inactif: !l.present }">
            <div class="carte-tete">
              <span class="pastille" :class="l.present ? 'pastille-verte' : 'pastille-orange'"></span>
              <strong>{{ l.agent.nom }} {{ l.agent.prenom }}</strong>
            </div>
            <div class="carte-fonction">{{ l.agent.fonction || l.agent.role }}</div>
            <div class="carte-ligne">Depuis le <strong>{{ dateHeure(l.debut) }}</strong></div>
            <div class="carte-ligne">Durée : <strong>{{ duree(l.heures) }}</strong></div>
            <div class="carte-ligne">Présence mesurée sur le poste : {{ duree(l.minutesPresence / 60) }}</div>
            <div class="carte-etat">
              <span v-if="l.present" class="badge badge-success">Actif sur son poste</span>
              <span v-else class="badge badge-warning">
                Poste inactif depuis {{ depuis(l.derniereActivite || l.debut) }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════════ SERVICES DU MOIS (contrôle et validation) ═══════════ -->
      <section v-else-if="onglet === 'services'" class="card">
        <div class="card-header">
          <h2>Services pointés</h2>
        </div>
        <div class="toolbar">
          <input v-model="mois" type="month" class="search-input champ-court" @change="chargerServices" />
          <select v-model="filtreAgent" class="search-input champ-moyen" @change="chargerServices">
            <option :value="null">Tous les agents</option>
            <option v-for="a in agents" :key="a.personnelId" :value="a.personnelId">{{ a.nom }} {{ a.prenom }}</option>
          </select>
          <button class="btn btn-outline btn-sm" @click="chargerServices">🔄 Actualiser</button>
        </div>
        <p class="small-note text-muted">
          Vérifiez les services avant de calculer les fiches : corrigez une durée erronée (avec un motif), validez ou rejetez.
          Les services fermés automatiquement (agent qui a oublié de terminer) sont marqués « À vérifier ».
        </p>
        <div v-if="!services.length" class="empty-state">Aucun service pointé sur ce mois.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th><th>Début</th><th>Fin</th><th>Durée</th><th>Présence</th><th>Vacations</th><th>État</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in services" :key="s.id">
                <td>
                  <strong>{{ s.agent.nom }} {{ s.agent.prenom }}</strong>
                  <div class="text-muted">{{ s.agent.fonction }}</div>
                </td>
                <td>{{ dateHeure(s.debut) }}</td>
                <td>{{ s.fin ? dateHeure(s.fin) : '—' }}</td>
                <td>
                  {{ duree(s.heures) }}
                  <div v-if="s.corrige" class="text-muted" :title="s.motifCorrection">corrigé (brut {{ duree(s.heuresBrutes) }})</div>
                </td>
                <td :class="{ 'presence-faible': s.fin && s.minutesPresence / 60 < s.heures * 0.2 }">
                  {{ duree(s.minutesPresence / 60) }}
                </td>
                <td>{{ nombre(s.vacations) }}</td>
                <td>
                  <span class="badge" :class="STATUTS_SERVICE[s.statut]?.classe">{{ STATUTS_SERVICE[s.statut]?.libelle || s.statut }}</span>
                  <div v-if="s.motifCorrection" class="text-muted motif">{{ s.motifCorrection }}</div>
                </td>
                <td class="actions-cellule">
                  <template v-if="s.statut !== 'EN_COURS'">
                    <button class="btn btn-outline btn-sm" title="Corriger la durée" @click="ouvrirCorrection(s)">✏️</button>
                    <button v-if="s.statut !== 'VALIDE'" class="btn btn-success btn-sm" title="Valider" @click="statutService(s, 'VALIDE')">✅</button>
                    <button v-if="s.statut !== 'REJETE'" class="btn btn-danger btn-sm" title="Rejeter (ne compte pas)" @click="statutService(s, 'REJETE')">✕</button>
                  </template>
                  <span v-else class="text-muted">en cours</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ═══════════ TARIFS DES AGENTS ═══════════ -->
      <section v-else-if="onglet === 'tarifs'" class="card">
        <div class="card-header"><h2>Tarifs des agents</h2></div>
        <p class="small-note text-muted">
          Renseignez le mode de rémunération et le tarif de chaque agent concerné, puis enregistrez la ligne.
          Le tarif est figé dans la fiche du mois au moment de sa validation.
        </p>
        <div class="toolbar">
          <input v-model="rechercheAgent" class="search-input" placeholder="Rechercher un agent…" />
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th><th>Statut</th><th>Rémunération</th><th>Tarif (FCFA)</th><th>Durée d'une vacation</th><th>Actif</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in agentsFiltres" :key="a.personnelId">
                <td>
                  <strong>{{ a.nom }} {{ a.prenom }}</strong>
                  <div class="text-muted">{{ a.fonction }} · {{ a.matricule }}<span v-if="!a.aUnCompte"> · sans compte de connexion</span></div>
                </td>
                <td>
                  <select v-model="a.form.statut">
                    <option value="VACATAIRE">Vacataire</option>
                    <option value="SALARIE">Salarié</option>
                  </select>
                </td>
                <td>
                  <select v-model="a.form.mode">
                    <option value="VACATION">À la vacation</option>
                    <option value="HEURE">À l'heure</option>
                  </select>
                </td>
                <td><input v-model.number="a.form.tarif" type="number" min="0" step="500" class="champ-nombre" /></td>
                <td>
                  <select v-model.number="a.form.dureeVacationHeures" :disabled="a.form.mode === 'HEURE'">
                    <option :value="24">24 heures</option>
                    <option :value="12">12 heures</option>
                    <option :value="8">8 heures</option>
                    <option :value="6">6 heures</option>
                  </select>
                </td>
                <td><input v-model="a.form.actif" type="checkbox" /></td>
                <td>
                  <button class="btn btn-primary btn-sm" @click="enregistrerTarif(a)">💾</button>
                  <span v-if="a.remuneration" class="badge badge-success">paramétré</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ═══════════ FICHES DE VACATION ═══════════ -->
      <section v-else class="card">
        <div class="card-header">
          <h2>Fiches de vacation du mois</h2>
          <div class="header-actions">
            <button class="btn btn-outline btn-sm" :disabled="!fiches.lignes.length" @click="exporterFichesExcel">📊 Excel</button>
            <button class="btn btn-outline btn-sm" :disabled="!fiches.lignes.length" @click="imprimerEtat">🖨️ État du mois (A4)</button>
          </div>
        </div>
        <div class="toolbar">
          <input v-model="mois" type="month" class="search-input champ-court" @change="chargerFiches" />
          <button class="btn btn-primary btn-sm" :disabled="calculEnCours" @click="genererFiches">
            {{ calculEnCours ? 'Calcul…' : '🔄 Calculer / recalculer les fiches du mois' }}
          </button>
        </div>
        <p class="small-note text-muted">
          Le calcul reprend les services du mois (sauf les services rejetés) et le tarif de chaque agent.
          Une fiche validée ou payée n'est plus recalculée.
        </p>
        <div v-if="!fiches.lignes.length" class="empty-state">
          Aucune fiche pour ce mois. Paramétrez les tarifs, puis cliquez sur « Calculer les fiches du mois ».
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th><th>Services</th><th>Heures</th><th>Vacations</th><th>Tarif</th><th>Montant</th>
                <th>Primes</th><th>Retenues</th><th>Total dû</th><th>État</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in fiches.lignes" :key="f.id">
                <td>
                  <strong>{{ f.personnel.nom }} {{ f.personnel.prenom }}</strong>
                  <div class="text-muted">{{ f.personnel.fonction }}</div>
                </td>
                <td>
                  {{ f.nbServices }}
                  <div v-if="f.nbAVerifier" class="presence-faible">⚠️ {{ f.nbAVerifier }} à vérifier</div>
                </td>
                <td>{{ nombre(f.heures) }}</td>
                <td>{{ nombre(f.vacations) }}</td>
                <td>{{ montant(f.tarif) }} / {{ f.mode === 'HEURE' ? 'heure' : 'vacation' }}</td>
                <td>{{ montant(f.montantBase) }}</td>
                <td>
                  <input v-if="f.statut === 'BROUILLON'" v-model.number="f.primes" type="number" min="0" class="champ-nombre" />
                  <span v-else>{{ montant(f.primes) }}</span>
                </td>
                <td>
                  <input v-if="f.statut === 'BROUILLON'" v-model.number="f.retenues" type="number" min="0" class="champ-nombre" />
                  <span v-else>{{ montant(f.retenues) }}</span>
                </td>
                <td><strong>{{ montant(f.statut === 'BROUILLON' ? f.montantBase + (f.primes || 0) - (f.retenues || 0) : f.montantTotal) }}</strong></td>
                <td>
                  <span class="badge" :class="STATUTS_FICHE[f.statut].classe">{{ STATUTS_FICHE[f.statut].libelle }}</span>
                  <div v-if="f.validePar" class="text-muted">par {{ f.validePar }}</div>
                </td>
                <td class="actions-cellule">
                  <template v-if="f.statut === 'BROUILLON'">
                    <button class="btn btn-outline btn-sm" title="Enregistrer primes et retenues" @click="enregistrerFiche(f)">💾</button>
                    <button class="btn btn-success btn-sm" title="Valider la fiche" @click="statutFiche(f, 'VALIDEE')">✅ Valider</button>
                  </template>
                  <template v-else-if="f.statut === 'VALIDEE'">
                    <button class="btn btn-primary btn-sm" @click="statutFiche(f, 'PAYEE')">💵 Payée</button>
                    <button class="btn btn-outline btn-sm" title="Repasser en brouillon" @click="statutFiche(f, 'BROUILLON')">↩️</button>
                  </template>
                  <button class="btn btn-outline btn-sm" title="Imprimer la fiche" @click="imprimerFiche(f)">🖨️</button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="8" class="total-libelle">TOTAL DU MOIS</td>
                <td colspan="3"><strong>{{ montant(fiches.total) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </main>

    <!-- Fenêtre : correction d'un service -->
    <div v-if="correction" class="modal-backdrop">
      <div class="modal">
        <h2>✏️ Corriger le service — {{ correction.agent }}</h2>
        <div class="form-row">
          <div class="field">
            <label>Début</label>
            <input v-model="correction.debut" type="datetime-local" />
          </div>
          <div class="field">
            <label>Fin</label>
            <input v-model="correction.fin" type="datetime-local" />
          </div>
          <div class="field">
            <label>Heures retenues (vide = calcul automatique)</label>
            <input v-model="correction.heuresRetenues" type="number" min="0" step="0.5" />
          </div>
          <div class="field">
            <label>Vacations retenues (vide = calcul automatique)</label>
            <input v-model="correction.vacationsRetenues" type="number" min="0" step="0.5" />
          </div>
        </div>
        <div class="field">
          <label>Motif de la correction *</label>
          <input v-model.trim="correction.motif" placeholder="Ex : oubli de terminer le service, garde de 24 h confirmée" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="correction = null">✖ Annuler</button>
          <button class="btn btn-primary" @click="enregistrerCorrection">💾 Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Feuilles A4 imprimables -->
    <div v-if="impression" id="rapport-print" class="fin-print">
      <div class="fin-a4">
        <h1 class="fin-a4-clinique">{{ cliniqueNom }}</h1>
        <template v-if="impression.type === 'fiche'">
          <h2 class="fin-a4-titre">FICHE DE VACATION — {{ libelleMois(impression.fiche.mois) }}</h2>
          <table class="fin-a4-infos">
            <tbody>
              <tr><td>Agent</td><td><strong>{{ impression.fiche.personnel.nom }} {{ impression.fiche.personnel.prenom }}</strong></td></tr>
              <tr><td>Matricule / fonction</td><td>{{ impression.fiche.personnel.matricule }} — {{ impression.fiche.personnel.fonction }}</td></tr>
              <tr><td>Tarif appliqué</td><td>{{ montant(impression.fiche.tarif) }} par {{ impression.fiche.mode === 'HEURE' ? 'heure' : `vacation de ${impression.fiche.dureeVacationHeures} h` }}</td></tr>
            </tbody>
          </table>
          <h3>Services effectués</h3>
          <table>
            <thead>
              <tr><th>N°</th><th>Début</th><th>Fin</th><th>Heures</th><th>Vacations</th><th>Observation</th></tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in impression.services" :key="s.id">
                <td>{{ i + 1 }}</td>
                <td>{{ dateHeure(s.debut) }}</td>
                <td>{{ s.fin ? dateHeure(s.fin) : '—' }}</td>
                <td class="num">{{ nombre(s.heures) }}</td>
                <td class="num">{{ nombre(s.vacations) }}</td>
                <td>{{ s.motifCorrection || (s.statut === 'A_VERIFIER' ? 'À vérifier' : '') }}</td>
              </tr>
            </tbody>
          </table>
          <table class="fin-a4-totaux">
            <tbody>
              <tr><td>Total des heures</td><td class="num">{{ nombre(impression.fiche.heures) }}</td></tr>
              <tr><td>Total des vacations</td><td class="num">{{ nombre(impression.fiche.vacations) }}</td></tr>
              <tr><td>Montant des {{ impression.fiche.mode === 'HEURE' ? 'heures' : 'vacations' }}</td><td class="num">{{ montant(impression.fiche.montantBase) }}</td></tr>
              <tr><td>Primes</td><td class="num">+ {{ montant(impression.fiche.primes) }}</td></tr>
              <tr><td>Retenues</td><td class="num">− {{ montant(impression.fiche.retenues) }}</td></tr>
              <tr class="fin-a4-total"><td>MONTANT DÛ</td><td class="num">{{ montant(impression.fiche.montantTotal) }}</td></tr>
            </tbody>
          </table>
          <p v-if="impression.fiche.commentaire">Observation : {{ impression.fiche.commentaire }}</p>
          <div class="fin-a4-sign">
            <div>L'agent<br /><small>Nom, signature et date</small></div>
            <div>Le responsable<br /><small>Signature et cachet</small></div>
          </div>
        </template>
        <template v-else>
          <h2 class="fin-a4-titre">ÉTAT DES VACATIONS — {{ libelleMois(mois) }}</h2>
          <table>
            <thead>
              <tr><th>Agent</th><th>Services</th><th>Heures</th><th>Vacations</th><th>Tarif</th><th>Primes</th><th>Retenues</th><th>Total dû</th><th>État</th></tr>
            </thead>
            <tbody>
              <tr v-for="f in fiches.lignes" :key="f.id">
                <td>{{ f.personnel.nom }} {{ f.personnel.prenom }}</td>
                <td class="num">{{ f.nbServices }}</td>
                <td class="num">{{ nombre(f.heures) }}</td>
                <td class="num">{{ nombre(f.vacations) }}</td>
                <td class="num">{{ montant(f.tarif) }}</td>
                <td class="num">{{ montant(f.primes) }}</td>
                <td class="num">{{ montant(f.retenues) }}</td>
                <td class="num"><strong>{{ montant(f.montantTotal) }}</strong></td>
                <td>{{ STATUTS_FICHE[f.statut].libelle }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td colspan="7">TOTAL</td><td class="num">{{ montant(fiches.total) }}</td><td></td></tr>
            </tfoot>
          </table>
          <div class="fin-a4-sign">
            <span>Imprimé le {{ dateHeure(new Date()) }}</span>
            <div>Le responsable<br /><small>Signature et cachet</small></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'
import { confirmer, toastError, toastSuccess } from '../utils/notifications'

const auth = useAuthStore()
const router = useRouter()
const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')
const todayLabel = computed(() =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
)

const onglet = ref('direct')
const moisCourant = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const mois = ref(moisCourant())

const STATUTS_SERVICE = {
  EN_COURS: { libelle: 'En cours', classe: 'badge-warning' },
  TERMINE: { libelle: 'Terminé', classe: 'badge-muted' },
  A_VERIFIER: { libelle: 'À vérifier', classe: 'badge-danger' },
  VALIDE: { libelle: 'Validé', classe: 'badge-success' },
  REJETE: { libelle: 'Rejeté', classe: 'badge-muted' },
}
const STATUTS_FICHE = {
  BROUILLON: { libelle: 'Brouillon', classe: 'badge-warning' },
  VALIDEE: { libelle: 'Validée', classe: 'badge-success' },
  PAYEE: { libelle: 'Payée', classe: 'badge-muted' },
}

// ── Formats ──
const nombre = (x) => Number(x ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
const montant = (x) => `${Math.round(Number(x ?? 0)).toLocaleString('fr-FR')} F`
const dateHeure = (d) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const heure = (d) => (d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—')
function duree(heures) {
  const totalMin = Math.max(0, Math.round(Number(heures ?? 0) * 60))
  return `${Math.floor(totalMin / 60)} h ${String(totalMin % 60).padStart(2, '0')}`
}
function depuis(d) {
  const min = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000))
  return min < 60 ? `${min} min` : duree(min / 60)
}
function libelleMois(m) {
  const [a, mm] = (m ?? '').split('-').map(Number)
  return a ? new Date(a, mm - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase() : ''
}
/** Date → valeur d'un champ « datetime-local » (heure locale). */
function versChampDate(d) {
  if (!d) return ''
  const x = new Date(d)
  const z = (n) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())}T${z(x.getHours())}:${z(x.getMinutes())}`
}

// ═══════════ En service maintenant ═══════════
const direct = ref({ lignes: [], total: 0, presents: 0, maintenant: null })
let minuterie = null
async function chargerDirect() {
  try {
    const { data } = await http.get('/finances/en-service', { params: { cliniqueId: cliniqueId.value } })
    direct.value = data
  } catch (e) {
    toastError(e.response?.data?.message || 'Liste du personnel en service indisponible.')
  }
}

// ═══════════ Services du mois ═══════════
const services = ref([])
const filtreAgent = ref(null)
async function chargerServices() {
  try {
    const { data } = await http.get('/finances/services', {
      params: { cliniqueId: cliniqueId.value, mois: mois.value, personnelId: filtreAgent.value ?? undefined },
    })
    services.value = data
  } catch (e) {
    services.value = []
    toastError(e.response?.data?.message || 'Services indisponibles.')
  }
}
async function statutService(s, statut) {
  if (statut === 'REJETE') {
    const ok = await confirmer({
      titre: 'Rejeter ce service ?',
      texte: `Service de ${s.agent.nom} ${s.agent.prenom} du ${dateHeure(s.debut)} : il ne sera pas payé.`,
      boutonOui: 'Oui, rejeter',
      danger: true,
    })
    if (!ok) return
  }
  try {
    await http.patch(`/finances/services/${s.id}`, { statut })
    toastSuccess(statut === 'VALIDE' ? 'Service validé.' : 'Service rejeté.')
    await chargerServices()
  } catch (e) {
    toastError(e.response?.data?.message || 'Modification impossible.')
  }
}
const correction = ref(null)
function ouvrirCorrection(s) {
  correction.value = {
    id: s.id,
    agent: `${s.agent.nom} ${s.agent.prenom}`,
    debut: versChampDate(s.debut),
    fin: versChampDate(s.fin),
    heuresRetenues: s.corrige ? s.heures : '',
    vacationsRetenues: s.corrige ? s.vacations : '',
    motif: s.motifCorrection ?? '',
  }
}
async function enregistrerCorrection() {
  const c = correction.value
  if (!c.motif) {
    toastError('Indiquez le motif de la correction.')
    return
  }
  try {
    await http.patch(`/finances/services/${c.id}`, {
      debut: c.debut ? new Date(c.debut).toISOString() : undefined,
      fin: c.fin ? new Date(c.fin).toISOString() : undefined,
      heuresRetenues: c.heuresRetenues === '' ? null : c.heuresRetenues,
      vacationsRetenues: c.vacationsRetenues === '' ? null : c.vacationsRetenues,
      motif: c.motif,
    })
    toastSuccess('Service corrigé.')
    correction.value = null
    await chargerServices()
  } catch (e) {
    toastError(e.response?.data?.message || 'Correction impossible.')
  }
}

// ═══════════ Tarifs ═══════════
const agents = ref([])
const rechercheAgent = ref('')
async function chargerAgents() {
  try {
    const { data } = await http.get('/finances/remunerations', { params: { cliniqueId: cliniqueId.value } })
    agents.value = data.map((a) => ({
      ...a,
      form: {
        statut: a.remuneration?.statut ?? 'VACATAIRE',
        mode: a.remuneration?.mode ?? 'VACATION',
        tarif: a.remuneration?.tarif ?? 0,
        dureeVacationHeures: a.remuneration?.dureeVacationHeures ?? 24,
        actif: a.remuneration?.actif ?? true,
      },
    }))
  } catch (e) {
    toastError(e.response?.data?.message || 'Liste des agents indisponible.')
  }
}
const agentsFiltres = computed(() => {
  const q = rechercheAgent.value.trim().toLowerCase()
  return q ? agents.value.filter((a) => `${a.nom} ${a.prenom} ${a.fonction} ${a.matricule}`.toLowerCase().includes(q)) : agents.value
})
async function enregistrerTarif(a) {
  try {
    const { data } = await http.put(`/finances/remunerations/${a.personnelId}`, a.form)
    a.remuneration = data
    toastSuccess(`Tarif de ${a.nom} ${a.prenom} enregistré.`)
  } catch (e) {
    toastError(e.response?.data?.message || 'Enregistrement impossible.')
  }
}

// ═══════════ Fiches de vacation ═══════════
const fiches = ref({ lignes: [], total: 0 })
const calculEnCours = ref(false)
async function chargerFiches() {
  try {
    const { data } = await http.get('/finances/fiches', { params: { cliniqueId: cliniqueId.value, mois: mois.value } })
    fiches.value = data
  } catch (e) {
    fiches.value = { lignes: [], total: 0 }
    toastError(e.response?.data?.message || 'Fiches indisponibles.')
  }
}
async function genererFiches() {
  calculEnCours.value = true
  try {
    const { data } = await http.post('/finances/fiches/generer', { cliniqueId: cliniqueId.value, mois: mois.value })
    toastSuccess(`${data.creees} fiche(s) créée(s), ${data.misesAJour} recalculée(s)${data.figees ? `, ${data.figees} déjà validée(s) non modifiée(s)` : ''}.`)
    await chargerFiches()
  } catch (e) {
    toastError(e.response?.data?.message || 'Calcul impossible.')
  } finally {
    calculEnCours.value = false
  }
}
async function enregistrerFiche(f) {
  try {
    await http.patch(`/finances/fiches/${f.id}`, { primes: f.primes || 0, retenues: f.retenues || 0 })
    toastSuccess('Fiche enregistrée.')
    await chargerFiches()
  } catch (e) {
    toastError(e.response?.data?.message || 'Enregistrement impossible.')
  }
}
async function statutFiche(f, statut) {
  const agent = `${f.personnel.nom} ${f.personnel.prenom}`
  const questions = {
    VALIDEE: { titre: 'Valider la fiche ?', texte: `Fiche de ${agent} : elle ne sera plus recalculée et les services du mois seront verrouillés.`, boutonOui: 'Oui, valider' },
    PAYEE: { titre: 'Confirmer le paiement ?', texte: `${montant(f.montantTotal)} versés à ${agent}. Une fiche payée est définitive.`, boutonOui: 'Oui, payée' },
    BROUILLON: { titre: 'Repasser en brouillon ?', texte: `La fiche de ${agent} redevient modifiable.`, boutonOui: 'Oui, modifier' },
  }
  if (!(await confirmer(questions[statut]))) return
  try {
    if (statut === 'VALIDEE') await http.patch(`/finances/fiches/${f.id}`, { primes: f.primes || 0, retenues: f.retenues || 0 })
    await http.post(`/finances/fiches/${f.id}/statut`, { statut })
    toastSuccess('Fiche mise à jour.')
    await chargerFiches()
  } catch (e) {
    toastError(e.response?.data?.message || 'Changement impossible.')
  }
}

// ── Impressions A4 ──
const impression = ref(null)
async function lancerImpression(contenu) {
  impression.value = contenu
  await nextTick()
  setTimeout(() => window.print(), 300)
}
async function imprimerFiche(f) {
  try {
    const { data } = await http.get(`/finances/fiches/${f.id}`)
    lancerImpression({ type: 'fiche', fiche: f, services: data.services })
  } catch (e) {
    toastError(e.response?.data?.message || 'Impression impossible.')
  }
}
function imprimerEtat() {
  lancerImpression({ type: 'etat' })
}
function exporterFichesExcel() {
  const lignes = fiches.value.lignes.map((f) => ({
    'Agent': `${f.personnel.nom} ${f.personnel.prenom}`,
    'Matricule': f.personnel.matricule,
    'Fonction': f.personnel.fonction,
    'Services': f.nbServices,
    'Heures': f.heures,
    'Vacations': f.vacations,
    'Mode': f.mode === 'HEURE' ? "À l'heure" : 'À la vacation',
    'Tarif': f.tarif,
    'Montant': f.montantBase,
    'Primes': f.primes,
    'Retenues': f.retenues,
    'Total dû': f.montantTotal,
    'État': STATUTS_FICHE[f.statut].libelle,
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lignes), 'Vacations')
  XLSX.writeFile(wb, `vacations_${mois.value}.xlsx`)
}

// ── Chargements ──
watch(onglet, (o) => {
  if (o === 'direct') chargerDirect()
  if (o === 'services') chargerServices()
  if (o === 'tarifs') chargerAgents()
  if (o === 'fiches') chargerFiches()
})
onMounted(() => {
  chargerDirect()
  chargerAgents()
  minuterie = setInterval(() => {
    if (onglet.value === 'direct') chargerDirect()
  }, 30000)
})
onUnmounted(() => clearInterval(minuterie))
</script>

<style scoped>
.fin-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
}
.fin-header {
  background: linear-gradient(120deg, #0d9488 0%, #0f766e 55%, #115e59 100%);
  box-shadow: 0 6px 24px rgba(13, 71, 67, 0.28);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 24px;
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
}
.brand-text span {
  color: rgba(236, 253, 245, 0.75);
  font-size: 12px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.date-pill {
  padding: 5px 13px;
  font-size: 12.5px;
  font-weight: 600;
  color: #ecfdf5;
  text-transform: capitalize;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
}
.btn-back {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.45);
}
.fin-content {
  flex: 1;
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
.champ-nombre {
  padding: 7px 10px;
  font-size: 14px;
  font-family: inherit;
  background: var(--surface);
  border: 1.5px solid var(--border-champ);
  border-radius: var(--radius);
}
.tab-count {
  margin-left: 6px;
  padding: 1px 8px;
  font-size: 11px;
  color: #fff;
  background: #16a34a;
  border-radius: 999px;
}
.kpi-ligne {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}
.kpi {
  padding: 10px 16px;
  font-size: 14px;
  background: #f1f5f9;
  border-radius: 10px;
}
.kpi strong {
  font-size: 20px;
}
.kpi-vert {
  color: #166534;
  background: #dcfce7;
}
.kpi-orange {
  color: #9a3412;
  background: #ffedd5;
}
.cartes-service {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.carte-service {
  padding: 14px 16px;
  background: #fff;
  border: 1.5px solid #86efac;
  border-radius: 12px;
}
.carte-service.inactif {
  border-color: #fdba74;
}
.carte-tete {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.pastille {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}
.pastille-verte {
  background: #16a34a;
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.18);
}
.pastille-orange {
  background: #f97316;
}
.carte-fonction {
  margin: 2px 0 8px 19px;
  font-size: 12.5px;
  color: #64748b;
}
.carte-ligne {
  font-size: 13px;
  line-height: 1.6;
}
.carte-etat {
  margin-top: 8px;
}
.champ-court {
  max-width: 180px;
  flex: none;
}
.champ-moyen {
  max-width: 260px;
  flex: none;
}
.champ-nombre {
  width: 110px;
}
.presence-faible {
  color: #c2410c;
}
.motif {
  max-width: 220px;
  font-size: 12px;
}
.actions-cellule {
  white-space: nowrap;
}
.total-libelle {
  text-align: right;
  font-weight: 800;
}

/* Feuilles A4 */
@media screen {
  .fin-print {
    position: fixed;
    left: -10000px;
    top: 0;
    width: 190mm;
  }
}
@media print {
  .fin-header,
  .fin-content,
  .modal-backdrop {
    display: none !important;
  }
}
.fin-a4 {
  color: #111;
  background: #fff;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 11.5px;
}
.fin-a4-clinique {
  margin: 0 0 8px;
  padding-bottom: 6px;
  font-size: 17px;
  text-align: center;
  text-transform: uppercase;
  border-bottom: 1.2px solid #111;
}
.fin-a4-titre {
  margin: 0 0 12px;
  font-size: 14px;
  text-align: center;
}
.fin-a4 h3 {
  margin: 14px 0 4px;
  font-size: 12.5px;
}
.fin-a4 table {
  width: 100%;
  border-collapse: collapse;
}
.fin-a4 th,
.fin-a4 td {
  padding: 4px 6px;
  text-align: left;
  border: 1px solid #94a3b8;
}
.fin-a4 th,
.fin-a4 tfoot td {
  font-weight: 700;
  background: #f1f5f9;
}
.fin-a4 .num {
  text-align: right;
  white-space: nowrap;
}
.fin-a4-infos td:first-child {
  width: 30%;
  font-weight: 700;
  background: #f8fafc;
}
.fin-a4-totaux {
  width: 55% !important;
  margin: 12px 0 0 auto;
}
.fin-a4-total td {
  font-size: 13px;
  font-weight: 800;
  background: #e2e8f0;
}
.fin-a4-sign {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 30px;
  margin-top: 26px;
  page-break-inside: avoid;
}
.fin-a4-sign div {
  flex: 1;
  max-width: 260px;
  padding: 8px 10px 50px;
  font-weight: 700;
  border: 1px solid #94a3b8;
}
.fin-a4-sign small {
  font-weight: 400;
  color: #64748b;
}
</style>
