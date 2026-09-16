<template>
  <div>
    <div class="page-head">
      <div>
        <h1 class="page-title">Services</h1>
        <p class="page-subtitle">Services de la clinique : accueil, caisse, médecine, pharmacie, laboratoire…</p>
      </div>
      <button class="btn btn-primary" @click="openForm()">+ Nouveau service</button>
    </div>

    <div class="card">
      <div v-if="loading" class="empty-state">Chargement…</div>
      <div v-else-if="error" class="alert alert-error">{{ error }}</div>
      <div v-else-if="liste.length === 0" class="empty-state">Aucun service créé.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Description</th>
              <th>Clinique</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in liste" :key="s.id">
              <td><span class="code-chip">{{ s.code }}</span></td>
              <td>{{ s.nom }}</td>
              <td>{{ s.description || '—' }}</td>
              <td>{{ s.clinique?.nom || '—' }}</td>
              <td>
                <span class="badge" :class="s.actif ? 'badge-success' : 'badge-danger'">
                  {{ s.actif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn btn-outline btn-sm" @click="openForm(s)">Modifier</button>
                  <button v-if="s.actif" class="btn btn-danger btn-sm" @click="desactiver(s)">Désactiver</button>
                  <button v-else class="btn btn-outline btn-sm reactiver-btn" @click="reactiver(s)">↻ Réactiver</button>
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

    <!-- Formulaire -->
    <div v-if="formVisible" class="modal-backdrop">
      <div class="modal">
        <h2>{{ form.id ? 'Modifier le service' : 'Nouveau service' }}</h2>
        <p v-if="formError" class="alert alert-error">{{ formError }}</p>
        <form @submit.prevent="save">
          <div class="form-row">
            <div class="field">
              <label>Clinique *</label>
              <select v-model="form.cliniqueId" required>
                <option v-for="c in cliniques" :key="c.id" :value="c.id">{{ c.nom }}</option>
              </select>
            </div>
            <div class="field">
              <label>Code * (auto à partir du nom)</label>
              <input v-model.trim="form.code" maxlength="4" required placeholder="Ex : MED" @input="codeManuel = true" />
            </div>
          </div>
          <div class="field">
            <label>Nom *</label>
            <input v-model.trim="form.nom" required placeholder="Ex : Médecine générale" @input="genererCode" />
          </div>
          <div class="field">
            <label>Description</label>
            <input v-model.trim="form.description" />
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
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import Swal from 'sweetalert2'
import http from '../../api/http'
import PaginationBar from '../../components/PaginationBar.vue'
import { toastError, toastSuccess } from '../../utils/notifications'

const liste = ref([])
const cliniques = ref([])
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
const codeManuel = ref(false)

/** Génère le code depuis les 3 premières lettres du nom (sauf saisie manuelle). */
function genererCode() {
  if (codeManuel.value) return
  const mots = (form.nom || '').trim().split(/\s+/)
  const code = (mots[0] || '').slice(0, 3).toUpperCase()
  form.code = code
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get('/services', {
      params: { page: page.value, perPage: perPage.value },
    })
    liste.value = data.data
    total.value = data.total
    totalPages.value = data.totalPages
  } catch (e) {
    error.value = 'Impossible de charger les services.'
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

function openForm(s) {
  formError.value = ''
  codeManuel.value = !!s // en édition, on considère le code existant comme manuel
  Object.keys(form).forEach((k) => delete form[k])
  if (s) {
    Object.assign(form, {
      id: s.id,
      cliniqueId: s.cliniqueId,
      code: s.code,
      nom: s.nom,
      description: s.description ?? '',
      actif: s.actif,
    })
  } else {
    Object.assign(form, {
      cliniqueId: cliniques.value[0]?.id ?? null,
      code: '',
      nom: '',
      description: '',
      actif: true,
    })
  }
  formVisible.value = true
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const payload = { ...form }
    delete payload.id
    if (form.id) {
      await http.patch(`/services/${form.id}`, payload)
    } else {
      await http.post('/services', payload)
    }
    formVisible.value = false
    toastSuccess(form.id ? 'Service modifié.' : 'Service créé.')
    await load()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    saving.value = false
  }
}

async function desactiver(s) {
  const reponse = await Swal.fire({
    title: `Désactiver le service « ${s.nom} » ?`,
    text: 'Le service ne sera plus proposé à l\'accueil. Vous pourrez le réactiver à tout moment.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, désactiver',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.delete(`/services/${s.id}`)
    await load()
    toastSuccess('Service désactivé.')
  } catch (e) {
    toastError('Erreur lors de la désactivation.')
  }
}

async function reactiver(s) {
  const reponse = await Swal.fire({
    title: `Réactiver le service « ${s.nom} » ?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui, réactiver',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#0e7490',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.patch(`/services/${s.id}`, { actif: true })
    await load()
    toastSuccess('Service réactivé.')
  } catch (e) {
    toastError('Erreur lors de la réactivation.')
  }
}

onMounted(async () => {
  load()
  try {
    const { data } = await http.get('/cliniques')
    cliniques.value = data
  } catch {
    // liste vide si l'API ne répond pas
  }
})
</script>

<style scoped>
.code-chip {
  font-family: Consolas, monospace;
  font-weight: 700;
  color: #0f766e;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12.5px;
}
.reactiver-btn {
  color: #16a34a;
  border-color: #bbf7d0;
}
.reactiver-btn:hover {
  background: #f0fdf4;
}
</style>
