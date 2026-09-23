<template>
  <div>
    <div class="page-title">{{ categorie.icone }} {{ categorie.libelle }}</div>
    <p class="text-muted">
      Liste paramétrable utilisée dans les listes déroulantes des formulaires.
      Une valeur saisie librement dans un formulaire est ajoutée automatiquement ici.
    </p>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Sélecteur de clinique -->
    <div class="toolbar">
      <div class="field" style="min-width: 280px">
        <label>Clinique</label>
        <SelectSearch
          v-model="cliniqueId"
          :options="optionsCliniques"
          placeholder="— Choisir —"
          @update:model-value="() => charger(1)"
        />
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>{{ categorie.libelle }}</h2>
        <div class="header-actions">
          <button class="btn btn-outline btn-sm" @click="telechargerModele">
            📄 Modèle Excel
          </button>
          <label class="btn btn-outline btn-sm" style="cursor: pointer">
            📥 Charger (Excel)
            <input
              type="file"
              accept=".xlsx,.xls"
              style="display: none"
              @change="importerExcel"
            />
          </label>
          <button class="btn btn-primary btn-sm" @click="ouvrirAjout">＋ Ajouter</button>
        </div>
      </div>

      <!-- Canevas du fichier Excel -->
      <div class="alert" style="background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534">
        <strong>📄 Canevas du fichier Excel :</strong> une seule colonne avec l'en-tête
        <strong>Libellé</strong> en ligne 1, puis une valeur par ligne (ex. pour les
        posologies : « 1 comprimé matin et soir », « 2 comprimés par jour »…).
        Les doublons et les valeurs déjà présentes sont ignorés. Téléchargez le
        <strong>Modèle Excel</strong> pour partir du bon format.
      </div>

      <div v-if="chargement" class="text-muted">Chargement…</div>
      <div v-else-if="liste.length === 0" class="empty-state">
        Aucune entrée — utilisez « ＋ Ajouter » ou « 📥 Charger (Excel) ».
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Libellé</th>
              <th>Statut</th>
              <th style="width: 220px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in liste" :key="e.id" :class="{ 'ligne-inactive': !e.actif }">
              <td>{{ e.libelle }}</td>
              <td>
                <span class="badge" :class="e.actif ? 'badge-success' : 'badge-muted'">
                  {{ e.actif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn btn-outline btn-sm" @click="ouvrirModifier(e)">✏️ Modifier</button>
                  <button
                    class="btn btn-sm"
                    :class="e.actif ? 'btn-danger' : 'btn-success'"
                    @click="basculer(e)"
                  >
                    {{ e.actif ? 'Désactiver' : 'Réactiver' }}
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

    <!-- Modale ajout / modification -->
    <div v-if="formVisible" class="modal-backdrop">
      <div class="modal">
        <h2>{{ form.id ? '✏️ Modifier' : '＋ Ajouter' }} — {{ categorie.libelle }}</h2>
        <form @submit.prevent="enregistrer">
          <div class="field">
            <label>Libellé *</label>
            <input v-model.trim="form.libelle" required placeholder="Ex : Abidjan" />
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as XLSX from 'xlsx'
import http from '../../api/http'
import { useAuthStore } from '../../stores/auth'
import SelectSearch from '../../components/SelectSearch.vue'
import PaginationBar from '../../components/PaginationBar.vue'
import { toastError, toastSuccess } from '../../utils/notifications'

const auth = useAuthStore()
const route = useRoute()

const CATEGORIES = {
  nationalites: { code: 'NATIONALITE', icone: '🌍', libelle: 'Nationalités', route: '/nationalites' },
  residences: { code: 'RESIDENCE', icone: '🏠', libelle: 'Résidences', route: '/residences' },
  diagnostics: { code: 'DIAGNOSTIC', icone: '🩺', libelle: 'Diagnostics retenus', route: '/diagnostics' },
  pathologies: { code: 'PATHOLOGIE', icone: '🦠', libelle: 'Autres pathologies associées', route: '/pathologies' },
  fournisseurs: { code: 'FOURNISSEUR', icone: '🚚', libelle: 'Fournisseurs', route: '/fournisseurs' },
  fonctions: { code: 'FONCTION', icone: '👔', libelle: 'Fonctions du personnel', route: '/fonctions' },
  posologies: { code: 'POSOLOGIE', icone: '💊', libelle: 'Posologies', route: '/posologies' },
}

const categorie = computed(() => CATEGORIES[route.params.code] ?? CATEGORIES.nationalites)

const cliniqueId = ref(auth.user?.clinique?.id ?? null)
const cliniques = ref([])
const liste = ref([])
const error = ref('')
const chargement = ref(false)
const saving = ref(false)
const formVisible = ref(false)
const form = ref({ id: null, libelle: '' })

// Pagination
const page = ref(1)
const perPage = ref(10)
const total = ref(0)
const totalPages = ref(1)

const optionsCliniques = computed(() =>
  cliniques.value.map((c) => ({ value: c.id, label: c.nom })),
)

async function charger(p = 1) {
  if (!cliniqueId.value) return
  chargement.value = true
  error.value = ''
  try {
    const { data } = await http.get(categorie.value.route, {
      params: { cliniqueId: cliniqueId.value, tous: '1', page: p, perPage: perPage.value },
    })
    liste.value = data.data ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 1
    page.value = p
  } catch {
    error.value = 'Impossible de charger la liste.'
  } finally {
    chargement.value = false
  }
}

function changerPage(p) {
  charger(p)
}

function changerPerPage(n) {
  perPage.value = n
  charger(1)
}

function ouvrirAjout() {
  form.value = { id: null, libelle: '' }
  formVisible.value = true
}

function ouvrirModifier(e) {
  form.value = { id: e.id, libelle: e.libelle }
  formVisible.value = true
}

async function enregistrer() {
  if (!form.value.libelle.trim()) return
  saving.value = true
  try {
    if (form.value.id) {
      await http.patch(`${categorie.value.route}/${form.value.id}`, { libelle: form.value.libelle.trim() })
      toastSuccess('Entrée modifiée.')
    } else {
      await http.post(categorie.value.route, {
        cliniqueId: cliniqueId.value,
        libelle: form.value.libelle.trim(),
      })
      toastSuccess('Entrée ajoutée.')
    }
    formVisible.value = false
    await charger(page.value)
  } catch (e) {
    toastError(e.response?.data?.message || 'Enregistrement impossible.')
  } finally {
    saving.value = false
  }
}

/** Désactive/réactive une entrée (comme les autres écrans de paramétrage). */
async function basculer(e) {
  try {
    await http.delete(`${categorie.value.route}/${e.id}`)
    toastSuccess(e.actif ? 'Entrée désactivée.' : 'Entrée réactivée.')
    await charger(page.value)
  } catch (err) {
    toastError(err.response?.data?.message || 'Opération impossible.')
  }
}

/** Télécharge le modèle Excel (1 colonne « Libellé » + exemples). */
function telechargerModele() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Libellé'],
    ['Exemple 1'],
    ['Exemple 2'],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Libelles')
  XLSX.writeFile(wb, `modele_${categorie.value.code.toLowerCase()}.xlsx`)
}

/** Import Excel : 1 colonne « Libellé » (en-tête ignoré si présent). */
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
    const lignes = XLSX.utils.sheet_to_json(classeur.Sheets[premiere], { header: 1 })
    const libelles = lignes
      .flat()
      .map((x) => String(x).trim())
      .filter((x) => x && x.toLowerCase() !== 'libelle')
    if (libelles.length === 0) {
      toastError('Aucune ligne trouvée (colonne « Libellé » attendue).')
      return
    }
    const { data } = await http.post('/listes-parametres/import', {
      cliniqueId: cliniqueId.value,
      code: categorie.value.code,
      libelles,
    })
    toastSuccess(`${data.ajoutes} entrée(s) ajoutée(s) (${data.total} ligne(s) lue(s)).`)
    await charger(page.value)
  } catch (e) {
    toastError(e.response?.data?.message || 'Import impossible.')
  }
}

onMounted(async () => {
  try {
    const { data } = await http.get('/cliniques')
    cliniques.value = data
  } catch {
    /* cliniques vides */
  }
  if (cliniqueId.value) charger()
})

// Changement de menu (nationalités → résidences…) : recharge la liste.
// Sans ce watch, le composant est réutilisé et la page ne change pas.
watch(
  () => route.params.code,
  () => charger(),
)
</script>
