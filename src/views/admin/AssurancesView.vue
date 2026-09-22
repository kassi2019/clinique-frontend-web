<template>
  <div>
    <div class="card-header">
      <h2>🛡️ Assurances & prises en charge</h2>
      <button v-if="vue === 'assurances'" class="btn btn-primary btn-sm" @click="ouvrirAjoutAssurance">＋ Ajouter une assurance</button>
    </div>

    <nav class="tabs-nav">
      <button class="tab-btn" :class="{ active: vue === 'assurances' }" @click="vue = 'assurances'">
        Assurances & formules
      </button>
      <button class="tab-btn" :class="{ active: vue === 'facturation' }" @click="vue = 'facturation'; chargerFacturation()">
        Facturation des assurances
      </button>
    </nav>

    <!-- ============ FACTURATION ============ -->
    <div v-if="vue === 'facturation'">
      <div class="toolbar">
        <input v-model="factDebut" type="date" class="search-input" style="max-width: 160px; flex: none" @change="chargerFacturation" />
        <span>→</span>
        <input v-model="factFin" type="date" class="search-input" style="max-width: 160px; flex: none" @change="chargerFacturation" />
        <select v-model="factAssuranceId" class="search-input" style="max-width: 220px; flex: none" @change="chargerFacturation">
          <option :value="null">Toutes les assurances</option>
          <option v-for="a in assurances" :key="a.id" :value="a.id">{{ a.libelle }}</option>
        </select>
        <button class="btn btn-outline btn-sm" @click="chargerFacturation">Actualiser</button>
      </div>

      <div v-if="facturation.parAssurance.length === 0" class="empty-state">
        Aucune prise en charge sur la période.
      </div>
      <template v-else>
        <div class="kpi-grid">
          <div v-for="a in facturation.parAssurance" :key="a.assurance" class="kpi-card">
            <div class="kpi-titre">{{ a.assurance }}</div>
            <div class="kpi-lignes">
              <span class="part-assurance">{{ a.totalAssurance.toLocaleString('fr-FR') }} F</span> à facturer
              <span class="text-muted">({{ a.nbLignes }} ligne(s) · part patient {{ a.totalPatient.toLocaleString('fr-FR') }} F)</span>
            </div>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Reçu</th>
                <th>Assurance</th>
                <th>Formule</th>
                <th>Taux</th>
                <th>Part assurance</th>
                <th>Part patient</th>
                <th>Motif</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in facturation.lignes" :key="l.id">
                <td>{{ formatDateHeure(l.createdAt) }}</td>
                <td>
                  <strong>{{ l.patient.nom }} {{ l.patient.prenom }}</strong>
                  <span class="text-muted"> ({{ l.numeroOrdre }})</span>
                </td>
                <td>{{ l.numeroRecu }}</td>
                <td>{{ l.assurance?.libelle || '—' }}</td>
                <td>{{ l.formule?.libelle || '—' }}</td>
                <td>
                  <span v-if="l.tauxApplique !== l.tauxParametre" class="text-muted" :title="'Taux paramétré : ' + l.tauxParametre + ' %'">
                    ⚠️ {{ l.tauxApplique }} %*
                  </span>
                  <span v-else>{{ l.tauxApplique }} %</span>
                </td>
                <td><strong class="part-assurance">{{ l.montantAssurance.toLocaleString('fr-FR') }} F</strong></td>
                <td><span class="part-patient">{{ l.montantPatient.toLocaleString('fr-FR') }} F</span></td>
                <td>{{ l.motifModification || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <PaginationBar
          v-if="facturation.total > facturation.perPage"
          :page="facturation.page"
          :per-page="facturation.perPage"
          :total="facturation.total"
          :total-pages="facturation.totalPages"
          @change="changerPageFact"
          @per-page="changerPerPageFact"
        />
      </template>
    </div>

    <!-- ============ ASSURANCES ============ -->
    <div v-else>

    <div v-if="chargement" class="empty-state">Chargement…</div>
    <div v-else-if="assurances.length === 0" class="empty-state">
      Aucune assurance paramétrée (SUNU, NSIA, MUGEF…).
    </div>
    <div v-else class="assurances-liste">
      <div v-for="a in assurances" :key="a.id" class="assurance-card">
        <div class="assurance-tete" @click="basculerOuverture(a.id)">
          <div class="assurance-titre">
            <span class="chevron">{{ assuranceOuverte === a.id ? '▾' : '▸' }}</span>
            <strong>{{ a.libelle }}</strong>
            <span class="text-muted"> ({{ a.code }})</span>
            <span v-if="a.telephone" class="text-muted"> · {{ a.telephone }}</span>
            <span class="text-muted nb-formules">({{ a.formules.length }} formule(s))</span>
          </div>
          <div class="actions">
            <span class="badge" :class="a.statut === 'ACTIF' ? 'badge-success' : 'badge-muted'">
              {{ a.statut === 'ACTIF' ? 'Active' : 'Inactive' }}
            </span>
            <button class="btn btn-outline btn-sm" @click.stop="ouvrirAjoutFormule(a)">＋ Formule</button>
            <button class="btn btn-outline btn-sm" @click.stop="basculerAssurance(a)">
              {{ a.statut === 'ACTIF' ? 'Désactiver' : 'Réactiver' }}
            </button>
          </div>
        </div>

        <div v-if="assuranceOuverte === a.id">
          <div v-for="f in a.formules" :key="f.id" class="formule-card">
          <div class="formule-tete">
            <div>
              <strong>{{ f.libelle }}</strong>
              <span class="text-muted"> ({{ f.code }})</span>
              <span v-if="f.dateDebut || f.dateFin" class="text-muted">
                · {{ f.dateDebut ? formatDate(f.dateDebut) : '…' }} → {{ f.dateFin ? formatDate(f.dateFin) : '…' }}
              </span>
            </div>
            <div class="actions">
              <span class="badge" :class="f.statut === 'ACTIF' ? 'badge-success' : 'badge-muted'">
                {{ f.statut === 'ACTIF' ? 'Active' : 'Inactive' }}
              </span>
              <button class="btn btn-outline btn-sm" @click="ouvrirAjoutCouverture(f)">＋ Couverture</button>
              <button class="btn btn-outline btn-sm" @click="basculerFormule(f)">
                {{ f.statut === 'ACTIF' ? 'Désactiver' : 'Réactiver' }}
              </button>
            </div>
          </div>

          <div v-if="f.couvertures.length === 0" class="small-note text-muted">
            Aucune prestation couverte pour cette formule.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Prestation</th>
                  <th>Taux</th>
                  <th>Plafond</th>
                  <th>Validité</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in f.couvertures" :key="c.id">
                  <td>{{ c.prestation?.libelle || '—' }}</td>
                  <td><strong>{{ c.tauxCouverture }} %</strong></td>
                  <td>{{ c.plafond ? Number(c.plafond).toLocaleString('fr-FR') + ' F' : '—' }}</td>
                  <td>
                    {{ c.dateDebut ? formatDate(c.dateDebut) : '—' }} → {{ c.dateFin ? formatDate(c.dateFin) : '—' }}
                  </td>
                  <td>
                    <span class="badge" :class="c.statut === 'ACTIF' ? 'badge-success' : 'badge-muted'">
                      {{ c.statut === 'ACTIF' ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-outline btn-sm" @click="ouvrirModifCouverture(c)">✏️</button>
                      <button class="btn btn-outline btn-sm" @click="basculerCouverture(c)">
                        {{ c.statut === 'ACTIF' ? 'Désactiver' : 'Réactiver' }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Modale : assurance -->
    <div v-if="modaleAssurance" class="modal-backdrop">
      <div class="modal">
        <h2>🛡️ Nouvelle assurance</h2>
        <div class="form-row">
          <div class="field">
            <label>Code *</label>
            <input v-model.trim="formAssurance.code" placeholder="SUNU" />
          </div>
          <div class="field">
            <label>Libellé *</label>
            <input v-model.trim="formAssurance.libelle" placeholder="SUNU ASSURANCES" />
          </div>
          <div class="field">
            <label>Téléphone</label>
            <input v-model.trim="formAssurance.telephone" />
          </div>
          <div class="field">
            <label>Email</label>
            <input v-model.trim="formAssurance.email" />
          </div>
          <div class="field">
            <label>Adresse</label>
            <input v-model.trim="formAssurance.adresse" />
          </div>
          <div class="field">
            <label>N° d'agrément</label>
            <input v-model.trim="formAssurance.numeroAgrement" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleAssurance = false">Annuler</button>
          <button class="btn btn-primary" @click="enregistrerAssurance">💾 Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Modale : formule -->
    <div v-if="modaleFormule" class="modal-backdrop">
      <div class="modal">
        <h2>📋 Formule — {{ assuranceFormule?.libelle }}</h2>
        <div class="form-row">
          <div class="field">
            <label>Code *</label>
            <input v-model.trim="formFormule.code" placeholder="STANDARD" />
          </div>
          <div class="field">
            <label>Libellé *</label>
            <input v-model.trim="formFormule.libelle" placeholder="Formule Standard" />
          </div>
          <div class="field">
            <label>Description</label>
            <input v-model.trim="formFormule.description" />
          </div>
          <div class="field">
            <label>Date de début</label>
            <input v-model="formFormule.dateDebut" type="date" />
          </div>
          <div class="field">
            <label>Date de fin</label>
            <input v-model="formFormule.dateFin" type="date" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleFormule = false">Annuler</button>
          <button class="btn btn-primary" @click="enregistrerFormule">💾 Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Modale : couverture -->
    <div v-if="modaleCouverture" class="modal-backdrop">
      <div class="modal">
        <h2>🧾 Couverture — {{ formuleCouverture?.libelle }}</h2>
        <div class="form-row">
          <div class="field" style="grid-column: span 2">
            <label>Prestation *</label>
            <SelectSearch
              v-model="formCouverture.prestationId"
              :options="optionsPrestations"
              placeholder="— Choisir une prestation —"
            />
          </div>
          <div class="field">
            <label>Taux de couverture (%) *</label>
            <input v-model.number="formCouverture.tauxCouverture" type="number" min="0" max="100" />
          </div>
          <div class="field">
            <label>Plafond (F)</label>
            <input v-model.number="formCouverture.plafond" type="number" min="0" />
          </div>
          <div class="field">
            <label>Date de début</label>
            <input v-model="formCouverture.dateDebut" type="date" />
          </div>
          <div class="field">
            <label>Date de fin</label>
            <input v-model="formCouverture.dateFin" type="date" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleCouverture = false">Annuler</button>
          <button class="btn btn-primary" @click="enregistrerCouverture">💾 Enregistrer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import http from '../../api/http'
import PaginationBar from '../../components/PaginationBar.vue'
import SelectSearch from '../../components/SelectSearch.vue'
import { useAuthStore } from '../../stores/auth'
import { toastError, toastSuccess } from '../../utils/notifications'

const auth = useAuthStore()
const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)

const assurances = ref([])
const prestations = ref([])
const chargement = ref(false)
const assuranceOuverte = ref(null)
const vue = ref('assurances')

// Facturation des assurances
const factDebut = ref(new Date().toISOString().slice(0, 10))
const factFin = ref(new Date().toISOString().slice(0, 10))
const factAssuranceId = ref(null)
const facturation = ref({ lignes: [], total: 0, page: 1, perPage: 20, totalPages: 1, parAssurance: [] })
const factPage = ref(1)
const factPerPage = ref(20)

async function chargerFacturation() {
  try {
    const { data } = await http.get('/assurances/facturation', {
      params: {
        cliniqueId: cliniqueId.value,
        debut: factDebut.value,
        fin: factFin.value,
        assuranceId: factAssuranceId.value ?? undefined,
        page: factPage.value,
        perPage: factPerPage.value,
      },
    })
    facturation.value = data
  } catch {
    facturation.value = { lignes: [], total: 0, page: 1, perPage: 20, totalPages: 1, parAssurance: [] }
  }
}

function changerPageFact(p) {
  factPage.value = p
  chargerFacturation()
}

function changerPerPageFact(n) {
  factPerPage.value = n
  factPage.value = 1
  chargerFacturation()
}

function basculerOuverture(id) {
  assuranceOuverte.value = assuranceOuverte.value === id ? null : id
}

const modaleAssurance = ref(false)
const formAssurance = reactive({ code: '', libelle: '', telephone: '', email: '', adresse: '', numeroAgrement: '' })

const modaleFormule = ref(false)
const assuranceFormule = ref(null)
const formFormule = reactive({ code: '', libelle: '', description: '', dateDebut: '', dateFin: '' })

const modaleCouverture = ref(false)
const formuleCouverture = ref(null)
const couvertureEditee = ref(null)
const formCouverture = reactive({ prestationId: null, tauxCouverture: null, plafond: null, dateDebut: '', dateFin: '' })

const optionsPrestations = computed(() =>
  prestations.value
    .filter((p) => p.actif)
    .map((p) => ({ value: p.id, label: p.libelle })),
)

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

async function charger() {
  chargement.value = true
  try {
    const [a, p] = await Promise.all([
      http.get('/assurances', { params: { cliniqueId: cliniqueId.value } }),
      http.get('/prestations', { params: { perPage: 0, cliniqueId: cliniqueId.value } }),
    ])
    assurances.value = a.data
    prestations.value = p.data.data ?? []
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger les assurances.')
  } finally {
    chargement.value = false
  }
}

// ── Assurance ──
function ouvrirAjoutAssurance() {
  Object.assign(formAssurance, { code: '', libelle: '', telephone: '', email: '', adresse: '', numeroAgrement: '' })
  modaleAssurance.value = true
}

async function enregistrerAssurance() {
  if (!formAssurance.code.trim() || !formAssurance.libelle.trim()) {
    toastError('Le code et le libellé sont obligatoires.')
    return
  }
  try {
    await http.post('/assurances', { ...formAssurance }, { params: { cliniqueId: cliniqueId.value } })
    toastSuccess('Assurance créée.')
    modaleAssurance.value = false
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  }
}

async function basculerAssurance(a) {
  try {
    await http.delete(`/assurances/${a.id}`)
    toastSuccess('Statut mis à jour.')
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Opération impossible.')
  }
}

// ── Formule ──
function ouvrirAjoutFormule(a) {
  assuranceFormule.value = a
  Object.assign(formFormule, { code: '', libelle: '', description: '', dateDebut: '', dateFin: '' })
  modaleFormule.value = true
}

async function enregistrerFormule() {
  if (!formFormule.code.trim() || !formFormule.libelle.trim()) {
    toastError('Le code et le libellé sont obligatoires.')
    return
  }
  try {
    await http.post('/assurances/formules', {
      assuranceId: assuranceFormule.value.id,
      ...formFormule,
    })
    toastSuccess('Formule créée.')
    modaleFormule.value = false
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  }
}

async function basculerFormule(f) {
  try {
    await http.delete(`/assurances/formules/${f.id}`)
    toastSuccess('Statut mis à jour.')
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Opération impossible.')
  }
}

// ── Couverture ──
function ouvrirAjoutCouverture(f) {
  formuleCouverture.value = f
  couvertureEditee.value = null
  Object.assign(formCouverture, { prestationId: null, tauxCouverture: null, plafond: null, dateDebut: '', dateFin: '' })
  modaleCouverture.value = true
}

function ouvrirModifCouverture(c) {
  formuleCouverture.value = null
  couvertureEditee.value = c
  Object.assign(formCouverture, {
    prestationId: c.prestationId,
    tauxCouverture: c.tauxCouverture,
    plafond: c.plafond ? Number(c.plafond) : null,
    dateDebut: c.dateDebut ? c.dateDebut.slice(0, 10) : '',
    dateFin: c.dateFin ? c.dateFin.slice(0, 10) : '',
  })
  modaleCouverture.value = true
}

async function enregistrerCouverture() {
  if (!formCouverture.prestationId || formCouverture.tauxCouverture == null) {
    toastError('La prestation et le taux sont obligatoires.')
    return
  }
  try {
    if (couvertureEditee.value) {
      await http.patch(`/assurances/couvertures/${couvertureEditee.value.id}`, { ...formCouverture })
      toastSuccess('Couverture modifiée.')
    } else {
      await http.post('/assurances/couvertures', {
        formuleId: formuleCouverture.value.id,
        ...formCouverture,
      })
      toastSuccess('Couverture créée.')
    }
    modaleCouverture.value = false
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  }
}

async function basculerCouverture(c) {
  try {
    await http.delete(`/assurances/couvertures/${c.id}`)
    toastSuccess('Statut mis à jour.')
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Opération impossible.')
  }
}

onMounted(charger)
</script>

<style scoped>
.assurances-liste {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.assurance-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  background: #f8fdfb;
}
.assurance-tete,
.formule-tete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.assurance-tete {
  cursor: pointer;
}
.assurance-titre {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.chevron {
  color: #0d9488;
  font-weight: 800;
  font-size: 15px;
}
.nb-formules {
  font-size: 12px;
}
.formule-card {
  border: 1px solid #d5eee9;
  border-radius: 10px;
  padding: 10px;
  margin-top: 8px;
  background: #fff;
}
.small-note {
  font-size: 13px;
}
.tabs-nav {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  border-bottom: 2px solid #d5eee9;
  flex-wrap: wrap;
}
.tab-btn {
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  color: #5f857f;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
}
.tab-btn.active {
  color: #0f766e;
  border-bottom-color: #0d9488;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.kpi-card {
  border: 1px solid #c9ece5;
  border-radius: 10px;
  padding: 12px;
  background: #f0fdfa;
}
.kpi-titre {
  font-weight: 800;
  color: #134e4a;
  margin-bottom: 4px;
}
.kpi-lignes {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}
.part-assurance {
  color: #166534;
  font-weight: 700;
}
.part-patient {
  color: #991b1b;
  font-weight: 700;
}
</style>
