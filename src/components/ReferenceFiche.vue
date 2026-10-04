<template>
  <div>
    <!-- Liste des fiches du patient -->
    <div v-if="fiches.length > 0" class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>N° fiche</th>
            <th>Établie le</th>
            <th>Motif de référence</th>
            <th>Contre-référence</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in fiches" :key="f.id">
            <td><strong>{{ f.numero }}</strong></td>
            <td>{{ formatDateHeure(f.createdAt) }}</td>
            <td>{{ f.motifReference || '—' }}</td>
            <td>
              <span class="badge" :class="f.contreDiagnostic ? 'badge-success' : 'badge-muted'">
                {{ f.contreDiagnostic ? 'Reçue' : 'En attente' }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button class="btn btn-outline btn-sm" @click="ouvrirContreReference(f)">
                  ✏️ Contre-référence
                </button>
                <button class="btn btn-primary btn-sm" @click="ouvrirApercu(f)">
                  🖨️ Imprimer
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="text-muted small-note">
      Aucune fiche de référence pour ce patient.
    </div>

    <button v-if="!formVisible" class="btn btn-primary btn-sm" @click="ouvrirForm">
      ＋ Nouvelle fiche de référence (évacuation)
    </button>
    <button v-else class="btn btn-outline btn-sm" @click="formVisible = false">
      ✖ Annuler
    </button>

    <!-- Formulaire partie 1 : référence -->
    <form v-if="formVisible" @submit.prevent="enregistrer">
      <div class="form-separator">1- Informations de référence</div>
      <div class="form-row">
        <div class="field">
          <label>Transfert urgent</label>
          <select v-model="form.transfertUrgent">
            <option :value="null">—</option>
            <option :value="true">OUI</option>
            <option :value="false">NON</option>
          </select>
        </div>
        <div class="field"><label>Nom et Prénoms</label><input v-model.trim="form.nomPrenoms" /></div>
        <div class="field"><label>Âge</label><input v-model.trim="form.age" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Sexe</label><input v-model.trim="form.sexe" /></div>
        <div class="field"><label>N° Sécurité sociale</label><input v-model.trim="form.numeroSecu" /></div>
        <div class="field"><label>Adresse / Tél</label><input v-model.trim="form.adresseTel" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>N° Registre SIG</label><input v-model.trim="form.numeroRegistreSig" /></div>
        <div class="field"><label>District sanitaire</label><input v-model.trim="form.districtSanitaire" /></div>
        <div class="field"><label>Date d'admission</label><input v-model="form.dateAdmission" type="date" /></div>
        <div class="field"><label>Heure d'admission</label><input v-model.trim="form.heureAdmission" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Agent qui réfère (nom)</label><input v-model.trim="form.agentNom" /></div>
        <div class="field"><label>Prénom</label><input v-model.trim="form.agentPrenom" /></div>
        <div class="field"><label>Contact</label><input v-model.trim="form.agentContact" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Institution de référence</label><input v-model.trim="form.institutionReference" /></div>
        <div class="field"><label>Service</label><input v-model.trim="form.serviceReference" /></div>
        <div class="field"><label>Date/heure de décision d'évacuation</label><input v-model.trim="form.dateHeureDecision" /></div>
      </div>
      <div class="field"><label>Diagnostic</label><textarea v-model.trim="form.diagnostic" rows="2"></textarea></div>
      <div class="field"><label>Examens cliniques</label><textarea v-model.trim="form.examensCliniques" rows="2"></textarea></div>
      <div class="form-row">
        <div class="field"><label>Antécédents médicaux</label><input v-model.trim="form.antecedentsMedicaux" /></div>
        <div class="field"><label>Chirurgicaux</label><input v-model.trim="form.antecedentsChirurgicaux" /></div>
        <div class="field"><label>Gynéco-obstétricaux</label><input v-model.trim="form.antecedentsGyneco" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Allergie</label><input v-model.trim="form.allergie" /></div>
        <div class="field"><label>Groupe sanguin et Rhésus</label><input v-model.trim="form.groupeSanguin" /></div>
      </div>
      <div class="field"><label>Motif de référence</label><textarea v-model.trim="form.motifReference" rows="2"></textarea></div>
      <div class="field"><label>Traitement reçu au centre</label><textarea v-model.trim="form.traitementRecu" rows="2"></textarea></div>
      <div class="form-row">
        <div class="field"><label>Depuis quand</label><input v-model.trim="form.depuisQuand" /></div>
        <div class="field">
          <label>Mode d'évacuation</label>
          <select v-model="form.modeEvacuation">
            <option value="">—</option>
            <option value="AMBULANCE">Ambulance</option>
            <option value="VEHICULE_PERSONNEL">Taxi ou véhicule personnel</option>
            <option value="AUTRE">Autre (à préciser)</option>
          </select>
        </div>
        <div class="field"><label>Autre (à préciser)</label><input v-model.trim="form.modeEvacuationAutre" /></div>
      </div>
      <div class="field"><label>Date, heure de départ effectif</label><input v-model.trim="form.dateHeureDepart" /></div>

      <div class="modal-actions">
        <button type="submit" class="btn btn-primary" :disabled="enCours">
          {{ enCours ? 'Enregistrement…' : '💾 Enregistrer la fiche' }}
        </button>
      </div>
    </form>

    <!-- Modale contre-référence (partie 2, au retour du patient) -->
    <div v-if="contreVisible" class="modal-backdrop">
      <div class="modal modal-lg">
        <h2>✏️ Contre-référence — {{ contreCible?.numero }}</h2>
        <form @submit.prevent="enregistrerContreReference">
          <div class="form-separator">2- Informations de contre-référence</div>
          <div class="form-row">
            <div class="field"><label>Nom et Prénoms du malade</label><input v-model.trim="contreForm.contreNomPrenoms" /></div>
            <div class="field"><label>Numéro du dossier</label><input v-model.trim="contreForm.contreNumeroDossier" /></div>
            <div class="field"><label>Date/heure d'arrivée</label><input v-model.trim="contreForm.contreDateArrivee" /></div>
          </div>
          <div class="field"><label>Diagnostic retenu à la sortie du malade</label><textarea v-model.trim="contreForm.contreDiagnostic" rows="2"></textarea></div>
          <div class="field">
            <label>Le patient a été hospitalisé</label>
            <select v-model="contreForm.contreHospitalise">
              <option :value="null">—</option>
              <option :value="true">OUI</option>
              <option :value="false">NON</option>
            </select>
          </div>
          <div class="field"><label>Traitement à suivre</label><textarea v-model.trim="contreForm.contreTraitement" rows="2"></textarea></div>
          <div class="form-row">
            <div class="field"><label>Nom et fonction du médecin responsable</label><input v-model.trim="contreForm.contreMedecin" /></div>
            <div class="field"><label>Date et signature</label><input v-model.trim="contreForm.contreDateSignature" /></div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="contreVisible = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="enCours">💾 Enregistrer la contre-référence</button>
          </div>
        </form>
      </div>
    </div>
    <!-- Aperçu A4 avant impression (même présentation que la fiche officielle) -->
    <div v-if="apercu" class="apercu-voile"></div>
    <div v-if="apercu" class="apercu-barre">
      <span>👁️ Aperçu de la fiche de référence — vérifiez avant d'imprimer</span>
      <div class="apercu-barre-actions">
        <button class="btn btn-primary btn-sm" @click="imprimerNavigateur">🖨️ Imprimer</button>
        <button class="btn btn-outline btn-sm btn-back" @click="apercu = null">Fermer</button>
      </div>
    </div>
    <div v-if="apercu" id="ref-print" class="apercu-flottant">
      <div class="ref-a4">
        <div class="ref-entete">
          <div class="ref-rep">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
          <div class="ref-min">Union - Discipline - Travail</div>
          <div class="ref-min">MINISTÈRE DE LA SANTÉ, DE L'HYGIÈNE PUBLIQUE ET DE LA COUVERTURE MALADIE UNIVERSELLE</div>
        </div>
        <div class="ref-titre">FORMULAIRE DE RÉFÉRENCE ET CONTRE-RÉFÉRENCE</div>
        <div class="ref-ligne">
          <span class="ref-lib">Direction régionale de :</span><span class="ref-val"></span>
          <span class="ref-lib">District sanitaire de :</span><span class="ref-val">{{ apercu.districtSanitaire }}</span>
        </div>
        <div class="ref-regle"></div>
        <div class="ref-section">1- INFORMATIONS DE RÉFÉRENCE</div>
        <div v-for="l in lignesApercu" :key="l.lib" class="ref-ligne">
          <span class="ref-lib">{{ l.lib }} :</span><span class="ref-val">{{ l.val }}</span>
        </div>
        <div class="ref-section">2- INFORMATIONS DE CONTRE-RÉFÉRENCE (à recevoir par l'agent qui a référé)</div>
        <div v-for="l in lignesContre" :key="l.lib" class="ref-ligne">
          <span class="ref-lib">{{ l.lib }} :</span><span class="ref-val">{{ l.val }}</span>
        </div>
        <div class="ref-sign">
          <div>Fiche établie par : {{ nomAgent }}</div>
          <div>{{ apercu.numero }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import http from '../api/http'
import { toastError, toastSuccess } from '../utils/notifications'

const props = defineProps({
  passage: { type: Object, required: true }, // { id, patient, service }
  cliniqueId: { type: Number, default: null },
})

const fiches = ref([])
const formVisible = ref(false)
const enCours = ref(false)
const contreVisible = ref(false)
const contreCible = ref(null)
const form = reactive({})
const contreForm = reactive({})
const emit = defineEmits(['apercu'])

function formatDateHeure(d) {
  return new Date(d).toLocaleString('fr-FR')
}

async function charger() {
  try {
    const { data } = await http.get(`/references/passages/${props.passage.id}`)
    fiches.value = data ?? []
  } catch {
    fiches.value = []
  }
}

onMounted(charger)

function ouvrirForm() {
  const p = props.passage.patient ?? {}
  Object.keys(form).forEach((k) => delete form[k])
  Object.assign(form, {
    transfertUrgent: null,
    nomPrenoms: `${p.nom ?? ''} ${p.prenom ?? ''}`.trim(),
    age: p.age ?? '',
    sexe: p.sexe ?? '',
    numeroSecu: p.numeroCmu ?? '',
    adresseTel: [p.ville, p.quartier, p.telephone].filter(Boolean).join(' / '),
    numeroRegistreSig: p.numeroDossier ?? '',
    districtSanitaire: '',
    dateAdmission: '',
    heureAdmission: '',
    agentNom: '',
    agentPrenom: '',
    agentContact: '',
    institutionReference: '',
    serviceReference: props.passage.service?.nom ?? '',
    dateHeureDecision: '',
    diagnostic: '',
    examensCliniques: '',
    antecedentsMedicaux: '',
    antecedentsChirurgicaux: '',
    antecedentsGyneco: '',
    allergie: '',
    groupeSanguin: '',
    motifReference: '',
    traitementRecu: '',
    depuisQuand: '',
    modeEvacuation: '',
    modeEvacuationAutre: '',
    dateHeureDepart: '',
  })
  formVisible.value = true
}

async function enregistrer() {
  enCours.value = true
  try {
    await http.post(`/references/passages/${props.passage.id}`, { ...form })
    toastSuccess('Fiche de référence enregistrée dans le dossier du patient.')
    formVisible.value = false
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || "Impossible d'enregistrer la fiche.")
  } finally {
    enCours.value = false
  }
}

function ouvrirContreReference(f) {
  contreCible.value = f
  Object.keys(contreForm).forEach((k) => delete contreForm[k])
  Object.assign(contreForm, {
    contreNomPrenoms: f.contreNomPrenoms ?? f.nomPrenoms ?? '',
    contreNumeroDossier: f.contreNumeroDossier ?? '',
    contreDateArrivee: f.contreDateArrivee ?? '',
    contreDiagnostic: f.contreDiagnostic ?? '',
    contreHospitalise: f.contreHospitalise ?? null,
    contreTraitement: f.contreTraitement ?? '',
    contreMedecin: f.contreMedecin ?? '',
    contreDateSignature: f.contreDateSignature ?? '',
  })
  contreVisible.value = true
}

async function enregistrerContreReference() {
  if (!contreCible.value) return
  enCours.value = true
  try {
    await http.patch(`/references/${contreCible.value.id}`, { ...contreForm })
    toastSuccess('Contre-référence enregistrée.')
    contreVisible.value = false
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || "Impossible d'enregistrer la contre-référence.")
  } finally {
    enCours.value = false
  }
}

function ouvrirApercu(f) {
  emit('apercu', f)
  apercu.value = f
}

/** window n'est pas accessible dans le template Vue : passer par une méthode. */
function imprimerNavigateur() {
  window.print()
}

const apercu = ref(null)

const nomAgent = computed(() => {
  const e = apercu.value?.etabliPar
  return e?.personnel ? `${e.personnel.nom} ${e.personnel.prenom}` : ''
})

const lignesApercu = computed(() => {
  const f = apercu.value
  if (!f) return []
  return [
    { lib: 'Transfert urgent', val: f.transfertUrgent == null ? 'OUI [ ] NON [ ]' : f.transfertUrgent ? 'OUI [X] NON [ ]' : 'OUI [ ] NON [X]' },
    { lib: 'Nom et Prénoms', val: f.nomPrenoms },
    { lib: 'Âge', val: f.age },
    { lib: 'Sexe', val: f.sexe },
    { lib: 'N° de Sécurité sociale', val: f.numeroSecu },
    { lib: 'Adresse / Tél', val: f.adresseTel },
    { lib: 'N° Registre SIG', val: f.numeroRegistreSig },
    { lib: "Date d'admission", val: f.dateAdmission ? new Date(f.dateAdmission).toLocaleDateString('fr-FR') : '' },
    { lib: "Heure d'admission", val: f.heureAdmission },
    { lib: 'Agent qui réfère', val: `${f.agentNom ?? ''} ${f.agentPrenom ?? ''}`.trim() },
    { lib: 'Contact', val: f.agentContact },
    { lib: 'Institution de référence', val: f.institutionReference },
    { lib: 'Service', val: f.serviceReference },
    { lib: "Date/heure de décision d'évacuation", val: f.dateHeureDecision },
    { lib: 'Diagnostic', val: f.diagnostic },
    { lib: 'Examens cliniques', val: f.examensCliniques },
    { lib: 'Antécédents (méd. / chir. / gynéco-obst.)', val: `${f.antecedentsMedicaux ?? ''} / ${f.antecedentsChirurgicaux ?? ''} / ${f.antecedentsGyneco ?? ''}` },
    { lib: 'Allergie', val: f.allergie },
    { lib: 'Groupe sanguin et Rhésus', val: f.groupeSanguin },
    { lib: 'Motif de référence', val: f.motifReference },
    { lib: 'Traitement reçu au centre', val: f.traitementRecu },
    { lib: 'Depuis quand', val: f.depuisQuand },
    {
      lib: "Mode d'évacuation",
      val:
        f.modeEvacuation === 'AMBULANCE' ? '[X] Ambulance  [ ] Taxi/véhicule personnel  [ ] Autre'
        : f.modeEvacuation === 'VEHICULE_PERSONNEL' ? '[ ] Ambulance  [X] Taxi/véhicule personnel  [ ] Autre'
        : f.modeEvacuation === 'AUTRE' ? `[ ] Ambulance  [ ] Taxi/véhicule personnel  [X] Autre : ${f.modeEvacuationAutre ?? ''}`
        : '[ ] Ambulance  [ ] Taxi/véhicule personnel  [ ] Autre',
    },
    { lib: 'Date, heure de départ effectif', val: f.dateHeureDepart },
  ]
})

const lignesContre = computed(() => {
  const f = apercu.value
  if (!f) return []
  return [
    { lib: 'Nom et Prénoms du malade', val: f.contreNomPrenoms ?? f.nomPrenoms },
    { lib: 'Numéro du dossier', val: f.contreNumeroDossier },
    { lib: "Date/heure d'arrivée", val: f.contreDateArrivee },
    { lib: 'Diagnostic retenu à la sortie du malade', val: f.contreDiagnostic },
    { lib: 'Le patient a été hospitalisé', val: f.contreHospitalise == null ? 'OUI [ ] NON [ ]' : f.contreHospitalise ? 'OUI [X] NON [ ]' : 'OUI [ ] NON [X]' },
    { lib: 'Traitement à suivre', val: f.contreTraitement },
    { lib: 'Nom et fonction du médecin responsable', val: f.contreMedecin },
    { lib: 'Date et signature', val: f.contreDateSignature },
  ]
})
</script>

<style scoped>
.ref-a4 {
  background: #fff;
  color: #111;
  font-size: 11.5px;
  padding: 14px 16px;
  width: 190mm;
  max-width: 100%;
}
.ref-entete { text-align: center; }
.ref-rep { font-weight: 800; font-size: 12px; }
.ref-min { font-size: 10.5px; }
.ref-titre {
  text-align: center;
  font-weight: 800;
  font-size: 13px;
  text-decoration: underline;
  margin: 6px 0;
}
.ref-regle { border-bottom: 1px solid #000; margin: 4px 0; }
.ref-section { font-weight: 800; margin: 8px 0 4px; }
.ref-ligne { display: flex; gap: 6px; margin-bottom: 2px; }
.ref-lib { font-weight: 700; min-width: 62mm; flex: none; }
.ref-val {
  border-bottom: 0.4px dotted #000;
  flex: 1;
  min-height: 14px;
  white-space: pre-wrap;
}
.ref-sign {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
}
.apercu-voile {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  z-index: 140;
}
.apercu-barre {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 160;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  background: #134e4a;
  color: #ecfdf5;
  font-size: 13.5px;
  flex-wrap: wrap;
}
.apercu-barre-actions { display: flex; gap: 8px; }
.apercu-barre .btn-back {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.45);
}
@media screen {
  #ref-print {
    position: fixed;
    left: -10000px;
    top: 0;
  }
  #ref-print.apercu-flottant {
    left: 50% !important;
    transform: translateX(-50%);
    top: 62px;
    z-index: 150;
    max-height: calc(100vh - 82px);
    overflow-y: auto;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
  }
}
</style>
