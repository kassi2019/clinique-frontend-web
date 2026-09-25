<template>
  <div class="rapports-page">
    <!-- En-tête -->
    <header class="rapports-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">📄</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Rapports — rapport mensuel officiel SIG (DIIS)</span>
          </div>
        </div>
        <div class="header-actions">
          <span class="date-pill">{{ todayLabel }}</span>
          <button
            class="btn btn-outline btn-sm btn-back"
            @click="router.push({ name: 'home' })"
          >
            ← Modules
          </button>
        </div>
      </div>
    </header>

    <main class="rapports-content">
      <!-- Barre de navigation du mois -->
      <div class="card barre-mois">
        <div class="barre-gauche">
          <label class="barre-label">Rapport du mois de</label>
          <select v-model="mois" class="select-mois" @change="chargerMois">
            <option v-for="(m, i) in MOIS_LABELS" :key="i" :value="i + 1">
              {{ m }}
            </option>
          </select>
          <select v-model="annee" class="select-mois" @change="chargerMois">
            <option v-for="a in anneesDispo" :key="a" :value="a">
              {{ a }}
            </option>
          </select>
          <button class="btn btn-outline btn-sm" @click="chargerMois">
            🔄 Charger
          </button>
          <span class="badge" :class="statutBadge">{{ statutLabel }}</span>
          <span v-if="sauvegardeEnCours" class="text-muted"
            >Enregistrement…</span
          >
        </div>
        <div class="barre-actions">
          <button
            class="btn btn-outline"
            :disabled="sauvegardeEnCours"
            @click="enregistrer(false)"
          >
            💾 Enregistrer
          </button>
          <button class="btn btn-outline" @click="preRemplir">
            💡 Préremplir depuis l'application
          </button>
          <button class="btn btn-outline" @click="validerRapport">
            ✅
            {{
              rapport?.statut === "VALIDE"
                ? "Rapport validé"
                : "Valider le rapport"
            }}
          </button>
          <button class="btn btn-primary" @click="imprimer">
            🖨️ Imprimer (A4 portrait)
          </button>
        </div>
      </div>

      <!-- En-tête du rapport (paramétrable dans Paramétrage → Clinique) -->
      <section class="card">
        <div class="card-header">
          <h2>En-tête du rapport</h2>
          <div class="header-droite">
            <span class="text-muted"
              >Préremplie depuis Paramétrage → Clinique, modifiable ici pour le
              mois</span
            >
            <button class="btn btn-outline btn-sm" @click="reimporterEntete">
              ↻ Réimporter depuis la fiche clinique
            </button>
          </div>
        </div>
        <div class="grid-entete">
          <div class="field">
            <label>Établissement sanitaire de</label
            ><input
              v-model="rapport.etablissement"
              @input="marquerEnteteSale"
            />
          </div>
          <div class="field">
            <label>Numéro d'immatriculation</label
            ><input
              v-model="rapport.immatriculation"
              @input="marquerEnteteSale"
            />
          </div>
          <div class="field">
            <label>District sanitaire de</label
            ><input v-model="rapport.districtNom" @input="marquerEnteteSale" />
          </div>
          <div class="field">
            <label>Code district</label
            ><input v-model="rapport.districtCode" @input="marquerEnteteSale" />
          </div>
          <div class="field">
            <label>Région sanitaire du</label
            ><input v-model="rapport.regionNom" @input="marquerEnteteSale" />
          </div>
          <div class="field">
            <label>Code région</label
            ><input v-model="rapport.regionCode" @input="marquerEnteteSale" />
          </div>
          <div class="field">
            <label>Population desservie</label
            ><input
              v-model.number="rapport.populationDesservie"
              type="number"
              min="0"
              @input="marquerEnteteSale"
            />
          </div>
          <div class="field">
            <label>Réalisé par (nom)</label
            ><input
              v-model="rapport.realiseParNom"
              @input="marquerEnteteSale"
            />
          </div>
          <div class="field">
            <label>Fonction</label
            ><input
              v-model="rapport.realiseParFonction"
              @input="marquerEnteteSale"
            />
          </div>
          <div class="field">
            <label>Contact téléphonique</label
            ><input
              v-model="rapport.realiseParContact"
              @input="marquerEnteteSale"
            />
          </div>
          <div class="field field-large">
            <label>Observations éventuelles</label
            ><textarea
              v-model="rapport.observations"
              rows="2"
              @input="marquerEnteteSale"
            ></textarea>
          </div>
        </div>
      </section>

      <!-- Portes Oui/Non des sections -->
      <section class="card">
        <div class="card-header">
          <h2>Activités réalisées ce mois (portes Oui/Non)</h2>
        </div>
        <div class="portes-grid">
          <div v-for="sec in SECTIONS" :key="sec.code" class="porte-item">
            <span class="porte-libelle">{{ sec.titre }}</span>
            <div class="porte-boutons">
              <button
                class="porte-btn"
                :class="{ on: rapport.portes?.[sec.code] !== false }"
                @click="basculerPorte(sec.code, true)"
              >
                OUI
              </button>
              <button
                class="porte-btn"
                :class="{ on: rapport.portes?.[sec.code] === false }"
                @click="basculerPorte(sec.code, false)"
              >
                NON
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Sections et tableaux (déroulables, fermées par défaut) -->
      <section v-for="sec in sectionsActives" :key="sec.code" class="card">
        <div
          class="card-header section-toggle"
          @click="basculerSection(sec.code)"
        >
          <span class="section-chevron">{{
            sectionOuverte(sec.code) ? "▾" : "▸"
          }}</span>
          <h2>{{ sec.titre }}</h2>
          <span class="text-muted section-aide">
            {{
              sectionOuverte(sec.code)
                ? "Cliquer pour replier"
                : "Cliquer pour dérouler"
            }}
          </span>
        </div>
        <div v-if="sectionOuverte(sec.code)">
          <div v-for="bloc in sousBlocs(sec)" :key="bloc.titre ?? sec.code">
            <div v-if="bloc.titre" class="sous-titre">{{ bloc.titre }}</div>
            <div v-if="bloc.question" class="section-question">
              <span class="q-texte">{{ bloc.question }}</span>
              <span class="q-cases"
                >Oui : {{ porteCase(sec.code, true) }} — non :
                {{ porteCase(sec.code, false) }}</span
              >
              <span class="q-suite">{{ sectionInstruction(sec) }}</span>
            </div>
            <div v-for="code in bloc.tableaux" :key="code" class="tableau-bloc">
              <div class="tableau-entete">
                <h3>
                  {{
                    TABLES[code].numeroComplet ??
                    `Tableau ${TABLES[code].numero}`
                  }}
                  — {{ TABLES[code].titre }}
                </h3>
                <span
                  v-if="TABLES_PRE_REMPLIES.includes(code)"
                  class="badge badge-muted"
                  >💡 prérempli automatiquement</span
                >
              </div>
              <p v-if="TABLES[code].texte" class="tableau-texte">
                {{ TABLES[code].texte }}
              </p>
              <div class="table-scroll">
                <table class="table-saisie">
                  <thead>
                    <tr>
                      <th v-if="TABLES[code].cim" class="th-cim">CIM 10</th>
                      <th class="th-libelle"></th>
                      <th
                        v-for="(col, c) in TABLES[code].colonnes"
                        :key="c"
                        class="th-col"
                      >
                        {{ col }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(lbl, l) in TABLES[code].lignes" :key="l">
                      <td v-if="TABLES[code].cim" class="td-cim">
                        {{ TABLES[code].cim[l] ?? "" }}
                      </td>
                      <td class="td-libelle">{{ lbl }}</td>
                      <td
                        v-for="(_, c) in TABLES[code].colonnes"
                        :key="c"
                        class="td-cell"
                      >
                        <input
                          type="number"
                          min="0"
                          class="cell-input"
                          :value="getVal(code, l, c)"
                          @input="setVal(code, l, c, $event)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="TABLES[code].legende" class="tableau-legende">
                {{ TABLES[code].legende }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- ============ Zone d'impression (modèle officiel, A4 paysage) ============ -->
    <div id="rapport-print">
      <div class="print-a4">
        <!-- ── Page de garde (fidèle au formulaire officiel : logos, textes et placements) ── -->
        <div class="print-garde">
          <div class="print-entete">
            <div class="print-lettre-a">
              {{ parametres?.sigVersion || "A" }}
            </div>

            <div class="print-col-gauche">
              <img
                v-if="parametres?.logoRapportGauche"
                :src="parametres.logoRapportGauche"
                class="print-logo print-logo-gauche"
                alt=""
              />
              <div class="print-ministere">
                MINISTERE DE LA SANTE ET<br />DE L'HYGIENE PUBLIQUE
              </div>
              <div class="print-regle-gauche"></div>
            </div>
            <div class="print-col-droite">
              <img
                v-if="parametres?.logoRapportDroit"
                :src="parametres.logoRapportDroit"
                class="print-logo print-logo-droit"
                alt=""
              />
              <div class="print-republique-droit">
                REPUBLIQUE DE COTE D'IVOIRE
              </div>
              <div class="print-regle-droite"></div>
              <div class="print-devise">Union Discipline Travail</div>
            </div>
          </div>

          <img
            v-if="parametres?.logoRapportCentre"
            :src="parametres.logoRapportCentre"
            class="print-logo-centre"
            alt=""
          />
          <div class="print-diis">
            DIRECTION DE L'INFORMATIQUE ET DE L'INFORMATION SANITAIRE (DIIS)
          </div>
          <div class="print-sig">SYSTEME D'INFORMATION DE GESTION (SIG)</div>

          <div class="print-titre">
            RAPPORT MENSUEL DE<br />L'ETABLISSEMENT SANITAIRE PRIMAIRE
          </div>

          <div class="print-champs">
            <div class="print-champ">
              <span class="print-puce">•</span>
              <span class="print-champ-label">Rapport du mois de</span>
              <span class="print-champ-valeur"
                >{{ moisLabel }} {{ annee }}</span
              >
            </div>
            <div class="print-champ">
              <span class="print-puce">•</span>
              <span class="print-champ-label">Etablissement sanitaire de</span>
              <span class="print-champ-valeur">{{
                rapport.etablissement
              }}</span>
            </div>
            <div class="print-champ">
              <span class="print-puce">•</span>
              <span class="print-champ-label">Numéro d'immatriculation</span>
              <span class="print-champ-valeur print-champ-valeur-court">{{
                rapport.immatriculation
              }}</span>
            </div>
            <div class="print-champ">
              <span class="print-puce">•</span>
              <span class="print-champ-label">District Sanitaire de</span>
              <span class="print-champ-valeur">{{ rapport.districtNom }}</span>
              <span class="print-champ-label print-code">Code</span>
              <span class="print-champ-valeur print-code-valeur">{{
                rapport.districtCode
              }}</span>
            </div>
            <div class="print-champ">
              <span class="print-puce">•</span>
              <span class="print-champ-label">Région Sanitaire du</span>
              <span class="print-champ-valeur">{{ rapport.regionNom }}</span>
              <span class="print-champ-label print-code">Code</span>
              <span class="print-champ-valeur print-code-valeur">{{
                rapport.regionCode
              }}</span>
            </div>
            <div class="print-champ">
              <span class="print-puce">•</span>
              <span class="print-champ-label"
                >Population desservie par l'établissement</span
              >
              <span class="print-champ-valeur print-champ-valeur-court">{{
                rapport.populationDesservie
              }}</span>
            </div>
          </div>

          <div class="print-signataire">
            <div class="print-signataire-label">
              Rapport réalisé par (nom, fonction, contact téléphonique) :
            </div>
            <div class="print-signe">
              {{
                [
                  rapport.realiseParNom,
                  rapport.realiseParFonction,
                  rapport.realiseParContact,
                ]
                  .filter(Boolean)
                  .join(" — ")
              }}
            </div>
            <div class="print-signe"></div>
            <div class="print-signe"></div>
            <div class="print-signataire-label">Observations éventuelles :</div>
            <div class="print-signe">{{ rapport.observations }}</div>
            <div class="print-signe"></div>
          </div>

          <div class="print-pied-garde">
            Ministère de la Santé et de l'Hygiène Publique - Direction de
            l'Informatique et de l'Information Sanitaire -<br />
            Sise au plateau, avenue Chardy, 3eme étage de l'Immeuble le Paris -
            04 BP 341 Abidjan 04 Téléphone : 20 22 60 43 / 45.36.82.74 -
          </div>
        </div>
        <div class="print-signature-ligne">
          <span>………………………………………………………………………………………………………………</span>
          <span>Signature :</span>
        </div>
        <div class="print-version">{{ CONSEILS_UTILISATION.version }}</div>
        <!-- ── Conseils d'utilisation (page 2 du formulaire) ── -->
        <div class="print-conseils">
          <div class="print-conseils-titre">
            {{ CONSEILS_UTILISATION.titre }}
          </div>

          <p class="print-conseils-texte">{{ CONSEILS_UTILISATION.texte }}</p>
        </div>

        <!-- ── Sections et tableaux ── -->
        <div
          v-for="sec in sectionsActives"
          :key="sec.code"
          class="print-section-bloc"
        >
          <div class="print-section">{{ sec.titre }}</div>
          <div v-if="sec.question" class="print-question">
            {{ sec.question }}&nbsp; Oui :
            <span class="print-case">{{ porteCase(sec.code, true) }}</span
            >&nbsp; non :
            <span class="print-case">{{ porteCase(sec.code, false) }}</span>
          </div>
          <div class="print-instructions">{{ sectionInstruction(sec) }}</div>

          <div v-for="bloc in sousBlocs(sec)" :key="bloc.titre ?? sec.code">
            <div v-if="bloc.titre" class="print-sous-titre">
              {{ bloc.titre }}
            </div>
            <div v-if="bloc.question" class="print-question">
              {{ bloc.question }}&nbsp; OUI :
              <span class="print-case">{{ porteCase(sec.code, true) }}</span
              >&nbsp; NON :
              <span class="print-case">{{ porteCase(sec.code, false) }}</span>
            </div>
            <div
              v-for="code in bloc.tableaux"
              :key="code"
              class="print-tableau"
            >
              <div class="print-tableau-titre">
                {{
                  TABLES[code].numeroComplet ?? `Tableau ${TABLES[code].numero}`
                }}
                : {{ TABLES[code].titre }}
              </div>
              <div v-if="TABLES[code].texte" class="print-tableau-texte">
                {{ TABLES[code].texte }}
              </div>
              <table class="print-table">
                <thead>
                  <tr>
                    <th v-if="TABLES[code].cim" class="print-th-cim">CIM 10</th>
                    <th class="print-th-libelle"></th>
                    <th v-for="(col, c) in TABLES[code].colonnes" :key="c">
                      {{ col }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(lbl, l) in TABLES[code].lignes" :key="l">
                    <td v-if="TABLES[code].cim" class="print-td-cim">
                      {{ TABLES[code].cim[l] ?? "" }}
                    </td>
                    <td class="print-td-libelle">{{ lbl }}</td>
                    <td
                      v-for="(_, c) in TABLES[code].colonnes"
                      :key="c"
                      class="print-td-num"
                    >
                      {{ getVal(code, l, c) }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="TABLES[code].legende" class="print-legende">
                {{ TABLES[code].legende }}
              </div>
            </div>
          </div>
        </div>

        <!-- ── VI.2 Gestion du rapport ── -->
        <div class="print-section">VI.2 — GESTION DU RAPPORT</div>
        <div class="print-gestion">
          <div class="print-gestion-titre">
            Gestion du rapport au niveau de l'établissement
          </div>
          <table class="print-table print-gestion-table">
            <tbody>
              <tr>
                <td class="print-td-libelle">
                  Date de fin de remplissage du rapport :
                </td>
                <td>
                  jour ………………&nbsp;&nbsp; mois ………………&nbsp;&nbsp; année ………………
                </td>
              </tr>
              <tr>
                <td class="print-td-libelle">
                  Date de départ du rapport de l'établissement :
                </td>
                <td>……………………………………………………………</td>
              </tr>
              <tr>
                <td class="print-td-libelle">
                  Moyen d'acheminement du rapport :
                </td>
                <td>……………………………………………………………</td>
              </tr>
            </tbody>
          </table>

          <div class="print-gestion-titre">
            Au niveau de la Direction Départementale – Centre de Surveillance
            Epidémiologique
          </div>
          <table class="print-table print-gestion-table">
            <tbody>
              <tr>
                <td class="print-td-libelle">
                  Date d'arrivée du rapport à la Direction Départementale :
                </td>
                <td>
                  jour ………………&nbsp;&nbsp; mois ………………&nbsp;&nbsp; année ………………
                </td>
              </tr>
              <tr>
                <td class="print-td-libelle">Rapport réceptionné par :</td>
                <td>……………………………………………………………</td>
              </tr>
              <tr>
                <td class="print-td-libelle">
                  Date de vérification du rapport à la Direction Départementale
                  :
                </td>
                <td>……………………………………………………………</td>
              </tr>
            </tbody>
          </table>
          <div class="print-erreurs">
            Erreurs constatées :<br />
            ………………………………………………………………<br />
            ………………………………………………………………<br />
            ………………………………………………………………<br />
            ………………………………………………………………
          </div>
          <table class="print-table print-gestion-table">
            <tbody>
              <tr>
                <td class="print-td-libelle">
                  Le rapport est-il retourné dans l'établissement : oui : ☐ non
                  : ☐
                </td>
                <td>Si oui, préciser les motifs : …………………………………</td>
              </tr>
              <tr>
                <td class="print-td-libelle">
                  Date de départ de la Direction Départementale :
                </td>
                <td>
                  jour ………………&nbsp;&nbsp; mois ………………&nbsp;&nbsp; année ………………
                </td>
              </tr>
              <tr>
                <td class="print-td-libelle">
                  Date de retour à la Direction Départementale :
                </td>
                <td>
                  jour ………………&nbsp;&nbsp; mois ………………&nbsp;&nbsp; année ………………
                </td>
              </tr>
              <tr>
                <td class="print-td-libelle">Date de saisie :</td>
                <td>
                  jour ………………&nbsp;&nbsp; mois ………………&nbsp;&nbsp; année ………………
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Swal from "sweetalert2";
import http from "../api/http";
import { useAuthStore } from "../stores/auth";
import { toastError, toastSuccess } from "../utils/notifications";
import {
  SECTIONS,
  TABLES,
  TABLES_PRE_REMPLIES,
  CONSEILS_UTILISATION,
} from "./rapports/sigTables";

const auth = useAuthStore();
const router = useRouter();

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null);
const cliniqueNom = computed(
  () => auth.user?.clinique?.nom || "Gestion Clinique",
);

const todayLabel = computed(() => {
  const d = new Date();
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});

const MOIS_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const maintenant = new Date();
const mois = ref(maintenant.getMonth() + 1);
const annee = ref(maintenant.getFullYear());
const anneesDispo = Array.from(
  { length: 8 },
  (_, i) => maintenant.getFullYear() - 2 + i,
);

const rapport = ref({
  id: null,
  statut: "BROUILLON",
  etablissement: "",
  immatriculation: "",
  districtNom: "",
  districtCode: "",
  regionNom: "",
  regionCode: "",
  populationDesservie: null,
  realiseParNom: "",
  realiseParFonction: "",
  realiseParContact: "",
  observations: "",
  portes: {},
});

// Valeurs des cellules : { [tableau]: { 'ligne_colonne': nombre } }
const valeurs = ref({});
const tableauxSales = ref(new Set());
const enteteSale = ref(false);
const sauvegardeEnCours = ref(false);

// Logos et lettre de version de la page de garde (Paramétrage → Paramètres)
const parametres = ref({});

// Sections déroulables (fermées par défaut)
const sectionsOuvertes = ref(new Set());

function sectionOuverte(code) {
  return sectionsOuvertes.value.has(code);
}

function basculerSection(code) {
  const s = new Set(sectionsOuvertes.value);
  if (s.has(code)) s.delete(code);
  else s.add(code);
  sectionsOuvertes.value = s;
}

const moisLabel = computed(() => MOIS_LABELS[mois.value - 1]);
const statutLabel = computed(() =>
  rapport.value.statut === "VALIDE" ? "Validé" : "Brouillon",
);
const statutBadge = computed(() =>
  rapport.value.statut === "VALIDE" ? "badge-success" : "badge-warning",
);
const sectionsActives = computed(() =>
  SECTIONS.filter((s) => rapport.value.portes?.[s.code] !== false),
);

/** Blocs d'une section (sous-sections VIH le cas échéant, sinon la section elle-même). */
function sousBlocs(sec) {
  if (sec.sousSections?.length) return sec.sousSections;
  return [{ titre: null, question: sec.question, tableaux: sec.tableaux }];
}

/** Case Oui/Non à afficher selon la porte de la section. */
function porteCase(code, oui) {
  const active = rapport.value.portes?.[code] !== false;
  return (oui && active) || (!oui && !active) ? "☒" : "☐";
}

/** Instruction « Si oui… / Si non… » selon la réponse donnée. */
function sectionInstruction(sec) {
  return rapport.value.portes?.[sec.code] === false ? sec.siNon : sec.siOui;
}

// ── Cellules ──
function cle(l, c) {
  return `${l}_${c}`;
}

function getVal(tableau, l, c) {
  return valeurs.value[tableau]?.[cle(l, c)] ?? "";
}

function setVal(tableau, l, c, ev) {
  const v = ev.target.value;
  if (!valeurs.value[tableau]) valeurs.value[tableau] = {};
  valeurs.value[tableau][cle(l, c)] =
    v === "" ? null : Math.max(0, Math.round(Number(v)));
  tableauxSales.value.add(tableau);
}

function marquerEnteteSale() {
  enteteSale.value = true;
}

// ── Chargement / sauvegarde ──
async function chargerMois() {
  if (tableauxSales.value.size > 0 || enteteSale.value) {
    await enregistrer(true);
  }
  try {
    const { data } = await http.get("/rapports/sig", {
      params: {
        cliniqueId: cliniqueId.value,
        mois: mois.value,
        annee: annee.value,
      },
    });
    const { valeurs: vals, parametres: params, ...entete } = data;
    rapport.value = entete;
    parametres.value = params ?? {};
    const map = {};
    for (const v of vals ?? []) {
      if (!map[v.tableau]) map[v.tableau] = {};
      map[v.tableau][cle(v.ligne, v.colonne)] = v.valeur;
    }
    valeurs.value = map;
    tableauxSales.value = new Set();
    enteteSale.value = false;
  } catch (e) {
    toastError(
      e.response?.data?.message || "Impossible de charger le rapport.",
    );
  }
}

/** Enregistre les tableaux modifiés puis l'en-tête si modifiée. */
async function enregistrer(silencieux) {
  if (!rapport.value.id) return;
  sauvegardeEnCours.value = true;
  try {
    for (const tableau of tableauxSales.value) {
      const map = valeurs.value[tableau] ?? {};
      const cells = Object.entries(map)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => {
          const [l, c] = k.split("_").map(Number);
          return { ligne: l, colonne: c, valeur: v };
        });
      await http.put(`/rapports/sig/${rapport.value.id}/valeurs`, {
        tableau,
        valeurs: cells,
      });
    }
    tableauxSales.value = new Set();
    if (enteteSale.value) {
      await http.patch(`/rapports/sig/${rapport.value.id}`, {
        etablissement: rapport.value.etablissement,
        immatriculation: rapport.value.immatriculation,
        districtNom: rapport.value.districtNom,
        districtCode: rapport.value.districtCode,
        regionNom: rapport.value.regionNom,
        regionCode: rapport.value.regionCode,
        populationDesservie: rapport.value.populationDesservie,
        realiseParNom: rapport.value.realiseParNom,
        realiseParFonction: rapport.value.realiseParFonction,
        realiseParContact: rapport.value.realiseParContact,
        observations: rapport.value.observations,
      });
      enteteSale.value = false;
    }
    if (!silencieux) toastSuccess("Rapport enregistré.");
  } catch (e) {
    toastError(e.response?.data?.message || "Enregistrement impossible.");
  } finally {
    sauvegardeEnCours.value = false;
  }
}

// ── Réimport de l'en-tête depuis la fiche clinique ──
async function reimporterEntete() {
  const conf = await Swal.fire({
    title: "Réimporter l’en-tête ?",
    html:
      "Les champs de l’en-tête de ce rapport seront remplacés par les valeurs actuelles de<br/>" +
      "<strong>Paramétrage → Clinique</strong> (les observations et les tableaux ne changent pas).",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Oui, réimporter",
    cancelButtonText: "Annuler",
    confirmButtonColor: "#0d9488",
    cancelButtonColor: "#64748b",
  });
  if (!conf.isConfirmed) return;
  try {
    const { data } = await http.post(
      `/rapports/sig/${rapport.value.id}/reimporter-entete`,
    );
    for (const f of [
      "etablissement",
      "immatriculation",
      "districtNom",
      "districtCode",
      "regionNom",
      "regionCode",
      "populationDesservie",
      "realiseParNom",
      "realiseParFonction",
      "realiseParContact",
    ]) {
      rapport.value[f] = data[f];
    }
    enteteSale.value = false;
    toastSuccess("En-tête réimportée depuis la fiche clinique.");
  } catch (e) {
    toastError(e.response?.data?.message || "Réimport impossible.");
  }
}

// ── Portes Oui/Non ──
async function basculerPorte(code, valeur) {
  rapport.value.portes[code] = valeur;
  try {
    await http.patch(`/rapports/sig/${rapport.value.id}`, {
      portes: { [code]: valeur },
    });
  } catch (e) {
    toastError(
      e.response?.data?.message || "Enregistrement de la porte impossible.",
    );
  }
}

// ── Préremplissage ──
async function preRemplir() {
  const conf = await Swal.fire({
    title: "Préremplir les tableaux calculables ?",
    html:
      `Les tableaux <strong>${TABLES_PRE_REMPLIES.join(", ")}</strong> seront calculés depuis les données de l'application<br/>` +
      `(consultations, soins, CPN, accouchements, décès, TDR, recettes) pour ${moisLabel.value} ${annee.value}.<br/><br/>` +
      `<strong>Attention :</strong> les valeurs déjà saisies sur ces tableaux seront remplacées.`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Oui, préremplir",
    cancelButtonText: "Annuler",
    confirmButtonColor: "#0d9488",
    cancelButtonColor: "#64748b",
  });
  if (!conf.isConfirmed) return;
  try {
    const { data } = await http.post(
      `/rapports/sig/${rapport.value.id}/pre-remplir`,
    );
    for (const [tableau, cells] of Object.entries(data)) {
      if (!valeurs.value[tableau]) valeurs.value[tableau] = {};
      for (const v of cells) {
        valeurs.value[tableau][cle(v.ligne, v.colonne)] = v.valeur;
      }
    }
    toastSuccess(
      "Tableaux préremplis. Vérifiez et corrigez les chiffres, puis enregistrez.",
    );
  } catch (e) {
    toastError(e.response?.data?.message || "Préremplissage impossible.");
  }
}

// ── Validation ──
async function validerRapport() {
  if (rapport.value.statut === "VALIDE") {
    toastSuccess("Ce rapport est déjà validé.");
    return;
  }
  const conf = await Swal.fire({
    title: "Valider le rapport ?",
    html: `Le rapport de <strong>${moisLabel.value} ${annee.value}</strong> sera marqué comme validé (il reste modifiable).`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Oui, valider",
    cancelButtonText: "Annuler",
    confirmButtonColor: "#0d9488",
    cancelButtonColor: "#64748b",
  });
  if (!conf.isConfirmed) return;
  try {
    await http.patch(`/rapports/sig/${rapport.value.id}`, { statut: "VALIDE" });
    rapport.value.statut = "VALIDE";
    toastSuccess("Rapport validé.");
  } catch (e) {
    toastError(e.response?.data?.message || "Validation impossible.");
  }
}

// ── Impression ──
async function imprimer() {
  await enregistrer(true);
  nextTick(() => window.print());
}

onMounted(chargerMois);
</script>

<style scoped>
.rapports-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
  display: flex;
  flex-direction: column;
}
.rapports-header {
  background: linear-gradient(120deg, #0d9488 0%, #0f766e 55%, #115e59 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 6px 24px rgba(13, 71, 67, 0.28);
}
.header-inner {
  max-width: none;
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
  color: #ffffff;
  font-size: 16px;
  letter-spacing: 0.02em;
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

.rapports-content {
  flex: 1;
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Barre du mois */
.barre-mois {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.barre-gauche {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.barre-label {
  font-weight: 700;
  font-size: 14px;
  color: #0f766e;
}
.select-mois {
  padding: 8px 10px;
  border: 1.5px solid var(--border-champ);
  border-radius: 8px;
  font-size: 13.5px;
  font-family: inherit;
  background: #fff;
}
.barre-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* En-tête du rapport */
.header-droite {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.grid-entete {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.field input,
.field textarea {
  padding: 8px 10px;
  border: 1.5px solid var(--border-champ);
  border-radius: 8px;
  font-size: 13.5px;
  font-family: inherit;
  background: #fff;
}
.field-large {
  grid-column: span 2;
}

/* Portes Oui/Non */
.portes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 8px;
  margin-top: 10px;
}
.porte-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fbfdfd;
}
.porte-libelle {
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
}
.porte-boutons {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.porte-btn {
  padding: 4px 12px;
  font-size: 11.5px;
  font-weight: 800;
  border: 1.5px solid var(--border);
  border-radius: 999px;
  background: #fff;
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
}
.porte-btn.on {
  background: #0d9488;
  border-color: #0d9488;
  color: #fff;
}

/* Sections déroulables */
.section-toggle {
  cursor: pointer;
  user-select: none;
  align-items: center;
  gap: 8px;
}
.section-toggle:hover {
  background: #f0fdfa;
}
.section-chevron {
  font-size: 13px;
  color: #0d9488;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}
.section-aide {
  font-size: 11.5px;
  font-weight: 400;
  margin-left: auto;
}

/* Sous-sections (volet VIH) */
.sous-titre {
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 800;
  color: #115e59;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-left: 4px solid #0d9488;
  padding-left: 10px;
}
.section-question {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 8px 0 6px;
  padding: 9px 12px;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
}
.section-question .q-texte {
  font-weight: 600;
  color: #334155;
}
.section-question .q-cases {
  color: #0f766e;
  font-weight: 700;
}
.section-question .q-suite {
  font-style: italic;
  color: var(--text-muted);
}

/* Textes officiels des tableaux (écran) */
.tableau-texte {
  font-size: 12.5px;
  color: #475569;
  font-style: italic;
  margin: 4px 0 8px;
  line-height: 1.45;
  white-space: pre-line;
}
.tableau-legende {
  font-size: 11.5px;
  color: var(--text-muted);
  margin: 6px 0 0;
  line-height: 1.4;
  white-space: pre-line;
}
.th-cim {
  background: #f0fdfa;
  min-width: 64px;
  padding: 6px 4px !important;
  font-size: 11px;
  font-weight: 700;
  color: #0f766e;
  position: sticky;
  left: 0;
  z-index: 2;
}
.td-cim {
  font-family: Consolas, monospace;
  font-size: 11px;
  color: #64748b;
  background: #f8fafc;
  position: sticky;
  left: 0;
  z-index: 1;
  padding: 6px 6px !important;
  border-right: 2px solid #d5eee9;
}

/* Tableaux de saisie */
.tableau-bloc {
  margin-top: 14px;
  border-top: 1px solid #e2f0ed;
  padding-top: 10px;
}
.tableau-entete {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.tableau-entete h3 {
  font-size: 14.5px;
  font-weight: 800;
  color: #0f766e;
  margin: 0;
}
.tableau-note {
  font-size: 12.5px;
  color: var(--text-muted);
  margin: 4px 0 8px;
}
.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.table-saisie {
  border-collapse: collapse;
  width: 100%;
  min-width: max-content;
}
.table-saisie th,
.table-saisie td {
  border: 1px solid #e5edf0;
  padding: 0;
  text-align: center;
}
.th-col {
  font-size: 11px;
  font-weight: 700;
  color: #0f766e;
  background: #f0fdfa;
  padding: 6px 4px !important;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.th-libelle {
  background: #f0fdfa;
  min-width: 260px;
  max-width: 380px;
  position: sticky;
  left: 0;
  z-index: 1;
}
.td-libelle {
  text-align: left;
  font-size: 12.5px;
  padding: 6px 10px !important;
  background: #fff;
  position: sticky;
  left: 0;
  z-index: 1;
  border-right: 2px solid #d5eee9;
  white-space: normal;
  min-width: 260px;
  max-width: 380px;
}
.td-cell {
  width: 56px;
  min-width: 56px;
}
.cell-input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 6px 4px;
  text-align: center;
  font-size: 13px;
  font-family: inherit;
  color: #0f172a;
}
.cell-input:focus {
  outline: 2px solid #0d9488;
  outline-offset: -2px;
  background: #ecfdf5;
}
/* Masquer les flèches pour un rendu compact */
.cell-input::-webkit-outer-spin-button,
.cell-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* ---------- Impression A4 paysage (modèle officiel) ---------- */
@media screen {
  #rapport-print {
    position: fixed;
    left: -10000px;
    top: 0;
  }
}
@page {
  size: A4 portrait;
  margin: 10mm 12mm;
}
.print-a4 {
  width: 186mm;
  max-width: 100%;
  margin: 0 auto;
  background: #fff;
  color: #111;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 9px;
  line-height: 1.4;
}

/* ── Page de garde (placements mesurés sur le formulaire officiel) ── */
.print-garde {
  page-break-after: always;
  /* Encadrement noir double de toute la page, comme l'original */
  border: 3px double #000;
  padding: 5mm 6mm 4mm;
}
.print-entete {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10mm;
  min-height: 46mm;
}
/* Logos (placements mesurés sur l'original) :
   à gauche, le logo est ALIGNÉ À GAUCHE avec le texte du ministère et ses tirets ;
   à droite, logo, texte, tirets et devise sont tous CENTRÉS sur le même axe. */
.print-logo {
  display: block;
  width: 24mm;
  height: 24mm;
  object-fit: contain;
}
.print-logo-gauche {
  margin: 0 0 4mm 25mm;
}
.print-logo-droit {
  margin: 0 auto 4mm;
}
.print-col-gauche {
  text-align: left;
  width: 47%;
}
.print-col-droite {
  text-align: center;
  width: 47%;
}
/* .print-logo1 {
  display: block;
  width: 100mm;
  height: 24mm;
  object-fit: contain;
} */
/* Emblème central, entre DIIS et SIG (comme l'original) */
.print-logo-centre {
  display: block;
  margin: 2mm auto 0;
  width: 50mm;
  height: 20mm;
  object-fit: contain;
}
/* Lettre de version (A) à droite, sous le logo droit (position mesurée : x≈413pt, y≈141pt) */
.print-lettre-a {
  position: absolute;
  right: 54mm;
  top: 45mm;
  font-size: 16pt;
  font-weight: 800;
}
.print-col-gauche {
  margin-top: 0;
  text-align: left;
  padding-left: 0;
}
.print-ministere {
  font-size: 14pt;
  font-weight: 800;
  letter-spacing: 1px;
  line-height: 1.35;
  text-transform: uppercase;
  margin-left: 9mm;
}
.print-regle-gauche {
  border-bottom: 1.2px solid #111;
  width: 40mm;
  margin-top: 7px;
  margin-left: 9mm;
}
.print-col-droite {
  margin-top: 0;
}
.print-republique-droit {
  font-weight: 800;
  font-size: 14pt;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}
.print-regle-droite {
  border-bottom: 1.2px solid #111;
  width: 40mm;
  margin: 7px auto;
}
.print-devise {
  font-style: italic;
  font-size: 12pt;
  letter-spacing: 2px;
  margin-top: 2px;
}
/* DIIS et SIG centrés sous l'en-tête (SIG sur bandeau gris, comme l'original) */
.print-diis {
  text-align: center;
  font-size: 14pt;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-top: 8mm;
}
.print-sig {
  display: table;
  margin: 5mm auto 0;
  background: #bdbdbd;
  padding: 3px 22px;
  text-align: center;
  font-size: 25pt;
  font-weight: 800;
  letter-spacing: 1.2px;
   border-radius: 30px;
}
/* Titre encadré, au-dessus des champs (comme l'original) */
.print-titre {
  border: 1.5pt solid #000;
  text-align: center;
  font-size: 25pt;
  font-weight: 800;
  letter-spacing: 1.6px;
  line-height: 1.5;
  padding: 8mm 4mm;
  margin: 9mm 0 10mm;
  font-family: 'Times New Roman', Times, serif;
}
.print-champs {
  margin: 6mm 0 8mm;
}
.print-champ {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin: 5.5px 0;
  font-size: 15pt;
}
.print-puce {
  flex-shrink: 0;
}
.print-champ-label {
  font-weight: 600;
  flex-shrink: 0;
  font-size: 20pt;
}
.print-champ-valeur {
  flex: 1;
  padding-bottom: 2px;
  font-weight: 600;
  min-height: 19px;
  letter-spacing: 0.4px;
  font-size: 20pt;
}
.print-champ-valeur-court {
  flex: 0 0 60mm;
}
.print-champ .print-code {
  flex-shrink: 0;
  font-weight: 600;
  font-size: 20pt;
}
.print-champ .print-code-valeur {
  flex: 0 0 20mm;
}
/* Titre central, sans cartouche (comme l'original) */
.print-titre-simple {
  text-align: center;
  font-size: 21px;
  font-weight: 900;
  letter-spacing: 1.6px;
  line-height: 1.35;
  margin: 16mm 0;
}
.print-signataire {
  margin: 14mm 0 0;
  font-size: 12.5pt;
}
.print-signataire-label {
  font-weight: 600;
  margin-bottom: 2px;
}
.print-signe {
  border-bottom: 1.4px dotted #555;
  min-height: 11mm;
  padding: 4px 0 5px;
  margin-bottom: 3mm;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.print-pied-garde {
  font-size: 12pt;
  color: #000;
  text-align: center;
  border-top: 1px solid #111;
  padding-top: 5px;
  margin-top: 30mm;
  line-height: 1.5;
}

/* ── Conseils d'utilisation (texte encadré + boîte de signature, comme l'original) ── */
.print-conseils {
  page-break-after: always;
  /* border: 1.2pt solid #000; */
  padding: 5mm 6mm;
}
.print-conseils-titre {
  text-align: center;
  font-size: 35px;
  font-weight: 900;
  /* text-decoration: underline; */
  letter-spacing: 1.2px;
 margin: 5mm auto 0;
  background: #000;
  padding: 3px 22px;
  color: #fff;
  border: #000 1.2pt solid;
  border-radius: 30px;
    /* display: table;
  margin: 5mm auto 0;
  background: #bdbdbd;
  padding: 3px 22px;
  text-align: center;
  font-size: 20pt;
  font-weight: 800;
  letter-spacing: 1.2px; */
}
.print-version {
  text-align: center;
  font-weight: 700;
  font-size: 9px;
  margin-bottom: 8px;
}
.print-conseils-texte {
  font-size: 25px;
  line-height: 1.55;
  text-align: justify;
}
.print-signature-ligne {
  margin-top: 30mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 14px;
  border: 1.2pt solid #000;
  padding: 6mm 5mm;
  min-height: 24mm;
}

/* ── Sections : titres blancs sur bandeau noir + en-têtes de tableaux gris (couleurs de l'original) ── */
.print-section-bloc {
  page-break-before: always;
}
.print-section {
  background: #000;
  color: #fff;
  font-size: 16pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 10px;
  margin: 4px 0 5px;
  page-break-after: avoid;
}
.print-question {
  font-size: 12pt;
  font-weight: 600;
  margin: 2px 0;
  page-break-after: avoid;
}
.print-case {
  font-size: 12pt;
}
.print-instructions {
  font-size: 11pt;
  font-style: italic;
  margin-bottom: 4px;
  page-break-after: avoid;
}
.print-sous-titre {
  font-size: 12pt;
  font-weight: 900;
  margin: 6px 0 2px;
  text-transform: uppercase;
  page-break-after: avoid;
}
.print-tableau {
  page-break-inside: avoid;
  margin-bottom: 6px;
}
.print-tableau-titre {
  font-size: 12pt;
  font-weight: 800;
  text-decoration: underline;
  margin: 3px 0 1.5px;
}
.print-tableau-texte {
  font-size: 11pt;
  font-style: italic;
  line-height: 1.35;
  margin: 1px 0 2px;
  white-space: pre-line;
}
.print-table {
  width: 100%;
  border-collapse: collapse;
}
.print-table th,
.print-table td {
  border: 0.6px solid #111;
  padding: 1.5px 2px;
  font-size: 10pt;
}
.print-table th {
  background: #9a9a9a;
  color: #000;
  font-size: 11pt;
  text-transform: uppercase;
}
.print-th-libelle {
  width: 34%;
}
.print-td-libelle {
  font-weight: 600;
}
.print-td-num {
  text-align: center;
  width: 16px;
  min-height: 10px;
}
.print-th-cim {
  width: 52px;
}
.print-td-cim {
  text-align: center;
  font-size: 9pt;
  color: #333;
}
.print-legende {
  font-size: 9.5pt;
  font-style: italic;
  margin-top: 1.5px;
  white-space: pre-line;
}

/* ── VI.2 Gestion ── */
.print-gestion {
  font-size: 9px;
}
.print-gestion-titre {
  font-weight: 800;
  text-transform: uppercase;
  margin: 6px 0 2px;
  text-decoration: underline;
}
.print-gestion-table {
  width: 100%;
}
.print-gestion-table td {
  padding: 4px 6px;
}
.print-erreurs {
  margin: 4px 0;
  line-height: 1.8;
}
@media print {
  .print-a4 {
    width: 100%;
  }
}
</style>
