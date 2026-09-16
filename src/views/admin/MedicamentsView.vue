<template>
  <div>
    <div class="page-head">
      <div>
        <h1 class="page-title">Médicaments</h1>
        <p class="page-subtitle">
          Catalogue utilisé par les médecins pour les ordonnances (module Consultation).
        </p>
      </div>
      <button class="btn btn-primary" @click="openForm()">+ Nouveau médicament</button>
    </div>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="Rechercher un médicament…"
          @input="onSearch"
        />
      </div>

      <div v-if="loading" class="empty-state">Chargement…</div>
      <div v-else-if="error" class="alert alert-error">{{ error }}</div>
      <div v-else-if="liste.length === 0" class="empty-state">Aucun médicament.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Forme</th>
              <th>Dosage</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in liste" :key="m.id">
              <td><strong>{{ m.nom }}</strong></td>
              <td>{{ m.forme || '—' }}</td>
              <td>{{ m.dosage || '—' }}</td>
              <td>
                <span class="badge" :class="m.actif ? 'badge-success' : 'badge-danger'">
                  {{ m.actif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn btn-outline btn-sm" @click="openForm(m)">Modifier</button>
                  <button v-if="m.actif" class="btn btn-danger btn-sm" @click="desactiver(m)">Désactiver</button>
                  <button v-else class="btn btn-outline btn-sm reactiver-btn" @click="reactiver(m)">↻ Réactiver</button>
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
        <h2>{{ form.id ? 'Modifier le médicament' : 'Nouveau médicament' }}</h2>
        <p v-if="formError" class="alert alert-error">{{ formError }}</p>
        <form @submit.prevent="save">
          <div class="field">
            <label>Nom *</label>
            <input v-model.trim="form.nom" required placeholder="Ex : Amoxicilline" />
          </div>
          <div class="form-row">
            <div class="field">
              <label>Forme</label>
              <input v-model.trim="form.forme" placeholder="Ex : Comprimé, sirop, injectable…" />
            </div>
            <div class="field">
              <label>Dosage</label>
              <input v-model.trim="form.dosage" placeholder="Ex : 500 mg" />
            </div>
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
import { useAuthStore } from '../../stores/auth'
import http from '../../api/http'
import { toastError, toastSuccess } from '../../utils/notifications'

const auth = useAuthStore()
const cliniqueId = auth.user?.clinique?.id ?? 1

const liste = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
let searchTimer = null

const formVisible = ref(false)
const form = reactive({})
const formError = ref('')
const saving = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get('/medicaments', { params: { cliniqueId } })
    liste.value = data.filter(
      (m) => !search.value || m.nom.toLowerCase().includes(search.value.toLowerCase()),
    )
  } catch (e) {
    error.value = 'Impossible de charger les médicaments.'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 300)
}

function openForm(m) {
  formError.value = ''
  Object.keys(form).forEach((k) => delete form[k])
  if (m) {
    Object.assign(form, {
      id: m.id,
      nom: m.nom,
      forme: m.forme ?? '',
      dosage: m.dosage ?? '',
    })
  } else {
    Object.assign(form, { nom: '', forme: '', dosage: '' })
  }
  formVisible.value = true
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      cliniqueId,
      nom: form.nom,
      forme: form.forme || undefined,
      dosage: form.dosage || undefined,
    }
    if (form.id) {
      await http.patch(`/medicaments/${form.id}`, payload)
    } else {
      await http.post('/medicaments', payload)
    }
    formVisible.value = false
    toastSuccess(form.id ? 'Médicament modifié.' : 'Médicament créé.')
    await load()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    saving.value = false
  }
}

async function desactiver(m) {
  const reponse = await Swal.fire({
    title: `Désactiver « ${m.nom} » ?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, désactiver',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.delete(`/medicaments/${m.id}`)
    await load()
    toastSuccess('Médicament désactivé.')
  } catch (e) {
    toastError('Erreur lors de la désactivation.')
  }
}

async function reactiver(m) {
  const reponse = await Swal.fire({
    title: `Réactiver « ${m.nom} » ?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui, réactiver',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#0e7490',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.patch(`/medicaments/${m.id}`, { actif: true })
    await load()
    toastSuccess('Médicament réactivé.')
  } catch (e) {
    toastError('Erreur lors de la réactivation.')
  }
}

onMounted(load)
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
