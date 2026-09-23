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
          <button
            v-if="estMedecin"
            class="btn btn-sm dispo-btn"
            :class="disponibilite === 'DISPONIBLE' ? 'dispo-on' : 'dispo-off'"
            @click="basculerDisponibilite"
          >
            {{ disponibilite === 'DISPONIBLE' ? '🟢 Disponible' : '🔴 Indisponible' }}
          </button>
          <span class="date-pill">{{ todayLabel }}</span>
          <button class="btn btn-outline btn-sm btn-back" @click="router.push({ name: 'home' })">
            ← Modules
          </button>
        </div>
      </div>
    </header>

    <main class="consultation-content">
      <!-- Médecin : file d'attente / terminées / recherche -->
      <nav v-if="estMedecin && !passageCourant" class="tabs-nav">
        <button class="tab-btn" :class="{ active: vueFile === 'attente' }" @click="vueFile = 'attente'">
          📋 File d'attente
          <span class="tab-count" :class="{ 'tab-count-actif': vueFile === 'attente' }">{{ file.enAttente.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: vueFile === 'terminees' }" @click="vueFile = 'terminees'; chargerFile()">
          ✅ Terminées
        </button>
        <button class="tab-btn" :class="{ active: vueFile === 'recherche' }" @click="vueFile = 'recherche'">
          🔍 Recherche par code
        </button>
      </nav>

      <!-- File d'attente du médecin -->
      <section v-if="estMedecin && !passageCourant && vueFile === 'attente'" class="card">
        <div class="card-header">
          <h2>Patients affectés (file d'attente)</h2>
          <input
            v-model="filtreJourFile"
            type="date"
            class="search-input"
            style="max-width: 160px"
            title="Vide = tous les jours"
            @change="chargerFile"
          />
        </div>
        <div v-if="file.enAttente.length === 0" class="empty-state">
          Aucun patient en attente.
          <template v-if="disponibilite !== 'DISPONIBLE'">
            <br />Passez en <strong>Disponible</strong> pour recevoir des patients.
          </template>
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>N° d'ordre</th>
                <th>Heure d'arrivée</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(a, i) in file.enAttente" :key="a.id">
                <td>{{ i + 1 }}</td>
                <td><strong>{{ a.passage.patient.nom }} {{ a.passage.patient.prenom }}</strong></td>
                <td>{{ a.passage.numeroOrdre }}</td>
                <td>{{ formatDateHeure(a.dateAffectation) }}</td>
                <td>
                  <span class="badge" :class="a.statut === 'EN_CONSULTATION' ? 'badge-warning' : 'badge-muted'">
                    {{ a.statut === 'EN_CONSULTATION' ? 'En consultation' : 'En attente' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-primary btn-sm" @click="consulterAffectation(a)">🩺 Consulter</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Consultations terminées du jour -->
      <section v-else-if="estMedecin && !passageCourant && vueFile === 'terminees'" class="card">
        <div class="card-header"><h2>Consultations terminées (aujourd'hui)</h2></div>
        <div v-if="file.terminees.length === 0" class="empty-state">Aucune consultation terminée aujourd'hui.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>N° d'ordre</th>
                <th>Validée le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in file.terminees" :key="a.id">
                <td><strong>{{ a.passage.patient.nom }} {{ a.passage.patient.prenom }}</strong></td>
                <td>{{ a.passage.numeroOrdre }}</td>
                <td>{{ formatDateHeure(a.updatedAt) }}</td>
                <td>
                  <button class="btn btn-outline btn-sm" @click="ouvrirTerminee(a)">👁️ Ouvrir le dossier</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Recherche par code (§7) -->
      <section v-if="!estMedecin || vueFile === 'recherche'" class="card search-card" :class="{ 'search-only': !estMedecin }">
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

      <!-- Contenu consultation : 3 onglets -->
      <div v-if="passageCourant && passageCourant.consultable" class="consultation-tabs">
        <nav class="tabs-nav">
          <button class="tab-btn" :class="{ active: onglet === 'fiche' }" @click="onglet = 'fiche'">
            📋 Fiche de consultation
          </button>
          <button class="tab-btn" :class="{ active: onglet === 'medicaments' }" @click="onglet = 'medicaments'">
            💊 Prescription de médicaments
          </button>
          <button class="tab-btn" :class="{ active: onglet === 'examens' }" @click="onglet = 'examens'">
            🔬 Examens (labo / imagerie)
          </button>
        </nav>

        <!-- ══ Onglet 1 : Fiche de consultation ══ -->
        <section v-if="onglet === 'fiche'" class="card">
          <div class="card-header">
            <h2>Fiche de consultation</h2>
            <span v-if="consultation" class="badge" :class="consultation.statut === 'VALIDEE' ? 'badge-success' : 'badge-warning'">
              {{ consultation.statut === 'VALIDEE' ? 'Validée' : 'En cours' }}
            </span>
          </div>

          <form @submit.prevent="validerEtEnregistrer">
            <!-- ══ 1. Données administratives ══ -->
            <h3 class="section-title">Données administratives</h3>
            <div class="form-row">
              <div class="field">
                <label>Mode d'entrée</label>
                <div class="chips">
                  <label class="chip" :class="{ actif: formConsult.modeEntree === 'VENUE_DIRECTE' }">
                    <input v-model="formConsult.modeEntree" type="radio" value="VENUE_DIRECTE" hidden /> Venue du même
                  </label>
                  <label class="chip" :class="{ actif: formConsult.modeEntree === 'REFERE_CENTRE' }">
                    <input v-model="formConsult.modeEntree" type="radio" value="REFERE_CENTRE" hidden /> Référée d'un centre
                  </label>
                  <label class="chip" :class="{ actif: formConsult.modeEntree === 'REFERE_MEDECIN' }">
                    <input v-model="formConsult.modeEntree" type="radio" value="REFERE_MEDECIN" hidden /> Référée par un médecin
                  </label>
                  <label class="chip" :class="{ actif: formConsult.modeEntree === 'AUTRE' }">
                    <input v-model="formConsult.modeEntree" type="radio" value="AUTRE" hidden /> Autre
                  </label>
                </div>
                <input
                  v-if="formConsult.modeEntree === 'AUTRE'"
                  v-model.trim="formConsult.modeEntreeAutre"
                  class="mt-6"
                  placeholder="Préciser…"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label>Nom</label>
                <input :value="passageCourant?.patient?.nom" disabled />
              </div>
              <div class="field">
                <label>Prénoms</label>
                <input :value="passageCourant?.patient?.prenom" disabled />
              </div>
              <div class="field">
                <label>Âge (ans)</label>
                <input :value="passageCourant?.patient?.age + ' ans'" disabled />
              </div>
              <div class="field">
                <label>Tranche d'âge</label>
                <input :value="trancheAge" disabled />
              </div>
              <div class="field">
                <label>Sexe</label>
                <input :value="passageCourant?.patient?.sexe === 'M' ? 'Masculin' : passageCourant?.patient?.sexe === 'F' ? 'Féminin' : '—'" disabled />
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label>Profession</label>
                <input v-model.trim="formConsult.profession" />
              </div>
              <div class="field">
                <label>Nationalité</label>
                <input v-model.trim="formConsult.nationalite" list="liste-nationalite" />
                <datalist id="liste-nationalite">
                  <option v-for="l in listesParams.NATIONALITE" :key="l.id" :value="l.libelle" />
                </datalist>
              </div>
              <div class="field">
                <label>Contacts téléphoniques</label>
                <input v-model.trim="formConsult.telephone" />
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label>Résidence habituelle</label>
                <input v-model.trim="formConsult.residenceHabituelle" />
              </div>
              <div class="field">
                <label>Résidence actuelle</label>
                <input v-model.trim="formConsult.residenceActuelle" list="liste-residence" />
                <datalist id="liste-residence">
                  <option v-for="l in listesParams.RESIDENCE" :key="l.id" :value="l.libelle" />
                </datalist>
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label>En cours de scolarisation</label>
                <div class="chips">
                  <label v-for="o in OUI_NON_NA" :key="o" class="chip" :class="{ actif: formConsult.scolarisation === o }">
                    <input v-model="formConsult.scolarisation" type="radio" :value="o" hidden /> {{ o }}
                  </label>
                </div>
              </div>
              <div class="field">
                <label>Statut conjugal</label>
                <div class="chips">
                  <label v-for="o in STATUTS_CONJUGAUX" :key="o" class="chip" :class="{ actif: formConsult.statutConjugal === o }">
                    <input v-model="formConsult.statutConjugal" type="radio" :value="o" hidden /> {{ o }}
                  </label>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label>Type de population</label>
                <div class="chips">
                  <label v-for="o in TYPES_POPULATION" :key="o" class="chip" :class="{ actif: formConsult.typePopulation === o }">
                    <input v-model="formConsult.typePopulation" type="radio" :value="o" hidden /> {{ o }}
                  </label>
                </div>
              </div>
              <div class="field">
                <label>Protection sociale</label>
                <div class="chips">
                  <label v-for="o in PROTECTIONS_SOCIALES" :key="o" class="chip" :class="{ actif: formConsult.protectionSociale === o }">
                    <input v-model="formConsult.protectionSociale" type="radio" :value="o" hidden /> {{ o }}
                  </label>
                </div>
              </div>
            </div>
            <div class="field">
              <label>Autres populations à haut risque</label>
              <input v-model.trim="formConsult.populationsRisque" />
            </div>

            <!-- ══ 2. Antécédents ══ -->
            <h3 class="section-title">Antécédents</h3>
            <div class="field">
              <label>Traitement médicamenteux antérieur / en cours</label>
              <input v-model.trim="formConsult.traitementAnterieur" />
            </div>
            <div class="form-row">
              <div class="field">
                <label>HTA</label>
                <div class="chips">
                  <label class="chip" :class="{ actif: formConsult.hta === true }">
                    <input v-model="formConsult.hta" type="radio" :value="true" hidden /> Oui
                  </label>
                  <label class="chip" :class="{ actif: formConsult.hta === false }">
                    <input v-model="formConsult.hta" type="radio" :value="false" hidden /> Non
                  </label>
                </div>
              </div>
              <div class="field">
                <label>Diabète</label>
                <div class="chips">
                  <label class="chip" :class="{ actif: formConsult.diabete === true }">
                    <input v-model="formConsult.diabete" type="radio" :value="true" hidden /> Oui
                  </label>
                  <label class="chip" :class="{ actif: formConsult.diabete === false }">
                    <input v-model="formConsult.diabete" type="radio" :value="false" hidden /> Non
                  </label>
                </div>
              </div>
              <div class="field">
                <label>Tabac</label>
                <div class="chips">
                  <label class="chip" :class="{ actif: formConsult.tabac === true }">
                    <input v-model="formConsult.tabac" type="radio" :value="true" hidden /> Oui
                  </label>
                  <label class="chip" :class="{ actif: formConsult.tabac === false }">
                    <input v-model="formConsult.tabac" type="radio" :value="false" hidden /> Non
                  </label>
                </div>
              </div>
              <div class="field">
                <label>Alcool</label>
                <div class="chips">
                  <label class="chip" :class="{ actif: formConsult.alcool === true }">
                    <input v-model="formConsult.alcool" type="radio" :value="true" hidden /> Oui
                  </label>
                  <label class="chip" :class="{ actif: formConsult.alcool === false }">
                    <input v-model="formConsult.alcool" type="radio" :value="false" hidden /> Non
                  </label>
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Antécédents médicaux (autres)</label>
                <input v-model.trim="formConsult.antecedentsMedicaux" />
              </div>
              <div class="field">
                <label>Antécédents chirurgicaux</label>
                <input v-model.trim="formConsult.antecedentsChirurgicaux" />
              </div>
              <div class="field">
                <label>DDR</label>
                <input v-model.trim="formConsult.ddr" type="date" />
              </div>
              <div class="field">
                <label>Grossesse en cours</label>
                <div class="chips">
                  <label class="chip" :class="{ actif: formConsult.grossesseEnCours === true }">
                    <input v-model="formConsult.grossesseEnCours" type="radio" :value="true" hidden /> Oui
                  </label>
                  <label class="chip" :class="{ actif: formConsult.grossesseEnCours === false }">
                    <input v-model="formConsult.grossesseEnCours" type="radio" :value="false" hidden /> Non
                  </label>
                </div>
              </div>
            </div>

            <!-- ══ 3. Examen clinique et constantes ══ -->
            <h3 class="section-title">Examen clinique et constantes physiques</h3>
            <div class="field">
              <label>Motifs de consultation</label>
              <input v-model.trim="formConsult.motif" placeholder="Ex : fièvre, douleurs abdominales…" />
            </div>
            <div class="constantes-grid fiche-constantes">
              <label class="constante-item">Poids (kg) <input v-model.trim="formConsult.poids" /></label>
              <label class="constante-item">Taille (m) <input v-model.trim="formConsult.taille" /></label>
              <label class="constante-item">
                IMC (kg/m²)
                <input
                  :value="imcCalcule"
                  readonly
                  class="champ-grise"
                  title="Calculé automatiquement à partir du poids et de la taille"
                />
              </label>
              <label class="constante-item">Z-score <input v-model.trim="formConsult.zscore" /></label>
              <label class="constante-item">Température (°C) <input v-model.trim="formConsult.temperature" /></label>
              <label class="constante-item">Fréq. resp. (c/min) <input v-model.trim="formConsult.frequenceRespiratoire" /></label>
              <label class="constante-item">TA (mmHg) <input v-model.trim="formConsult.tension" /></label>
              <label class="constante-item">Pouls (batt/min) <input v-model.trim="formConsult.pouls" /></label>
              <label class="constante-item">Périm. brachial (cm) <input v-model.trim="formConsult.perimetreBrachial" /></label>
              <label class="constante-item">Périm. crânien (cm) <input v-model.trim="formConsult.perimetreCranien" /></label>
            </div>
            <div class="field">
              <label>Recherche active de la tuberculose</label>
              <div class="chips">
                <label v-for="o in OUI_NON_NA" :key="o" class="chip" :class="{ actif: formConsult.rechercheTB === o }">
                  <input v-model="formConsult.rechercheTB" type="radio" :value="o" hidden /> {{ o }}
                </label>
              </div>
            </div>
            <div class="field">
              <label>Examen physique</label>
              <textarea v-model.trim="formConsult.observation" rows="2"></textarea>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Diagnostic retenu</label>
                <input v-model.trim="formConsult.diagnostic" list="liste-diagnostic" placeholder="Ex : Paludisme simple" />
                <datalist id="liste-diagnostic">
                  <option v-for="l in listesParams.DIAGNOSTIC" :key="l.id" :value="l.libelle" />
                </datalist>
              </div>
              <div class="field">
                <label>Autres pathologies associées</label>
                <input v-model.trim="formConsult.pathologiesAssociees" list="liste-pathologie" />
                <datalist id="liste-pathologie">
                  <option v-for="l in listesParams.PATHOLOGIE" :key="l.id" :value="l.libelle" />
                </datalist>
              </div>
            </div>

            <h4 class="section-title">Examens complémentaires</h4>
            <div class="form-row">
              <div class="field">
                <label>TDR Paludisme</label>
                <div class="chips">
                  <label v-for="o in ['positif', 'négatif', 'non réalisé', 'NA']" :key="o" class="chip" :class="{ actif: formConsult.tdrPaludisme === o }">
                    <input v-model="formConsult.tdrPaludisme" type="radio" :value="o" hidden /> {{ o }}
                  </label>
                </div>
              </div>
              <div class="field">
                <label>Goutte épaisse</label>
                <div class="chips">
                  <label v-for="o in ['positive', 'négative', 'non réalisée', 'NA']" :key="o" class="chip" :class="{ actif: formConsult.goutteEpaisse === o }">
                    <input v-model="formConsult.goutteEpaisse" type="radio" :value="o" hidden /> {{ o }}
                  </label>
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>MILDA Enfant 12–59 mois — Éligible</label>
                <div class="chips">
                  <label v-for="o in OUI_NON_NA" :key="o" class="chip" :class="{ actif: formConsult.mildaEligible === o }">
                    <input v-model="formConsult.mildaEligible" type="radio" :value="o" hidden /> {{ o }}
                  </label>
                </div>
              </div>
              <div class="field">
                <label>Remise MILDA</label>
                <div class="chips">
                  <label v-for="o in OUI_NON_NA" :key="o" class="chip" :class="{ actif: formConsult.mildaRemise === o }">
                    <input v-model="formConsult.mildaRemise" type="radio" :value="o" hidden /> {{ o }}
                  </label>
                </div>
              </div>
              <div class="field">
                <label>CDIP proposé</label>
                <div class="chips">
                  <label class="chip" :class="{ actif: formConsult.cdipPropose === true }">
                    <input v-model="formConsult.cdipPropose" type="radio" :value="true" hidden /> Oui
                  </label>
                  <label class="chip" :class="{ actif: formConsult.cdipPropose === false }">
                    <input v-model="formConsult.cdipPropose" type="radio" :value="false" hidden /> Non
                  </label>
                </div>
              </div>
              <div class="field">
                <label>CDIP réalisé</label>
                <div class="chips">
                  <label class="chip" :class="{ actif: formConsult.cdipRealise === true }">
                    <input v-model="formConsult.cdipRealise" type="radio" :value="true" hidden /> Oui
                  </label>
                  <label class="chip" :class="{ actif: formConsult.cdipRealise === false }">
                    <input v-model="formConsult.cdipRealise" type="radio" :value="false" hidden /> Non
                  </label>
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Code dépistage client</label>
                <input v-model.trim="formConsult.codeDepistage" />
              </div>
              <div class="field">
                <label>Glycémie à jeun</label>
                <input v-model.trim="formConsult.glycemieAjeun" />
              </div>
              <div class="field">
                <label>Glycémie non à jeun</label>
                <input v-model.trim="formConsult.glycemieNonAjeun" />
              </div>
            </div>
            <div class="field">
              <label>Autres examens</label>
              <textarea v-model.trim="formConsult.autresExamens" rows="2"></textarea>
            </div>

            <!-- ══ 4. Prescription de médicaments (intégrée à la fiche) ══ -->
            <h3 class="section-title">Prescription de médicaments</h3>
            <div class="field">
              <div v-if="consultation" class="prescriptions-fiche">
                <table v-if="(consultation.medicaments ?? []).length > 0" class="prescriptions-fiche-table">
                  <tbody>
                    <tr v-for="p in consultation.medicaments" :key="p.id">
                      <td>
                        <strong>{{ p.medicamentNom }}</strong>
                        <span class="text-muted" v-if="p.forme"> ({{ p.forme }})</span>
                        <div class="text-muted small-note">
                          {{ [p.posologie, p.quantite, p.duree].filter(Boolean).join(' · ') || '—' }}
                        </div>
                      </td>
                      <td style="width: 40px">
                        <button class="btn btn-danger btn-sm" title="Retirer" @click="retirerMedicament(p)">✕</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p v-else class="text-muted small-note">Aucun médicament prescrit.</p>

                <!-- Formulaire de prescription intégré à la fiche -->
                <p v-if="ficheMedError" class="alert alert-error">{{ ficheMedError }}</p>
                <div class="form-row">
                  <div class="field">
                    <label>Médicament (catalogue ou saisie libre)</label>
                    <SelectSearch
                      v-model="ficheMedId"
                      :options="optionsMedicaments"
                      placeholder="— Choisir —"
                    />
                    <input
                      v-model.trim="ficheMedNom"
                      class="search-input"
                      style="margin-top: 6px"
                      placeholder="Ou saisir librement le nom…"
                    />
                  </div>
                  <div class="field">
                    <label>Posologie</label>
                    <input v-model.trim="ficheMedPoso" list="liste-posologie" placeholder="Ex : 1 comprimé 3x/j" />
                    <datalist id="liste-posologie">
                      <option v-for="l in listesParams.POSOLOGIE" :key="l.id" :value="l.libelle" />
                    </datalist>
                  </div>
                </div>
                <div class="form-row">
                  <div class="field">
                    <label>Quantité</label>
                    <input v-model.trim="ficheMedQte" placeholder="Ex : 2 boîtes" />
                  </div>
                  <div class="field">
                    <label>Durée</label>
                    <input v-model.trim="ficheMedDuree" placeholder="Ex : 5 jours" />
                  </div>
                  <div class="field">
                    <label>&nbsp;</label>
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      :disabled="ficheMedEnCours"
                      @click="ajouterMedicamentFiche"
                    >
                      ＋ Ajouter
                    </button>
                  </div>
                </div>
              </div>
              <p v-else class="text-muted small-note">
                Enregistrez la fiche pour pouvoir prescrire des médicaments.
              </p>
            </div>

            <!-- ══ 5. Issue de la consultation ══ -->
            <h3 class="section-title">Issue de la consultation</h3>
            <div class="form-row">
              <div class="field">
                <label>Sortie</label>
                <div class="chips">
                  <label v-for="o in ISSUES_SORTIE" :key="o.value" class="chip" :class="{ actif: formConsult.issueSortie === o.value }">
                    <input v-model="formConsult.issueSortie" type="radio" :value="o.value" hidden /> {{ o.label }}
                  </label>
                </div>
              </div>
              <div class="field">
                <label>Cas présumé de TB référé</label>
                <div class="chips">
                  <label class="chip" :class="{ actif: formConsult.casPresumeTB === 'A_REVOIR' }">
                    <input v-model="formConsult.casPresumeTB" type="radio" value="A_REVOIR" hidden /> À revoir
                  </label>
                  <label class="chip" :class="{ actif: formConsult.casPresumeTB === 'DECEDE' }">
                    <input v-model="formConsult.casPresumeTB" type="radio" value="DECEDE" hidden /> Décédé(e)
                  </label>
                </div>
              </div>
            </div>
            <div v-if="formConsult.issueSortie === 'MO'" class="form-row">
              <div class="field">
                <label>Durée M.O. (heures)</label>
                <input v-model.number="formConsult.moDureeHeures" type="number" min="0" />
              </div>
              <div class="field">
                <label>Durée M.O. (minutes)</label>
                <input v-model.number="formConsult.moDureeMinutes" type="number" min="0" />
              </div>
              <div class="field">
                <label>Début M.O.</label>
                <input v-model="formConsult.moDebut" type="datetime-local" />
              </div>
              <div class="field">
                <label>Fin M.O.</label>
                <input v-model="formConsult.moFin" type="datetime-local" />
              </div>
            </div>

            <!-- ══ Hospitalisation (§13) : prescription + chambre + facturation à l'entrée ══ -->
            <div class="form-row">
              <div class="field">
                <label>Hospitaliser le patient ?</label>
                <div class="chips">
                  <label class="chip" :class="{ actif: formConsult.hospitalisation === true }">
                    <input v-model="formConsult.hospitalisation" type="radio" :value="true" hidden /> Oui
                  </label>
                  <label class="chip" :class="{ actif: formConsult.hospitalisation === false }">
                    <input v-model="formConsult.hospitalisation" type="radio" :value="false" hidden /> Non
                  </label>
                </div>
              </div>
            </div>
            <template v-if="formConsult.hospitalisation">
              <div class="form-row">
                <div class="field">
                  <label>Type d'hospitalisation</label>
                  <div class="chips">
                    <label class="chip" :class="{ actif: formConsult.typeHospitalisation === 'MISE_EN_OBSERVATION' }">
                      <input v-model="formConsult.typeHospitalisation" type="radio" value="MISE_EN_OBSERVATION" hidden /> Mise en observation (0-3 j)
                    </label>
                    <label class="chip" :class="{ actif: formConsult.typeHospitalisation === 'MOYENNE' }">
                      <input v-model="formConsult.typeHospitalisation" type="radio" value="MOYENNE" hidden /> Moyenne (3-10 j)
                    </label>
                    <label class="chip" :class="{ actif: formConsult.typeHospitalisation === 'LONGUE' }">
                      <input v-model="formConsult.typeHospitalisation" type="radio" value="LONGUE" hidden /> Longue (&gt; 10 j)
                    </label>
                  </div>
                </div>
              </div>
              <div class="form-row">
                <div class="field">
                  <label>Durée prévue</label>
                  <input v-model.trim="formConsult.hospitalisationDuree" placeholder="Ex : 3 jours" />
                </div>
                <div class="field">
                  <label>Nombre de jours (facturation) *</label>
                  <input v-model.number="formConsult.hospitalisationDureeJours" type="number" min="1" />
                </div>
                <div class="field">
                  <label>Chambre / lit *</label>
                  <SelectSearch
                    v-model="formConsult.litId"
                    :options="optionsLitsLibres"
                    placeholder="— Choisir un lit libre —"
                  />
                </div>
              </div>
              <p class="small-note text-muted">
                💡 La facture (jours × tarif de la chambre) part à la caisse dès
                l'enregistrement de la fiche — le patient peut la régler à
                l'entrée ou à la sortie.
              </p>
            </template>

            <div class="form-actions">
              <button
                class="btn btn-outline"
                type="button"
                @click="imprimerFicheApercu"
              >
                🖨️ Imprimer
              </button>
              <button
                class="btn btn-primary"
                type="button"
                :disabled="savingConsult"
                @click="validerEtEnregistrer"
              >
                {{
                  savingConsult
                    ? 'Enregistrement…'
                    : consultation?.statut === 'VALIDEE'
                      ? '💾 Enregistrer les modifications'
                      : '💾 Enregistrer'
                }}
              </button>
            </div>
          </form>
        </section>

        <!-- ══ Onglet 2 : Prescription de médicaments ══ -->
        <section v-else-if="onglet === 'medicaments'" class="card">
          <div class="card-header"><h2>Prescription de médicaments</h2></div>
          <div v-if="!consultation" class="empty-state">
            💊 Enregistrez d'abord la fiche de consultation pour prescrire des médicaments.
          </div>
          <template v-else>
          <div v-if="consultation.medicaments.length === 0" class="text-muted small-note">
            Aucun médicament prescrit.
          </div>
          <div v-else class="table-wrap">
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

          <!-- Ordonnance -->
          <div class="form-actions validation-row">
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
          </div>
          </template>
        </section>

        <!-- ══ Onglet 3 : Examens (laboratoire / imagerie) ══ -->
        <section v-else-if="onglet === 'examens'" class="card">
          <div class="card-header">
            <h2>Examens (laboratoire / imagerie)</h2>
            <button
              v-if="consultation && examensPrescrits.length > 0"
              class="btn btn-outline btn-sm"
              @click="apercuExamensVisible = true"
            >
              🖨️ Ordonnance d'examens
            </button>
          </div>
          <div v-if="!consultation" class="text-muted small-note">
            Enregistrez la fiche de consultation pour prescrire des examens.
          </div>
          <div v-if="consultation" class="ajout-examen">
            <div class="ajout-examen-select">
              <SelectSearch
                v-model="nouvelExamenId"
                :options="optionsExamensCatalogue"
                placeholder="— Choisir un examen à prescrire (labo, imagerie…) —"
              />
            </div>
            <button
              class="btn btn-outline btn-sm"
              :disabled="!nouvelExamenId || ajoutExamenEnCours"
              @click="ajouterExamen"
            >
              ＋ Ajouter
            </button>
          </div>
          <div v-if="consultation" class="ajout-examen">
            <input
              v-model.trim="nouvelExamenLibre"
              class="search-input ajout-examen-libre"
              placeholder="Ou saisir librement un examen non réalisé à la clinique (non facturable)…"
              @keyup.enter="ajouterExamenLibre"
            />
            <button
              class="btn btn-outline btn-sm"
              :disabled="!nouvelExamenLibre || ajoutExamenEnCours"
              @click="ajouterExamenLibre"
            >
              ＋ Ajouter (libre)
            </button>
          </div>
          <div v-if="detail && detail.passage.prestations.length === 0" class="text-muted small-note">
            Aucune prestation disponible pour ce service.
          </div>
          <div v-else-if="detail" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Examen</th>
                  <th>Service</th>
                  <th>État</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in detail.passage.prestations" :key="l.id">
                  <td>{{ l.libelle }}</td>
                  <td>{{ l.service?.nom || '—' }}</td>
                  <td>
                    <span v-if="l.statut === 'NON_PRESCRITE'" class="badge badge-muted">Pas prescrit</span>
                    <span v-else-if="l.statut === 'EN_ATTENTE'" class="badge badge-warning">Prescrit — à payer</span>
                    <span v-else-if="l.statut === 'EXTERNE'" class="badge badge-muted" title="Examen réalisé hors clinique — non facturable">
                      Prescrit (externe)
                    </span>
                    <span v-else class="badge badge-success">Payé</span>
                  </td>
                  <td>
                    <button
                      v-if="resultatExamen(l)"
                      class="btn btn-outline btn-sm"
                      title="Voir le résultat de l'examen"
                      @click="ouvrirResultat(l)"
                    >
                      📋 Résultat
                    </button>
                    <button
                      v-if="l.statut === 'NON_PRESCRITE' && consultation"
                      class="btn btn-outline btn-sm"
                      @click="prescrireExamen(l)"
                    >
                      ✍️ Prescrire
                    </button>
                    <button
                      v-if="(l.statut === 'EN_ATTENTE' || l.statut === 'EXTERNE') && consultation"
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

        </section>
      </div>
    </main>

    <!-- Modale : résultat d'examen (labo / imagerie) -->
    <div v-if="resultatVisible" class="modal-backdrop">
      <div class="modal">
        <h2>📋 Résultat d'examen — {{ resultatCourant?.exam.libelle }}</h2>
        <template v-if="resultatCourant?.type === 'LABO'">
          <table class="resultat-table">
            <thead>
              <tr>
                <th>Paramètre</th>
                <th>Résultat</th>
                <th>Unité</th>
                <th>Normes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(lg, i) in resultatCourant.exam.lignes" :key="i">
                <td>{{ lg.parametre || '—' }}</td>
                <td><strong>{{ lg.valeur || '—' }}</strong></td>
                <td>{{ lg.unite || '—' }}</td>
                <td>{{ lg.normes || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <p class="resultat-conclusion">
            <strong>Conclusion :</strong> {{ resultatCourant.exam.conclusion || '—' }}
          </p>
        </template>
        <template v-else-if="resultatCourant?.type === 'IMAGERIE'">
          <p><strong>Indication :</strong> {{ resultatCourant.exam.indication || '—' }}</p>
          <p><strong>Technique :</strong> {{ resultatCourant.exam.technique || '—' }}</p>
          <p><strong>Résultat :</strong> {{ resultatCourant.exam.resultat || '—' }}</p>
          <p class="resultat-conclusion">
            <strong>Conclusion :</strong> {{ resultatCourant.exam.conclusion || '—' }}
          </p>
        </template>
        <p v-if="resultatCourant?.exam.valideLe" class="text-muted small-note">
          Validé le {{ new Date(resultatCourant.exam.valideLe).toLocaleString('fr-FR') }}
          <template v-if="auteurExamen(resultatCourant.exam)"> par {{ auteurExamen(resultatCourant.exam) }}</template>
        </p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="resultatVisible = false">✖ Fermer</button>
        </div>
      </div>
    </div>

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
              <input v-model.trim="ajoutPosologie" list="liste-posologie" placeholder="Ex : 1 comprimé 3x/j" />
              <datalist id="liste-posologie">
                <option v-for="l in listesParams.POSOLOGIE" :key="l.id" :value="l.libelle" />
              </datalist>
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
            <button type="button" class="btn btn-outline" @click="ajoutVisible = false">✖ Annuler</button>
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
          <button class="btn btn-outline" @click="apercuVisible = false">✖ Fermer</button>
          <button class="btn btn-primary" @click="imprimerNavigateur">🖨️ Imprimer (A4)</button>
        </div>
      </div>
    </div>

    <!-- Aperçu flottant avant impression (fiche ou ordonnance d'examens) -->
    <div v-if="apercuFicheVisible || apercuExamensVisible" class="apercu-voile"></div>
    <div v-if="apercuFicheVisible || apercuExamensVisible" class="apercu-barre">
      <span>
        👁️ {{ apercuFicheVisible ? 'Aperçu de la fiche' : 'Aperçu de l\'ordonnance d\'examens' }} — vérifiez avant
        d'imprimer
      </span>
      <div class="apercu-barre-actions">
        <button class="btn btn-primary btn-sm" @click="imprimerFiche">🖨️ Imprimer</button>
        <button
          class="btn btn-outline btn-sm btn-back"
          @click="apercuFicheVisible = false; apercuExamensVisible = false"
        >
          Fermer
        </button>
      </div>
    </div>

    <!-- Fiche de consultation imprimable (A4, format papier) -->
    <div
      v-if="passageCourant"
      id="fiche-print"
      :class="{ 'apercu-flottant': apercuFicheVisible, 'masque-impression': apercuExamensVisible }"
    >
      <div class="fiche-a4">
        <div class="fiche-a4-head">
          <h1>{{ cliniqueNom }}</h1>
          <p v-if="cliniqueAdresse">{{ cliniqueAdresse }}</p>
        </div>
        <h2 class="fiche-a4-titre">FICHE DE CONSULTATION CURATIVE</h2>

        <!-- Données administratives -->
        <h2 class="fiche-a4-section">Données administratives</h2>
        <p class="fiche-a4-ligne">Numéro d'ordre : <strong>{{ passageCourant.numeroOrdre }}</strong></p>
        <p class="fiche-a4-ligne">
          Mode d'entrée :
          {{ caseCoche(formConsult.modeEntree === 'VENUE_DIRECTE') }} Venue du même &nbsp;&nbsp;
          {{ caseCoche(formConsult.modeEntree === 'REFERE_CENTRE') }} Référée d'un centre de santé<br />
          {{ caseCoche(formConsult.modeEntree === 'AUTRE') }} Autre : {{ formConsult.modeEntreeAutre }} &nbsp;&nbsp;
          {{ caseCoche(formConsult.modeEntree === 'REFERE_MEDECIN') }} Référée par un médecin/praticien
        </p>
        <p class="fiche-a4-ligne">
          Nom : <strong>{{ passageCourant.patient.nom }}</strong> &nbsp;&nbsp;&nbsp;
          Prénoms : <strong>{{ passageCourant.patient.prenom }}</strong>
        </p>
        <p class="fiche-a4-ligne">
          Profession : {{ formConsult.profession }} &nbsp;&nbsp;&nbsp;
          Nationalité : {{ formConsult.nationalite }}
        </p>
        <p class="fiche-a4-ligne">
          Âge : <strong>{{ passageCourant.patient.age }} ans</strong> &nbsp;&nbsp;&nbsp;
          Tranche d'âge :
          <span v-for="t in TRANCHES_AGE" :key="t">{{ caseCoche(trancheAge === t) }} {{ t }} &nbsp;</span>
        </p>
        <p class="fiche-a4-ligne">
          Sexe :
          {{ caseCoche(passageCourant.patient.sexe === 'F') }} Féminin &nbsp;&nbsp;
          {{ caseCoche(passageCourant.patient.sexe === 'M') }} Masculin
        </p>
        <p class="fiche-a4-ligne">
          En cours de scolarisation :
          <span v-for="o in OUI_NON_NA" :key="o">{{ caseCoche(formConsult.scolarisation === o) }} {{ o }} &nbsp;</span>
        </p>
        <p class="fiche-a4-ligne">Résidence habituelle : {{ formConsult.residenceHabituelle }}</p>
        <p class="fiche-a4-ligne">Résidence actuelle : {{ formConsult.residenceActuelle }}</p>
        <p class="fiche-a4-ligne">
          Statut conjugal :
          <span v-for="o in STATUTS_CONJUGAUX" :key="o">{{ caseCoche(formConsult.statutConjugal === o) }} {{ o }} &nbsp;</span>
        </p>
        <p class="fiche-a4-ligne">
          Type de population :
          <span v-for="o in TYPES_POPULATION" :key="o">{{ caseCoche(formConsult.typePopulation === o) }} {{ o }} &nbsp;</span>
        </p>
        <p class="fiche-a4-ligne">Autres populations à haut risque : {{ formConsult.populationsRisque }}</p>
        <p class="fiche-a4-ligne">Contacts téléphoniques : {{ formConsult.telephone }}</p>
        <p class="fiche-a4-ligne">
          Protection sociale :
          <span v-for="o in PROTECTIONS_SOCIALES" :key="o">{{ caseCoche(formConsult.protectionSociale === o) }} {{ o }} &nbsp;</span>
        </p>

        <!-- Antécédents -->
        <h2 class="fiche-a4-section">ANTÉCÉDENTS</h2>
        <p class="fiche-a4-ligne">Traitement médicamenteux antérieur / en cours : {{ formConsult.traitementAnterieur }}</p>
        <p class="fiche-a4-ligne">
          Médicaux : HTA : {{ caseCoche(formConsult.hta === true) }} Oui {{ caseCoche(formConsult.hta === false) }} Non &nbsp;&nbsp;
          DIABÈTE : {{ caseCoche(formConsult.diabete === true) }} Oui {{ caseCoche(formConsult.diabete === false) }} Non<br />
          Autres : {{ formConsult.antecedentsMedicaux }}
        </p>
        <p class="fiche-a4-ligne">Chirurgicaux : {{ formConsult.antecedentsChirurgicaux }}</p>
        <p class="fiche-a4-ligne">Gynéco-obstétricaux : DDR : {{ formConsult.ddr }} &nbsp;&nbsp;
          Grossesse en cours : {{ caseCoche(formConsult.grossesseEnCours === true) }} Oui {{ caseCoche(formConsult.grossesseEnCours === false) }} Non</p>
        <p class="fiche-a4-ligne">
          Modes de vie : Tabac : {{ caseCoche(formConsult.tabac === true) }} Oui {{ caseCoche(formConsult.tabac === false) }} Non &nbsp;&nbsp;
          Alcool : {{ caseCoche(formConsult.alcool === true) }} Oui {{ caseCoche(formConsult.alcool === false) }} Non
        </p>
        <p class="fiche-a4-ligne">Type de suivi : {{ formConsult.typeSuivi }} &nbsp;&nbsp; Consultant : {{ formConsult.consultantType }}</p>

        <!-- Examen clinique -->
        <h2 class="fiche-a4-section">Examen clinique et constantes physiques du patient</h2>
        <p class="fiche-a4-ligne">Motifs de consultation : {{ formConsult.motif }}</p>
        <p class="fiche-a4-ligne">
          Constantes physiques : Poids : {{ formConsult.poids }} kg &nbsp; Taille : {{ formConsult.taille }} m &nbsp;
          IMC : {{ formConsult.imc }} kg/m² &nbsp; Z-score : {{ formConsult.zscore }}<br />
          Température : {{ formConsult.temperature }} °C &nbsp; Fréquence respiratoire : {{ formConsult.frequenceRespiratoire }} cycles/min<br />
          TA : {{ formConsult.tension }} mmHg &nbsp; Pouls : {{ formConsult.pouls }} batt/min<br />
          Périmètre brachial : {{ formConsult.perimetreBrachial }} cm &nbsp; Périmètre crânien : {{ formConsult.perimetreCranien }} cm
        </p>
        <p class="fiche-a4-ligne">
          Recherche active de la tuberculose :
          <span v-for="o in OUI_NON_NA" :key="o">{{ caseCoche(formConsult.rechercheTB === o) }} {{ o }} &nbsp;</span>
        </p>
        <p class="fiche-a4-ligne">Examen physique : {{ formConsult.observation }}</p>
        <p class="fiche-a4-ligne">Diagnostic retenu : <strong>{{ formConsult.diagnostic }}</strong></p>
        <p class="fiche-a4-ligne">Autres pathologies associées : {{ formConsult.pathologiesAssociees }}</p>

        <h2 class="fiche-a4-section">Examens complémentaires</h2>
        <p class="fiche-a4-ligne">
          TDR Paludisme : {{ caseCoche(formConsult.tdrPaludisme === 'positif') }} positif
          {{ caseCoche(formConsult.tdrPaludisme === 'négatif') }} Négatif
          {{ caseCoche(formConsult.tdrPaludisme === 'non réalisé') }} Non réalisé
          {{ caseCoche(formConsult.tdrPaludisme === 'NA') }} NA<br />
          Goutte épaisse : {{ caseCoche(formConsult.goutteEpaisse === 'positive') }} positive
          {{ caseCoche(formConsult.goutteEpaisse === 'négative') }} Négative
          {{ caseCoche(formConsult.goutteEpaisse === 'non réalisée') }} Non réalisée
          {{ caseCoche(formConsult.goutteEpaisse === 'NA') }} NA
        </p>
        <p class="fiche-a4-ligne">
          MILDA Enfant de 12 à 59 mois : Éligible :
          <span v-for="o in OUI_NON_NA" :key="o">{{ caseCoche(formConsult.mildaEligible === o) }} {{ o }} &nbsp;</span>
          &nbsp; Remise :
          <span v-for="o in OUI_NON_NA" :key="o">{{ caseCoche(formConsult.mildaRemise === o) }} {{ o }} &nbsp;</span>
        </p>
        <p class="fiche-a4-ligne">
          CDIP proposé : {{ caseCoche(formConsult.cdipPropose === true) }} Oui {{ caseCoche(formConsult.cdipPropose === false) }} Non &nbsp;&nbsp;
          CDIP réalisé : {{ caseCoche(formConsult.cdipRealise === true) }} Oui {{ caseCoche(formConsult.cdipRealise === false) }} Non
        </p>
        <p class="fiche-a4-ligne">Code dépistage client : {{ formConsult.codeDepistage }}</p>
        <p class="fiche-a4-ligne">Glycémie : à jeun {{ formConsult.glycemieAjeun }} / non à jeun {{ formConsult.glycemieNonAjeun }}</p>
        <p class="fiche-a4-ligne">Autres examens : {{ formConsult.autresExamens }}</p>

        <!-- Conduite à tenir -->
        <h2 class="fiche-a4-section">CONDUITE À TENIR — TRAITEMENT</h2>
        <p class="fiche-a4-ligne">Médicaments, posologie, voie d'administration, durée ; conseils hygiéno-diététiques :</p>
        <p class="fiche-a4-texte">{{ textePrescriptions || '—' }}</p>

        <!-- Issue -->
        <h2 class="fiche-a4-section">Issue de la consultation</h2>
        <p class="fiche-a4-ligne">
          Sortie :
          <span v-for="o in ISSUES_SORTIE" :key="o.value">{{ caseCoche(formConsult.issueSortie === o.value) }} {{ o.label }} &nbsp;</span>
        </p>
        <p class="fiche-a4-ligne">
          Cas présumé de TB référé :
          {{ caseCoche(formConsult.casPresumeTB === 'A_REVOIR') }} À revoir &nbsp;&nbsp;
          {{ caseCoche(formConsult.casPresumeTB === 'DECEDE') }} Décédé(e)
        </p>
        <p class="fiche-a4-ligne" v-if="formConsult.issueSortie === 'MO'">
          Si M.O. préciser la durée : {{ formConsult.moDureeHeures }} h {{ formConsult.moDureeMinutes }} mn<br />
          Date et heure de début M.O. : {{ formConsult.moDebut }} &nbsp;&nbsp;
          Date et heure de fin M.O. : {{ formConsult.moFin }}
        </p>

        <!-- Signature et cachet -->
        <div class="fiche-a4-sign">
          <div class="fiche-a4-sign-date">
            Fait le {{ formatDate(new Date()) }}
          </div>
          <div class="fiche-a4-sign-doc">
            <p>Le médecin : Dr {{ auth.user?.personnel?.nom }} {{ auth.user?.personnel?.prenom }}</p>
            <div class="fiche-a4-cachet">
              Signature et cachet
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ordonnance d'examens imprimable (A4, navigateur) -->
    <div v-if="apercuExamensVisible && detail" id="ordo-examens-print" class="apercu-flottant">
      <div class="ordo-ex-a4">
        <div class="fiche-a4-head">
          <h1>{{ cliniqueNom }}</h1>
          <p v-if="cliniqueAdresse">{{ cliniqueAdresse }}</p>
        </div>
        <div class="fiche-a4-titre">Ordonnance d'examens</div>

        <div class="ordo-ex-infos">
          <div class="fiche-a4-ligne">
            <span class="ordo-ex-label">Patient</span>
            <span>
              <strong>{{ detail.passage.patient.nom }} {{ detail.passage.patient.prenom }}</strong>
              ({{ detail.passage.patient.age ?? '—' }} ans, {{ detail.passage.patient.sexe ?? '—' }})
            </span>
          </div>
          <div class="fiche-a4-ligne">
            <span class="ordo-ex-label">Code patient</span>
            <span>{{ detail.passage.patient.code }}</span>
          </div>
          <div class="fiche-a4-ligne">
            <span class="ordo-ex-label">N° d'ordre</span>
            <span>{{ detail.passage.numeroOrdre }}</span>
          </div>
          <div class="fiche-a4-ligne">
            <span class="ordo-ex-label">Médecin</span>
            <span>Dr {{ auth.user?.personnel?.nom }} {{ auth.user?.personnel?.prenom }}</span>
          </div>
        </div>

        <table class="ordo-ex-table">
          <thead>
            <tr>
              <th>Examen</th>
              <th>Service</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in examensPrescrits" :key="l.id">
              <td>{{ l.libelle }}</td>
              <td>{{ l.service?.nom || '—' }}</td>
              <td>
                <span v-if="estFait(l)" class="ordo-ex-fait">✓ Déjà fait</span>
                <span v-else class="ordo-ex-reste">● Reste à faire</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="ordo-ex-sign">
          <div class="ordo-ex-sign-date">Fait le {{ formatDate(new Date()) }}</div>
          <div class="ordo-ex-sign-doc">
            <p>Le médecin : Dr {{ auth.user?.personnel?.nom }} {{ auth.user?.personnel?.prenom }}</p>
            <div class="fiche-a4-cachet">Signature et cachet</div>
          </div>
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

// ── File d'attente des médecins (affectation automatique) ──
const estMedecin = computed(() => auth.user?.role?.code === 'MEDECIN')
const disponibilite = ref('INDISPONIBLE')
const file = ref({ enAttente: [], terminees: [] })
const vueFile = ref('attente')
let affectationOuverteId = ref(null)
let pingTimer = null
const filtreJourFile = ref(new Date().toISOString().slice(0, 10))

async function chargerFile() {
  if (!estMedecin.value) return
  try {
    const { data } = await http.get('/consultations/moi', {
      params: { jour: filtreJourFile.value || undefined },
    })
    disponibilite.value = data.disponibilite
    file.value = { enAttente: data.enAttente ?? [], terminees: data.terminees ?? [] }
  } catch {
    /* file vide */
  }
}

async function basculerDisponibilite() {
  const cible = disponibilite.value === 'DISPONIBLE' ? 'INDISPONIBLE' : 'DISPONIBLE'
  try {
    const { data } = await http.put('/consultations/disponibilite', { disponibilite: cible })
    disponibilite.value = data.disponibilite
    toastSuccess(cible === 'DISPONIBLE' ? 'Vous êtes disponible — les patients non affectés vous sont redistribués.' : 'Vous êtes indisponible.')
    await chargerFile()
  } catch (e) {
    toastError(e.response?.data?.message || 'Changement de disponibilité impossible.')
  }
}

async function consulterAffectation(a) {
  try {
    await http.post(`/consultations/affectations/${a.id}/ouvrir`)
    affectationOuverteId.value = a.id
  } catch {
    /* l'ouverture est tolérante */
  }
  passageCourant.value = {
    id: a.passage.id,
    numeroOrdre: a.passage.numeroOrdre,
    statut: a.passage.statut,
    patient: a.passage.patient,
    service: a.passage.service,
    consultable: true,
  }
  resultats.value = []
  await chargerDetail()
}

/** Rouvre le dossier d'une consultation terminée (prescriptions encore possibles). */
async function ouvrirTerminee(a) {
  affectationOuverteId.value = null // déjà TERMINE : rien à refermer
  passageCourant.value = {
    id: a.passage.id,
    numeroOrdre: a.passage.numeroOrdre,
    statut: 'ACTIF',
    patient: a.passage.patient,
    service: a.passage.service,
    consultable: true,
  }
  resultats.value = []
  await chargerDetail()
}

// Onglets de la consultation
const onglet = ref('fiche') // fiche | medicaments | examens

// Formulaire consultation (fiche curative)
const formConsult = reactive({})
const savingConsult = ref(false)

const OUI_NON_NA = ['Oui', 'Non', 'NA']
const STATUTS_CONJUGAUX = ['Marié(e)', 'Concubinage', 'Célibataire', 'Séparé(e)', 'Veuf/Veuve', 'Autre']
const TYPES_POPULATION = ['Population générale', 'TS', 'OEV', 'HSH', 'PC']
const PROTECTIONS_SOCIALES = ['Non assuré', 'CMU', 'Assurance privée (AP)', 'CMU + AP', 'Indigent']
const ISSUES_SORTIE = [
  { value: 'HOSPITALISE', label: 'Hospitalisé(e)' },
  { value: 'MO', label: 'M.O.' },
  { value: 'REFERE_INTERNE', label: 'Référé(e) en interne' },
  { value: 'REFERE_EXTERNE', label: 'Référé(e) externe' },
]

const TRANCHES_AGE = ['0–4 ans', '5–9 ans', '10–14 ans', '15–19 ans', '20–24 ans', '25–49 ans', '50 ans et plus']

/** IMC calculé automatiquement (poids / taille²) — champ grisé de la fiche. */
const imcCalcule = computed(() => {
  const poids = Number(formConsult.poids)
  const taille = Number(formConsult.taille)
  if (!poids || !taille) return ''
  return (poids / (taille * taille)).toFixed(1)
})

/** Texte des prescriptions pour l'impression de la fiche (conduite à tenir). */
const textePrescriptions = computed(() =>
  (consultation.value?.medicaments ?? [])
    .map((m) => `${m.medicamentNom} — ${[m.posologie, m.quantite, m.duree].filter(Boolean).join(' · ') || '—'}`)
    .join(' ; '),
)

// ── Prescription intégrée à la fiche (en plus de l'onglet Médicaments) ──
const ficheMedId = ref(null)
const ficheMedNom = ref('')
const ficheMedPoso = ref('')
const ficheMedQte = ref('')
const ficheMedDuree = ref('')
const ficheMedEnCours = ref(false)
const ficheMedError = ref('')

async function ajouterMedicamentFiche() {
  if (!consultation.value) return
  if (!ficheMedId.value && !ficheMedNom.value.trim()) {
    ficheMedError.value = 'Choisissez un médicament du catalogue ou saisissez un nom.'
    return
  }
  ficheMedEnCours.value = true
  ficheMedError.value = ''
  try {
    await http.post(`/consultations/${consultation.value.id}/medicaments`, {
      medicamentId: ficheMedId.value ?? undefined,
      nom: ficheMedNom.value.trim() || undefined,
      posologie: ficheMedPoso.value || undefined,
      quantite: ficheMedQte.value || undefined,
      duree: ficheMedDuree.value || undefined,
    })
    alimenterListe('POSOLOGIE', ficheMedPoso.value)
    ficheMedId.value = null
    ficheMedNom.value = ''
    ficheMedPoso.value = ''
    ficheMedQte.value = ''
    ficheMedDuree.value = ''
    toastSuccess('Médicament ajouté à la prescription.')
    await chargerDetail()
  } catch (e) {
    ficheMedError.value = e.response?.data?.message || 'Ajout impossible.'
  } finally {
    ficheMedEnCours.value = false
  }
}

// ── Listes paramétrées (datalists + saisie libre auto-alimentée) ──
// Chaque liste a sa table dédiée et son endpoint dédié.
const ROUTES_LISTES = {
  NATIONALITE: '/nationalites',
  RESIDENCE: '/residences',
  DIAGNOSTIC: '/diagnostics',
  PATHOLOGIE: '/pathologies',
  POSOLOGIE: '/posologies',
}

const listesParams = reactive({
  NATIONALITE: [],
  RESIDENCE: [],
  DIAGNOSTIC: [],
  PATHOLOGIE: [],
  POSOLOGIE: [],
})

async function chargerListesParams(cliniqueId) {
  if (!cliniqueId) return
  try {
    const codes = Object.keys(listesParams)
    const reponses = await Promise.all(
      codes.map((code) =>
        http.get(ROUTES_LISTES[code], { params: { cliniqueId } }),
      ),
    )
    codes.forEach((code, i) => {
      listesParams[code] = reponses[i].data ?? []
    })
  } catch {
    /* listes vides */
  }
}

/** Ajoute silencieusement une valeur saisie librement à sa liste dédiée. */
async function alimenterListe(code, libelle) {
  if (!libelle?.trim() || !auth.user?.clinique?.id || !ROUTES_LISTES[code]) return
  try {
    await http.post(ROUTES_LISTES[code], {
      cliniqueId: auth.user.clinique.id,
      libelle: libelle.trim(),
    })
    await chargerListesParams(auth.user.clinique.id)
  } catch {
    /* facultatif */
  }
}

const trancheAge = computed(() => {
  const age = Number(passageCourant.value?.patient?.age)
  if (!age) return '—'
  if (age <= 4) return '0–4 ans'
  if (age <= 9) return '5–9 ans'
  if (age <= 14) return '10–14 ans'
  if (age <= 19) return '15–19 ans'
  if (age <= 24) return '20–24 ans'
  if (age <= 49) return '25–49 ans'
  return '50 ans et plus'
})

/** Case cochée ☑ ou vide ☐ pour la fiche imprimée. */
function caseCoche(valeur) {
  return valeur ? '☑' : '☐'
}

function imprimerFiche() {
  window.print()
}

// Aperçu de la fiche (flottant) avant impression
const apercuFicheVisible = ref(false)

// Aperçu de l'ordonnance d'examens (A4 flottant)
const apercuExamensVisible = ref(false)

/** Examens prescrits (ordonnance d'examens) : tout sauf « pas prescrit »/annulée. */
const examensPrescrits = computed(() =>
  (detail.value?.passage.prestations ?? []).filter(
    (l) => l.statut !== 'NON_PRESCRITE' && l.statut !== 'ANNULEE',
  ),
)

/** Un examen est « déjà fait » si le service concerné l'a validé (labo ou imagerie). */
function estFait(l) {
  const labo = (detail.value?.passage.examensLabo ?? []).find(
    (e) => e.passagePrestationId === l.id,
  )
  const imagerie = (detail.value?.passage.examensImagerie ?? []).find(
    (e) => e.passagePrestationId === l.id,
  )
  return labo?.statut === 'VALIDE' || imagerie?.statut === 'VALIDE'
}

// ── Résultats des examens (visibles par le médecin) ──
const resultatVisible = ref(false)
const resultatCourant = ref(null) // { type: 'LABO' | 'IMAGERIE', exam }

/** Retourne l'examen réalisé (avec résultats) pour une ligne de prestation. */
function resultatExamen(l) {
  const labo = (detail.value?.passage.examensLabo ?? []).find(
    (e) => e.passagePrestationId === l.id,
  )
  if (labo && (labo.statut === 'VALIDE' || labo.statut === 'RESULTATS')) {
    return { type: 'LABO', exam: labo }
  }
  const imagerie = (detail.value?.passage.examensImagerie ?? []).find(
    (e) => e.passagePrestationId === l.id,
  )
  if (imagerie && (imagerie.statut === 'VALIDE' || imagerie.statut === 'RESULTATS')) {
    return { type: 'IMAGERIE', exam: imagerie }
  }
  return null
}

function ouvrirResultat(l) {
  resultatCourant.value = resultatExamen(l)
  if (resultatCourant.value) resultatVisible.value = true
}

function auteurExamen(exam) {
  const v = exam.validePar
  if (!v) return ''
  return `${v.personnel?.prenom ?? ''} ${v.personnel?.nom ?? ''}`.trim()
}

/** Bouton Enregistrer : enregistre la fiche et valide la consultation (sans aperçu). */
async function validerEtEnregistrer() {
  if (!passageCourant.value) return
  // 1. Enregistrer la fiche
  await sauvegarderFiche()
  if (!consultation.value) return
  // 2. Valider la consultation (si ce n'est pas déjà fait)
  if (consultation.value.statut !== 'VALIDEE') {
    try {
      await http.post(`/consultations/${consultation.value.id}/valider`)
      toastSuccess('Consultation validée.')
      affectationOuverteId.value = null // l'affectation passe TERMINE
      await chargerDetail()
      chargerFile()
    } catch (e) {
      toastError(e.response?.data?.message || 'Erreur lors de la validation.')
    }
  }
}

/** Bouton Imprimer : ouvre l'aperçu de la fiche pour tirer l'impression. */
function imprimerFicheApercu() {
  apercuFicheVisible.value = true
}

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
  affectationOuverteId.value = null
  onglet.value = 'fiche'
  await chargerDetail()
}

function quitterPatient() {
  // Refermer l'affectation si le dossier est quitté sans validation
  if (affectationOuverteId.value) {
    http
      .post(`/consultations/affectations/${affectationOuverteId.value}/fermer`)
      .catch(() => {})
    affectationOuverteId.value = null
  }
  passageCourant.value = null
  detail.value = null
  consultation.value = null
  ordonnance.value = null
  apercuFicheVisible.value = false
  Object.keys(formConsult).forEach((k) => delete formConsult[k])
  chargerFile()
}

async function chargerDetail() {
  if (!passageCourant.value) return
  try {
    const { data } = await http.get(`/consultations/passages/${passageCourant.value.id}`)
    detail.value = data
    consultation.value = data.passage.consultation
    const c = data.passage.consultation ?? {}
    const pat = data.passage.patient ?? {}
    // Listes paramétrées pour les datalists (diagnostic, pathologies, posologie…)
    chargerListesParams(auth.user?.clinique?.id)
    const cons = data.passage.constantes ?? {}
    Object.keys(formConsult).forEach((k) => delete formConsult[k])
    Object.assign(formConsult, {
      // Fiche (déjà saisie ou vide)
      motif: c.motif ?? '',
      observation: c.observation ?? '',
      diagnostic: c.diagnostic ?? '',
      hospitalisation: c.hospitalisation ?? false,
      hospitalisationDuree: c.hospitalisationDuree ?? '',
      typeHospitalisation: c.typeHospitalisation ?? '',
      hospitalisationDureeJours: c.hospitalisationDureeJours ?? null,
      litId: c.litId ?? null,
      modeEntree: c.modeEntree ?? '',
      modeEntreeAutre: c.modeEntreeAutre ?? '',
      traitementAnterieur: c.traitementAnterieur ?? '',
      hta: c.hta ?? null,
      diabete: c.diabete ?? null,
      antecedentsMedicaux: c.antecedentsMedicaux ?? '',
      antecedentsChirurgicaux: c.antecedentsChirurgicaux ?? '',
      ddr: c.ddr ?? '',
      grossesseEnCours: c.grossesseEnCours ?? null,
      tabac: c.tabac ?? null,
      alcool: c.alcool ?? null,
      typeSuivi: c.typeSuivi ?? '',
      consultantType: c.consultantType ?? '',
      imc: c.imc ?? '',
      zscore: c.zscore ?? '',
      frequenceRespiratoire: c.frequenceRespiratoire ?? '',
      perimetreBrachial: c.perimetreBrachial ?? '',
      perimetreCranien: c.perimetreCranien ?? '',
      rechercheTB: c.rechercheTB ?? '',
      pathologiesAssociees: c.pathologiesAssociees ?? '',
      tdrPaludisme: c.tdrPaludisme ?? '',
      goutteEpaisse: c.goutteEpaisse ?? '',
      mildaEligible: c.mildaEligible ?? '',
      mildaRemise: c.mildaRemise ?? '',
      cdipPropose: c.cdipPropose ?? null,
      cdipRealise: c.cdipRealise ?? null,
      codeDepistage: c.codeDepistage ?? '',
      glycemieAjeun: c.glycemieAjeun ?? '',
      glycemieNonAjeun: c.glycemieNonAjeun ?? '',
      autresExamens: c.autresExamens ?? '',
      conduiteTenir: c.conduiteTenir ?? '',
      issueSortie: c.issueSortie ?? '',
      casPresumeTB: c.casPresumeTB ?? '',
      moDureeHeures: c.moDureeHeures ?? null,
      moDureeMinutes: c.moDureeMinutes ?? null,
      moDebut: c.moDebut ? new Date(c.moDebut).toISOString().slice(0, 16) : '',
      moFin: c.moFin ? new Date(c.moFin).toISOString().slice(0, 16) : '',
      // Données administratives → fiche patient
      profession: pat.profession ?? '',
      nationalite: pat.nationalite ?? '',
      scolarisation: pat.scolarisation ?? '',
      statutConjugal: pat.statutConjugal ?? '',
      typePopulation: pat.typePopulation ?? '',
      populationsRisque: pat.populationsRisque ?? '',
      protectionSociale: pat.protectionSociale ?? '',
      residenceHabituelle: pat.residenceHabituelle ?? '',
      residenceActuelle: pat.residenceActuelle ?? '',
      telephone: pat.telephone ?? '',
      // Constantes de l'accueil (modifiables)
      poids: cons.poids ?? '',
      taille: cons.taille ?? '',
      temperature: cons.temperature ?? '',
      pouls: cons.pouls ?? '',
      tension: cons.tensionGauche
        ? `${cons.tensionGauche}${cons.tensionDroite ? ' / ' + cons.tensionDroite : ''}`
        : '',
    })
  } catch (e) {
    toastError('Impossible de charger le passage.')
  }
}

async function sauvegarderFiche() {
  if (!passageCourant.value) return
  savingConsult.value = true
  try {
    const f = formConsult
    const vider = (x) => (x === '' || x === null ? undefined : x)
    const payload = {
      motif: vider(f.motif),
      observation: vider(f.observation),
      diagnostic: vider(f.diagnostic),
      hospitalisation: f.hospitalisation,
      hospitalisationDuree: vider(f.hospitalisationDuree),
      typeHospitalisation: vider(f.typeHospitalisation),
      hospitalisationDureeJours: f.hospitalisationDureeJours ?? undefined,
      litId: f.litId ?? undefined,
      modeEntree: vider(f.modeEntree),
      modeEntreeAutre: vider(f.modeEntreeAutre),
      traitementAnterieur: vider(f.traitementAnterieur),
      hta: f.hta,
      diabete: f.diabete,
      antecedentsMedicaux: vider(f.antecedentsMedicaux),
      antecedentsChirurgicaux: vider(f.antecedentsChirurgicaux),
      ddr: vider(f.ddr),
      grossesseEnCours: f.grossesseEnCours,
      tabac: f.tabac,
      alcool: f.alcool,
      typeSuivi: vider(f.typeSuivi),
      consultantType: vider(f.consultantType),
      imc: imcCalcule.value || undefined,
      zscore: vider(f.zscore),
      frequenceRespiratoire: vider(f.frequenceRespiratoire),
      perimetreBrachial: vider(f.perimetreBrachial),
      perimetreCranien: vider(f.perimetreCranien),
      rechercheTB: vider(f.rechercheTB),
      pathologiesAssociees: vider(f.pathologiesAssociees),
      tdrPaludisme: vider(f.tdrPaludisme),
      goutteEpaisse: vider(f.goutteEpaisse),
      mildaEligible: vider(f.mildaEligible),
      mildaRemise: vider(f.mildaRemise),
      cdipPropose: f.cdipPropose,
      cdipRealise: f.cdipRealise,
      codeDepistage: vider(f.codeDepistage),
      glycemieAjeun: vider(f.glycemieAjeun),
      glycemieNonAjeun: vider(f.glycemieNonAjeun),
      autresExamens: vider(f.autresExamens),
      conduiteTenir: vider(f.conduiteTenir) || textePrescriptions.value || undefined,
      issueSortie: vider(f.issueSortie),
      casPresumeTB: vider(f.casPresumeTB),
      moDureeHeures: f.moDureeHeures,
      moDureeMinutes: f.moDureeMinutes,
      moDebut: vider(f.moDebut),
      moFin: vider(f.moFin),
      // Données administratives → fiche patient
      patient: {
        profession: vider(f.profession),
        nationalite: vider(f.nationalite),
        scolarisation: vider(f.scolarisation),
        statutConjugal: vider(f.statutConjugal),
        typePopulation: vider(f.typePopulation),
        populationsRisque: vider(f.populationsRisque),
        protectionSociale: vider(f.protectionSociale),
        residenceHabituelle: vider(f.residenceHabituelle),
        residenceActuelle: vider(f.residenceActuelle),
      },
    }
    const { data } = await http.post(`/consultations/passages/${passageCourant.value.id}`, payload)
    consultation.value = data
    toastSuccess('Fiche de consultation enregistrée.')
    // Saisie libre auto-alimentée : les nouvelles valeurs enrichissent les listes paramétrées
    alimenterListe('DIAGNOSTIC', f.diagnostic)
    alimenterListe('PATHOLOGIE', f.pathologiesAssociees)
    alimenterListe('NATIONALITE', f.nationalite)
    alimenterListe('RESIDENCE', f.residenceActuelle)
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
    // Posologie saisie librement : ajoutée automatiquement à la liste paramétrée
    alimenterListe('POSOLOGIE', ajoutPosologie.value)
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

// ── Ajout d'un examen depuis le catalogue (labo, imagerie…) ──
const nouvelExamenId = ref(null)
const ajoutExamenEnCours = ref(false)
const prestationsCatalogue = ref([])

// ── Lits libres (prescription d'hospitalisation, §13) ──
const litsLibres = ref([])
const optionsLitsLibres = computed(() =>
  litsLibres.value.map((l) => ({
    value: l.id,
    label: l.label,
  })),
)

async function chargerLits() {
  try {
    const { data } = await http.get('/hospitalisation/lits', {
      params: { cliniqueId: cliniqueId.value },
    })
    litsLibres.value = (Array.isArray(data) ? data : []).filter((l) => l.actif && !l.occupe)
  } catch {
    litsLibres.value = []
  }
}

/** Examens du catalogue proposés au médecin : actifs, hors consultation, pas déjà sur le passage. */
const optionsExamensCatalogue = computed(() => {
  const deja = new Set(
    (detail.value?.passage.prestations ?? [])
      .map((l) => l.prestationId)
      .filter(Boolean),
  )
  return prestationsCatalogue.value
    .filter((p) => p.actif && p.type !== 'CONSULTATION' && !deja.has(p.id))
    .map((p) => ({ value: p.id, label: p.libelle }))
})

async function chargerPrestations() {
  try {
    const { data } = await http.get('/prestations', {
      params: { perPage: 0, cliniqueId: cliniqueId.value },
    })
    prestationsCatalogue.value = Array.isArray(data) ? data : data.data ?? []
  } catch {
    // catalogue optionnel
  }
}

async function ajouterExamen() {
  if (!nouvelExamenId.value || !consultation.value) return
  ajoutExamenEnCours.value = true
  try {
    await http.post(`/consultations/${consultation.value.id}/examens/ajouter`, {
      prestationId: nouvelExamenId.value,
    })
    toastSuccess('Examen ajouté à la prescription — payable à la caisse.')
    nouvelExamenId.value = null
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || "Impossible d'ajouter l'examen.")
  } finally {
    ajoutExamenEnCours.value = false
  }
}

// Saisie libre : examen non réalisé dans la clinique (non facturable)
const nouvelExamenLibre = ref('')

async function ajouterExamenLibre() {
  const libelle = nouvelExamenLibre.value.trim()
  if (!libelle || !consultation.value) return
  ajoutExamenEnCours.value = true
  try {
    await http.post(`/consultations/${consultation.value.id}/examens/ajouter`, {
      libelle,
    })
    toastSuccess('Examen externe ajouté à la prescription (non facturable).')
    nouvelExamenLibre.value = ''
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || "Impossible d'ajouter l'examen.")
  } finally {
    ajoutExamenEnCours.value = false
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
  chargerPrestations()
  chargerLits()
  chargerFile()
  // Signal de vie du poste : un médecin DISPONIBLE sans heartbeat est considéré
  // « poste éteint » et ne reçoit plus de patients (seuil : 2 minutes).
  if (estMedecin.value) {
    pingTimer = setInterval(() => {
      http.post('/consultations/ping').catch(() => {})
    }, 60000)
    http.post('/consultations/ping').catch(() => {})
  }
  try {
    const { data } = await http.get('/cliniques')
    cliniqueAdresse.value =
      data.find((x) => x.id === cliniqueId.value)?.adresse ?? ''
  } catch {
    // adresse vide si l'API ne répond pas
  }
})
onUnmounted(() => {
  clearTimeout(rechercheTimer)
  clearInterval(pingTimer)
})
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
  max-width: none;
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

.consultation-tabs {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tabs-nav {
  display: flex;
  gap: 6px;
  border-bottom: 2px solid #d5eee9;
  flex-wrap: wrap;
}
.tab-btn {
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  color: #5f857f;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.tab-btn:hover {
  color: #0f766e;
}
.tab-btn.active {
  color: #0f766e;
  border-bottom-color: #0d9488;
}

/* Bascule disponibilité du médecin */
.dispo-btn {
  border-radius: 999px;
  font-weight: 800;
  padding: 8px 16px;
  border: 1.5px solid;
}
.dispo-on {
  background: #dcfce7;
  color: #166534;
  border-color: #86efac;
}
.dispo-off {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
}

/* Badge compteur de la file d'attente */
.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  margin-left: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}
.tab-count-actif {
  background: #0d9488;
  color: #ffffff;
}

/* Ancien layout deux colonnes (conservé, non utilisé) */
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

/* Ajout d'un examen depuis le catalogue */
.ajout-examen {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.ajout-examen-select {
  flex: 1;
  min-width: 280px;
}

/* Cases à cocher façon fiche papier */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  background: #fbfefd;
  border: 1.5px solid #c9ece5;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  user-select: none;
}
.chip:hover {
  border-color: #8bc34a;
}
.chip.actif {
  background: #d9f2e8;
  border-color: #0f766e;
  color: #0f5f59;
}
.chip input {
  display: none;
}
.mt-6 {
  margin-top: 6px;
}
.fiche-constantes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px 12px;
  background: #f8fdfb;
  border: 1px solid #d5eee9;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}
.constante-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.constante-item input {
  padding: 7px 10px;
  border: 1px solid #d7e9e6;
  border-radius: 8px;
  font-size: 13.5px;
  font-family: inherit;
  background: #fff;
}
.constante-item input:focus {
  outline: none;
  border-color: #8bc34a;
  box-shadow: 0 0 0 3px rgba(139, 195, 74, 0.15);
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

/* ---------- Fiche de consultation imprimable (format papier) ---------- */
@media screen {
  #fiche-print {
    position: fixed;
    left: -10000px;
    top: 0;
  }
  /* Aperçu avant impression : la fiche flotte au-dessus de la page */
  #fiche-print.apercu-flottant {
    left: 50% !important;
    transform: translateX(-50%);
    top: 62px;
    z-index: 150;
    max-height: calc(100vh - 82px);
    overflow-y: auto;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
  }
  /* Ordonnance d'examens : flottante quand son aperçu est ouvert */
  #ordo-examens-print {
    position: fixed;
    left: 50% !important;
    transform: translateX(-50%);
    top: 62px;
    z-index: 150;
    max-height: calc(100vh - 82px);
    overflow-y: auto;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
  }
}
/* Pendant l'aperçu de l'ordonnance d'examens, la fiche ne doit pas s'imprimer */
@media print {
  .masque-impression {
    display: none !important;
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

/* ---------- Ordonnance d'examens (A4) ---------- */
.ordo-ex-a4 {
  width: 210mm;
  max-width: 100%;
  margin: 0 auto;
  background: #fff;
  padding: 10mm 12mm;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #111;
  font-size: 12px;
  line-height: 1.5;
}
.ordo-ex-infos {
  margin-bottom: 8px;
}
.ordo-ex-infos .fiche-a4-ligne {
  display: flex;
  gap: 10px;
  margin: 3px 0;
}
.ordo-ex-label {
  font-weight: 700;
  min-width: 110px;
  flex-shrink: 0;
}
.ordo-ex-table {
  width: 100%;
  border-collapse: collapse;
  margin: 6px 0;
}
.ordo-ex-table th,
.ordo-ex-table td {
  border: 1px solid #111;
  padding: 5px 8px;
  text-align: left;
}
.ordo-ex-table th {
  background: #f1f5f9;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ordo-ex-fait {
  display: inline-block;
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
  border-radius: 999px;
  padding: 2px 10px;
  font-weight: 700;
  font-size: 11px;
}
.ordo-ex-reste {
  display: inline-block;
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
  border-radius: 999px;
  padding: 2px 10px;
  font-weight: 700;
  font-size: 11px;
}
.ordo-ex-sign {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
}
.ordo-ex-sign-date {
  font-size: 11.5px;
  align-self: center;
}
.ordo-ex-sign-doc {
  text-align: center;
  font-size: 11.5px;
}
.ordo-ex-sign-doc p {
  margin: 0 0 2px;
  font-weight: 600;
}
@media print {
  .ordo-ex-a4 {
    width: 100%;
    padding: 0;
    margin: 0;
  }
  .ordo-ex-a4 * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ordo-ex-infos,
  .ordo-ex-table,
  .ordo-ex-sign {
    page-break-inside: avoid;
  }
}
.fiche-a4 {
  width: 210mm;
  max-width: 100%;
  margin: 0 auto;
  background: #fff;
  padding: 8mm 10mm;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #111;
  font-size: 11px;
  line-height: 1.3;
}
.fiche-a4-head {
  text-align: center;
  margin-bottom: 4px;
}
.fiche-a4-head h1 {
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}
.fiche-a4-head p {
  font-size: 10.5px;
  margin: 1px 0 0;
  color: #333;
}
.fiche-a4-titre {
  text-align: center;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 6px;
  text-decoration: underline;
}
.fiche-a4-section {
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #111;
  margin: 7px 0 3px;
  padding-bottom: 1px;
}
.fiche-a4-ligne {
  margin: 1.5px 0;
}
.fiche-a4-ligne strong {
  margin-right: 2px;
}
.fiche-a4-texte {
  margin: 2px 0;
  white-space: pre-wrap;
  min-height: 12px;
}
.fiche-a4-sign {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
}
.fiche-a4-sign-date {
  font-size: 11px;
  align-self: center;
}
.fiche-a4-sign-doc {
  text-align: center;
  font-size: 11px;
}
.fiche-a4-sign-doc p {
  margin: 0 0 2px;
  font-weight: 600;
}
.fiche-a4-cachet {
  border: 1px solid #111;
  border-radius: 6px;
  width: 160px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #555;
  font-style: italic;
}
@media print {
  .fiche-a4 {
    width: 100%;
    padding: 0;
    margin: 0;
  }
  .fiche-a4-titre,
  .fiche-a4-section,
  .fiche-a4-ligne,
  .fiche-a4-sign {
    page-break-inside: avoid;
  }
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
