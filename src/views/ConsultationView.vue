<template>
  <div class="consultation-page">
    <!-- En-tête -->
    <header class="consultation-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">🩺</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Consultation — dossier médical et prescriptions</span>
          </div>
        </div>
        <div class="header-actions">
          <span class="date-pill">{{ todayLabel }}</span>
          <button class="btn btn-outline btn-sm btn-back" @click="router.push({ name: 'home' })">
            ← Modules
          </button>
        </div>
      </div>
    </header>

    <main class="consultation-content">
      <!-- Recherche par code (§7) -->
      <section class="card search-card">
        <div class="toolbar">
          <input
            v-model="recherche"
            class="search-input"
            type="text"
            placeholder="Rechercher par code patient ou N° d'ordre…"
            @input="onRecherche"
          />
        </div>
        <ul v-if="resultats.length && !passageCourant" class="resultats">
          <li
            v-for="p in resultats"
            :key="p.id"
            :class="{ 'non-consultable': !p.consultable }"
            @click="choisirPassage(p)"
          >
            <strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong>
            <span>
              {{ p.numeroOrdre }} · code {{ p.patient.code }} · {{ p.service?.nom }} ·
              {{ p.consultable ? 'Consultable' : 'Non activé (paiement requis)' }}
            </span>
          </li>
        </ul>
      </section>

      <!-- Fiche patient -->
      <section v-if="passageCourant" class="card fiche-card">
        <div class="fiche-info">
          <div class="fiche-ligne">
            <span class="fiche-label">Patient</span>
            <strong>{{ passageCourant.patient.nom }} {{ passageCourant.patient.prenom }}</strong>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">Code</span>
            <span class="code-chip">{{ passageCourant.patient.code }}</span>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">N° d'ordre</span>
            <strong>{{ passageCourant.numeroOrdre }}</strong>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">Service</span>
            <span>{{ passageCourant.service?.nom }}</span>
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">Âge / Sexe</span>
            <span>
              {{ passageCourant.patient.age || '?' }} ans ·
              {{ passageCourant.patient.sexe === 'M' ? 'Masculin' : passageCourant.patient.sexe === 'F' ? 'Féminin' : '—' }}
            </span>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" @click="quitterPatient">✕ Changer de patient</button>
      </section>

      <!-- Passage non activé -->
      <section v-if="passageCourant && !passageCourant.consultable" class="card">
        <div class="empty-state">
          ⚠️ Ce passage n'est pas activé — le paiement à la caisse est requis avant
          la consultation (§7 du cahier des charges).
        </div>
      </section>

      <!-- Contenu consultation -->
      <div v-if="passageCourant && passageCourant.consultable" class="consultation-grid">
        <!-- Colonne gauche : consultation -->
        <section class="card">
          <div class="card-header">
            <h2>Consultation</h2>
            <span v-if="consultation" class="badge" :class="consultation.statut === 'VALIDEE' ? 'badge-success' : 'badge-warning'">
              {{ consultation.statut === 'VALIDEE' ? 'Validée' : 'En cours' }}
            </span>
          </div>

          <!-- Constantes récupérées de l'accueil -->
          <div v-if="detail" class="constantes-box">
            <h3 class="section-title">Constantes (accueil)</h3>
            <div class="constantes-grid">
              <span v-if="detail.passage.constantes.temperature">🌡️ T° : <strong>{{ detail.passage.constantes.temperature }} °C</strong></span>
              <span v-if="detail.passage.constantes.pouls">💓 Pouls : <strong>{{ detail.passage.constantes.pouls }} bpm</strong></span>
              <span v-if="detail.passage.constantes.tensionGauche">🩸 TA : <strong>{{ detail.passage.constantes.tensionGauche }}{{ detail.passage.constantes.tensionDroite ? ' / ' + detail.passage.constantes.tensionDroite : '' }}</strong></span>
              <span v-if="detail.passage.constantes.poids">⚖️ Poids : <strong>{{ detail.passage.constantes.poids }} kg</strong></span>
              <span v-if="detail.passage.constantes.taille">📏 Taille : <strong>{{ detail.passage.constantes.taille }} cm</strong></span>
            </div>
          </div>

          <form @submit.prevent="enregistrerConsultation">
            <h3 class="section-title">Éléments de consultation</h3>
            <div class="field">
              <label>Motif</label>
              <input v-model.trim="formConsult.motif" placeholder="Ex : fièvre, douleurs abdominales…" />
            </div>
            <div class="field">
              <label>Observations</label>
              <textarea v-model.trim="formConsult.observation" rows="3" placeholder="Examen clinique, antécédents…"></textarea>
            </div>
            <div class="field">
              <label>Diagnostic</label>
              <input v-model.trim="formConsult.diagnostic" placeholder="Ex : Paludisme simple" />
            </div>
            <div class="form-row">
              <div class="field checkbox-field">
                <label class="checkbox-label">
                  <input v-model="formConsult.hospitalisation" type="checkbox" />
                  Hospitalisation
                </label>
              </div>
              <div v-if="formConsult.hospitalisation" class="field">
                <label>Durée prévue</label>
                <input v-model.trim="formConsult.hospitalisationDuree" placeholder="Ex : 3 jours" />
              </div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" type="submit" :disabled="savingConsult">
                {{ savingConsult ? 'Enregistrement…' : '💾 Enregistrer' }}
              </button>
            </div>
          </form>

          <!-- Médicaments -->
          <h3 class="section-title">Prescription de médicaments</h3>
          <div v-if="consultation && consultation.medicaments.length === 0" class="text-muted small-note">
            Aucun médicament prescrit.
          </div>
          <div v-else-if="consultation" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Médicament</th>
                  <th>Posologie</th>
                  <th>Quantité</th>
                  <th>Durée</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in consultation.medicaments" :key="p.id">
                  <td><strong>{{ p.medicamentNom }}</strong><span v-if="p.forme" class="text-muted"> ({{ p.forme }})</span></td>
                  <td>{{ p.posologie || '—' }}</td>
                  <td>{{ p.quantite || '—' }}</td>
                  <td>{{ p.duree || '—' }}</td>
                  <td>
                    <button class="btn btn-danger btn-sm" title="Retirer" @click="retirerMedicament(p)">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button class="btn btn-outline btn-sm btn-add" :disabled="!consultation" @click="ouvrirAjoutMedicament">
            + Ajouter un médicament
          </button>

          <!-- Examens -->
          <h3 class="section-title">Examens (laboratoire / imagerie)</h3>
          <div v-if="detail && detail.passage.prestations.length === 0" class="text-muted small-note">
            Aucune prestation disponible pour ce service.
          </div>
          <div v-else-if="detail" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Examen</th>
                  <th>Service</th>
                  <th>Montant</th>
                  <th>État</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in detail.passage.prestations" :key="l.id">
                  <td>{{ l.libelle }}</td>
                  <td>{{ l.service?.nom || '—' }}</td>
                  <td>{{ l.montant.toLocaleString('fr-FR') }}</td>
                  <td>
                    <span v-if="l.statut === 'NON_PRESCRITE'" class="badge badge-muted">Pas prescrit</span>
                    <span v-else-if="l.statut === 'EN_ATTENTE'" class="badge badge-warning">Prescrit — à payer</span>
                    <span v-else class="badge badge-success">Payé</span>
                  </td>
                  <td>
                    <button
                      v-if="l.statut === 'NON_PRESCRITE' && consultation"
                      class="btn btn-outline btn-sm"
                      @click="prescrireExamen(l)"
                    >
                      ✍️ Prescrire
                    </button>
                    <button
                      v-if="l.statut === 'EN_ATTENTE' && consultation"
                      class="btn btn-danger btn-sm"
                      title="Retirer la prescription"
                      @click="retirerExamen(l)"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Validation / ordonnance -->
          <div v-if="consultation" class="form-actions validation-row">
            <div class="ordo-save-group">
              <button class="btn btn-primary" :disabled="savingOrdo" @click="sauvegarderOrdonnance">
                💾 {{ savingOrdo ? 'Sauvegarde…' : 'Sauvegarder l\'ordonnance' }}
              </button>
              <button class="btn btn-outline" @click="imprimerOrdonnance">
                🖨️ Imprimer l'ordonnance
              </button>
              <span v-if="consultation.ordonnanceSauveeLe" class="badge badge-success ordo-saved-badge">
                ✓ Sauvegardée le {{ formatDateHeure(consultation.ordonnanceSauveeLe) }}
              </span>
            </div>
            <button
              class="btn btn-primary btn-validate"
              :disabled="consultation.statut === 'VALIDEE'"
              @click="validerConsultation"
            >
              ✓ Valider la consultation
            </button>
          </div>
        </section>

        <!-- Colonne droite : historique médical -->
        <section class="card">
          <div class="card-header"><h2>Historique médical</h2></div>
          <div v-if="!detail || detail.historique.length === 0" class="empty-state">
            Aucune consultation antérieure.
          </div>
          <div v-else class="historique-list">
            <div v-for="h in detail.historique" :key="h.id" class="historique-item">
              <div class="historique-head">
                <strong>{{ h.passage?.numeroOrdre }}</strong>
                <span>{{ formatDate(h.createdAt) }} · {{ h.medecin?.personnel?.nom || '—' }}</span>
              </div>
              <div v-if="h.diagnostic" class="historique-diag">
                Diagnostic : {{ h.diagnostic }}
              </div>
              <div v-if="h.medicaments.length" class="historique-meds">
                💊 {{ h.medicaments.map((m) => m.medicamentNom).join(', ') }}
              </div>
              <span class="badge" :class="h.statut === 'VALIDEE' ? 'badge-success' : 'badge-warning'">
                {{ h.statut === 'VALIDEE' ? 'Validée' : 'En cours' }}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Modale : ajout médicament -->
    <div v-if="ajoutVisible" class="modal-backdrop">
      <div class="modal">
        <h2>Prescrire un médicament</h2>
        <p v-if="ajoutError" class="alert alert-error">{{ ajoutError }}</p>
        <form @submit.prevent="confirmerAjoutMedicament">
          <div class="field">
            <label>
              Médicament (catalogue)
              <span v-if="estInterne" class="text-muted"> — uniquement les médicaments disponibles</span>
            </label>
            <SelectSearch
              v-model="ajoutMedicamentId"
              :options="optionsMedicaments"
              placeholder="— Saisie libre ci-dessous —"
              @change="onMedicamentChoisi"
            />
          </div>
          <div class="field">
            <label>Nom du médicament (saisie libre)</label>
            <input v-model.trim="ajoutNom" placeholder="Ex : Paracétamol 500 mg" />
          </div>
          <div class="form-row">
            <div class="field">
              <label>Posologie</label>
              <input v-model.trim="ajoutPosologie" placeholder="Ex : 1 comprimé 3x/j" />
            </div>
            <div class="field">
              <label>Quantité</label>
              <input v-model.trim="ajoutQuantite" placeholder="Ex : 12 comprimés" />
            </div>
            <div class="field">
              <label>Durée</label>
              <input v-model.trim="ajoutDuree" placeholder="Ex : 4 jours" />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="ajoutVisible = false">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="ajoutEnCours">
              {{ ajoutEnCours ? 'Ajout…' : 'Ajouter' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modale : aperçu de l'ordonnance (format A4) -->
    <div v-if="apercuVisible" class="modal-backdrop">
      <div class="modal modal-a4">
        <h2>📋 Aperçu de l'ordonnance (A4)</h2>
        <div class="ordo-a4 apercu-a4">
          <div class="ordo-a4-head">
            <img :src="logoClinique" alt="Logo" class="ordo-a4-logo" />
            <div class="ordo-a4-titre">
              <h1>{{ cliniqueNom }}</h1>
              <p v-if="cliniqueAdresse">{{ cliniqueAdresse }}</p>
            </div>
            <div class="ordo-a4-date">
              <div>Date : {{ formatDate(new Date()) }}</div>
              <div>N° ordre : {{ ordonnance?.passage?.numeroOrdre }}</div>
            </div>
          </div>
          <h2 class="ordo-a4-title">ORDONNANCE MÉDICALE</h2>
          <div class="ordo-a4-infos">
            <div><strong>Patient :</strong> {{ ordonnance?.patient?.nom }} {{ ordonnance?.patient?.prenom }}</div>
            <div><strong>Âge :</strong> {{ ordonnance?.patient?.age || '—' }} ans &nbsp;·&nbsp; <strong>Sexe :</strong> {{ ordonnance?.patient?.sexe === 'M' ? 'Masculin' : ordonnance?.patient?.sexe === 'F' ? 'Féminin' : '—' }}</div>
            <div><strong>Code :</strong> {{ ordonnance?.patient?.code }}</div>
            <div><strong>Médecin :</strong> Dr {{ auth.user?.personnel?.nom }} {{ auth.user?.personnel?.prenom }}</div>
          </div>

          <table class="ordo-a4-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Médicament</th>
                <th>Posologie</th>
                <th>Quantité</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!ordonnance || ordonnance.medicaments.length === 0">
                <td colspan="5" class="ordo-a4-vide">Aucun médicament prescrit.</td>
              </tr>
              <tr v-for="(m, i) in ordonnance?.medicaments" :key="m.id">
                <td>{{ i + 1 }}</td>
                <td>
                  <strong>{{ m.medicamentNom }}</strong>
                  <span v-if="m.forme" class="ordo-a4-sous"> ({{ m.forme }})</span>
                </td>
                <td>{{ m.posologie || '—' }}</td>
                <td>{{ m.quantite || '—' }}</td>
                <td>{{ m.duree || '—' }}</td>
              </tr>
            </tbody>
          </table>

          <div class="ordo-a4-footer">
            <div class="ordo-a4-signature">
              Signature et cachet du médecin
            </div>
            <div class="ordo-a4-merci">Merci de votre visite.</div>
          </div>
          <div class="ordo-a4-cut" aria-hidden="true">✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="apercuVisible = false">Fermer</button>
          <button class="btn btn-primary" @click="imprimerNavigateur">🖨️ Imprimer (A4)</button>
        </div>
      </div>
    </div>

    <!-- Ordonnance imprimable (A4, navigateur) -->
    <div v-if="ordonnance" id="ordo-print">
      <div class="ordo-a4">
        <div class="ordo-a4-head">
          <img :src="logoClinique" alt="Logo" class="ordo-a4-logo" />
          <div class="ordo-a4-titre">
            <h1>{{ cliniqueNom }}</h1>
            <p v-if="cliniqueAdresse">{{ cliniqueAdresse }}</p>
          </div>
          <div class="ordo-a4-date">
            <div>Date : {{ formatDate(new Date()) }}</div>
            <div>N° ordre : {{ ordonnance.passage.numeroOrdre }}</div>
          </div>
        </div>
        <h2 class="ordo-a4-title">ORDONNANCE MÉDICALE</h2>
        <div class="ordo-a4-infos">
          <div><strong>Patient :</strong> {{ ordonnance.patient.nom }} {{ ordonnance.patient.prenom }}</div>
          <div><strong>Âge :</strong> {{ ordonnance.patient.age || '—' }} ans &nbsp;·&nbsp; <strong>Sexe :</strong> {{ ordonnance.patient.sexe === 'M' ? 'Masculin' : ordonnance.patient.sexe === 'F' ? 'Féminin' : '—' }}</div>
          <div><strong>Code :</strong> {{ ordonnance.patient.code }}</div>
          <div><strong>Médecin :</strong> Dr {{ auth.user?.personnel?.nom }} {{ auth.user?.personnel?.prenom }}</div>
        </div>

        <table class="ordo-a4-table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Médicament</th>
              <th>Posologie</th>
              <th>Quantité</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="ordonnance.medicaments.length === 0">
              <td colspan="5" class="ordo-a4-vide">Aucun médicament prescrit.</td>
            </tr>
            <tr v-for="(m, i) in ordonnance.medicaments" :key="m.id">
              <td>{{ i + 1 }}</td>
              <td>
                <strong>{{ m.medicamentNom }}</strong>
                <span v-if="m.forme" class="ordo-a4-sous"> ({{ m.forme }})</span>
              </td>
              <td>{{ m.posologie || '—' }}</td>
              <td>{{ m.quantite || '—' }}</td>
              <td>{{ m.duree || '—' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="ordo-a4-footer">
          <div class="ordo-a4-signature">
            Signature et cachet du médecin
          </div>
          <div class="ordo-a4-merci">Merci de votre visite.</div>
        </div>
        <div class="ordo-a4-cut" aria-hidden="true">✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import http from '../api/http'
import { toastError, toastSuccess } from '../utils/notifications'
import logoClinique from '../assets/logoclinique.jpeg'
import SelectSearch from '../components/SelectSearch.vue'

const auth = useAuthStore()
const router = useRouter()

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')
const cliniqueAdresse = ref('')

const todayLabel = computed(() =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
)

// Recherche + passage courant
const recherche = ref('')
const resultats = ref([])
const passageCourant = ref(null)
const detail = ref(null)
const consultation = ref(null)
let rechercheTimer = null

// Formulaire consultation
const formConsult = reactive({})
const savingConsult = ref(false)

// Médicaments
const medicaments = ref([])
const ajoutVisible = ref(false)
const ajoutMedicamentId = ref(null)
const ajoutNom = ref('')
const ajoutPosologie = ref('')
const ajoutQuantite = ref('')
const ajoutDuree = ref('')
const ajoutEnCours = ref(false)
const ajoutError = ref('')

// Ordonnance
const ordonnance = ref(null)
const apercuVisible = ref(false)

function onRecherche() {
  clearTimeout(rechercheTimer)
  rechercheTimer = setTimeout(async () => {
    if (recherche.value.trim().length < 2) {
      resultats.value = []
      return
    }
    try {
      const { data } = await http.get('/consultations/recherche', {
        params: { code: recherche.value, cliniqueId: cliniqueId.value },
      })
      resultats.value = data
    } catch {
      resultats.value = []
    }
  }, 300)
}

async function choisirPassage(p) {
  passageCourant.value = p
  resultats.value = []
  recherche.value = ''
  await chargerDetail()
}

function quitterPatient() {
  passageCourant.value = null
  detail.value = null
  consultation.value = null
  ordonnance.value = null
  Object.keys(formConsult).forEach((k) => delete formConsult[k])
}

async function chargerDetail() {
  if (!passageCourant.value) return
  try {
    const { data } = await http.get(`/consultations/passages/${passageCourant.value.id}`)
    detail.value = data
    consultation.value = data.passage.consultation
    Object.keys(formConsult).forEach((k) => delete formConsult[k])
    if (data.passage.consultation) {
      Object.assign(formConsult, {
        motif: data.passage.consultation.motif ?? '',
        observation: data.passage.consultation.observation ?? '',
        diagnostic: data.passage.consultation.diagnostic ?? '',
        hospitalisation: data.passage.consultation.hospitalisation,
        hospitalisationDuree: data.passage.consultation.hospitalisationDuree ?? '',
      })
    } else {
      Object.assign(formConsult, {
        motif: '', observation: '', diagnostic: '',
        hospitalisation: false, hospitalisationDuree: '',
      })
    }
  } catch (e) {
    toastError('Impossible de charger le passage.')
  }
}

async function enregistrerConsultation() {
  if (!passageCourant.value) return
  savingConsult.value = true
  try {
    const { data } = await http.post(`/consultations/passages/${passageCourant.value.id}`, {
      ...formConsult,
      hospitalisationDuree: formConsult.hospitalisationDuree || undefined,
    })
    consultation.value = data
    toastSuccess('Consultation enregistrée.')
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    savingConsult.value = false
  }
}

// Type du passage courant : interne ou externe (règles de prescription)
const estInterne = computed(() => passageCourant.value?.typePatient !== 'EXTERNE')

const medicamentsDisponibles = computed(() =>
  medicaments.value.filter((m) => m.stock > 0),
)
const medicamentsRupture = computed(() =>
  medicaments.value.filter((m) => m.stock <= 0),
)

/** Options du SelectSearch : disponibles + rupture (externe uniquement). */
const optionsMedicaments = computed(() => {
  const dispo = medicamentsDisponibles.value.map((m) => ({
    value: m.id,
    label: `${m.nom}${m.dosage ? ' — ' + m.dosage : ''} (stock ${m.stock})`,
  }))
  const rupture = estInterne.value
    ? []
    : medicamentsRupture.value.map((m) => ({
        value: m.id,
        label: `${m.nom}${m.dosage ? ' — ' + m.dosage : ''} (rupture)`,
      }))
  return [...dispo, ...rupture]
})

async function ouvrirAjoutMedicament() {
  ajoutVisible.value = true
  ajoutMedicamentId.value = null
  ajoutNom.value = ''
  ajoutPosologie.value = ''
  ajoutQuantite.value = ''
  ajoutDuree.value = ''
  ajoutError.value = ''
  try {
    const { data } = await http.get('/medicaments', { params: { cliniqueId: cliniqueId.value } })
    medicaments.value = data.filter((m) => m.actif)
  } catch {
    medicaments.value = []
  }
}

function onMedicamentChoisi(valeur) {
  const m = medicaments.value.find((x) => x.id === valeur)
  if (m) ajoutNom.value = m.nom
}

async function confirmerAjoutMedicament() {
  if (!consultation.value) return
  if (!ajoutMedicamentId.value && !ajoutNom.value.trim()) {
    ajoutError.value = 'Sélectionnez un médicament du catalogue ou saisissez un nom.'
    return
  }
  ajoutEnCours.value = true
  ajoutError.value = ''
  try {
    await http.post(`/consultations/${consultation.value.id}/medicaments`, {
      medicamentId: ajoutMedicamentId.value ?? undefined,
      nom: ajoutNom.value || undefined,
      posologie: ajoutPosologie.value || undefined,
      quantite: ajoutQuantite.value || undefined,
      duree: ajoutDuree.value || undefined,
    })
    // La modale reste ouverte pour enchaîner les prescriptions ;
    // seuls les champs sont réinitialisés.
    ajoutMedicamentId.value = null
    ajoutNom.value = ''
    ajoutPosologie.value = ''
    ajoutQuantite.value = ''
    ajoutDuree.value = ''
    toastSuccess('Médicament ajouté — vous pouvez en ajouter un autre.')
    await chargerDetail()
  } catch (e) {
    ajoutError.value = e.response?.data?.message || 'Erreur lors de l\'ajout.'
  } finally {
    ajoutEnCours.value = false
  }
}

async function retirerMedicament(p) {
  try {
    await http.delete(`/consultations/medicaments/${p.id}`)
    toastSuccess('Prescription retirée.')
    await chargerDetail()
  } catch (e) {
    toastError('Erreur lors du retrait.')
  }
}

async function prescrireExamen(l) {
  if (!consultation.value) return
  try {
    await http.post(`/consultations/${consultation.value.id}/examens`, {
      lignesIds: [l.id],
    })
    toastSuccess(`Examen prescrit : ${l.libelle} — payable à la caisse.`)
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de la prescription.')
  }
}

async function retirerExamen(l) {
  if (!consultation.value) return
  try {
    await http.delete(`/consultations/examens/${l.id}`)
    toastSuccess('Prescription d\'examen retirée.')
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors du retrait.')
  }
}

async function validerConsultation() {
  if (!consultation.value) return
  try {
    await http.post(`/consultations/${consultation.value.id}/valider`)
    toastSuccess('Consultation validée.')
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de la validation.')
  }
}

const savingOrdo = ref(false)

async function sauvegarderOrdonnance() {
  if (!consultation.value) return
  savingOrdo.value = true
  try {
    await http.post(`/consultations/${consultation.value.id}/ordonnance-sauvegarder`)
    await chargerDetail()
    // Affiche l'aperçu de l'ordonnance sauvegardée
    construireApercu()
    apercuVisible.value = true
    toastSuccess('Ordonnance sauvegardée.')
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de la sauvegarde.')
  } finally {
    savingOrdo.value = false
  }
}

/** Construit l'ordonnance pour l'aperçu et l'impression. */
function construireApercu() {
  if (!consultation.value || !passageCourant.value) return
  ordonnance.value = {
    patient: passageCourant.value.patient,
    passage: passageCourant.value,
    medicaments: consultation.value.medicaments ?? [],
  }
}

/** L'ordonnance s'imprime en A4 : ouvre l'aperçu avant impression. */
async function imprimerOrdonnance() {
  construireApercu()
  apercuVisible.value = true
}

async function imprimerNavigateur() {
  construireApercu()
  window.print()
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR')
}

function formatDateHeure(d) {
  return new Date(d).toLocaleString('fr-FR')
}

onMounted(async () => {
  try {
    const { data } = await http.get('/cliniques')
    cliniqueAdresse.value =
      data.find((x) => x.id === cliniqueId.value)?.adresse ?? ''
  } catch {
    // adresse vide si l'API ne répond pas
  }
})
onUnmounted(() => clearTimeout(rechercheTimer))
</script>

<style scoped>
.consultation-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
  display: flex;
  flex-direction: column;
}

.consultation-header {
  background: linear-gradient(120deg, #0d9488 0%, #0f766e 55%, #115e59 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 6px 24px rgba(13, 71, 67, 0.28);
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-logo {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 13px;
}
.brand-text {
  display: flex;
  flex-direction: column;
}
.brand-text strong {
  color: #fff;
  font-size: 16px;
  font-weight: 800;
}
.brand-text span {
  color: rgba(236, 253, 245, 0.75);
  font-size: 12px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.date-pill {
  padding: 5px 13px;
  font-size: 12.5px;
  font-weight: 600;
  color: #ecfdf5;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  text-transform: capitalize;
}
.btn-back {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.45);
}
.btn-back:hover {
  background: rgba(255, 255, 255, 0.16);
}

.consultation-content {
  flex: 1;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 24px;
}

.search-card {
  margin-bottom: 16px;
}
.resultats {
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 220px;
  overflow-y: auto;
}
.resultats li {
  padding: 10px 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border);
}
.resultats li:hover {
  background: var(--primary-light);
}
.resultats li.non-consultable {
  opacity: 0.6;
}
.resultats span {
  font-size: 12px;
  color: var(--text-muted);
}

.fiche-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  background: #f0fdfa;
  border-color: #c9ece5;
}
.fiche-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.fiche-ligne {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13.5px;
}
.fiche-label {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
.code-chip {
  font-family: Consolas, monospace;
  font-weight: 700;
  color: #0f766e;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12.5px;
  width: fit-content;
}

.consultation-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 1000px) {
  .consultation-grid {
    grid-template-columns: 1fr;
  }
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f766e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 18px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #ddf1ee;
}
.constantes-box {
  background: #f8fdfb;
  border: 1px solid #d5eee9;
  border-radius: 10px;
  padding: 6px 14px 10px;
  margin-bottom: 8px;
}
.constantes-grid {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13.5px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}
.validation-row {
  border-top: 1px solid var(--border);
  padding-top: 14px;
  justify-content: space-between;
  flex-wrap: wrap;
}
.ordo-save-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.ordo-saved-badge {
  font-size: 12px;
}
.btn-validate {
  background: #16a34a;
}
.small-note {
  font-size: 13px;
}
.btn-add {
  margin-top: 8px;
}
.checkbox-field {
  display: flex;
  align-items: center;
}

.historique-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.historique-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.historique-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.historique-head span {
  color: var(--text-muted);
  font-size: 12px;
}
.historique-diag {
  font-weight: 600;
}
.historique-meds {
  color: #475569;
  font-size: 12.5px;
}

/* ---------- Ordonnance format A4 ---------- */
@media screen {
  #ordo-print {
    position: fixed;
    left: -10000px;
    top: 0;
  }
}
@media print {
  @page {
    size: A4;
    margin: 16mm 14mm;
  }
}
.modal-a4 {
  max-width: 960px;
}
.ordo-a4 {
  width: 210mm;
  max-width: 100%;
  /* La hauteur s'adapte au contenu (liste des médicaments) */
  margin: 0 auto 16px;
  background: #ffffff;
  padding: 14mm 12mm;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #1e293b;
  box-shadow: 0 10px 30px rgba(13, 148, 136, 0.12);
  border: 1px solid #d5eee9;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ordo-a4-head {
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 2px solid #134e4a;
  padding-bottom: 14px;
}
.ordo-a4-logo {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 12px;
  flex-shrink: 0;
}
.ordo-a4-titre h1 {
  font-size: 22px;
  color: #134e4a;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.ordo-a4-titre p {
  font-size: 13px;
  color: #475569;
  margin-top: 2px;
}
.ordo-a4-date {
  margin-left: auto;
  text-align: right;
  font-size: 13px;
  color: #1e293b;
  white-space: nowrap;
}
.ordo-a4-title {
  text-align: center;
  font-size: 20px;
  letter-spacing: 4px;
  color: #134e4a;
  margin: 20px 0 16px;
  text-transform: uppercase;
}
.ordo-a4-infos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 24px;
  font-size: 14px;
  border: 1px solid #d5eee9;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 18px;
}
.ordo-a4-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  table-layout: fixed;
  word-wrap: break-word;
}
.ordo-a4-table th,
.ordo-a4-table td {
  border: 1px solid #cbd5e1;
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
  overflow-wrap: break-word;
}
.ordo-a4-table th:first-child,
.ordo-a4-table td:first-child {
  width: 8%;
}
.ordo-a4-table th:nth-child(2),
.ordo-a4-table td:nth-child(2) {
  width: 34%;
}
.ordo-a4-table th:nth-child(3),
.ordo-a4-table td:nth-child(3) {
  width: 24%;
}
.ordo-a4-table th:nth-child(4),
.ordo-a4-table td:nth-child(4) {
  width: 15%;
}
.ordo-a4-table th:nth-child(5),
.ordo-a4-table td:nth-child(5) {
  width: 14%;
}
.ordo-a4-table th {
  background: #f0fdfa;
  color: #134e4a;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ordo-a4-sous {
  color: #64748b;
  font-weight: 400;
}
.ordo-a4-vide {
  text-align: center;
  color: #64748b;
  padding: 18px !important;
}
.ordo-a4-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-top: 1px solid #d5eee9;
  padding-top: 18px;
  margin-top: 24px;
}
.ordo-a4-cut {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 2px;
  color: #94a3b8;
}
.ordo-a4-signature {
  font-size: 13px;
  color: #475569;
  font-style: italic;
}
.ordo-a4-merci {
  font-size: 13.5px;
  font-weight: 700;
  color: #134e4a;
}
@media print {
  .ordo-a4 {
    box-shadow: none;
    border: none;
    margin: 0;
    min-height: 0;
    width: 100%;
    padding: 0;
  }
  .ordo-a4-head,
  .ordo-a4-title,
  .ordo-a4-infos,
  .ordo-a4-table,
  .ordo-a4-footer {
    page-break-inside: avoid;
  }
  .ordo-a4-cut {
    page-break-before: avoid;
  }
}
</style>
