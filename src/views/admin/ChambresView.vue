<template>
  <div>
    <div class="card-header">
      <h2>🛏️ Chambres & lits (§13)</h2>
      <button class="btn btn-primary btn-sm" @click="ouvrirAjoutChambre">＋ Ajouter une chambre</button>
    </div>

    <!-- Types de chambres (référentiel paramétrable) -->
    <div class="types-bloc">
      <div class="types-titre">Types de chambres</div>
      <div class="types-liste">
        <span
          v-for="t in types"
          :key="t.id"
          class="badge"
          :class="t.actif ? 'badge-success' : 'badge-muted'"
          :title="`${t._count?.chambres ?? 0} chambre(s) · cliquer pour renommer`"
          @click="renommerType(t)"
        >
          {{ t.libelle }}
          <button
            class="type-x"
            :class="t.actif ? 'type-x-rouge' : 'type-x-vert'"
            :title="t.actif ? 'Désactiver ce type' : 'Réactiver ce type'"
            @click.stop="basculerType(t)"
          >
            {{ t.actif ? '✕' : '↺' }}
          </button>
        </span>
        <div class="type-ajout">
          <input
            v-model.trim="nouveauType"
            class="type-input"
            placeholder="Nouveau type…"
            @keyup.enter="ajouterType"
          />
          <button class="btn btn-outline btn-sm" :disabled="!nouveauType" @click="ajouterType">
            ＋ Ajouter
          </button>
        </div>
      </div>
    </div>

    <div v-if="chargement" class="empty-state">Chargement…</div>
    <div v-else-if="chambres.length === 0" class="empty-state">
      Aucune chambre paramétrée. Ajoutez une première chambre et ses lits.
    </div>
    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Chambre</th>
            <th>Type</th>
            <th>Tarif / nuit</th>
            <th>Lits</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in chambres" :key="c.id">
            <td><strong>{{ c.numero }}</strong></td>
            <td>{{ c.typeChambre?.libelle || '—' }}</td>
            <td>
              <template v-if="c.tarifJournalier">
                {{ Number(c.tarifJournalier).toLocaleString('fr-FR') }} F
              </template>
              <span v-else class="text-muted" title="Tarif de la prestation Hospitalisation — journée">
                HOSP-JOUR
              </span>
            </td>
            <td>
              <div class="lits-cell">
                <span
                  v-for="l in c.lits"
                  :key="l.id"
                  class="badge"
                  :class="l.actif ? 'badge-success' : 'badge-danger'"
                  :title="l.actif ? 'Lit actif' : 'Lit désactivé'"
                >
                  {{ c.numero }}-{{ l.numero }}
                  <button
                    v-if="l.actif"
                    class="lit-x"
                    title="Désactiver ce lit"
                    @click="desactiverLit(l)"
                  >
                    ✕
                  </button>
                </span>
                <button
                  v-if="c.actif"
                  class="btn btn-outline btn-sm"
                  title="Ajouter un lit"
                  @click="ouvrirAjoutLit(c)"
                >
                  ＋ Lit
                </button>
              </div>
            </td>
            <td>
              <span class="badge" :class="c.actif ? 'badge-success' : 'badge-muted'">
                {{ c.actif ? 'Active' : 'Désactivée' }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button class="btn btn-outline btn-sm" @click="ouvrirModifChambre(c)">
                  ✏️ Modifier
                </button>
                <button class="btn btn-sm" :class="c.actif ? 'btn-danger' : 'btn-success'" @click="basculerChambre(c)">
                  {{ c.actif ? 'Désactiver' : 'Réactiver' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modale : chambre -->
    <div v-if="modaleChambre" class="modal-backdrop">
      <div class="modal modal-sm">
        <h2>🛏️ {{ chambreEditee ? 'Modifier la chambre' : 'Nouvelle chambre' }}</h2>
        <div class="form-row">
          <div class="field">
            <label>Numéro *</label>
            <input v-model.trim="formChambre.numero" placeholder="101" />
          </div>
          <div class="field">
            <label>Type</label>
            <SelectSearch
              v-model="formChambre.typeChambreId"
              :options="optionsTypes"
              placeholder="— Choisir un type —"
            />
          </div>
          <div class="field">
            <label>Tarif par nuit (F)</label>
            <input
              v-model.number="formChambre.tarifJournalier"
              type="number"
              min="0"
              placeholder="Sinon tarif HOSP-JOUR"
            />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleChambre = false">✖ Annuler</button>
          <button class="btn btn-primary" :disabled="saving" @click="enregistrerChambre">
            💾 Enregistrer
          </button>
        </div>
      </div>
    </div>

    <!-- Modale : lit -->
    <div v-if="modaleLit" class="modal-backdrop">
      <div class="modal modal-sm">
        <h2>🛌 Nouveau lit — chambre {{ chambreLit?.numero }}</h2>
        <div class="field">
          <label>Numéro du lit *</label>
          <input v-model.trim="formLit.numero" placeholder="A" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleLit = false">✖ Annuler</button>
          <button class="btn btn-primary" :disabled="saving" @click="enregistrerLit">
            💾 Ajouter
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import Swal from 'sweetalert2'
import http from '../../api/http'
import SelectSearch from '../../components/SelectSearch.vue'
import { useAuthStore } from '../../stores/auth'
import { toastError, toastSuccess } from '../../utils/notifications'

const auth = useAuthStore()
const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)

const chambres = ref([])
const types = ref([])
const nouveauType = ref('')
const chargement = ref(false)
const saving = ref(false)

const modaleChambre = ref(false)
const chambreEditee = ref(null)
const formChambre = reactive({ numero: '', typeChambreId: null, tarifJournalier: null })

const modaleLit = ref(false)
const chambreLit = ref(null)
const formLit = reactive({ numero: '' })

const optionsTypes = computed(() =>
  types.value
    .filter((t) => t.actif)
    .map((t) => ({ value: t.id, label: t.libelle })),
)

async function charger() {
  if (!cliniqueId.value) return
  chargement.value = true
  try {
    const [{ data: c }, { data: t }] = await Promise.all([
      http.get('/hospitalisation/chambres', { params: { cliniqueId: cliniqueId.value } }),
      http.get('/hospitalisation/types-chambres', { params: { cliniqueId: cliniqueId.value } }),
    ])
    chambres.value = c
    types.value = t
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger les chambres.')
  } finally {
    chargement.value = false
  }
}

// ---- Types de chambres ----
async function ajouterType() {
  const libelle = nouveauType.value.trim()
  if (!libelle) return
  try {
    await http.post(
      '/hospitalisation/types-chambres',
      { libelle },
      { params: { cliniqueId: cliniqueId.value } },
    )
    toastSuccess(`Type « ${libelle} » ajouté.`)
    nouveauType.value = ''
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible d\'ajouter le type.')
  }
}

async function renommerType(t) {
  const { value } = await Swal.fire({
    title: `Renommer le type « ${t.libelle} »`,
    input: 'text',
    inputValue: t.libelle,
    showCancelButton: true,
    confirmButtonText: 'Renommer',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#0d9488',
    inputValidator: (v) => (!v || !v.trim() ? 'Le libellé est obligatoire.' : null),
  })
  if (!value || value.trim() === t.libelle) return
  try {
    await http.patch(`/hospitalisation/types-chambres/${t.id}`, { libelle: value.trim() })
    toastSuccess('Type renommé.')
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Renommage impossible.')
  }
}

async function basculerType(t) {
  try {
    await http.delete(`/hospitalisation/types-chambres/${t.id}`)
    toastSuccess(t.actif ? 'Type désactivé.' : 'Type réactivé.')
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Opération impossible.')
  }
}

// ---- Chambres ----
function ouvrirAjoutChambre() {
  chambreEditee.value = null
  formChambre.numero = ''
  formChambre.typeChambreId = null
  formChambre.tarifJournalier = null
  modaleChambre.value = true
}

function ouvrirModifChambre(c) {
  chambreEditee.value = c
  formChambre.numero = c.numero
  formChambre.typeChambreId = c.typeChambreId ?? null
  formChambre.tarifJournalier = c.tarifJournalier ? Number(c.tarifJournalier) : null
  modaleChambre.value = true
}

async function enregistrerChambre() {
  if (!formChambre.numero.trim()) {
    toastError('Le numéro de la chambre est obligatoire.')
    return
  }
  saving.value = true
  try {
    const payload = {
      numero: formChambre.numero,
      typeChambreId: formChambre.typeChambreId || undefined,
      tarifJournalier: formChambre.tarifJournalier || undefined,
    }
    if (chambreEditee.value) {
      await http.patch(`/hospitalisation/chambres/${chambreEditee.value.id}`, payload)
      toastSuccess('Chambre modifiée.')
    } else {
      await http.post('/hospitalisation/chambres', payload, {
        params: { cliniqueId: cliniqueId.value },
      })
      toastSuccess('Chambre créée.')
    }
    modaleChambre.value = false
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    saving.value = false
  }
}

async function basculerChambre(c) {
  const action = c.actif ? 'désactiver' : 'réactiver'
  const conf = await Swal.fire({
    title: `${c.actif ? 'Désactiver' : 'Réactiver'} la chambre ${c.numero} ?`,
    text: c.actif ? 'Une chambre occupée ne peut pas être désactivée.' : '',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: `Oui, ${action}`,
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#0d9488',
    cancelButtonColor: '#64748b',
  })
  if (!conf.isConfirmed) return
  try {
    await http.delete(`/hospitalisation/chambres/${c.id}`)
    toastSuccess(`Chambre ${action.slice(0, -1)}e.`)
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Opération impossible.')
  }
}

// ---- Lits ----
function ouvrirAjoutLit(c) {
  chambreLit.value = c
  formLit.numero = ''
  modaleLit.value = true
}

async function enregistrerLit() {
  if (!formLit.numero.trim()) {
    toastError('Le numéro du lit est obligatoire.')
    return
  }
  saving.value = true
  try {
    await http.post(`/hospitalisation/chambres/${chambreLit.value.id}/lits`, {
      numero: formLit.numero,
    })
    toastSuccess(`Lit ${chambreLit.value.numero}-${formLit.numero} ajouté.`)
    modaleLit.value = false
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'ajout du lit.')
  } finally {
    saving.value = false
  }
}

async function desactiverLit(l) {
  const conf = await Swal.fire({
    title: `Désactiver le lit ${l.numero} ?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#0d9488',
    cancelButtonColor: '#64748b',
  })
  if (!conf.isConfirmed) return
  try {
    await http.delete(`/hospitalisation/lits/${l.id}`)
    toastSuccess('Lit désactivé.')
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Opération impossible.')
  }
}

onMounted(charger)
</script>

<style scoped>
.modal-sm {
  max-width: 460px;
}
.types-bloc {
  background: #f8fdfb;
  border: 1px solid #d5eee9;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.types-titre {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.types-liste {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.types-liste .badge {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.type-x {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
}
.type-ajout {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}
.type-input {
  width: 170px;
  padding: 6px 10px;
  border: 1.5px solid var(--border-champ);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}
.lits-cell {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.lits-cell .badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.lit-x {
  background: transparent;
  border: none;
  color: #991b1b;
  font-size: 11px;
  cursor: pointer;
  padding: 0 2px;
}
</style>
