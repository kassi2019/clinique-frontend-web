<template>
  <div>
    <div class="page-head">
      <div>
        <h1 class="page-title">Prestations & tarifs</h1>
        <p class="page-subtitle">Actes facturables et leurs tarifs, rattachés à un service (caisse §6).</p>
      </div>
      <button class="btn btn-primary" @click="openForm()">+ Nouvelle prestation</button>
    </div>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="Rechercher par code ou libellé…"
          @input="onSearch"
        />
        <select v-model="filtreService" @change="page = 1; load()">
          <option :value="null">Tous les services</option>
          <option v-for="s in services" :key="s.id" :value="s.id">{{ s.nom }}</option>
        </select>
      </div>

      <div v-if="loading" class="empty-state">Chargement…</div>
      <div v-else-if="error" class="alert alert-error">{{ error }}</div>
      <div v-else-if="liste.length === 0" class="empty-state">Aucune prestation trouvée.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Libellé</th>
              <th>Service</th>
              <th>Type</th>
              <th>Montant (FCFA)</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in liste" :key="p.id">
              <td><strong>{{ p.code }}</strong></td>
              <td>{{ p.libelle }}</td>
              <td>{{ p.service?.nom || '—' }}</td>
              <td>{{ typeLabel(p.type) }}</td>
              <td>{{ p.montant.toLocaleString('fr-FR') }}</td>
              <td>
                <span class="badge" :class="p.actif ? 'badge-success' : 'badge-danger'">
                  {{ p.actif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn btn-outline btn-sm" @click="openForm(p)">Modifier</button>
                  <button v-if="p.actif" class="btn btn-danger btn-sm" @click="desactiver(p)">Désactiver</button>
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
        <h2>{{ form.id ? 'Modifier la prestation' : 'Nouvelle prestation' }}</h2>
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
              <label>Service *</label>
              <select v-model="form.serviceId" required>
                <option v-for="s in services" :key="s.id" :value="s.id">{{ s.nom }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Code *</label>
              <input v-model.trim="form.code" required placeholder="Ex : CONS-GEN" />
            </div>
            <div class="field">
              <label>Type *</label>
              <select v-model="form.type" required>
                <option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>Libellé *</label>
            <input v-model.trim="form.libelle" required placeholder="Ex : Consultation générale" />
          </div>
          <div class="field">
            <label>Montant (FCFA) *</label>
            <input v-model.number="form.montant" type="number" min="0" step="1" required />
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

const TYPES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'EXAMEN_LABO', label: 'Examen de laboratoire' },
  { value: 'IMAGERIE', label: 'Imagerie' },
  { value: 'SOIN', label: 'Soin' },
  { value: 'MATERNITE', label: 'Maternité' },
  { value: 'HOSPITALISATION', label: 'Hospitalisation' },
  { value: 'MEDICAMENT', label: 'Médicament' },
  { value: 'AUTRE', label: 'Autre' },
]
const types = TYPES

const liste = ref([])
const services = ref([])
const cliniques = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const filtreService = ref(null)
let searchTimer = null

// Pagination
const page = ref(1)
const perPage = ref(10)
const total = ref(0)
const totalPages = ref(1)

const formVisible = ref(false)
const form = reactive({})
const formError = ref('')
const saving = ref(false)

function typeLabel(t) {
  return TYPES.find((x) => x.value === t)?.label || t
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      serviceId: filtreService.value ?? undefined,
      search: search.value || undefined,
      page: page.value,
      perPage: perPage.value,
    }
    const { data } = await http.get('/prestations', { params })
    liste.value = data.data
    total.value = data.total
    totalPages.value = data.totalPages
  } catch (e) {
    error.value = 'Impossible de charger les prestations.'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
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

function openForm(p) {
  formError.value = ''
  Object.keys(form).forEach((k) => delete form[k])
  if (p) {
    Object.assign(form, {
      id: p.id,
      cliniqueId: p.cliniqueId,
      serviceId: p.serviceId,
      code: p.code,
      libelle: p.libelle,
      type: p.type,
      montant: p.montant,
      actif: p.actif,
    })
  } else {
    Object.assign(form, {
      cliniqueId: cliniques.value[0]?.id ?? null,
      serviceId: services.value[0]?.id ?? null,
      code: '',
      libelle: '',
      type: 'CONSULTATION',
      montant: 0,
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
      await http.patch(`/prestations/${form.id}`, payload)
    } else {
      await http.post('/prestations', payload)
    }
    formVisible.value = false
    toastSuccess(form.id ? 'Prestation modifiée.' : 'Prestation créée.')
    await load()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    saving.value = false
  }
}

async function desactiver(p) {
  const reponse = await Swal.fire({
    title: `Désactiver la prestation « ${p.libelle} » ?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, désactiver',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.delete(`/prestations/${p.id}`)
    await load()
    toastSuccess('Prestation désactivée.')
  } catch (e) {
    toastError('Erreur lors de la désactivation.')
  }
}

onMounted(async () => {
  load()
  try {
    // perPage 0 = liste complète (pour les sélecteurs et filtres)
    const [s, c] = await Promise.all([
      http.get('/services', { params: { perPage: 0 } }),
      http.get('/cliniques'),
    ])
    services.value = s.data.data
    cliniques.value = c.data
  } catch {
    // listes vides si l'API ne répond pas
  }
})
</script>
