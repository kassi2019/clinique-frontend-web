<template>
  <div>
    <div class="page-head">
      <div>
        <h1 class="page-title">Utilisateurs</h1>
        <p class="page-subtitle">
          Comptes de connexion à l'application — un compte est toujours rattaché à une fiche Personnel (§16.3).
        </p>
      </div>
      <button class="btn btn-primary" @click="openForm()">+ Nouvel utilisateur</button>
    </div>

    <div class="card">
      <div v-if="loading" class="empty-state">Chargement…</div>
      <div v-else-if="error" class="alert alert-error">{{ error }}</div>
      <div v-else-if="liste.length === 0" class="empty-state">Aucun utilisateur créé.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Matricule (login)</th>
              <th>Personnel rattaché</th>
              <th>Rôle</th>
              <th>Dernière connexion</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in liste" :key="u.id">
              <td><strong>{{ u.matricule }}</strong></td>
              <td>
                {{ u.personnel?.nom }} {{ u.personnel?.prenom }}
                <span class="text-muted">({{ u.personnel?.matricule }})</span>
              </td>
              <td><span class="badge badge-muted">{{ u.role?.nom }}</span></td>
              <td>{{ u.derniereConnexion ? formatDate(u.derniereConnexion) : 'Jamais' }}</td>
              <td>
                <span class="badge" :class="u.statut === 'ACTIF' ? 'badge-success' : 'badge-danger'">{{ u.statut }}</span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn btn-outline btn-sm" @click="openForm(u)">Modifier</button>
                  <button class="btn btn-outline btn-sm" @click="openReset(u)">Mot de passe</button>
                  <button
                    v-if="u.statut === 'ACTIF'"
                    class="btn btn-danger btn-sm"
                    @click="suspendre(u)"
                  >
                    Suspendre
                  </button>
                  <button
                    v-else
                    class="btn btn-outline btn-sm reactiver-btn"
                    @click="reactiver(u)"
                  >
                    ↻ Réactiver
                  </button>
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
    </div>

    <!-- Formulaire création / édition -->
    <div v-if="formVisible" class="modal-backdrop">
      <div class="modal">
        <h2>{{ form.id ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur' }}</h2>
        <p v-if="formError" class="alert alert-error">{{ formError }}</p>
        <form @submit.prevent="save">
          <div class="field">
            <label>Fiche personnel rattachée *</label>
            <SelectSearch
              v-model="form.personnelId"
              :options="optionsPersonnel"
              placeholder="— Choisir —"
            />
          </div>
          <div class="form-row">
            <div class="field">
              <label>Matricule de connexion *</label>
              <input v-model.trim="form.matricule" required placeholder="Ex : koffi.a" />
            </div>
            <div class="field">
              <label>Rôle *</label>
              <SelectSearch
                v-model="form.roleId"
                :options="optionsRoles"
                placeholder="— Choisir —"
              />
            </div>
          </div>
          <div v-if="!form.id" class="field">
            <label>Mot de passe * (6 caractères minimum)</label>
            <input v-model="form.motDePasse" type="password" required minlength="6" />
          </div>
          <div v-if="form.id" class="field">
            <label>Statut</label>
            <select v-model="form.statut">
              <option value="ACTIF">Actif</option>
              <option value="SUSPENDU">Suspendu</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="formVisible = false">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Réinitialisation du mot de passe -->
    <div v-if="resetVisible" class="modal-backdrop">
      <div class="modal">
        <h2>Réinitialiser le mot de passe — {{ resetTarget?.matricule }}</h2>
        <p v-if="resetError" class="alert alert-error">{{ resetError }}</p>
        <form @submit.prevent="doReset">
          <div class="field">
            <label>Nouveau mot de passe * (6 caractères minimum)</label>
            <input v-model="nouveauMotDePasse" type="password" required minlength="6" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="resetVisible = false">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Enregistrement…' : 'Valider' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import Swal from 'sweetalert2'
import http from '../../api/http'
import PaginationBar from '../../components/PaginationBar.vue'
import SelectSearch from '../../components/SelectSearch.vue'
import { toastError, toastSuccess } from '../../utils/notifications'

const liste = ref([])
const roles = ref([])
const personnel = ref([])
const loading = ref(false)
const error = ref('')

// Pagination
const page = ref(1)
const perPage = ref(10)
const total = ref(0)
const totalPages = ref(1)

const formVisible = ref(false)
const form = reactive({})
const formError = ref('')
const saving = ref(false)

const resetVisible = ref(false)
const resetTarget = ref(null)
const resetError = ref('')
const nouveauMotDePasse = ref('')

// Personnel sans compte (ou le personnel déjà rattaché à ce compte en édition)
const personnelDisponibles = computed(() => {
  const rattache = form.id ? form.personnelId : null
  return personnel.value.filter((p) => !p.utilisateur || p.utilisateur?.id === rattache)
})

const optionsPersonnel = computed(() =>
  personnelDisponibles.value.map((p) => ({
    value: p.id,
    label: `${p.matricule} — ${p.nom} ${p.prenom} (${p.fonction})`,
  })),
)
const optionsRoles = computed(() =>
  roles.value.map((r) => ({ value: r.id, label: r.nom })),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get('/utilisateurs', {
      params: { page: page.value, perPage: perPage.value },
    })
    liste.value = data.data
    total.value = data.total
    totalPages.value = data.totalPages
  } catch (e) {
    error.value = 'Impossible de charger les utilisateurs.'
  } finally {
    loading.value = false
  }
}

function changerPage(p) {
  page.value = p
  load()
}

function changerPerPage(n) {
  perPage.value = n
  page.value = 1
  load()
}

function openForm(u) {
  formError.value = ''
  Object.keys(form).forEach((k) => delete form[k])
  if (u) {
    Object.assign(form, {
      id: u.id,
      personnelId: u.personnelId,
      matricule: u.matricule,
      roleId: u.roleId,
      statut: u.statut,
      motDePasse: '',
    })
  } else {
    Object.assign(form, {
      personnelId: personnelDisponibles.value[0]?.id ?? null,
      matricule: '',
      roleId: roles.value[0]?.id ?? null,
      motDePasse: '',
    })
  }
  formVisible.value = true
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    if (form.id) {
      await http.patch(`/utilisateurs/${form.id}`, {
        matricule: form.matricule,
        roleId: form.roleId,
        statut: form.statut,
      })
    } else {
      await http.post('/utilisateurs', {
        personnelId: form.personnelId,
        matricule: form.matricule,
        motDePasse: form.motDePasse,
        roleId: form.roleId,
      })
    }
    formVisible.value = false
    toastSuccess(form.id ? 'Utilisateur modifié.' : 'Utilisateur créé.')
    await load()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    saving.value = false
  }
}

