<template>
  <div>
    <div class="page-head">
      <div>
        <h1 class="page-title">Personnel</h1>
        <p class="page-subtitle">
          Fiches employés de la clinique — les comptes de connexion sont gérés dans le menu Utilisateurs (§16.3).
        </p>
      </div>
      <button class="btn btn-primary" @click="openForm()">+ Nouveau personnel</button>
    </div>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="Rechercher par nom, prénom ou matricule…"
          @input="onSearch"
        />
        <select v-model="filtreStatut" @change="page = 1; load()">
          <option value="">Tous les statuts</option>
          <option value="ACTIF">Actif</option>
          <option value="INACTIF">Inactif</option>
        </select>
      </div>

      <div v-if="loading" class="empty-state">Chargement…</div>
      <div v-else-if="error" class="alert alert-error">{{ error }}</div>
      <div v-else-if="liste.length === 0" class="empty-state">Aucun personnel trouvé.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Matricule</th>
              <th>Nom & prénom</th>
              <th>Fonction</th>
              <th>Service</th>
              <th>Contact</th>
              <th>Compte</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in liste" :key="p.id">
              <td>
                <div class="avatar-cell">
                  <img v-if="p.photo" :src="p.photo" alt="" />
                  <span v-else class="avatar-fallback">{{ initialesDe(p.prenom, p.nom) }}</span>
                </div>
              </td>
              <td><strong>{{ p.matricule }}</strong></td>
              <td>{{ p.nom }} {{ p.prenom }}</td>
              <td>{{ p.fonction }}</td>
              <td>{{ p.service?.nom || '—' }}</td>
              <td>{{ p.telephone || '—' }}</td>
              <td>
                <span v-if="p.utilisateur" class="badge badge-success">Compte : {{ p.utilisateur.matricule }}</span>
                <span v-else class="badge badge-muted">Aucun compte</span>
              </td>
              <td>
                <span class="badge" :class="p.statut === 'ACTIF' ? 'badge-success' : 'badge-danger'">{{ p.statut }}</span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn btn-outline btn-sm" @click="openForm(p)">Modifier</button>
                  <button
                    v-if="p.statut === 'ACTIF'"
                    class="btn btn-danger btn-sm"
                    @click="desactiver(p)"
                  >
                    Désactiver
                  </button>
                  <button
                    v-else
                    class="btn btn-outline btn-sm reactiver-btn"
                    @click="reactiver(p)"
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
        <h2>{{ form.id ? 'Modifier le personnel' : 'Nouveau personnel' }}</h2>
        <p v-if="formError" class="alert alert-error">{{ formError }}</p>
        <form @submit.prevent="save">
          <!-- Photo -->
          <div class="field">
            <label>Photo</label>
            <div class="photo-zone">
              <div class="photo-preview">
                <img v-if="form.photo" :src="form.photo" alt="photo" />
                <span v-else class="avatar-fallback large">{{ initialesDe(form.prenom, form.nom) }}</span>
              </div>
              <div class="photo-actions">
                <label class="btn btn-outline btn-sm photo-btn">
                  📷 Prendre une photo
                  <input type="file" accept="image/*" capture="user" hidden @change="onPhotoChoisie" />
                </label>
                <label class="btn btn-outline btn-sm photo-btn">
                  🖼️ Choisir un fichier
                  <input type="file" accept="image/png, image/jpeg" hidden @change="onPhotoChoisie" />
                </label>
                <button
                  v-if="form.photo"
                  type="button"
                  class="btn btn-danger btn-sm"
                  @click="form.photo = null"
                >
                  Retirer
                </button>
              </div>
            </div>
            <small v-if="photoAvertissement" class="photo-avertissement">{{ photoAvertissement }}</small>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Clinique *</label>
              <select v-model="form.cliniqueId" required>
                <option v-for="c in cliniques" :key="c.id" :value="c.id">{{ c.nom }}</option>
              </select>
            </div>
            <div class="field">
              <label>Matricule *</label>
              <input v-model.trim="form.matricule" required placeholder="Ex : M001" />
            </div>
            <div class="field">
              <label>Nom *</label>
              <input v-model.trim="form.nom" required />
            </div>
            <div class="field">
              <label>Prénom *</label>
              <input v-model.trim="form.prenom" required />
            </div>
            <div class="field">
              <label>Sexe</label>
              <select v-model="form.sexe">
                <option value="">—</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div class="field">
              <label>Fonction *</label>
              <input v-model.trim="form.fonction" required placeholder="Médecin, agent d'accueil…" />
            </div>
            <div class="field">
              <label>Service de rattachement</label>
              <select v-model="form.serviceId">
                <option :value="null">—</option>
                <option v-for="s in services" :key="s.id" :value="s.id">{{ s.nom }}</option>
              </select>
            </div>
            <div class="field">
              <label>Téléphone</label>
              <input v-model.trim="form.telephone" />
            </div>
            <div class="field">
              <label>Email</label>
              <input v-model.trim="form.email" type="email" />
            </div>
            <div class="field">
              <label>Date d'embauche</label>
              <input v-model="form.dateEmbauche" type="date" />
            </div>
            <div class="field">
              <label>Statut</label>
              <select v-model="form.statut">
                <option value="ACTIF">Actif</option>
                <option value="INACTIF">Inactif</option>
              </select>
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
import http from '../../api/http'
import { initialesDe, optimiserImage } from '../../utils/image'
import PaginationBar from '../../components/PaginationBar.vue'
import { toastError, toastSuccess } from '../../utils/notifications'

