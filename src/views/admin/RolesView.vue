<template>
  <div>
    <div class="page-head">
      <div>
        <h1 class="page-title">Rôles & habilitations</h1>
        <p class="page-subtitle">
          Les rôles déterminent les modules accessibles et les droits (lecture, écriture, validation) de chaque utilisateur (§16).
        </p>
      </div>
      <button class="btn btn-primary" @click="openForm()">+ Nouveau rôle</button>
    </div>

    <div class="card">
      <div v-if="loading" class="empty-state">Chargement…</div>
      <div v-else-if="error" class="alert alert-error">{{ error }}</div>
      <div v-else-if="liste.length === 0" class="empty-state">Aucun rôle créé.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Description</th>
              <th>Modules accessibles</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in liste" :key="r.id">
              <td><strong>{{ r.code }}</strong></td>
              <td>{{ r.nom }}</td>
              <td>{{ r.description || '—' }}</td>
              <td>
                <span v-for="h in r.habilitations" :key="h.moduleId" class="badge badge-muted role-module-badge">
                  {{ h.module.nom }}
                </span>
                <span v-if="r.habilitations.length === 0" class="text-muted">Aucun module</span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn btn-outline btn-sm" @click="openForm(r)">✏️ Modifier</button>
                  <button class="btn btn-danger btn-sm" @click="supprimer(r)">🗑️ Supprimer</button>
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
      <div class="modal modal-lg">
        <h2>{{ form.id ? 'Modifier le rôle' : 'Nouveau rôle' }}</h2>
        <p v-if="formError" class="alert alert-error">{{ formError }}</p>
        <form @submit.prevent="save">
          <div class="form-row">
            <div class="field">
              <label>Code *</label>
              <input v-model.trim="form.code" required placeholder="Ex : MEDECIN" />
            </div>
            <div class="field">
              <label>Nom *</label>
              <input v-model.trim="form.nom" required placeholder="Ex : Médecin" />
            </div>
          </div>
          <div class="field">
            <label>Description</label>
            <input v-model.trim="form.description" />
          </div>

          <div class="field">
            <label>Habilitations par module</label>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Lecture</th>
                    <th>Écriture</th>
                    <th>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in modules" :key="m.id">
                    <td>{{ m.nom }}</td>
                    <td>
                      <input
                        type="checkbox"
                        :checked="habilitationOf(m.id)?.lecture"
                        @change="setHabilitation(m.id, 'lecture', $event.target.checked)"
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        :checked="habilitationOf(m.id)?.ecriture"
                        @change="setHabilitation(m.id, 'ecriture', $event.target.checked)"
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        :checked="habilitationOf(m.id)?.validation"
                        @change="setHabilitation(m.id, 'validation', $event.target.checked)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
import PaginationBar from '../../components/PaginationBar.vue'
import { toastError, toastSuccess } from '../../utils/notifications'

const liste = ref([])
const modules = ref([])
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

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get('/roles', {
      params: { page: page.value, perPage: perPage.value },
    })
    liste.value = data.data
    total.value = data.total
    totalPages.value = data.totalPages
  } catch (e) {
    error.value = 'Impossible de charger les rôles.'
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

function openForm(r) {
  formError.value = ''
  Object.keys(form).forEach((k) => delete form[k])
  if (r) {
    Object.assign(form, {
      id: r.id,
      code: r.code,
      nom: r.nom,
      description: r.description ?? '',
      habilitations: r.habilitations.map((h) => ({
        moduleId: h.moduleId,
        lecture: h.lecture,
        ecriture: h.ecriture,
        validation: h.validation,
      })),
    })
  } else {
    Object.assign(form, {
      code: '',
      nom: '',
      description: '',
      habilitations: [],
    })
  }
  formVisible.value = true
}

function habilitationOf(moduleId) {
  return form.habilitations.find((h) => h.moduleId === moduleId)
}

function setHabilitation(moduleId, droit, valeur) {
  let h = form.habilitations.find((x) => x.moduleId === moduleId)
  if (!h) {
    h = { moduleId, lecture: false, ecriture: false, validation: false }
    form.habilitations.push(h)
  }
  h[droit] = valeur
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      code: form.code,
      nom: form.nom,
      description: form.description,
      habilitations: form.habilitations,
    }
    if (form.id) {
      await http.patch(`/roles/${form.id}`, payload)
    } else {
      await http.post('/roles', payload)
    }
    formVisible.value = false
    toastSuccess(form.id ? 'Rôle modifié.' : 'Rôle créé.')
    await load()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    saving.value = false
  }
}

async function supprimer(r) {
  const reponse = await Swal.fire({
    title: `Supprimer le rôle « ${r.nom} » ?`,
    text: 'Cette action est définitive. Les rôles utilisés par des comptes ne peuvent pas être supprimés.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, supprimer',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.delete(`/roles/${r.id}`)
    await load()
    toastSuccess('Rôle supprimé.')
  } catch (e) {
    toastError(e.response?.data?.message || 'Suppression impossible.')
  }
}

onMounted(async () => {
  load()
  try {
    const { data } = await http.get('/modules')
    modules.value = data
  } catch {
    // liste vide si l'API ne répond pas
  }
})
</script>

<style scoped>
.modal-lg {
  max-width: 760px;
}
.role-module-badge {
  margin: 2px;
}
</style>
