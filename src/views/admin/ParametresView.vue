<template>
  <div>
    <h1 class="page-title">Paramètres</h1>
    <p class="page-subtitle">
      Personnalisation de l'application — notamment l'image affichée sur la page de connexion.
    </p>

    <div class="card">
      <div class="field clinique-field">
        <label>Clinique</label>
        <SelectSearch
          v-model="cliniqueId"
          :options="optionsCliniques"
          placeholder="— Choisir —"
          @change="loadParametre"
        />
      </div>

      <div class="parametre-grid">
        <!-- Aperçu -->
        <div>
          <div class="apercu-label">Aperçu de la page de connexion</div>
          <div class="apercu" :class="{ 'no-image': !previewImage }">
            <div class="apercu-overlay"></div>
            <div class="apercu-texte">
              <strong>{{ cliniqueCourante?.nom || 'Gestion Clinique' }}</strong>
              <span>Application intégrée de gestion</span>
            </div>
          </div>
          <p v-if="!previewImage" class="text-muted apercu-note">
            Aucune image paramétrée — le visuel par défaut est affiché.
          </p>
        </div>

        <!-- Contrôles -->
        <div>
          <p v-if="message" class="alert" :class="messageOk ? 'alert-success' : 'alert-error'">
            {{ message }}
          </p>

          <div class="field">
            <label>Image de connexion (JPG ou PNG)</label>
            <input
              type="file"
              accept="image/png, image/jpeg"
              @change="onFileChoisi"
            />
            <small class="text-muted">
              Format paysage, minimum <strong>1920 px de large</strong> pour un
              rendu net sur les grands écrans (ex. 1920 × 1280). Les images trop
              grandes sont redimensionnées automatiquement avec une compression
              légère.
            </small>
          </div>

          <div class="modal-actions" style="justify-content: flex-start">
            <button class="btn btn-primary" :disabled="saving || !imageChoisie" @click="save">
              {{ saving ? 'Enregistrement…' : 'Enregistrer l\'image' }}
            </button>
            <button
              v-if="imageEnBase"
              class="btn btn-outline"
              :disabled="saving"
              @click="resetImage"
            >
              Revenir au visuel par défaut
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ Page de garde du rapport SIG ============ -->
    <div class="card imprimante-card">
      <div class="card-header">
        <h2>📄 Page de garde du rapport mensuel SIG</h2>
      </div>
      <p v-if="sigMessage" class="alert" :class="sigMessageOk ? 'alert-success' : 'alert-error'">
        {{ sigMessage }}
      </p>

      <div class="form-row">
        <div class="field">
          <label>Logo en haut à gauche (armoiries — PNG ou JPG)</label>
          <div v-if="logoGauchePreview" class="logo-apercu">
            <img :src="logoGauchePreview" alt="Logo gauche" />
            <button type="button" class="btn btn-outline btn-sm" @click="retirerLogo('gauche')">Retirer</button>
          </div>
          <input type="file" accept="image/png, image/jpeg" @change="(e) => onLogoChoisi(e, 'gauche')" />
        </div>
        <div class="field">
          <label>Emblème au centre (entre DIIS et SIG — PNG ou JPG)</label>
          <div v-if="logoCentrePreview" class="logo-apercu">
            <img :src="logoCentrePreview" alt="Logo centre" />
            <button type="button" class="btn btn-outline btn-sm" @click="retirerLogo('centre')">Retirer</button>
          </div>
          <input type="file" accept="image/png, image/jpeg" @change="(e) => onLogoChoisi(e, 'centre')" />
        </div>
        <div class="field">
          <label>Logo en haut à droite (PNG ou JPG)</label>
          <div v-if="logoDroitPreview" class="logo-apercu">
            <img :src="logoDroitPreview" alt="Logo droit" />
            <button type="button" class="btn btn-outline btn-sm" @click="retirerLogo('droit')">Retirer</button>
          </div>
          <input type="file" accept="image/png, image/jpeg" @change="(e) => onLogoChoisi(e, 'droit')" />
        </div>
        <div class="field">
          <label>Lettre de version du rapport</label>
          <select v-model="sigVersionChoisie">
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <small class="text-muted">
            Affiche la lettre « A » à droite de l'en-tête du rapport, comme le
            formulaire officiel (ex. « SIG A »).
          </small>
        </div>
      </div>

      <div class="modal-actions" style="justify-content: flex-start">
        <button class="btn btn-primary" :disabled="sigSaving" @click="saveSig">
          {{ sigSaving ? 'Enregistrement…' : 'Enregistrer la page de garde' }}
        </button>
      </div>
    </div>

    <!-- ============ Imprimantes par poste ============ -->
    <div class="card imprimante-card">
      <div class="card-header">
        <h2>🖨️ Imprimantes par poste</h2>
        <div class="actions">
          <button class="btn btn-outline btn-sm" :disabled="testEnCours" @click="testerImprimante">
            {{ testEnCours ? 'Test en cours…' : 'Tester cette imprimante' }}
          </button>
        </div>
      </div>

      <div class="field">
        <label>Imprimante à paramétrer</label>
        <SelectSearch
          v-model="posteActif"
          :options="optionsPostes"
          placeholder="— Choisir un poste —"
        />
      </div>

      <p v-if="imprimanteMsg" class="alert" :class="imprimanteOk ? 'alert-success' : 'alert-error'">
        {{ imprimanteMsg }}
      </p>

      <div class="form-row">
        <div class="field">
          <label>Type</label>
          <select v-model="configImp.type">
            <option value="WINDOWS">WINDOWS (USB partagée)</option>
            <option value="NETWORK">NETWORK (Ethernet/WiFi)</option>
            <option value="AGENT">AGENT (site en ligne — agent local à la clinique)</option>
            <option value="BLUETOOTH">BLUETOOTH (via navigateur)</option>
            <option value="NONE">NONE (pas d'imprimante)</option>
          </select>
        </div>
        <div v-if="configImp.type === 'NETWORK'" class="field">
          <label>Adresse IP</label>
          <input v-model.trim="configImp.ip" placeholder="192.168.1.100" />
        </div>
        <div v-if="configImp.type === 'NETWORK'" class="field">
          <label>Port</label>
          <input v-model.number="configImp.port" type="number" placeholder="9100" />
        </div>
        <div v-if="configImp.type === 'WINDOWS' || configImp.type === 'AGENT'" class="field">
          <label>Nom de l'imprimante (Windows)</label>
          <input v-model.trim="configImp.nom" placeholder="POS-80C (copy 2)" />
        </div>
        <div v-if="configImp.type === 'WINDOWS' || configImp.type === 'AGENT'" class="field">
          <label>Nom du partage (impression brute fidèle)</label>
          <input v-model.trim="configImp.partage" placeholder="RECU" />
        </div>
        <div class="field">
          <label>Largeur papier (caractères)</label>
          <select v-model.number="configImp.largeur">
            <option :value="32">32 (58 mm)</option>
            <option :value="42">42 (80 mm)</option>
            <option :value="48">48 (80 mm)</option>
          </select>
        </div>
        <div class="field">
          <label>Impression automatique</label>
          <select v-model="configImp.autoPrint">
            <option :value="true">Oui (après chaque document)</option>
            <option :value="false">Non (impression manuelle)</option>
          </select>
        </div>
      </div>

      <div class="modal-actions" style="justify-content: flex-start">
        <button class="btn btn-primary" :disabled="savingConfig" @click="sauvegarderConfig">
          {{ savingConfig ? 'Enregistrement…' : 'Enregistrer la configuration' }}
        </button>
      </div>

      <div v-if="imprimantesWindows.length" class="printers-list">
        <h3>Imprimantes installées sur le serveur</h3>
        <div class="printers-chips">
          <span v-for="p in imprimantesWindows" :key="p" class="badge badge-muted printer-chip">{{ p }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import http from '../../api/http'
import { optimiserImage } from '../../utils/image'
import { toastError, toastSuccess } from '../../utils/notifications'
import SelectSearch from '../../components/SelectSearch.vue'

const cliniques = ref([])
const cliniqueId = ref(null)
const imageEnBase = ref(null)
const imageChoisie = ref(null)
const saving = ref(false)
const message = ref('')
const messageOk = ref(true)

// Imprimantes par poste (tickets, reçus caisse, reçus pharmacie, ordonnances)
const configsImprimantes = ref([])
const posteActif = ref('TICKET')
const configImp = reactive({})
const imprimanteMsg = ref('')
const imprimanteOk = ref(true)
const testEnCours = ref(false)
const savingConfig = ref(false)
const imprimantesWindows = ref([])

const optionsPostes = computed(() =>
  configsImprimantes.value.map((p) => ({ value: p.poste, label: p.libelle })),
)

function appliquerConfigPoste() {
  const ligne = configsImprimantes.value.find((p) => p.poste === posteActif.value)
  Object.keys(configImp).forEach((k) => delete configImp[k])
  Object.assign(configImp, ligne?.config ?? { type: 'WINDOWS', nom: '', partage: '', ip: '', port: 9100, largeur: 42, autoPrint: true })
  imprimanteMsg.value = ''
}

async function chargerConfigImprimante() {
  try {
    const { data } = await http.get('/impression/config', {
      params: { cliniqueId: cliniqueId.value },
    })
    configsImprimantes.value = data.printers ?? []
    appliquerConfigPoste()
  } catch {
    // config par défaut côté serveur
  }
}

async function testerImprimante() {
  testEnCours.value = true
  imprimanteMsg.value = ''
  try {
    const { data } = await http.post('/impression/test', {
      cliniqueId: cliniqueId.value,
      poste: posteActif.value,
    })
    imprimanteOk.value = data.ok
    imprimanteMsg.value = data.message + (data.debug ? ' — ' + data.debug : '')
  } catch (e) {
    imprimanteOk.value = false
    imprimanteMsg.value = `Erreur lors du test : ${e.response?.data?.message || e.message}`
  } finally {
    testEnCours.value = false
  }
}

async function sauvegarderConfig() {
  savingConfig.value = true
  try {
    await http.put('/impression/config', {
      cliniqueId: cliniqueId.value,
      poste: posteActif.value,
      ...configImp,
    })
    toastSuccess('Configuration enregistrée — appliquée immédiatement.')
    await chargerConfigImprimante()
  } catch (e) {
    toastError(e.response?.data?.message || e.message)
  } finally {
    savingConfig.value = false
  }
}

const cliniqueCourante = computed(() =>
  cliniques.value.find((c) => c.id === cliniqueId.value),
)
const optionsCliniques = computed(() =>
  cliniques.value.map((c) => ({ value: c.id, label: c.nom })),
)
const previewImage = computed(() => imageChoisie.value ?? imageEnBase.value)

async function loadCliniques() {
  const { data } = await http.get('/cliniques')
  cliniques.value = data
  if (data.length && cliniqueId.value === null) {
    cliniqueId.value = data[0].id
    await loadParametre()
  }
  await chargerConfigImprimante()
}

async function loadParametre() {
  if (cliniqueId.value === null) return
  imageChoisie.value = null
  try {
    const { data } = await http.get(`/parametres/${cliniqueId.value}`)
    imageEnBase.value = data.loginImage
    // Page de garde du rapport SIG
    logoGaucheEnBase.value = data.logoRapportGauche
    logoCentreEnBase.value = data.logoRapportCentre
    logoDroitEnBase.value = data.logoRapportDroit
    logoGaucheChoisi.value = null
    logoCentreChoisi.value = null
    logoDroitChoisi.value = null
    sigVersionChoisie.value = data.sigVersion ?? 'A'
  } catch {
    imageEnBase.value = null
  }
}

// ── Page de garde du rapport SIG (logos + lettre de version) ──
const logoGaucheEnBase = ref(null)
const logoCentreEnBase = ref(null)
const logoDroitEnBase = ref(null)
const logoGaucheChoisi = ref(null)
const logoCentreChoisi = ref(null)
const logoDroitChoisi = ref(null)
const sigVersionChoisie = ref('A')
const sigMessage = ref('')
const sigMessageOk = ref(true)
const sigSaving = ref(false)

const logoGauchePreview = computed(() => logoGaucheChoisi.value ?? logoGaucheEnBase.value)
const logoCentrePreview = computed(() => logoCentreChoisi.value ?? logoCentreEnBase.value)
const logoDroitPreview = computed(() => logoDroitChoisi.value ?? logoDroitEnBase.value)

async function onLogoChoisi(e, cote) {
  const file = e.target.files[0]
  sigMessage.value = ''
  if (!file) return
  try {
    const { dataUrl } = await optimiserImage(file, 800, 0.92)
    if (cote === 'gauche') logoGaucheChoisi.value = dataUrl
    else if (cote === 'centre') logoCentreChoisi.value = dataUrl
    else logoDroitChoisi.value = dataUrl
  } catch (err) {
    sigMessage.value = err.message
    sigMessageOk.value = false
  }
}

async function retirerLogo(cote) {
  if (cote === 'gauche') {
    logoGaucheChoisi.value = null
    logoGaucheEnBase.value = null
  } else if (cote === 'centre') {
    logoCentreChoisi.value = null
    logoCentreEnBase.value = null
  } else {
    logoDroitChoisi.value = null
    logoDroitEnBase.value = null
  }
  await saveSig()
}

async function saveSig() {
  sigSaving.value = true
  sigMessage.value = ''
  try {
    await http.patch(`/parametres/${cliniqueId.value}`, {
      logoRapportGauche: logoGaucheChoisi.value ?? logoGaucheEnBase.value ?? null,
      logoRapportCentre: logoCentreChoisi.value ?? logoCentreEnBase.value ?? null,
      logoRapportDroit: logoDroitChoisi.value ?? logoDroitEnBase.value ?? null,
      sigVersion: sigVersionChoisie.value,
    })
    if (logoGaucheChoisi.value) {
      logoGaucheEnBase.value = logoGaucheChoisi.value
      logoGaucheChoisi.value = null
    }
    if (logoCentreChoisi.value) {
      logoCentreEnBase.value = logoCentreChoisi.value
      logoCentreChoisi.value = null
    }
    if (logoDroitChoisi.value) {
      logoDroitEnBase.value = logoDroitChoisi.value
      logoDroitChoisi.value = null
    }
    sigMessage.value = 'Page de garde enregistrée — elle apparaîtra sur les rapports SIG imprimés.'
    sigMessageOk.value = true
  } catch (e) {
    sigMessage.value = e.response?.data?.message || "Erreur lors de l'enregistrement."
    sigMessageOk.value = false
  } finally {
    sigSaving.value = false
  }
}

async function onFileChoisi(e) {
  const file = e.target.files[0]
  message.value = ''
  if (!file) return
  try {
    const { dataUrl, largeur } = await optimiserImage(file, 2560, 0.92)
    imageChoisie.value = dataUrl
    if (largeur < 1920) {
      message.value = `Attention : votre image ne fait que ${largeur} px de large — elle risque d'apparaître floue sur les grands écrans. Utilisez de préférence une image d'au moins 1920 px de large.`
      messageOk.value = false
    } else {
      message.value = ''
    }
  } catch (err) {
    message.value = err.message
    messageOk.value = false
  }
}

async function save() {
  if (!imageChoisie.value) return
  saving.value = true
  message.value = ''
  try {
    await http.patch(`/parametres/${cliniqueId.value}`, {
      loginImage: imageChoisie.value,
    })
    imageEnBase.value = imageChoisie.value
    imageChoisie.value = null
    toastSuccess('Image enregistrée — elle apparaîtra sur la page de connexion.')
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    saving.value = false
  }
}

async function resetImage() {
  saving.value = true
  message.value = ''
  try {
    await http.patch(`/parametres/${cliniqueId.value}`, { loginImage: null })
    imageEnBase.value = null
    imageChoisie.value = null
    toastSuccess('Visuel par défaut rétabli.')
  } catch (e) {
    toastError('Erreur lors de la réinitialisation.')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadCliniques()
  http
    .get('/impression/printers')
    .then(({ data }) => (imprimantesWindows.value = data.printers))
    .catch(() => {})
})

// Changer de poste recharge sa configuration dans le formulaire
watch(posteActif, appliquerConfigPoste)
</script>

<style scoped>
.logo-apercu {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.logo-apercu img {
  width: 90px;
  height: 82px;
  object-fit: contain;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  padding: 4px;
}
.clinique-field {
  max-width: 340px;
}
.parametre-grid {
  display: grid;
  grid-template-columns: minmax(280px, 460px) 1fr;
  gap: 28px;
  align-items: start;
}
@media (max-width: 860px) {
  .parametre-grid {
    grid-template-columns: 1fr;
  }
}
.apercu-label {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.apercu {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  border: 1px solid var(--border);
  display: flex;
  align-items: flex-end;
  padding: 18px;
}
.apercu.no-image {
  background: linear-gradient(155deg, #0d9488 0%, #134e4a 60%, #0c4a6e 130%);
}
.apercu-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(185deg, rgba(6, 44, 44, 0.05), rgba(6, 44, 44, 0.55));
}
.apercu-texte {
  position: relative;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.apercu-texte strong {
  font-size: 16px;
}
.apercu-texte span {
  font-size: 12px;
  opacity: 0.85;
}
.apercu-note {
  margin-top: 8px;
  font-size: 12.5px;
}

/* ---------- Imprimante ---------- */
.imprimante-card {
  margin-top: 24px;
}
.printers-list {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.printers-list h3 {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.printers-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.printer-chip {
  font-family: Consolas, monospace;
}
</style>