function openReset(u) {
  resetTarget.value = u
  nouveauMotDePasse.value = ''
  resetError.value = ''
  resetVisible.value = true
}

async function doReset() {
  saving.value = true
  resetError.value = ''
  try {
    await http.post(`/utilisateurs/${resetTarget.value.id}/reinitialiser-mot-de-passe`, {
      motDePasse: nouveauMotDePasse.value,
    })
    resetVisible.value = false
    toastSuccess('Mot de passe réinitialisé.')
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de la réinitialisation.')
  } finally {
    saving.value = false
  }
}

async function suspendre(u) {
  const reponse = await Swal.fire({
    title: `Suspendre le compte ${u.matricule} ?`,
    text: 'Le compte sera conservé pour la traçabilité (statut SUSPENDU).',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, suspendre',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.delete(`/utilisateurs/${u.id}`)
    await load()
    toastSuccess('Compte suspendu.')
  } catch (e) {
    toastError('Erreur lors de la suspension.')
  }
}

async function reactiver(u) {
  const reponse = await Swal.fire({
    title: `Réactiver le compte ${u.matricule} ?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui, réactiver',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#0e7490',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.patch(`/utilisateurs/${u.id}`, { statut: 'ACTIF' })
    await load()
    toastSuccess('Compte réactivé.')
  } catch (e) {
    toastError('Erreur lors de la réactivation.')
  }
}

function formatDate(d) {
  return new Date(d).toLocaleString('fr-FR')
}


onMounted(async () => {
  load()
  try {
    // perPage 0 = liste complète (pour le sélecteur de rattachement)
    const [r, p] = await Promise.all([
      http.get('/roles', { params: { perPage: 0 } }),
      http.get('/personnel', { params: { perPage: 0 } }),
    ])
    roles.value = r.data.data
    personnel.value = p.data.data
  } catch {
    // listes vides si l'API ne répond pas
  }
})
</script>

<style scoped>
.reactiver-btn {
  color: #16a34a;
  border-color: #bbf7d0;
}
.reactiver-btn:hover {
  background: #f0fdf4;
}
</style>
