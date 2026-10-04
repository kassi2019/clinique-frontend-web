<template>
  <div class="journal-page">
    <div class="card">
      <div class="card-header">
        <h2>📜 Journal des actions</h2>
        <button class="btn btn-outline btn-sm" @click="charger">🔄 Actualiser</button>
      </div>
      <p class="text-muted small-note">
        Chaque écriture de l'application (création, modification, encaissement, validation…)
        est enregistrée avec l'utilisateur qui l'a effectuée — sur le web comme sur le mobile.
      </p>

      <div class="toolbar">
        <input
          v-model="jourFiltre"
          type="date"
          class="search-input"
          style="max-width: 170px; flex: none"
          title="Vide = tous les jours"
          @change="charger"
        />
        <input
          v-model.trim="entiteFiltre"
          type="text"
          list="journal-entites"
          class="search-input"
          style="max-width: 200px; flex: none"
          placeholder="Module (ex. passages)…"
          @change="charger"
        />
        <datalist id="journal-entites">
          <option v-for="e in ENTITES_CONNUES" :key="e" :value="e" />
        </datalist>
        <SelectSearch
          v-model="utilisateurId"
          :options="optionsUtilisateurs"
          placeholder="— Tous les utilisateurs —"
          style="max-width: 320px; flex: 1"
          @change="charger"
        />
        <button class="btn btn-outline btn-sm" @click="exporterExcel" title="Exporter la liste filtrée en Excel">
          📥 Excel
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date / heure</th>
              <th>Utilisateur</th>
              <th>Action</th>
              <th>Route</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in data" :key="e.id">
              <td style="white-space: nowrap">{{ formatDateHeure(e.createdAt) }}</td>
              <td>
                <strong v-if="e.utilisateur">
                  {{ e.utilisateur.personnel?.nom }} {{ e.utilisateur.personnel?.prenom }}
                </strong>
                <span v-else class="text-muted">—</span>
                <span v-if="e.utilisateur" class="text-muted"> ({{ e.utilisateur.matricule }})</span>
              </td>
              <td>
                <span class="badge" :class="badgeMethode(e.methode)">
                  {{ libelleMethode(e.methode) }}
                </span>
              </td>
              <td style="font-family: monospace; font-size: 12px">{{ e.route }}</td>
              <td>
                <span v-if="e.details" :title="e.details" class="journal-details">
                  {{ e.details.length > 120 ? e.details.slice(0, 120) + '…' : e.details }}
                </span>
                <span v-else class="text-muted">—</span>
              </td>
            </tr>
            <tr v-if="data.length === 0">
              <td colspan="5" class="empty-state chargement">
                {{ chargement ? 'Chargement…' : 'Aucune action enregistrée.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        v-if="total > perPage"
        :page="page"
        :per-page="perPage"
        :total="total"
        :total-pages="totalPages"
        @change="changerPage"
        @per-page="changerPerPage"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import http from '../../api/http'
import PaginationBar from '../../components/PaginationBar.vue'
import SelectSearch from '../../components/SelectSearch.vue'
import { useAuthStore } from '../../stores/auth'
import { toastError, toastSuccess } from '../../utils/notifications'
import * as XLSX from 'xlsx'

const auth = useAuthStore()
const cliniqueId = auth.user?.clinique?.id ?? null

const data = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(50)
const totalPages = ref(1)
const chargement = ref(false)
const jourFiltre = ref('')
const entiteFiltre = ref('')
const utilisateurId = ref(null)
const utilisateurs = ref([])

// Modules connus de l'application (aide à la saisie du filtre « Module »)
const ENTITES_CONNUES = [
  'passages', 'patients', 'consultations', 'caisse', 'paiements', 'pharmacie',
  'prestations', 'utilisateurs', 'personnel', 'roles', 'services', 'maternite',
  'imagerie', 'laboratoire', 'hospitalisation', 'soins', 'rapports', 'parametres',
  'medicaments', 'listes-parametres', 'chambres', 'assurances', 'impression',
]

const optionsUtilisateurs = utilisateurs

function libelleMethode(m) {
  return { POST: 'Création', PATCH: 'Modification', PUT: 'Mise à jour', DELETE: 'Suppression' }[m] ?? m
}

function badgeMethode(m) {
  return {
    POST: 'badge-success',
    PATCH: 'badge-warning',
    PUT: 'badge-info',
    DELETE: 'badge-danger',
  }[m] ?? 'badge-muted'
}

function formatDateHeure(d) {
  return new Date(d).toLocaleString('fr-FR')
}

async function charger() {
  chargement.value = true
  try {
    const { data: rep } = await http.get('/journal', {
      params: {
        cliniqueId: cliniqueId ?? undefined,
        page: page.value,
        perPage: perPage.value,
        jour: jourFiltre.value || undefined,
        entite: entiteFiltre.value || undefined,
        utilisateurId: utilisateurId.value ?? undefined,
      },
    })
    data.value = rep.data ?? []
    total.value = rep.total ?? 0
    totalPages.value = rep.totalPages ?? 1
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger le journal.')
  } finally {
    chargement.value = false
  }
}

/** Export Excel des actions filtrées (jusqu'à 2000 lignes). */
async function exporterExcel() {
  try {
    const { data: rep } = await http.get('/journal', {
      params: {
        cliniqueId: cliniqueId ?? undefined,
        page: 1,
        perPage: 2000,
        jour: jourFiltre.value || undefined,
        entite: entiteFiltre.value || undefined,
        utilisateurId: utilisateurId.value ?? undefined,
      },
    })
    const lignes = (rep.data ?? []).map((e) => ({
      'Date / heure': formatDateHeure(e.createdAt),
      Utilisateur: e.utilisateur?.matricule ?? '—',
      'Nom': e.utilisateur?.personnel
        ? `${e.utilisateur.personnel.nom} ${e.utilisateur.personnel.prenom}`
        : '—',
      'Action': libelleMethode(e.methode),
      'Module': e.entite ?? '—',
      'Route': e.route,
      'Détails': e.details ?? '',
    }))
    const feuille = XLSX.utils.json_to_sheet(lignes)
    const classeur = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(classeur, feuille, 'Journal')
    XLSX.writeFile(classeur, `journal-actions-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toastSuccess(`${lignes.length} action(s) exportée(s) en Excel.`)
  } catch (e) {
    toastError(e.response?.data?.message || "Impossible d'exporter le journal.")
  }
}

function changerPage(p) {
  page.value = p
  charger()
}

function changerPerPage(n) {
  perPage.value = n
  page.value = 1
  charger()
}

async function chargerUtilisateurs() {
  try {
    const { data: rep } = await http.get('/utilisateurs', { params: { perPage: 0 } })
    utilisateurs.value = (rep.data ?? []).map((u) => ({
      value: u.id,
      label: `${u.matricule} — ${u.personnel?.nom ?? ''} ${u.personnel?.prenom ?? ''}`,
    }))
  } catch {
    utilisateurs.value = []
  }
}

onMounted(() => {
  chargerUtilisateurs()
  charger()
})
</script>

<style scoped>
.journal-page {
  padding: 16px;
}
.journal-details {
  font-family: monospace;
  font-size: 11.5px;
  color: #64748b;
  display: block;
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.badge-info {
  background: #e0f2fe;
  color: #0369a1;
}
</style>
