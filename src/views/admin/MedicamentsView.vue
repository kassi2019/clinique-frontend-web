<template>
  <div>
    <div class="page-head">
      <div>
        <h1 class="page-title">Médicaments</h1>
        <p class="page-subtitle">
          Catalogue utilisé par les médecins pour les ordonnances (module Consultation).
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" @click="telechargerModele">📄 Modèle Excel</button>
        <label class="btn btn-outline" style="cursor: pointer">
          📥 Charger (Excel)
          <input
            type="file"
            accept=".xlsx,.xls"
            style="display: none"
            @change="importerExcel"
          />
        </label>
        <button class="btn btn-primary" @click="openForm()">+ Nouveau médicament</button>
      </div>
    </div>

    <div class="card">
      <div class="alert" style="background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534">
        <strong>📄 Canevas du fichier Excel :</strong> colonnes
        <strong>Nom · Forme · Dosage · Prix · Seuil · Unité · Consommable · Stock</strong>
        (un médicament par ligne, en-têtes en ligne 1). « Unité » : BOITE ou PLAQUE.
        « Consommable » : Oui ou Non (Non si vide). Téléchargez le
        <strong>Modèle Excel</strong> pour partir du bon format.
      </div>
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
              <th>Prix de vente</th>
              <th>Unité</th>
              <th>Stock</th>
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
                <span v-if="m.prixVente" class="prix">{{ m.prixVente.toLocaleString('fr-FR') }} F</span>
                <span v-else class="text-muted">—</span>
              </td>
              <td>
                <span class="badge badge-muted">{{ m.uniteVente === 'PLAQUE' ? 'Plaque' : 'Boîte' }}</span>
              </td>
              <td>
                <span v-if="m.stock > 0" class="badge badge-success">{{ m.stock }}</span>
                <span v-else class="badge badge-danger">Rupture</span>
              </td>
              <td>
                <span class="badge" :class="m.actif ? 'badge-success' : 'badge-danger'">
                  {{ m.actif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn btn-outline btn-sm" @click="openForm(m)">✏️ Modifier</button>
                  <button v-if="m.actif" class="btn btn-danger btn-sm" @click="desactiver(m)">⛔ Désactiver</button>
                  <button v-else class="btn btn-success btn-sm reactiver-btn" @click="reactiver(m)">↻ Réactiver</button>
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
            <div class="field">
              <label>Prix de vente (FCFA)</label>
              <input v-model.number="form.prixVente" type="number" min="0" step="1" placeholder="Ex : 2500" />
            </div>
            <div class="field">
              <label>Unité de vente</label>
              <select v-model="form.uniteVente">
                <option value="BOITE">Boîte</option>
                <option value="PLAQUE">Plaque</option>
              </select>
              <small class="text-muted">Le prix de vente s'applique à cette unité.</small>
            </div>
            <div class="field">
              <label>Stock</label>
              <input v-model.number="form.stock" type="number" min="0" placeholder="Quantité disponible" />
              <small class="text-muted">Le stock sera géré par le module Pharmacie.</small>
            </div>
            <div class="field">
              <label>Seuil d'alerte</label>
              <input v-model.number="form.seuilAlerte" type="number" min="0" placeholder="Ex : 10" />
            </div>
            <div class="field">
              <label>Consommable</label>
              <select v-model="form.consommable">
                <option :value="false">Non</option>
                <option :value="true">Oui</option>
              </select>
              <small class="text-muted">
                Un consommable (coton, alcool…) n'est pas facturé en caisse pharmacie (montant = 0).
              </small>
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
import * as XLSX from 'xlsx'
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

/** Télécharge le modèle Excel d'import des médicaments. */
function telechargerModele() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nom', 'Forme', 'Dosage', 'Prix', 'Seuil', 'Unité', 'Consommable', 'Stock'],
    ['Paracétamol', 'Comprimé', '500 mg', 1500, 10, 'BOITE', 'Non', 50],
    ['Coton hydrophile', 'Rouleau', '', 0, 5, 'BOITE', 'Oui', 20],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Medicaments')
  XLSX.writeFile(wb, 'modele_medicaments.xlsx')
}

/** Import Excel : colonnes nom, forme, dosage, prixVente, seuilAlerte, uniteVente, consommable. */
async function importerExcel(event) {
  const fichier = event.target.files?.[0]
  event.target.value = ''
  if (!fichier) return
  try {
    const buffer = await fichier.arrayBuffer()
    const classeur = XLSX.read(buffer, { type: 'array' })
    const premiere = classeur.SheetNames[0]
    if (!premiere) {
      toastError('Fichier vide.')
      return
    }
    const lignes = XLSX.utils.sheet_to_json(classeur.Sheets[premiere])
    if (lignes.length === 0) {
      toastError('Aucune ligne trouvée.')
      return
    }
    const { data } = await http.post('/medicaments/import', {
      cliniqueId,
      lignes: lignes.map((l) => ({
        nom: l.nom ?? l['Nom'],
        forme: l.forme ?? l['Forme'],
        dosage: l.dosage ?? l['Dosage'],
        prixVente: l.prixVente ?? l['Prix'],
        seuilAlerte: l.seuilAlerte ?? l['Seuil'],
        uniteVente: l.uniteVente ?? l['Unite'],
        stock: l.stock ?? l['Stock'],
        consommable: l.consommable ?? l['Consommable'],
      })),
    })
    toastSuccess(`${data.ajoutes} médicament(s) ajouté(s) (${data.total} ligne(s) lue(s)).`)
    await load()
  } catch (e) {
    toastError(e.response?.data?.message || 'Import impossible.')
  }
}

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
      prixVente: m.prixVente ?? null,
      uniteVente: m.uniteVente ?? 'BOITE',
      stock: m.stock ?? 0,
      seuilAlerte: m.seuilAlerte ?? 0,
      consommable: m.consommable ?? false,
    })
  } else {
    Object.assign(form, {
      nom: '',
      forme: '',
      dosage: '',
      prixVente: null,
      uniteVente: 'BOITE',
      stock: 0,
      seuilAlerte: 0,
      consommable: false,
    })
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
      prixVente: form.prixVente ?? undefined,
      uniteVente: form.uniteVente ?? 'BOITE',
      stock: form.stock ?? 0,
      seuilAlerte: form.seuilAlerte ?? 0,
      consommable: form.consommable ?? false,
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
.prix {
  font-weight: 700;
  color: #134e4a;
}
</style>
