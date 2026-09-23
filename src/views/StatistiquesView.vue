<template>
  <div class="stat-page">
    <!-- En-tête -->
    <header class="stat-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">📊</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Statistiques — tableaux de bord et rapports (§20)</span>
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

    <div class="stat-body">
      <!-- Menu latéral (à gauche) -->
      <aside class="stat-sidebar">
        <div class="sidebar-titre">📊 Rubriques</div>
        <button
          v-for="m in menus"
          :key="m.code"
          class="menu-item"
          :class="{ active: rubrique === m.code }"
          @click="changerRubrique(m.code)"
        >
          <span class="menu-icon">{{ m.icon }}</span>
          <span>{{ m.label }}</span>
        </button>
      </aside>

      <!-- Contenu -->
      <main class="stat-content">
        <div class="stat-head card">
          <h2>{{ menuActif.icon }} {{ menuActif.label }}</h2>
          <div class="periode-bar">
            <label>Période</label>
            <input v-model="debut" type="date" class="search-input" />
            <span>→</span>
            <input v-model="fin" type="date" class="search-input" />
            <button class="btn btn-primary btn-sm" @click="charger">🔄 Actualiser</button>
          </div>
          <div class="stat-actions">
            <button class="btn btn-outline btn-sm" @click="ouvrirApercu">🖨️ PDF</button>
            <button class="btn btn-outline btn-sm" @click="exporterExcel">📥 Excel</button>
          </div>
        </div>

        <!-- ══ Tableau de bord ══ -->
        <section v-if="rubrique === 'tableau-bord'" class="kpi-grid">
          <div v-for="k in kpis" :key="k.label" class="kpi-card" :class="k.cls">
            <div class="kpi-icon">{{ k.icon }}</div>
            <div class="kpi-num">{{ k.valeur }}</div>
            <div class="kpi-label">{{ k.label }}</div>
          </div>
        </section>

        <!-- ══ Fréquentation ══ -->
        <section v-else-if="rubrique === 'frequentation'" class="rubrique">
          <div class="kpi-grid kpi-grid-sm">
            <div class="kpi-card kpi-teal"><div class="kpi-icon">🏥</div><div class="kpi-num">{{ d.frequentation?.passages ?? '—' }}</div><div class="kpi-label">Patients reçus</div></div>
            <div class="kpi-card kpi-sky"><div class="kpi-icon">🧍</div><div class="kpi-num">{{ d.frequentation?.internes ?? '—' }}</div><div class="kpi-label">Internes</div></div>
            <div class="kpi-card kpi-amber"><div class="kpi-icon">🚶</div><div class="kpi-num">{{ d.frequentation?.externes ?? '—' }}</div><div class="kpi-label">Externes</div></div>
            <div class="kpi-card kpi-emerald"><div class="kpi-icon">🩺</div><div class="kpi-num">{{ d.frequentation?.consultations ?? '—' }}</div><div class="kpi-label">Consultations</div></div>
          </div>
          <div class="deux-cols">
            <div class="card mini">
              <h3>Par jour</h3>
              <TableSimple :colonnes="[{cle:'jour',libelle:'Jour'},{cle:'nombre',libelle:'Passages'}]" :lignes="d.frequentation?.parJour ?? []" />
            </div>
            <div class="card mini">
              <h3>Par service</h3>
              <TableSimple :colonnes="[{cle:'service',libelle:'Service'},{cle:'nombre',libelle:'Passages'}]" :lignes="d.frequentation?.parService ?? []" />
            </div>
          </div>
          <div class="card mini">
            <h3>Parcours des patients</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>N° d'ordre</th><th>Patient</th><th>Service</th><th>Type</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  <tr v-for="p in d.frequentation?.parcours?.data ?? []" :key="p.id">
                    <td>{{ p.numeroOrdre }}</td>
                    <td><strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong> ({{ p.patient.code }})</td>
                    <td>{{ p.service }}</td>
                    <td>{{ p.typePatient === 'EXTERNE' ? 'Externe' : 'Interne' }}</td>
                    <td>{{ p.statut }}</td>
                  </tr>
                  <tr v-if="(d.frequentation?.parcours?.data ?? []).length === 0">
                    <td colspan="5" class="empty-state">Aucun passage sur la période.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <PaginationBar
              v-if="(d.frequentation?.parcours?.total ?? 0) > (d.frequentation?.parcours?.perPage ?? 20)"
              :page="pageParcours"
              :per-page="d.frequentation?.parcours?.perPage ?? 20"
              :total="d.frequentation?.parcours?.total ?? 0"
              :total-pages="d.frequentation?.parcours?.totalPages ?? 1"
              @change="changerPageParcours"
              @per-page="changerPerPageParcours"
            />
          </div>
        </section>

        <!-- ══ Recettes ══ -->
        <section v-else-if="rubrique === 'recettes'" class="rubrique">
          <div class="kpi-grid kpi-grid-sm">
            <div class="kpi-card kpi-emerald"><div class="kpi-icon">💰</div><div class="kpi-num">{{ d.recettes?.nombre ?? '—' }}</div><div class="kpi-label">Paiements</div></div>
            <div class="kpi-card kpi-green"><div class="kpi-icon">💵</div><div class="kpi-num">{{ fmtF(d.recettes?.total) }}</div><div class="kpi-label">Montant total (F)</div></div>
          </div>
          <div class="deux-cols">
            <div class="card mini">
              <h3>Par jour</h3>
              <TableSimple :colonnes="[{cle:'jour',libelle:'Jour'},{cle:'nombre',libelle:'Paiements'}]" :lignes="d.recettes?.parJour ?? []" />
            </div>
            <div class="card mini">
              <h3>Par mode de paiement</h3>
              <TableSimple :colonnes="[{cle:'mode',libelle:'Mode'},{cle:'nombre',libelle:'N'},{cle:'montant',libelle:'Montant (F)'}]" :lignes="(d.recettes?.parMode ?? []).map((l) => ({...l, montant: fmtF(l.montant)}))" />
            </div>
            <div class="card mini">
              <h3>Par service</h3>
              <TableSimple :colonnes="[{cle:'service',libelle:'Service'},{cle:'montant',libelle:'Montant (F)'}]" :lignes="(d.recettes?.parService ?? []).map((l) => ({...l, montant: fmtF(l.montant)}))" />
            </div>
            <div class="card mini">
              <h3>Par type d'acte</h3>
              <TableSimple :colonnes="[{cle:'type',libelle:'Type'},{cle:'montant',libelle:'Montant (F)'}]" :lignes="(d.recettes?.parType ?? []).map((l) => ({...l, montant: fmtF(l.montant)}))" />
            </div>
          </div>
        </section>

        <!-- ══ Laboratoire ══ -->
        <section v-else-if="rubrique === 'laboratoire'" class="rubrique">
          <div class="kpi-grid kpi-grid-sm">
            <div class="kpi-card kpi-violet"><div class="kpi-icon">🧪</div><div class="kpi-num">{{ d.laboratoire?.total ?? '—' }}</div><div class="kpi-label">Examens</div></div>
          </div>
          <div class="deux-cols">
            <div class="card mini">
              <h3>Par jour</h3>
              <TableSimple :colonnes="[{cle:'jour',libelle:'Jour'},{cle:'nombre',libelle:'Examens'}]" :lignes="d.laboratoire?.parJour ?? []" />
            </div>
            <div class="card mini">
              <h3>Par examen</h3>
              <TableSimple :colonnes="[{cle:'libelle',libelle:'Examen'},{cle:'nombre',libelle:'N'}]" :lignes="d.laboratoire?.parLibelle ?? []" />
            </div>
            <div class="card mini">
              <h3>Par statut</h3>
              <TableSimple :colonnes="[{cle:'statut',libelle:'Statut'},{cle:'nombre',libelle:'N'}]" :lignes="d.laboratoire?.parStatut ?? []" />
            </div>
          </div>
        </section>

        <!-- ══ Imagerie ══ -->
        <section v-else-if="rubrique === 'imagerie'" class="rubrique">
          <div class="kpi-grid kpi-grid-sm">
            <div class="kpi-card kpi-indigo"><div class="kpi-icon">🩻</div><div class="kpi-num">{{ d.imagerie?.total ?? '—' }}</div><div class="kpi-label">Examens</div></div>
          </div>
          <div class="deux-cols">
            <div class="card mini">
              <h3>Par jour</h3>
              <TableSimple :colonnes="[{cle:'jour',libelle:'Jour'},{cle:'nombre',libelle:'Examens'}]" :lignes="d.imagerie?.parJour ?? []" />
            </div>
            <div class="card mini">
              <h3>Par examen</h3>
              <TableSimple :colonnes="[{cle:'libelle',libelle:'Examen'},{cle:'nombre',libelle:'N'}]" :lignes="d.imagerie?.parLibelle ?? []" />
            </div>
            <div class="card mini">
              <h3>Par statut</h3>
              <TableSimple :colonnes="[{cle:'statut',libelle:'Statut'},{cle:'nombre',libelle:'N'}]" :lignes="d.imagerie?.parStatut ?? []" />
            </div>
          </div>
        </section>

        <!-- ══ Hospitalisation ══ -->
        <section v-else-if="rubrique === 'hospitalisation'" class="rubrique">
          <div class="kpi-grid kpi-grid-sm">
            <div class="kpi-card kpi-rose"><div class="kpi-icon">🛏️</div><div class="kpi-num">{{ d.hospitalisation?.entrees ?? '—' }}</div><div class="kpi-label">Entrées</div></div>
            <div class="kpi-card kpi-sky"><div class="kpi-icon">🚪</div><div class="kpi-num">{{ d.hospitalisation?.sorties ?? '—' }}</div><div class="kpi-label">Sorties</div></div>
            <div class="kpi-card kpi-amber"><div class="kpi-icon">⏳</div><div class="kpi-num">{{ d.hospitalisation?.enCours ?? '—' }}</div><div class="kpi-label">En cours</div></div>
            <div class="kpi-card kpi-violet"><div class="kpi-icon">📅</div><div class="kpi-num">{{ d.hospitalisation?.joursFactures ?? '—' }}</div><div class="kpi-label">Jours facturés</div></div>
            <div class="kpi-card kpi-emerald"><div class="kpi-icon">💵</div><div class="kpi-num">{{ fmtF(d.hospitalisation?.montantFacture) }}</div><div class="kpi-label">Montant facturé (F)</div></div>
          </div>
          <div class="card mini">
            <h3>Entrées par jour</h3>
            <TableSimple :colonnes="[{cle:'jour',libelle:'Jour'},{cle:'nombre',libelle:'Entrées'}]" :lignes="d.hospitalisation?.parJour ?? []" />
          </div>
        </section>

        <!-- ══ Pharmacie ══ -->
        <section v-else-if="rubrique === 'pharmacie'" class="rubrique">
          <div class="kpi-grid kpi-grid-sm">
            <div class="kpi-card kpi-emerald"><div class="kpi-icon">💊</div><div class="kpi-num">{{ fmtF(d.pharmacie?.totalVentes) }}</div><div class="kpi-label">Ventes (F)</div></div>
            <div class="kpi-card kpi-teal"><div class="kpi-icon">📦</div><div class="kpi-num">{{ d.pharmacie?.quantitesVendues ?? '—' }}</div><div class="kpi-label">Unités vendues</div></div>
          </div>
          <div class="deux-cols">
            <div class="card mini">
              <h3>Top médicaments vendus</h3>
              <TableSimple :colonnes="[{cle:'medicament',libelle:'Médicament'},{cle:'quantite',libelle:'Qté'},{cle:'montant',libelle:'Montant (F)'}]" :lignes="(d.pharmacie?.topMedicaments ?? []).map((l) => ({...l, montant: fmtF(l.montant)}))" />
            </div>
            <div class="card mini">
              <h3>Stocks faibles (≤ seuil d'alerte)</h3>
              <TableSimple :colonnes="[{cle:'medicament',libelle:'Médicament'},{cle:'stock',libelle:'Stock'},{cle:'seuilAlerte',libelle:'Seuil'}]" :lignes="d.pharmacie?.stocksFaibles ?? []" />
            </div>
            <div class="card mini">
              <h3>Péremptions proches (≤ 30 jours)</h3>
              <TableSimple :colonnes="[{cle:'medicament',libelle:'Médicament'},{cle:'lot',libelle:'Lot'},{cle:'quantite',libelle:'Qté'},{cle:'peremption',libelle:'Péremption'}]" :lignes="d.pharmacie?.peremptions ?? []" />
            </div>
          </div>
        </section>

        <!-- ══ Maternité ══ -->
        <section v-else class="rubrique">
          <div class="kpi-grid kpi-grid-sm">
            <div class="kpi-card kpi-teal"><div class="kpi-icon">🤰</div><div class="kpi-num">{{ d.maternite?.total ?? '—' }}</div><div class="kpi-label">Actes</div></div>
            <div class="kpi-card kpi-emerald"><div class="kpi-icon">💵</div><div class="kpi-num">{{ fmtF(d.maternite?.montant) }}</div><div class="kpi-label">Montant (F)</div></div>
          </div>
          <div class="card mini">
            <h3>Actes de maternité</h3>
            <TableSimple :colonnes="[{cle:'acte',libelle:'Acte'},{cle:'nombre',libelle:'N'},{cle:'montant',libelle:'Montant (F)'}]" :lignes="(d.maternite?.parActe ?? []).map((l) => ({...l, montant: fmtF(l.montant)}))" />
          </div>
        </section>
      </main>
    </div>

    <!-- Aperçu PDF -->
    <div v-if="apercuVisible" class="apercu-voile"></div>
    <div v-if="apercuVisible" class="apercu-barre">
      <span>👁️ Aperçu du rapport — vérifiez avant d'imprimer (choisir « Enregistrer en PDF »)</span>
      <div class="apercu-barre-actions">
        <button class="btn btn-primary btn-sm" @click="window.print()">🖨️ Imprimer / PDF</button>
        <button class="btn btn-outline btn-sm btn-back" @click="apercuVisible = false">✖ Fermer</button>
      </div>
    </div>

    <!-- Rapport imprimable -->
    <div v-if="rapport" id="stat-print" :class="{ 'apercu-flottant': apercuVisible }">
      <div class="stat-a4">
        <div class="stat-a4-head">
          <h1>{{ cliniqueNom }}</h1>
          <p v-if="cliniqueAdresse">{{ cliniqueAdresse }}</p>
        </div>
        <div class="stat-a4-titre">{{ rapport.titre }}</div>
        <div class="stat-a4-periode">Période : {{ rapport.periode }}</div>

        <div v-if="rapport.resume.length" class="stat-a4-resume">
          <div v-for="r in rapport.resume" :key="r.label" class="stat-a4-resume-item">
            <span class="stat-a4-label">{{ r.label }}</span>
            <strong>{{ r.valeur }}</strong>
          </div>
        </div>

        <table class="stat-a4-table">
          <thead>
            <tr>
              <th v-for="c in rapport.colonnes" :key="c.cle">{{ c.libelle }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in rapport.lignes" :key="i">
              <td v-for="c in rapport.colonnes" :key="c.cle">{{ l[c.cle] ?? '—' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="stat-a4-sign">
          <div>Fait le {{ formatDate(new Date()) }}</div>
          <div class="stat-a4-cachet">Signature et cachet</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import http from '../api/http'
import PaginationBar from '../components/PaginationBar.vue'
import TableSimple from '../components/TableSimple.vue'
import { useAuthStore } from '../stores/auth'
import { toastError } from '../utils/notifications'

const auth = useAuthStore()
const router = useRouter()

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')
const cliniqueAdresse = ref('')

const todayLabel = computed(() =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
)

const menus = [
  { code: 'tableau-bord', label: 'Tableau de bord', icon: '📊' },
  { code: 'frequentation', label: 'Fréquentation', icon: '🏥' },
  { code: 'recettes', label: 'Recettes', icon: '💰' },
  { code: 'laboratoire', label: 'Laboratoire', icon: '🧪' },
  { code: 'imagerie', label: 'Imagerie', icon: '🩻' },
  { code: 'hospitalisation', label: 'Hospitalisation', icon: '🛏️' },
  { code: 'pharmacie', label: 'Pharmacie', icon: '💊' },
  { code: 'maternite', label: 'Maternité', icon: '🤰' },
]

const rubrique = ref('frequentation')
const menuActif = computed(() => menus.find((m) => m.code === rubrique.value) ?? menus[0])

const aujourdHui = new Date().toISOString().slice(0, 10)
const debut = ref(aujourdHui)
const fin = ref(aujourdHui)
const d = reactive({})
const pageParcours = ref(1)
const perPageParcours = ref(20)

const apercuVisible = ref(false)

const kpis = computed(() => {
  const t = d.tableauBord
  if (!t) return []
  return [
    { label: 'Patients reçus', valeur: t.passages, icon: '🏥', cls: 'kpi-teal' },
    { label: 'Consultations', valeur: t.consultations, icon: '🩺', cls: 'kpi-sky' },
    { label: 'Patients externes', valeur: t.externes, icon: '🚶', cls: 'kpi-amber' },
    { label: 'Paiements', valeur: t.paiements?.nombre, icon: '💰', cls: 'kpi-emerald' },
    { label: 'Montant encaissé (F)', valeur: fmtF(t.paiements?.montant), icon: '💵', cls: 'kpi-green' },
    { label: 'Examens labo', valeur: t.examensLabo, icon: '🧪', cls: 'kpi-violet' },
    { label: 'Examens imagerie', valeur: t.examensImagerie, icon: '🩻', cls: 'kpi-indigo' },
    { label: 'Hospitalisés', valeur: t.hospitalisationsEnCours, icon: '🛏️', cls: 'kpi-rose' },
    { label: 'Occupation des lits', valeur: `${t.lits?.occupes ?? 0}/${t.lits?.total ?? 0}`, icon: '📊', cls: 'kpi-slate' },
  ]
})

function fmtF(x) {
  return x == null ? '—' : `${Number(x).toLocaleString('fr-FR')}`
}

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const ENDPOINTS = {
  'tableau-bord': { url: '/statistiques/tableau-bord', params: () => ({ jour: debut.value, cliniqueId: cliniqueId.value }) },
  frequentation: {
    url: '/statistiques/frequentation',
    params: () => ({ debut: debut.value, fin: fin.value, page: pageParcours.value, perPage: perPageParcours.value, cliniqueId: cliniqueId.value }),
  },
  recettes: { url: '/statistiques/recettes', params: () => ({ debut: debut.value, fin: fin.value, cliniqueId: cliniqueId.value }) },
  laboratoire: { url: '/statistiques/laboratoire', params: () => ({ debut: debut.value, fin: fin.value, cliniqueId: cliniqueId.value }) },
  imagerie: { url: '/statistiques/imagerie', params: () => ({ debut: debut.value, fin: fin.value, cliniqueId: cliniqueId.value }) },
  hospitalisation: { url: '/statistiques/hospitalisation', params: () => ({ debut: debut.value, fin: fin.value, cliniqueId: cliniqueId.value }) },
  pharmacie: { url: '/statistiques/pharmacie', params: () => ({ debut: debut.value, fin: fin.value, cliniqueId: cliniqueId.value }) },
  maternite: { url: '/statistiques/maternite', params: () => ({ debut: debut.value, fin: fin.value, cliniqueId: cliniqueId.value }) },
}

async function charger() {
  const ep = ENDPOINTS[rubrique.value]
  if (!ep || !cliniqueId.value) return
  try {
    const { data } = await http.get(ep.url, { params: ep.params() })
    d[rubrique.value] = data
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger les statistiques.')
  }
}

function changerRubrique(code) {
  rubrique.value = code
  pageParcours.value = 1
  charger()
}

function changerPageParcours(p) {
  pageParcours.value = p
  charger()
}

function changerPerPageParcours(n) {
  perPageParcours.value = n
  pageParcours.value = 1
  charger()
}

// ── Rapport générique (PDF + Excel) ──
const rapport = computed(() => {
  const data = d[rubrique.value]
  if (!data) return null
  const titre = menuActif.value.label
  const periode = data.periode ?? `${formatDate(debut.value)} au ${formatDate(fin.value)}`
  const C = (cle, libelle) => ({ cle, libelle })

  switch (rubrique.value) {
    case 'tableau-bord':
      return {
        titre: 'Tableau de bord', periode,
        resume: kpis.value.map((k) => ({ label: k.label, valeur: k.valeur })),
        colonnes: [], lignes: [],
      }
    case 'frequentation':
      return {
        titre, periode,
        resume: [
          { label: 'Patients reçus', valeur: data.passages },
          { label: 'Internes', valeur: data.internes },
          { label: 'Externes', valeur: data.externes },
          { label: 'Consultations', valeur: data.consultations },
        ],
        colonnes: [C('jour', 'Jour'), C('nombre', 'Passages')],
        lignes: data.parJour ?? [],
      }
    case 'recettes':
      return {
        titre, periode,
        resume: [
          { label: 'Paiements', valeur: data.nombre },
          { label: 'Montant total', valeur: `${fmtF(data.total)} F` },
        ],
        colonnes: [C('service', 'Service'), C('montant', 'Montant (F)')],
        lignes: (data.parService ?? []).map((l) => ({ ...l, montant: fmtF(l.montant) })),
      }
    case 'laboratoire':
      return {
        titre, periode,
        resume: [{ label: 'Examens', valeur: data.total }],
        colonnes: [C('libelle', 'Examen'), C('nombre', 'Nombre')],
        lignes: data.parLibelle ?? [],
      }
    case 'imagerie':
      return {
        titre, periode,
        resume: [{ label: 'Examens', valeur: data.total }],
        colonnes: [C('libelle', 'Examen'), C('nombre', 'Nombre')],
        lignes: data.parLibelle ?? [],
      }
    case 'hospitalisation':
      return {
        titre, periode,
        resume: [
          { label: 'Entrées', valeur: data.entrees },
          { label: 'Sorties', valeur: data.sorties },
          { label: 'En cours', valeur: data.enCours },
          { label: 'Jours facturés', valeur: data.joursFactures },
          { label: 'Montant facturé', valeur: `${fmtF(data.montantFacture)} F` },
        ],
        colonnes: [C('jour', 'Jour'), C('nombre', 'Entrées')],
        lignes: data.parJour ?? [],
      }
    case 'pharmacie':
      return {
        titre, periode,
        resume: [
          { label: 'Ventes', valeur: `${fmtF(data.totalVentes)} F` },
          { label: 'Unités vendues', valeur: data.quantitesVendues },
        ],
        colonnes: [C('medicament', 'Médicament'), C('quantite', 'Qté'), C('montant', 'Montant (F)')],
        lignes: (data.topMedicaments ?? []).map((l) => ({ ...l, montant: fmtF(l.montant) })),
      }
    case 'maternite':
      return {
        titre, periode,
        resume: [
          { label: 'Actes', valeur: data.total },
          { label: 'Montant', valeur: `${fmtF(data.montant)} F` },
        ],
        colonnes: [C('acte', 'Acte'), C('nombre', 'Nombre'), C('montant', 'Montant (F)')],
        lignes: (data.parActe ?? []).map((l) => ({ ...l, montant: fmtF(l.montant) })),
      }
    default:
      return null
  }
})

function ouvrirApercu() {
  if (!rapport.value) return
  apercuVisible.value = true
}

function exporterExcel() {
  const r = rapport.value
  if (!r) return
  const aoa = [
    [`${cliniqueNom.value} — ${r.titre}`],
    [`Période : ${r.periode}`],
    [],
    ...r.resume.map((x) => [x.label, String(x.valeur)]),
    [],
  ]
  if (r.colonnes.length > 0) {
    aoa.push(r.colonnes.map((c) => c.libelle))
    for (const l of r.lignes) aoa.push(r.colonnes.map((c) => l[c.cle] ?? ''))
  }
  const feuille = XLSX.utils.aoa_to_sheet(aoa)
  feuille['!cols'] = r.colonnes.map((c) => ({ wch: Math.max(14, c.libelle.length + 6) }))
  const classeur = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(classeur, feuille, 'Statistiques')
  const nom = `statistiques-${rubrique.value}-${debut.value}_${fin.value}.xlsx`
  XLSX.writeFile(classeur, nom)
}

onMounted(async () => {
  await charger()
  try {
    const { data } = await http.get('/cliniques', { params: { perPage: 0 } })
    const liste = Array.isArray(data) ? data : data.data ?? []
    if (liste.length > 0) cliniqueAdresse.value = liste[0].adresse ?? ''
  } catch {
    /* adresse facultative */
  }
})
</script>

<style scoped>
.stat-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
  display: flex;
  flex-direction: column;
}
.stat-header {
  background: linear-gradient(120deg, #0d9488 0%, #0f766e 55%, #115e59 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 6px 24px rgba(13, 71, 67, 0.28);
}
.header-inner {
  width: 100%;
  margin: 0 auto;
  padding: 10px 20px;
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
  color: #ffffff;
  font-size: 16px;
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

.stat-body {
  flex: 1;
  width: 100%;
  margin: 0 auto;
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  align-items: stretch;
}
.stat-sidebar {
  width: 250px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #0d9488 0%, #0f766e 55%, #115e59 100%);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(13, 71, 67, 0.3);
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: sticky;
  top: 16px;
  min-height: calc(100vh - 120px);
}
.sidebar-titre {
  color: rgba(236, 253, 245, 0.85);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0 10px 8px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  color: rgba(236, 253, 245, 0.85);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}
.menu-item:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}
.menu-item.active {
  background: #ffffff;
  color: #0f766e;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
}
.menu-icon {
  font-size: 16px;
}

.stat-content {
  flex: 1;
  min-width: 0;
}
.stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 14px 18px;
}
.stat-head h2 {
  font-size: 20px;
  font-weight: 800;
  color: #134e4a;
}
.periode-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}
.periode-bar .search-input {
  flex: none;
  width: 150px;
}
.stat-actions {
  display: flex;
  gap: 8px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.kpi-grid-sm {
  margin-bottom: 14px;
}
.kpi-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  padding: 12px 14px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: transform 0.12s, box-shadow 0.12s;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--kpi-c, #0d9488);
}
.kpi-icon {
  font-size: 22px;
  margin-bottom: 6px;
}
.kpi-num {
  font-size: 22px;
  font-weight: 800;
  color: #134e4a;
}
.kpi-label {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}
/* Couleurs des indicateurs */
.kpi-teal { --kpi-c: #0d9488; }
.kpi-sky { --kpi-c: #0284c7; }
.kpi-amber { --kpi-c: #d97706; }
.kpi-emerald { --kpi-c: #059669; }
.kpi-green { --kpi-c: #16a34a; }
.kpi-violet { --kpi-c: #7c3aed; }
.kpi-indigo { --kpi-c: #4f46e5; }
.kpi-rose { --kpi-c: #e11d48; }
.kpi-slate { --kpi-c: #475569; }

.rubrique {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.deux-cols {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.card.mini {
  padding: 14px 16px;
  border-radius: 12px;
}
.card.mini h3 {
  font-size: 13px;
  font-weight: 700;
  color: #0f766e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #ddf1ee;
}

@media (max-width: 900px) {
  .stat-body {
    flex-direction: column;
  }
  .stat-sidebar {
    width: 100%;
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }
  .sidebar-titre {
    width: 100%;
  }
}

/* ── Aperçu + rapport imprimable (paysage A4) ── */
@media screen {
  #stat-print {
    position: fixed;
    left: -10000px;
    top: 0;
  }
  #stat-print.apercu-flottant {
    left: 50% !important;
    transform: translateX(-50%);
    top: 62px;
    z-index: 150;
    max-height: calc(100vh - 82px);
    overflow-y: auto;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
  }
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
.apercu-barre-actions {
  display: flex;
  gap: 8px;
}
.apercu-barre .btn-back {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.45);
}
.apercu-barre .btn-back:hover {
  background: rgba(255, 255, 255, 0.16);
}

@page {
  size: A4 landscape;
  margin: 12mm;
}
.stat-a4 {
  width: 277mm;
  max-width: 100%;
  margin: 0 auto;
  background: #fff;
  padding: 8mm 10mm;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #111;
  font-size: 11px;
  line-height: 1.35;
}
.stat-a4-head {
  text-align: center;
  margin-bottom: 4px;
}
.stat-a4-head h1 {
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}
.stat-a4-head p {
  font-size: 10.5px;
  margin: 1px 0 0;
  color: #333;
}
.stat-a4-titre {
  text-align: center;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 2px;
  text-decoration: underline;
}
.stat-a4-periode {
  text-align: center;
  font-size: 11px;
  margin-bottom: 6px;
  color: #333;
}
.stat-a4-resume {
  display: flex;
  gap: 8px 22px;
  flex-wrap: wrap;
  border: 1px solid #111;
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 8px;
}
.stat-a4-resume-item {
  display: flex;
  gap: 6px;
  font-size: 11px;
}
.stat-a4-label {
  font-weight: 700;
}
.stat-a4-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.stat-a4-table th,
.stat-a4-table td {
  border: 1px solid #111;
  padding: 4px 8px;
  text-align: left;
}
.stat-a4-table th {
  background: #f1f5f9;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stat-a4-sign {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 11px;
}
.stat-a4-cachet {
  border: 1px solid #111;
  border-radius: 6px;
  width: 160px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #555;
  font-style: italic;
}
@media print {
  .stat-a4 {
    width: 100%;
    padding: 0;
    margin: 0;
  }
  .stat-a4-head,
  .stat-a4-titre,
  .stat-a4-resume,
  .stat-a4-table,
  .stat-a4-sign {
    page-break-inside: avoid;
  }
}
</style>