const liste = ref([])
const cliniques = ref([])
const services = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const filtreStatut = ref('')
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
const photoAvertissement = ref('')

/** Charge la photo (caméra ou fichier), redimensionnée pour un avatar. */
async function onPhotoChoisie(e) {
  const file = e.target.files[0]
  if (!file) return
  try {
    const { dataUrl, largeur } = await optimiserImage(file, 512, 0.85)
    form.photo = dataUrl
    photoAvertissement.value =
      largeur < 300
        ? `Attention : image très petite (${largeur} px) — préférez une photo d'au moins 300 px de large.`
        : ''
  } catch (err) {
    formError.value = err.message
  }
  e.target.value = ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      statut: filtreStatut.value || undefined,
      search: search.value || undefined,
      page: page.value,
      perPage: perPage.value,
    }
    const { data } = await http.get('/personnel', { params })
    liste.value = data.data
    total.value = data.total
    totalPages.value = data.totalPages
  } catch (e) {
    error.value = 'Impossible de charger le personnel.'
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
  photoAvertissement.value = ''
  Object.keys(form).forEach((k) => delete form[k])
  if (p) {
    Object.assign(form, {
      id: p.id,
      cliniqueId: p.cliniqueId,
      matricule: p.matricule,
      nom: p.nom,
      prenom: p.prenom,
      sexe: p.sexe ?? '',
      photo: p.photo ?? null,
      fonction: p.fonction,
      serviceId: p.serviceId ?? null,
      telephone: p.telephone ?? '',
      email: p.email ?? '',
      dateEmbauche: p.dateEmbauche ? p.dateEmbauche.slice(0, 10) : '',
      statut: p.statut,
    })
  } else {
    Object.assign(form, {
      cliniqueId: cliniques.value[0]?.id ?? null,
      matricule: '',
      nom: '',
      prenom: '',
      sexe: '',
      photo: null,
      fonction: '',
      serviceId: null,
      telephone: '',
      email: '',
      dateEmbauche: '',
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
    // À la création, une photo absente est simplement omise ;
    // en modification, photo: null retire la photo existante.
    if (!form.id && !payload.photo) delete payload.photo
    if (form.id) {
      await http.patch(`/personnel/${form.id}`, payload)
    } else {
      await http.post('/personnel', payload)
    }
    formVisible.value = false
    toastSuccess(form.id ? 'Personnel modifié.' : 'Personnel créé.')
    await load()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    saving.value = false
  }
}

async function desactiver(p) {
  const reponse = await Swal.fire({
    title: `Désactiver ${p.nom} ${p.prenom} ?`,
    text: 'La fiche sera conservée pour la traçabilité (statut INACTIF).',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, désactiver',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.delete(`/personnel/${p.id}`)
    await load()
    toastSuccess('Personnel désactivé.')
  } catch (e) {
    toastError('Erreur lors de la désactivation.')
  }
}

async function reactiver(p) {
  const reponse = await Swal.fire({
    title: `Réactiver ${p.nom} ${p.prenom} ?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui, réactiver',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#0e7490',
    cancelButtonColor: '#64748b',
  })
  if (!reponse.isConfirmed) return
  try {
    await http.patch(`/personnel/${p.id}`, { statut: 'ACTIF' })
    await load()
    toastSuccess('Personnel réactivé.')
  } catch (e) {
    toastError('Erreur lors de la réactivation.')
  }
}

onMounted(async () => {
  load()
  try {
    // perPage 0 = liste complète (pour les sélecteurs du formulaire)
    const [c, s] = await Promise.all([
      http.get('/cliniques'),
      http.get('/services', { params: { perPage: 0 } }),
    ])
    cliniques.value = c.data
    services.value = s.data.data
  } catch {
    // les listes restent vides si l'API ne répond pas
  }
})
</script>

<style scoped>
/* ---------- Avatar (liste) ---------- */
.avatar-cell {
  width: 38px;
  height: 38px;
}
.avatar-cell img {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid #c9ece5;
  display: block;
}
.avatar-fallback {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #ccfbf1, #99f6e4);
  border: 1.5px solid #c9ece5;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
}
.avatar-fallback.large {
  width: 84px;
  height: 84px;
  font-size: 26px;
}

/* ---------- Zone photo (formulaire) ---------- */
.photo-zone {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.photo-preview {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #c9ece5;
  background: #f0fdfa;
}
.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.photo-preview .avatar-fallback {
  border: none;
  border-radius: 0;
  width: 100%;
  height: 100%;
}
.photo-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.photo-btn {
  cursor: pointer;
}
.photo-avertissement {
  display: block;
  margin-top: 8px;
  color: var(--warning);
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
