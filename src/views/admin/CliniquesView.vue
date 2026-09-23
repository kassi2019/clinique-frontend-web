<template>
  <div>
    <div class="page-head">
      <div>
        <h1 class="page-title">Clinique</h1>
        <p class="page-subtitle">
          Établissement(s) géré(s) par l'application — le nom apparaît sur la page
          de connexion, les en-têtes et les tickets imprimés.
        </p>
      </div>
      <button class="btn btn-primary" @click="openForm()">+ Nouvelle clinique</button>
    </div>

    <div class="card">
      <div v-if="loading" class="empty-state">Chargement…</div>
      <div v-else-if="error" class="alert alert-error">{{ error }}</div>
      <div v-else-if="liste.length === 0" class="empty-state">Aucune clinique enregistrée.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Adresse</th>
              <th>Téléphone</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in liste" :key="c.id">
              <td><strong>{{ c.code }}</strong></td>
              <td>{{ c.nom }}</td>
              <td>{{ c.adresse || '—' }}</td>
              <td>{{ c.telephone || '—' }}</td>
              <td>
                <span class="badge" :class="c.statut === 'ACTIF' ? 'badge-success' : 'badge-danger'">
                  {{ c.statut }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn btn-outline btn-sm" @click="openForm(c)">✏️ Modifier</button>
                  <button v-if="c.statut === 'ACTIF'" class="btn btn-danger btn-sm" @click="desactiver(c)">
                    Désactiver
                  </button>
                  <button v-else class="btn btn-success btn-sm reactiver-btn" @click="reactiver(c)">
                    ↻ Réactiver
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Formulaire -->
    <div v-if="formVisible" class="modal-backdrop">
      <div class="modal">
        <h2>{{ form.id ? 'Modifier la clinique' : 'Nouvelle clinique' }}</h2>
        <p v-if="formError" class="alert alert-error">{{ formError }}</p>
        <form @submit.prevent="save">
          <div class="form-row">
            <div class="field">
              <label>Code *</label>
              <input v-model.trim="form.code" required placeholder="Ex : CLI001" />
            </div>
            <div class="field">
              <label>Nom *</label>
              <input v-model.trim="form.nom" required placeholder="Ex : Clinique Centrale" />
            </div>
          </div>
          <div class="field">
            <label>Adresse</label>
            <input v-model.trim="form.adresse" placeholder="Ex : Abidjan, Côte d'Ivoire" />
          </div>
          <div class="field">
            <label>Téléphone</label>
            <input v-model.trim="form.telephone" placeholder="Ex : +225 27 22 00 00 00" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="formVisible = false">✖ Annuler</button>
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
import { toastError, toastSuccess } from '../../utils/notifications'

const liste = ref([])
const loading = ref(false)
const error = ref('')

const formVisible = ref(false)
const form = reactive({})
const formError = ref('')
const saving = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get('/cliniques')
    liste.value = data
  } catch (e) {
    error.value = 'Impossible de charger les cliniques.'
  } finally {
    loading.value = false
  }
}

function openForm(c) {
  formError.value = ''
  Object.keys(form).forEach((k) => delete form[k])
  if (c) {
    Object.assign(form, {
      id: c.id,
      code: c.code,
      nom: c.nom,
      adresse: c.adresse ?? '',
      telephone: c.telephone ?? '',
      statut: c.statut,
    })
  } else {
    Object.assign(form, {
      code: '',
      nom: '',
      adresse: '',
      telephone: '',
      statut: 'ACTIF',
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
      await http.patch(`/cliniques/${form.id}`, payload)
    } else {
      await http.post('/cliniques', payload)
    }
    formVisible.value = false
    toastSuccess(form.id ? 'Clinique modifiée.' : 'Clinique créée.')
    await load()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    saving.value = false
  }
}

async function desactiver(c) {
  const reponse = await Swal.fire({
    title: `Désactiver « ${c.nom} » ?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, désactiver',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.delete(`/cliniques/${c.id}`)
    await load()
    toastSuccess('Clinique désactivée.')
  } catch (e) {
    toastError('Erreur lors de la désactivation.')
  }
}

async function reactiver(c) {
  const reponse = await Swal.fire({
    title: `Réactiver « ${c.nom} » ?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui, réactiver',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#0e7490',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.patch(`/cliniques/${c.id}`, { statut: 'ACTIF' })
    await load()
    toastSuccess('Clinique réactivée.')
  } catch (e) {
    toastError('Erreur lors de la réactivation.')
  }
}

onMounted(load)
</script>

<style scoped>
</style>
