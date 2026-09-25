<template>
  <div class="maternite-page">
    <!-- En-tête -->
    <header class="maternite-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">🤰</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Maternité — CPN, CPON, accouchements et planification familiale</span>
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

    <main class="maternite-content">
      <!-- ============ ACCUEIL DU MODULE : 2 onglets ============ -->
      <template v-if="!passageCourant">
        <nav class="tabs-nav">
          <button
            class="tab-btn"
            :class="{ active: onglet === 'attente' }"
            @click="onglet = 'attente'; chargerFile()"
          >
            Patients en attente ({{ file.length }})
          </button>
          <button
            class="tab-btn"
            :class="{ active: onglet === 'termines' }"
            @click="onglet = 'termines'; chargerTraites()"
          >
            Patients terminés
          </button>
        </nav>

        <!-- Patients en attente -->
        <section v-if="onglet === 'attente'" class="card">
          <div class="card-header">
            <h2>Patientes à traiter — par ordre d'arrivée</h2>
            <button class="btn btn-outline btn-sm" @click="chargerFile">🔄 Actualiser</button>
          </div>
          <div class="toolbar">
            <input
              v-model="recherche"
              class="search-input"
              type="text"
              placeholder="Rechercher par code patient, nom ou N° d'ordre…"
              @input="onRecherche"
            />
          </div>

          <!-- Résultats de recherche -->
          <ul v-if="resultatsRecherche.length && recherche.trim().length >= 2" class="resultats">
            <li v-for="p in resultatsRecherche" :key="p.id">
              <div class="resultat-item">
                <div>
                  <strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong>
                  <span>{{ p.numeroOrdre }} · code {{ p.patient.code }}</span>
                  <span class="text-muted">{{ (p.actes ?? []).join(', ') }}</span>
                </div>
                <button class="btn btn-primary btn-sm" @click="ouvrirTraitement(p)">🩺 Traitement</button>
              </div>
            </li>
          </ul>
          <div
            v-if="!resultatsRecherche.length && recherche.trim().length >= 2"
            class="empty-state"
          >
            Aucune patiente trouvée avec une prestation maternité payée.
          </div>

          <div v-if="!recherche.trim()">
            <div v-if="!file.length" class="empty-state">Aucune patiente en attente.</div>
            <div v-else class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Patiente</th>
                    <th>N° d'ordre</th>
                    <th>Heure d'arrivée</th>
                    <th>Actes payés</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, i) in file" :key="p.id">
                    <td>{{ i + 1 }}</td>
                    <td><strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong></td>
                    <td>{{ p.numeroOrdre }}</td>
                    <td>{{ heure(p.createdAt) }}</td>
                    <td>{{ (p.actes ?? []).join(', ') }}</td>
                    <td>
                      <button class="btn btn-primary btn-sm" @click="ouvrirTraitement(p)">🩺 Traitement</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Patients terminés -->
        <section v-else class="card">
          <div class="card-header"><h2>Patientes traitées</h2></div>
          <div class="toolbar">
            <input v-model="jourTraites" type="date" class="search-input" style="max-width: 170px; flex: none" @change="chargerTraites" />
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patiente</th>
                  <th>N° d'ordre</th>
                  <th>Service</th>
                  <th>Traitée le</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in traites.data" :key="p.id">
                  <td><strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong></td>
                  <td>{{ p.numeroOrdre }}</td>
                  <td>{{ p.service?.nom }}</td>
                  <td>{{ formatDateHeure(p.materniteTraiteLe) }}</td>
                  <td>
                    <button class="btn btn-outline btn-sm" @click="rouvrirTraitement(p)">👁️ Rouvrir</button>
                  </td>
                </tr>
                <tr v-if="traites.data.length === 0">
                  <td colspan="5" class="empty-state">Aucune patiente traitée ce jour.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <PaginationBar
            v-if="traites.total > traites.perPage"
            :page="traites.page"
            :per-page="traites.perPage"
            :total="traites.total"
            :total-pages="traites.totalPages"
            @change="changerPageTraites"
          />
        </section>
      </template>

      <!-- ============ PAGE TRAITEMENT : 6 onglets ============ -->
      <template v-else>
        <div class="fiche-barre">
          <div class="fiche-info">
            <div class="fiche-ligne">
              <span class="fiche-label">Patiente</span>
              <strong>{{ passageCourant.patient?.nom }} {{ passageCourant.patient?.prenom }}</strong>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">Code</span>
              <span class="code-chip">{{ passageCourant.patient?.code }}</span>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">Âge / Sexe</span>
              <span>{{ passageCourant.patient?.age ?? '—' }} ans · {{ passageCourant.patient?.sexe ?? '—' }}</span>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">N° d'ordre</span>
              <strong>{{ passageCourant.numeroOrdre }}</strong>
            </div>
          </div>
          <div class="fiche-actions">
            <button class="btn btn-outline" @click="terminerPassage">✅ Terminer la prise en charge</button>
            <button class="btn btn-outline" @click="quitterTraitement">✕ Retour</button>
          </div>
        </div>

        <nav class="tabs-nav">
          <button class="tab-btn" :class="{ active: ongletTraitement === 'cpn' }" @click="ongletTraitement = 'cpn'">1. CPN</button>
          <button class="tab-btn" :class="{ active: ongletTraitement === 'cpon' }" @click="ongletTraitement = 'cpon'">2. CPON</button>
          <button class="tab-btn" :class="{ active: ongletTraitement === 'accouchement' }" @click="ongletTraitement = 'accouchement'">3. Accouchement</button>
          <button class="tab-btn" :class="{ active: ongletTraitement === 'pf' }" @click="ongletTraitement = 'pf'">4. PF</button>
          <button class="tab-btn" :class="{ active: ongletTraitement === 'ordonnance' }" @click="ongletTraitement = 'ordonnance'; assurerConsultation()">5. Ordonnance</button>
          <button class="tab-btn" :class="{ active: ongletTraitement === 'examens' }" @click="ongletTraitement = 'examens'; assurerConsultation(); chargerPrestations()">6. Examens</button>
        </nav>

        <!-- ─── 1. CPN (registre complet, en pleine page) ─── -->
        <section v-if="ongletTraitement === 'cpn'" class="card">
          <div class="card-header">
            <h2>Registre de consultations prénatales (CPN)</h2>
            <div class="actions">
              <span v-if="dossier" class="text-muted">
                Dossier {{ dossier.numero }} · {{ dossier.numeroGestante || 'N° gestante à renseigner' }}
              </span>
              <span v-if="dossier" class="badge badge-muted">Prochaine visite : CPN{{ (dossier.visites?.length ?? 0) + 1 }}</span>
              <button type="button" class="btn btn-outline btn-sm" @click="imprimerRegistre('cpn')">🖨️ Imprimer le registre</button>
            </div>
          </div>

          <form @submit.prevent="enregistrerCpn">
            <div class="form-separator">Données administratives</div>
            <div class="form-row">
              <div class="field"><label>Date de la consultation *</label><input v-model="formCpn.date" type="date" required /></div>
              <div class="field">
                <label>Mode d'entrée</label>
                <select v-model="formCpn.modeEntree">
                  <option value="">—</option>
                  <option value="VENUE_DIRECTE">Venue d'elle-même (ambulatoire)</option>
                  <option value="REFERE_CENTRE">Référée d'un centre de santé</option>
                  <option value="REFERE_TRADIPRATICIEN">Référée par un tradipraticien</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
              <div class="field"><label>N° gestante</label><input v-model.trim="formCpn.numeroGestante" placeholder="ex : 08/B/2026/CPN1/R1/P10" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Nom *</label><input v-model.trim="formCpn.nom" required /></div>
              <div class="field"><label>Prénoms</label><input v-model.trim="formCpn.prenom" /></div>
              <div class="field"><label>Âge (ans)</label><input v-model.number="formCpn.age" type="number" min="0" max="150" /></div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Profession</label>
                <input v-model.trim="formCpn.profession" list="liste-profession" />
                <datalist id="liste-profession">
                  <option v-for="p in listesParams.PROFESSION" :key="p.id" :value="p.libelle" />
                </datalist>
              </div>
              <div class="field">
                <label>Nationalité</label>
                <input v-model.trim="formCpn.nationalite" list="liste-nationalite" />
                <datalist id="liste-nationalite">
                  <option v-for="n in listesParams.NATIONALITE" :key="n.id" :value="n.libelle" />
                </datalist>
              </div>
              <div class="field">
                <label>Statut conjugal</label>
                <select v-model="formCpn.statutConjugal">
                  <option value="">—</option>
                  <option value="Mariée">Mariée</option>
                  <option value="Célibataire">Célibataire</option>
                  <option value="Divorcée">Divorcée</option>
                  <option value="Veuve">Veuve</option>
                  <option value="Union libre">Union libre</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>En cours de scolarisation</label>
                <select v-model="formCpn.scolarisation">
                  <option value="">—</option>
                  <option value="OUI">Oui</option>
                  <option value="NON">Non</option>
                </select>
              </div>
              <div class="field">
                <label>Résidence habituelle</label>
                <input v-model.trim="formCpn.residenceHabituelle" list="liste-residence" />
                <datalist id="liste-residence">
                  <option v-for="r in listesParams.RESIDENCE" :key="r.id" :value="r.libelle" />
                </datalist>
              </div>
              <div class="field">
                <label>Résidence actuelle</label>
                <input v-model.trim="formCpn.residenceActuelle" list="liste-residence" />
              </div>
            </div>
            <div class="form-row">
              <div class="field"><label>Contacts téléphoniques</label><input v-model.trim="formCpn.telephone" /></div>
            </div>

            <div class="form-separator">Antécédents</div>
            <div class="form-row">
              <div class="field"><label>Gestité</label><input v-model.number="formCpn.gravidite" type="number" min="0" /></div>
              <div class="field"><label>Parité</label><input v-model.number="formCpn.parite" type="number" min="0" /></div>
              <div class="field"><label>Enfants vivants</label><input v-model.number="formCpn.enfantsVivants" type="number" min="0" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Enfants décédés</label><input v-model.number="formCpn.enfantsDecedes" type="number" min="0" /></div>
              <div class="field"><label>Césariennes</label><input v-model.number="formCpn.cesariennes" type="number" min="0" /></div>
              <div class="field"><label>Avortements</label><input v-model.number="formCpn.avortements" type="number" min="0" /></div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Toxémie gravidique</label>
                <select v-model="formCpn.toxemie"><option value="">—</option><option value="OUI">Oui</option><option value="NON">Non</option></select>
              </div>
            </div>
            <div class="field"><label>Antécédents médicaux</label><textarea v-model.trim="formCpn.antecedentsMedicaux" rows="2"></textarea></div>
            <div class="field"><label>Antécédents chirurgicaux</label><textarea v-model.trim="formCpn.antecedentsChirurgicaux" rows="2"></textarea></div>
            <div class="field"><label>Antécédents obstétricaux</label><textarea v-model.trim="formCpn.antecedentsObstetricaux" rows="2"></textarea></div>

            <div class="form-separator">Grossesse</div>
            <div class="form-row">
              <div class="field"><label>DDR (date des dernières règles) *</label><input v-model="formCpn.ddr" type="date" required /></div>
              <div class="field"><label>Terme prévu (calculé)</label><input :value="termePrevu" disabled /></div>
              <div class="field"><label>Âge gestationnel (SA)</label><input v-model.trim="formCpn.ageGestationnelSA" placeholder="Ex : 16 SA + 3 j" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Date de la dernière CPN</label><input :value="derniereCpn" disabled /></div>
              <div class="field"><label>Rang de la visite</label><input :value="'CPN' + (visiteEnEdition ? visiteEnEdition.numero : (dossier?.visites?.length ?? 0) + 1)" disabled /></div>
            </div>

            <div class="form-separator">Statut vaccinal VAT</div>
            <div class="form-row">
              <div class="field">
                <label>Statut VAT</label>
                <select v-model="formCpn.vatStatut">
                  <option value="">—</option>
                  <option value="NON_VACCINEE">Non vaccinée</option>
                  <option value="INCOMPLETEMENT_VACCINEE">Incomplètement vaccinée</option>
                  <option value="CORRECTEMENT_VACCINEE">Correctement vaccinée</option>
                </select>
              </div>
              <div class="field"><label>Date VAT1</label><input v-model="formCpn.vat1" type="date" /></div>
              <div class="field"><label>Date VAT2</label><input v-model="formCpn.vat2" type="date" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Date VAT rappel</label><input v-model="formCpn.vatRappel" type="date" /></div>
              <div class="field">
                <label>Statut VIH à l'accueil</label>
                <select v-model="formCpn.statutVih">
                  <option value="">—</option>
                  <option value="POSITIF">Positif</option>
                  <option value="NEGATIF">Négatif</option>
                  <option value="INCONNU">Inconnu</option>
                </select>
              </div>
            </div>

            <div class="form-separator">Examen clinique</div>
            <div class="form-row">
              <div class="field"><label>Poids (kg)</label><input v-model.number="formCpn.poids" type="number" step="0.1" min="0" /></div>
              <div class="field"><label>Taille (cm)</label><input v-model.trim="formCpn.taille" placeholder="ex : 165" /></div>
              <div class="field"><label>TA gauche</label><input v-model.trim="formCpn.tensionGauche" placeholder="12/8" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>TA droite</label><input v-model.trim="formCpn.tensionDroite" placeholder="12/8" /></div>
              <div class="field">
                <label>Œdèmes</label>
                <select v-model="formCpn.oedemes"><option value="">—</option><option value="Oui">Oui</option><option value="Non">Non</option></select>
              </div>
              <div class="field"><label>Albumine</label><input v-model.trim="formCpn.albumine" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Sucre</label><input v-model.trim="formCpn.sucre" /></div>
              <div class="field"><label>Hauteur utérine (cm)</label><input v-model.trim="formCpn.hauteurUterine" /></div>
              <div class="field"><label>BCF (bruits du cœur fœtal)</label><input v-model.trim="formCpn.bcf" placeholder="140 bpm" /></div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Mouvements actifs</label>
                <select v-model="formCpn.mouvementsActifs"><option value="">—</option><option value="Oui">Oui</option><option value="Non">Non</option></select>
              </div>
              <div class="field"><label>TV (toucher vaginal)</label><input v-model.trim="formCpn.tv" /></div>
              <div class="field"><label>Présentation</label><input v-model.trim="formCpn.presentation" placeholder="Céphalique, siège…" /></div>
            </div>

            <div class="form-separator">Vaccinations et prévention de cette visite</div>
            <div class="form-row">
              <div class="field">
                <label>Dose de SP donnée</label>
                <select v-model.number="formCpn.spDose">
                  <option :value="null">—</option>
                  <option v-for="n in 5" :key="n" :value="n">SP — dose {{ n }}</option>
                </select>
              </div>
              <div class="field"><label>MILDA remise</label><select v-model="formCpn.mildaRemise"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Fer + Folate</label><select v-model="formCpn.ferFolate"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Déparasitée</label><select v-model="formCpn.deparasitee"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Counseling PFPPI + conseils nutritionnels</label><select v-model="formCpn.counselingPfppi"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>

            <div class="form-separator">Dépistages (rapport SIG T4)</div>
            <div class="form-row">
              <div class="field"><label>Grossesse à risque dépistée</label><select v-model="formCpn.risqueDepiste"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Malnutrition</label><select v-model="formCpn.malnutrition"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Anémie</label><select v-model="formCpn.anemie"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Syphilis positive</label><select v-model="formCpn.syphilisPositif"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>AgHBs positive</label><select v-model="formCpn.agHbsPositif"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>

            <div class="form-separator">Conseils et rendez-vous</div>
            <div class="form-row">
              <div class="field champ-large"><label>Conseils donnés</label><textarea v-model.trim="formCpn.conseils" rows="2" placeholder="Fer, acide folique, MILDA, VAT…"></textarea></div>
              <div class="field"><label>Prochaine visite</label><input v-model="formCpn.prochaineVisite" type="date" /></div>
            </div>

            <div class="modal-actions" style="justify-content: flex-start">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ visiteEnEdition ? '💾 Enregistrer les modifications de la ' + 'CPN' + visiteEnEdition.numero : '💾 Enregistrer la visite CPN' + ((dossier?.visites?.length ?? 0) + 1) }}
              </button>
              <button v-if="visiteEnEdition" type="button" class="btn btn-outline" @click="annulerEdition">↺ Nouvelle visite</button>
            </div>
          </form>

          <h3 class="section-title">Visites CPN enregistrées</h3>
          <div v-if="!dossier?.visites?.length" class="text-muted small-note">Aucune visite enregistrée.</div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rang</th><th>Date</th><th>SA</th><th>Poids</th><th>TA</th><th>SP</th><th>MILDA / Fer</th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in dossier.visites" :key="v.id">
                  <td><strong>CPN{{ v.numero }}</strong></td>
                  <td>{{ formatDate(v.date) }}</td>
                  <td>{{ v.ageGestationnelSA || '—' }}</td>
                  <td>{{ v.poids ?? '—' }}</td>
                  <td>{{ v.tensionGauche || '—' }}</td>
                  <td>{{ v.spDose ? `SP${v.spDose}` : '—' }}</td>
                  <td>{{ v.mildaRemise ? 'MILDA' : '' }}{{ v.ferFolate ? (v.mildaRemise ? ' + Fer' : 'Fer') : '' }}</td>
                  <td><button type="button" class="btn btn-outline btn-sm" @click="editerVisite(v)">✏️ Corriger</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ─── 2. CPON (registre complet, en pleine page) ─── -->
        <section v-if="ongletTraitement === 'cpon'" class="card">
          <div class="card-header">
            <h2>Registre de consultations postnatales (CPoN)</h2>
            <div class="actions">
              <span v-if="cponEnEdition" class="badge badge-warning">Correction en cours</span>
              <button type="button" class="btn btn-outline btn-sm" @click="imprimerRegistre('cpon')">🖨️ Imprimer le registre</button>
            </div>
          </div>

          <form @submit.prevent="enregistrerCpon">
            <div class="form-separator">Données administratives</div>
            <div class="form-row">
              <div class="field"><label>Date de la consultation *</label><input v-model="formCpon.date" type="date" required /></div>
              <div class="field">
                <label>Type de consultation postnatale</label>
                <select v-model="formCpon.typeCpon">
                  <option value="">—</option>
                  <option value="IMMEDIATE_6_72H">Immédiate (6 à 72 h après l'accouchement)</option>
                  <option value="6_10_JOURS">Entre 6ᵉ et 10ᵉ jour après l'accouchement</option>
                  <option value="AUTRES_PERIODES">Autres périodes (&gt;72h et &lt;6 j ; &gt;10 j et &lt;6ᵉ semaine)</option>
                  <option value="6_8_SEMAINES">6ᵉ semaine à 8ᵉ semaine</option>
                </select>
              </div>
              <div class="field">
                <label>Mode d'entrée</label>
                <select v-model="formCpon.modeEntree">
                  <option value="">—</option>
                  <option value="VENUE_DIRECTE">Venue d'elle-même (ambulatoire)</option>
                  <option value="REFERE_CENTRE">Référée d'un centre de santé</option>
                  <option value="REFERE_TRADIPRATICIEN">Référée par un tradipraticien</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field"><label>Report N° gestante</label><input v-model.trim="formCpon.numeroGestanteReport" placeholder="ex : 08/B/2026/CPN1/R1/P10R" /></div>
              <div class="field"><label>Nom *</label><input v-model.trim="formCpon.nom" required /></div>
              <div class="field"><label>Prénoms</label><input v-model.trim="formCpon.prenom" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Âge (ans)</label><input v-model.number="formCpon.age" type="number" min="0" max="150" /></div>
              <div class="field">
                <label>Statut conjugal</label>
                <select v-model="formCpon.statutConjugal">
                  <option value="">—</option>
                  <option value="Mariée">Mariée</option>
                  <option value="Célibataire">Célibataire</option>
                  <option value="Divorcée">Divorcée</option>
                  <option value="Veuve">Veuve</option>
                  <option value="Union libre">Union libre</option>
                </select>
              </div>
              <div class="field">
                <label>En cours de scolarisation</label>
                <select v-model="formCpon.scolarisation"><option value="">—</option><option value="OUI">Oui</option><option value="NON">Non</option></select>
              </div>
            </div>
            <div class="form-row">
              <div class="field"><label>Résidence habituelle</label><input v-model.trim="formCpon.residenceHabituelle" list="liste-residence" /></div>
              <div class="field"><label>Résidence actuelle</label><input v-model.trim="formCpon.residenceActuelle" list="liste-residence" /></div>
              <div class="field"><label>Contacts téléphoniques</label><input v-model.trim="formCpon.telephone" /></div>
            </div>

            <div class="form-separator">Antécédents</div>
            <div class="form-row">
              <div class="field"><label>Gestité</label><input v-model.number="formCpon.gravidite" type="number" min="0" /></div>
              <div class="field"><label>Parité</label><input v-model.number="formCpon.parite" type="number" min="0" /></div>
              <div class="field"><label>Enfants vivants</label><input v-model.number="formCpon.enfantsVivants" type="number" min="0" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Enfants décédés</label><input v-model.number="formCpon.enfantsDecedes" type="number" min="0" /></div>
              <div class="field"><label>Césariennes</label><input v-model.number="formCpon.cesariennes" type="number" min="0" /></div>
              <div class="field"><label>Avortements</label><input v-model.number="formCpon.avortements" type="number" min="0" /></div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Toxémie gravidique</label>
                <select v-model="formCpon.toxemie"><option value="">—</option><option value="OUI">Oui</option><option value="NON">Non</option></select>
              </div>
            </div>
            <div class="field"><label>Antécédents médicaux</label><textarea v-model.trim="formCpon.antecedentsMedicaux" rows="2"></textarea></div>
            <div class="field"><label>Antécédents chirurgicaux</label><textarea v-model.trim="formCpon.antecedentsChirurgicaux" rows="2"></textarea></div>

            <div class="form-separator">Accouchement</div>
            <div class="form-row">
              <div class="field"><label>Date d'accouchement</label><input v-model="formCpon.dateAccouchement" type="date" /></div>
              <div class="field">
                <label>Lieu d'accouchement</label>
                <select v-model="formCpon.lieuAccouchement"><option value="">—</option><option value="ETABLISSEMENT">Établissement de soins</option><option value="DOMICILE">Domicile</option></select>
              </div>
              <div class="field">
                <label>Mode d'accouchement</label>
                <select v-model="formCpon.modeAccouchement"><option value="">—</option><option value="VOIE_BASSE">Voie basse</option><option value="CESARIENNE">Césarienne</option></select>
              </div>
            </div>

            <div class="form-separator">VIH</div>
            <div class="form-row">
              <div class="field"><label>N° de dépistage ou de PEC VIH</label><input v-model.trim="formCpon.numeroDepistagePec" /></div>
              <div class="field">
                <label>Statut VIH</label>
                <select v-model="formCpon.statutVih"><option value="">—</option><option value="POSITIF">Positif</option><option value="NEGATIF">Négatif</option><option value="INCONNU">Inconnu</option></select>
              </div>
            </div>

            <div class="form-separator">Examens</div>
            <div class="field"><label>Examen de la mère</label><textarea v-model.trim="formCpon.examenMere" rows="2"></textarea></div>
            <div class="field"><label>Examen du nouveau-né</label><textarea v-model.trim="formCpon.examenEnfant" rows="2"></textarea></div>
            <div class="field"><label>Conseils</label><textarea v-model.trim="formCpon.conseils" rows="2"></textarea></div>
            <div class="field"><label>Observations</label><textarea v-model.trim="formCpon.observations" rows="2"></textarea></div>

            <div class="modal-actions" style="justify-content: flex-start">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ cponEnEdition ? '💾 Enregistrer la correction' : '💾 Enregistrer la consultation postnatale' }}
              </button>
              <button v-if="cponEnEdition" type="button" class="btn btn-outline" @click="annulerEditionCpon">↺ Nouvelle consultation</button>
            </div>
          </form>

          <h3 class="section-title">Consultations postnatales enregistrées</h3>
          <div v-if="cpons.length === 0" class="text-muted small-note">Aucune consultation postnatale enregistrée.</div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Type</th><th>Report N° gestante</th><th>Lieu / mode accouchement</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="c in cpons" :key="c.id">
                  <td>{{ formatDate(c.date) }}</td>
                  <td>{{ libelleTypeCpon(c.typeCpon) }}</td>
                  <td>{{ c.numeroGestanteReport || '—' }}</td>
                  <td>{{ libelleLieu(c.lieuAccouchement) }} / {{ c.modeAccouchement === 'CESARIENNE' ? 'Césarienne' : 'Voie basse' }}</td>
                  <td><button type="button" class="btn btn-outline btn-sm" @click="editerCpon(c)">✏️ Corriger</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ─── 3. ACCOUCHEMENT (registre complet, en pleine page) ─── -->
        <section v-else-if="ongletTraitement === 'accouchement'" class="card">
          <div class="card-header">
            <h2>Registre d'accouchement</h2>
            <div class="actions">
              <span v-if="dossier?.accouchement" class="badge badge-muted">
                Enregistré le {{ formatDateHeure(dossier.accouchement.dateHeure) }}
              </span>
              <button type="button" class="btn btn-outline btn-sm" @click="imprimerRegistre('accouchement')">🖨️ Imprimer le registre</button>
            </div>
          </div>
          <div v-if="!dossier" class="empty-state">
            Enregistrez d'abord la CPN1 (onglet CPN) pour créer le dossier de grossesse.
          </div>
          <form v-else @submit.prevent="enregistrerAccouchement">
            <div class="form-separator">Identité et arrivée</div>
            <div class="form-row">
              <div class="field"><label>Date et heure de l'accouchement *</label><input v-model="formAccouchement.dateHeure" type="datetime-local" required /></div>
              <div class="field"><label>Numéro d'accouchement</label><input v-model.number="formAccouchement.numeroAccouchement" type="number" min="0" /></div>
              <div class="field">
                <label>Mode d'entrée</label>
                <select v-model="formAccouchement.modeEntree">
                  <option value="">—</option>
                  <option value="VENUE_DIRECTE">Venue d'elle-même</option>
                  <option value="REFERE_CENTRE">Référée d'un centre</option>
                  <option value="REFERE_TRADIPRATICIEN">Référée par un tradipraticien</option>
                  <option value="AUTRE">Autre (matrone, SAMU…)</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field"><label>Heure d'arrivée</label><input v-model="formAccouchement.heureArrivee" type="datetime-local" /></div>
              <div class="field"><label>Motif d'admission</label><input v-model.trim="formAccouchement.motifAdmission" placeholder="Douleur abdominale…" /></div>
              <div class="field"><label>En travail</label><select v-model="formAccouchement.enTravail"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Contractions</label>
                <select v-model="formAccouchement.contractions">
                  <option value="">—</option>
                  <option value="OUI_REGULIERES">Présentes, régulières</option>
                  <option value="OUI_IRREGULIERES">Présentes, irrégulières</option>
                  <option value="NON">Absentes</option>
                </select>
              </div>
              <div class="field"><label>Poche des eaux intacte</label><select v-model="formAccouchement.pocheEauxIntacte"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field">
                <label>Aspect du liquide amniotique</label>
                <select v-model="formAccouchement.liquideAspect">
                  <option value="">—</option>
                  <option value="CLAIR">Clair</option>
                  <option value="TEINTE">Teinté</option>
                  <option value="MECONIAL">Méconial</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field"><label>Heures depuis la rupture des membranes</label><input v-model.number="formAccouchement.ruptureHeures" type="number" min="0" /></div>
              <div class="field"><label>Voie</label><select v-model="formAccouchement.voie"><option value="VOIE_BASSE">Voie basse</option><option value="CESARIENNE">Césarienne</option></select></div>
              <div class="field"><label>Terme (SA)</label><input v-model.trim="formAccouchement.termeSA" placeholder="39 SA" /></div>
            </div>

            <div class="form-separator">Antécédents</div>
            <div class="form-row">
              <div class="field"><label>HTA connue</label><select v-model="formAccouchement.htaConnue"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Diabète connu</label><select v-model="formAccouchement.diabeteConnu"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Toxémie</label><select v-model="formAccouchement.toxemie"><option value="">—</option><option value="OUI">Oui</option><option value="NON">Non</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Enfants vivants</label><input v-model.number="formAccouchement.enfantsVivants" type="number" min="0" /></div>
              <div class="field"><label>Enfants décédés</label><input v-model.number="formAccouchement.enfantsDecedes" type="number" min="0" /></div>
              <div class="field"><label>Césariennes antérieures</label><input v-model.number="formAccouchement.cesariennes" type="number" min="0" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Avortements</label><input v-model.number="formAccouchement.avortements" type="number" min="0" /></div>
              <div class="field"><label>Gémellité</label><input v-model.number="formAccouchement.gemellite" type="number" min="0" /></div>
              <div class="field"><label>Prématurité</label><input v-model.number="formAccouchement.prematurite" type="number" min="0" /></div>
            </div>
            <div class="field"><label>Antécédents médicaux</label><textarea v-model.trim="formAccouchement.antecedentsMedicaux" rows="2"></textarea></div>
            <div class="field"><label>Antécédents chirurgicaux</label><textarea v-model.trim="formAccouchement.antecedentsChirurgicaux" rows="2"></textarea></div>

            <div class="form-separator">PMI et VIH</div>
            <div class="form-row">
              <div class="field"><label>Âge de la grossesse à la 1ère CPN</label><input v-model.trim="formAccouchement.ageGrossessePremiereCpn" placeholder="3 mois / 14 SA" /></div>
              <div class="field"><label>Nombre de CPN</label><input v-model.number="formAccouchement.nombreCpn" type="number" min="0" /></div>
              <div class="field">
                <label>Statut vaccinal VAT</label>
                <select v-model="formAccouchement.vatStatut">
                  <option value="">—</option>
                  <option value="NON_VACCINEE">Non vaccinée</option>
                  <option value="INCOMPLETEMENT_VACCINEE">Incomplètement vaccinée</option>
                  <option value="CORRECTEMENT_VACCINEE">Correctement vaccinée</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Statut VIH à l'accueil</label>
                <select v-model="formAccouchement.statutVihAccueil">
                  <option value="">—</option>
                  <option value="POSITIF">Positif</option>
                  <option value="NEGATIF">Négatif</option>
                  <option value="INCONNU">Inconnu</option>
                </select>
              </div>
              <div class="field"><label>Sous TARV en CPN</label><select v-model="formAccouchement.sousTarvCpn"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>N° de PEC</label><input v-model.trim="formAccouchement.numeroPec" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Test VIH proposé</label><select v-model="formAccouchement.offreTestVih"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field">
                <label>Résultat du test VIH</label>
                <select v-model="formAccouchement.resultatTestVih"><option value="">—</option><option value="POSITIF">Positif</option><option value="NEGATIF">Négatif</option></select>
              </div>
            </div>

            <div class="form-separator">Accouchement, délivrance et enfant</div>
            <div class="form-row">
              <div class="field"><label>Délivrance à</label><input v-model="formAccouchement.delivranceLe" type="datetime-local" /></div>
              <div class="field"><label>Révision utérine</label><select v-model="formAccouchement.revisionUterine"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>UBT</label><select v-model="formAccouchement.ubt"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>HPPI</label><select v-model="formAccouchement.hppi"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field">
                <label>Sexe de l'enfant</label>
                <select v-model="formAccouchement.sexeEnfant"><option value="">—</option><option value="M">Masculin</option><option value="F">Féminin</option></select>
              </div>
              <div class="field"><label>Poids de l'enfant (kg)</label><input v-model.number="formAccouchement.poidsEnfant" type="number" step="0.01" min="0" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>APGAR</label><input v-model.trim="formAccouchement.apgar" placeholder="8/10 à 5 min" /></div>
              <div class="field"><label>Périmètre crânien (cm)</label><input v-model.trim="formAccouchement.perimetreCranienEnfant" /></div>
              <div class="field"><label>Réanimation du nouveau-né</label><select v-model="formAccouchement.reanimationNn"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Issue mère</label>
                <select v-model="formAccouchement.issueMere"><option value="">—</option><option value="Vivante">Vivante</option><option value="Décédée">Décédée</option><option value="Transférée">Transférée</option></select>
              </div>
              <div class="field">
                <label>Issue enfant</label>
                <select v-model="formAccouchement.issueEnfant"><option value="">—</option><option value="Né vivant">Né vivant</option><option value="Mort-né">Mort-né</option><option value="Transféré">Transféré</option></select>
              </div>
              <div class="field"><label>Lieu</label><input v-model.trim="formAccouchement.lieu" placeholder="Salle d'accouchement, bloc…" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Mort-né (type)</label><select v-model="formAccouchement.mortNeType"><option value="">—</option><option value="FRAIS">Frais</option><option value="MACERE">Macéré</option></select></div>
              <div class="field"><label>Décédé à la maternité</label><select v-model="formAccouchement.decedeMaternite"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Accouchement multiple</label><select v-model="formAccouchement.accouchementMultiple"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>

            <div class="form-separator">Sortie de la mère</div>
            <div class="form-row">
              <div class="field"><label>Sortie le</label><input v-model="formAccouchement.sortieMereLe" type="datetime-local" /></div>
              <div class="field"><label>Mode de sortie</label><input v-model.trim="formAccouchement.sortieMereMode" placeholder="Normale, transfert…" /></div>
              <div class="field"><label>Intervention du médecin</label><input v-model.trim="formAccouchement.interventionMedecin" /></div>
            </div>
            <div class="field"><label>Complications</label><textarea v-model.trim="formAccouchement.complications" rows="2"></textarea></div>

            <div class="modal-actions" style="justify-content: flex-start">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ dossier?.accouchement ? '💾 Enregistrer les modifications' : '💾 Enregistrer l’accouchement' }}
              </button>
            </div>
          </form>
        </section>

        <!-- ─── 4. PF (registre complet, en pleine page) ─── -->
        <section v-else-if="ongletTraitement === 'pf'" class="card">
          <div class="card-header">
            <h2>Registre de consultation de planification familiale (PF)</h2>
            <div class="actions">
              <span v-if="pfEnEdition" class="badge badge-warning">Correction en cours</span>
              <button type="button" class="btn btn-outline btn-sm" @click="imprimerRegistre('pf')">🖨️ Imprimer le registre</button>
            </div>
          </div>

          <form @submit.prevent="enregistrerPf">
            <div class="form-separator">Consultation</div>
            <div class="form-row">
              <div class="field"><label>Date *</label><input v-model="formPf.date" type="date" required /></div>
              <div class="field">
                <label>Méthode contraceptive *</label>
                <select v-model="formPf.methode" required>
                  <option value="" disabled>— Choisir —</option>
                  <option v-for="m in METHODES_PF" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
              <div class="field">
                <label>Statut de l'utilisatrice</label>
                <select v-model="formPf.nouvelleUtilisatrice">
                  <option :value="true">Nouvelle utilisatrice</option>
                  <option :value="false">Ancienne utilisatrice</option>
                </select>
              </div>
            </div>

            <div class="form-separator">Suivi de la méthode</div>
            <div class="form-row">
              <div class="field"><label>Protégée</label><select v-model="formPf.protégée"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Perdue de vue</label><select v-model="formPf.perdueDeVue"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Abandon</label><select v-model="formPf.abandon"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Arrêt / retrait</label><select v-model="formPf.arretRetrait"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Counseling PF dans le post-partum</label><select v-model="formPf.conseilPostpartum"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Produit contraceptif en post-partum immédiat</label><select v-model="formPf.produitPostpartumImmediat"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Produit contraceptif en post-abortum</label><select v-model="formPf.produitPostAbortum"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Femme formée à l'auto-injection</label><select v-model="formPf.femmesFormeesAutoInjection"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>IST présente</label><select v-model="formPf.istPresente"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Femme séropositive au VIH sous contraception</label><select v-model="formPf.seropositive"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Nourrisson de 0-6 mois + conseils nutritionnels</label><select v-model="formPf.nourrisson0_6"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
              <div class="field"><label>Nourrisson de 6 mois + alimentation complémentaire</label><select v-model="formPf.nourrisson6"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            </div>
            <div class="field"><label>Observations</label><textarea v-model.trim="formPf.observations" rows="2"></textarea></div>

            <div class="modal-actions" style="justify-content: flex-start">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ pfEnEdition ? '💾 Enregistrer la correction' : '💾 Enregistrer la consultation PF' }}
              </button>
              <button v-if="pfEnEdition" type="button" class="btn btn-outline" @click="annulerEditionPf">↺ Nouvelle consultation</button>
            </div>
          </form>

          <h3 class="section-title">Consultations PF enregistrées</h3>
          <div v-if="pfs.length === 0" class="text-muted small-note">Aucune consultation PF enregistrée.</div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Méthode</th><th>Statut</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="p in pfs" :key="p.id">
                  <td>{{ formatDate(p.date) }}</td>
                  <td><strong>{{ p.methode }}</strong></td>
                  <td>{{ p.nouvelleUtilisatrice ? 'Nouvelle utilisatrice' : 'Ancienne utilisatrice' }}</td>
                  <td><button type="button" class="btn btn-outline btn-sm" @click="editerPf(p)">✏️ Corriger</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ─── 5. ORDONNANCE ─── -->
        <section v-else-if="ongletTraitement === 'ordonnance'" class="card">
          <div class="card-header">
            <h2>Prescription de médicaments</h2>
            <div class="actions">
              <button class="btn btn-outline btn-sm" @click="imprimerOrdonnance">🖨️ Imprimer l'ordonnance</button>
            </div>
          </div>
          <div v-if="!detail?.passage.consultation" class="empty-state">
            <button class="btn btn-primary" @click="assurerConsultation">Ouvrir la consultation</button>
          </div>
          <template v-else>
            <div v-if="!detail.passage.consultation.medicaments?.length" class="text-muted small-note">
              Aucun médicament prescrit.
            </div>
            <div v-else class="table-wrap">
              <table>
                <thead><tr><th>Médicament</th><th>Posologie</th><th>Quantité</th><th>Durée</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="m in detail.passage.consultation.medicaments" :key="m.id">
                    <td><strong>{{ m.nom }}</strong></td>
                    <td>{{ m.posologie || '—' }}</td>
                    <td>{{ m.quantite || '—' }}</td>
                    <td>{{ m.duree || '—' }}</td>
                    <td><button class="btn btn-outline btn-sm" @click="retirerMedicament(m)">✕</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button class="btn btn-primary btn-sm" @click="modaleAjoutMedicament = true">＋ Ajouter un médicament</button>
          </template>
        </section>

        <!-- ─── 6. EXAMENS ─── -->
        <section v-else class="card">
          <div class="card-header"><h2>Prescription d'examens (imagerie, laboratoire)</h2></div>
          <div class="form-row">
            <div class="field">
              <label>Examen du catalogue</label>
              <SelectSearch v-model="nouvelExamenId" :options="optionsExamensCatalogue" placeholder="— Choisir un examen —" />
            </div>
            <div class="field">
              <label>Examen hors clinique (saisie libre, non facturable)</label>
              <input v-model.trim="nouvelExamenLibre" placeholder="Ex : échographie doppler externe…" />
            </div>
          </div>
          <div class="actions" style="margin: 8px 0">
            <button class="btn btn-primary btn-sm" :disabled="!nouvelExamenId || ajoutExamenEnCours" @click="ajouterExamen">
              Prescrire l'examen du catalogue
            </button>
            <button class="btn btn-outline btn-sm" :disabled="!nouvelExamenLibre.trim() || ajoutExamenEnCours" @click="ajouterExamenLibre">
              Ajouter l'examen libre
            </button>
          </div>
          <h3 class="section-title">Examens prescrits</h3>
          <div v-if="examensPrescrits.length === 0" class="text-muted small-note">Aucun examen prescrit.</div>
          <div v-else class="table-wrap">
            <table>
              <thead><tr><th>Examen</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                <tr v-for="e in examensPrescrits" :key="e.id">
                  <td><strong>{{ e.libelle }}</strong></td>
                  <td>
                    <span class="badge" :class="e.statut === 'PAYEE' ? 'badge-success' : 'badge-muted'">
                      {{ e.statut === 'PAYEE' ? 'Payé' : 'En attente de paiement' }}
                    </span>
                  </td>
                  <td>
                    <button v-if="e.statut !== 'PAYEE'" class="btn btn-outline btn-sm" @click="retirerExamen(e)">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </main>

    <!-- ============ Modale : accouchement ============ -->
    <div v-if="modaleAccouchement" class="modal-backdrop">
      <div class="modal modal-lg">
        <h2>👶 Accouchement — {{ dossier?.patient?.nom }} {{ dossier?.patient?.prenom }}</h2>
        <form @submit.prevent="enregistrerAccouchement">
          <div class="form-separator">Identité et arrivée</div>
          <div class="form-row">
            <div class="field"><label>Date et heure *</label><input v-model="formAccouchement.dateHeure" type="datetime-local" required /></div>
            <div class="field"><label>Numéro d'accouchement</label><input v-model.number="formAccouchement.numeroAccouchement" type="number" min="0" /></div>
            <div class="field">
              <label>Mode d'entrée</label>
              <select v-model="formAccouchement.modeEntree">
                <option value="">—</option>
                <option value="VENUE_DIRECTE">Venue d'elle-même</option>
                <option value="REFERE_CENTRE">Référée d'un centre</option>
                <option value="REFERE_TRADIPRATICIEN">Référée par un tradipraticien</option>
                <option value="AUTRE">Autre (matrone, SAMU…)</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field"><label>Heure d'arrivée</label><input v-model="formAccouchement.heureArrivee" type="datetime-local" /></div>
            <div class="field"><label>Motif d'admission</label><input v-model.trim="formAccouchement.motifAdmission" placeholder="Douleur abdominale…" /></div>
            <div class="field"><label>En travail</label><select v-model="formAccouchement.enTravail"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Contractions</label>
              <select v-model="formAccouchement.contractions">
                <option value="">—</option>
                <option value="OUI_REGULIERES">Présentes, régulières</option>
                <option value="OUI_IRREGULIERES">Présentes, irrégulières</option>
                <option value="NON">Absentes</option>
              </select>
            </div>
            <div class="field"><label>Poche des eaux intacte</label><select v-model="formAccouchement.pocheEauxIntacte"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field">
              <label>Aspect du liquide</label>
              <select v-model="formAccouchement.liquideAspect">
                <option value="">—</option>
                <option value="CLAIR">Clair</option>
                <option value="TEINTE">Teinté</option>
                <option value="MECONIAL">Méconial</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field"><label>Heures depuis rupture</label><input v-model.number="formAccouchement.ruptureHeures" type="number" min="0" /></div>
            <div class="field"><label>Voie</label><select v-model="formAccouchement.voie"><option value="VOIE_BASSE">Voie basse</option><option value="CESARIENNE">Césarienne</option></select></div>
            <div class="field"><label>Terme (SA)</label><input v-model.trim="formAccouchement.termeSA" placeholder="39 SA" /></div>
          </div>

          <div class="form-separator">Antécédents</div>
          <div class="form-row">
            <div class="field"><label>Gestité</label><input v-model.number="formAccouchement.gemellite" type="number" min="0" /></div>
          </div>
          <div class="form-row">
            <div class="field"><label>HTA connue</label><select v-model="formAccouchement.htaConnue"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>Diabète connu</label><select v-model="formAccouchement.diabeteConnu"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>Toxémie</label><select v-model="formAccouchement.toxemie"><option value="">—</option><option value="OUI">Oui</option><option value="NON">Non</option></select></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Enfants vivants</label><input v-model.number="formAccouchement.enfantsVivants" type="number" min="0" /></div>
            <div class="field"><label>Enfants décédés</label><input v-model.number="formAccouchement.enfantsDecedes" type="number" min="0" /></div>
            <div class="field"><label>Césariennes antérieures</label><input v-model.number="formAccouchement.cesariennes" type="number" min="0" /></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Avortements</label><input v-model.number="formAccouchement.avortements" type="number" min="0" /></div>
            <div class="field"><label>Gémellité</label><input v-model.number="formAccouchement.gemellite" type="number" min="0" /></div>
            <div class="field"><label>Prématurité</label><input v-model.number="formAccouchement.prematurite" type="number" min="0" /></div>
          </div>
          <div class="field"><label>Antécédents médicaux</label><textarea v-model.trim="formAccouchement.antecedentsMedicaux" rows="2"></textarea></div>
          <div class="field"><label>Antécédents chirurgicaux</label><textarea v-model.trim="formAccouchement.antecedentsChirurgicaux" rows="2"></textarea></div>

          <div class="form-separator">PMI et VIH</div>
          <div class="form-row">
            <div class="field"><label>Âge grossesse 1ère CPN</label><input v-model.trim="formAccouchement.ageGrossessePremiereCpn" placeholder="3 mois / 14 SA" /></div>
            <div class="field"><label>Nombre de CPN</label><input v-model.number="formAccouchement.nombreCpn" type="number" min="0" /></div>
            <div class="field">
              <label>Statut VAT</label>
              <select v-model="formAccouchement.vatStatut">
                <option value="">—</option>
                <option value="NON_VACCINEE">Non vaccinée</option>
                <option value="INCOMPLETEMENT_VACCINEE">Incomplètement vaccinée</option>
                <option value="CORRECTEMENT_VACCINEE">Correctement vaccinée</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Statut VIH à l'accueil</label>
              <select v-model="formAccouchement.statutVihAccueil">
                <option value="">—</option>
                <option value="POSITIF">Positif</option>
                <option value="NEGATIF">Négatif</option>
                <option value="INCONNU">Inconnu</option>
              </select>
            </div>
            <div class="field"><label>Sous TARV en CPN</label><select v-model="formAccouchement.sousTarvCpn"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>N° de PEC</label><input v-model.trim="formAccouchement.numeroPec" /></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Test VIH proposé</label><select v-model="formAccouchement.offreTestVih"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field">
              <label>Résultat du test</label>
              <select v-model="formAccouchement.resultatTestVih"><option value="">—</option><option value="POSITIF">Positif</option><option value="NEGATIF">Négatif</option></select>
            </div>
          </div>

          <div class="form-separator">Accouchement, délivrance et enfant</div>
          <div class="form-row">
            <div class="field"><label>Délivrance à</label><input v-model="formAccouchement.delivranceLe" type="datetime-local" /></div>
            <div class="field"><label>Révision utérine</label><select v-model="formAccouchement.revisionUterine"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>UBT</label><select v-model="formAccouchement.ubt"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
          </div>
          <div class="form-row">
            <div class="field"><label>HPPI</label><select v-model="formAccouchement.hppi"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field">
              <label>Sexe de l'enfant</label>
              <select v-model="formAccouchement.sexeEnfant"><option value="">—</option><option value="M">Masculin</option><option value="F">Féminin</option></select>
            </div>
            <div class="field"><label>Poids (kg)</label><input v-model.number="formAccouchement.poidsEnfant" type="number" step="0.01" min="0" /></div>
          </div>
          <div class="form-row">
            <div class="field"><label>APGAR</label><input v-model.trim="formAccouchement.apgar" placeholder="8/10 à 5 min" /></div>
            <div class="field"><label>Périmètre crânien (cm)</label><input v-model.trim="formAccouchement.perimetreCranienEnfant" /></div>
            <div class="field"><label>Réanimation NN</label><select v-model="formAccouchement.reanimationNn"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Issue mère</label>
              <select v-model="formAccouchement.issueMere"><option value="">—</option><option value="Vivante">Vivante</option><option value="Décédée">Décédée</option><option value="Transférée">Transférée</option></select>
            </div>
            <div class="field">
              <label>Issue enfant</label>
              <select v-model="formAccouchement.issueEnfant"><option value="">—</option><option value="Né vivant">Né vivant</option><option value="Mort-né">Mort-né</option><option value="Transféré">Transféré</option></select>
            </div>
            <div class="field"><label>Lieu</label><input v-model.trim="formAccouchement.lieu" placeholder="Salle d'accouchement, bloc…" /></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Mort-né (type)</label><select v-model="formAccouchement.mortNeType"><option value="">—</option><option value="FRAIS">Frais</option><option value="MACERE">Macéré</option></select></div>
            <div class="field"><label>Décédé à la maternité</label><select v-model="formAccouchement.decedeMaternite"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>Accouchement multiple</label><select v-model="formAccouchement.accouchementMultiple"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Sortie de la mère le</label><input v-model="formAccouchement.sortieMereLe" type="datetime-local" /></div>
            <div class="field"><label>Mode de sortie</label><input v-model.trim="formAccouchement.sortieMereMode" placeholder="Normale, transfert…" /></div>
            <div class="field"><label>Intervention du médecin</label><input v-model.trim="formAccouchement.interventionMedecin" /></div>
          </div>
          <div class="field"><label>Complications</label><textarea v-model.trim="formAccouchement.complications" rows="2"></textarea></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="modaleAccouchement = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">💾 Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ Modale : CPON ============ -->
    <div v-if="modaleCpon" class="modal-backdrop">
      <div class="modal modal-lg">
        <h2>{{ formCpon.id ? '✏️ Modifier la CPoN' : '＋ Nouvelle consultation postnatale' }}</h2>
        <form @submit.prevent="enregistrerCpon">
          <div class="form-row">
            <div class="field"><label>Date *</label><input v-model="formCpon.date" type="date" required /></div>
            <div class="field">
              <label>Type de CPoN</label>
              <select v-model="formCpon.typeCpon">
                <option value="">—</option>
                <option value="IMMEDIATE_6_72H">Immédiate (6 à 72 h)</option>
                <option value="6_10_JOURS">Entre 6ᵉ et 10ᵉ jour</option>
                <option value="AUTRES_PERIODES">Autres périodes</option>
                <option value="6_8_SEMAINES">6ᵉ à 8ᵉ semaine</option>
              </select>
            </div>
            <div class="field">
              <label>Mode d'entrée</label>
              <select v-model="formCpon.modeEntree">
                <option value="">—</option>
                <option value="VENUE_DIRECTE">Venue d'elle-même</option>
                <option value="REFERE_CENTRE">Référée d'un centre</option>
                <option value="REFERE_TRADIPRATICIEN">Référée par un tradipraticien</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field"><label>Report N° gestante</label><input v-model.trim="formCpon.numeroGestanteReport" placeholder="ex : 08/B/2026/CPN1/R1/P10R" /></div>
            <div class="field"><label>Date d'accouchement</label><input v-model="formCpon.dateAccouchement" type="date" /></div>
            <div class="field">
              <label>Lieu d'accouchement</label>
              <select v-model="formCpon.lieuAccouchement"><option value="">—</option><option value="ETABLISSEMENT">Établissement de soins</option><option value="DOMICILE">Domicile</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Mode d'accouchement</label>
              <select v-model="formCpon.modeAccouchement"><option value="">—</option><option value="VOIE_BASSE">Voie basse</option><option value="CESARIENNE">Césarienne</option></select>
            </div>
            <div class="field"><label>N° de dépistage / PEC VIH</label><input v-model.trim="formCpon.numeroDepistagePec" /></div>
            <div class="field">
              <label>Statut VIH</label>
              <select v-model="formCpon.statutVih"><option value="">—</option><option value="POSITIF">Positif</option><option value="NEGATIF">Négatif</option><option value="INCONNU">Inconnu</option></select>
            </div>
          </div>
          <div class="field"><label>Examen de la mère</label><textarea v-model.trim="formCpon.examenMere" rows="2"></textarea></div>
          <div class="field"><label>Examen du nouveau-né</label><textarea v-model.trim="formCpon.examenEnfant" rows="2"></textarea></div>
          <div class="field"><label>Conseils</label><textarea v-model.trim="formCpon.conseils" rows="2"></textarea></div>
          <div class="field"><label>Observations</label><textarea v-model.trim="formCpon.observations" rows="2"></textarea></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="modaleCpon = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">💾 Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ Modale : PF ============ -->
    <div v-if="modalePf" class="modal-backdrop">
      <div class="modal modal-lg">
        <h2>{{ formPf.id ? '✏️ Modifier la consultation PF' : '＋ Nouvelle consultation PF' }}</h2>
        <form @submit.prevent="enregistrerPf">
          <div class="form-row">
            <div class="field"><label>Date *</label><input v-model="formPf.date" type="date" required /></div>
            <div class="field">
              <label>Méthode contraceptive *</label>
              <select v-model="formPf.methode" required>
                <option value="" disabled>— Choisir —</option>
                <option v-for="m in METHODES_PF" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
            <div class="field">
              <label>Statut</label>
              <select v-model="formPf.nouvelleUtilisatrice">
                <option :value="true">Nouvelle utilisatrice</option>
                <option :value="false">Ancienne utilisatrice</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field"><label>Protégée</label><select v-model="formPf.protégée"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>Perdue de vue</label><select v-model="formPf.perdueDeVue"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>Abandon</label><select v-model="formPf.abandon"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Arrêt / retrait</label><select v-model="formPf.arretRetrait"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>Counseling PF post-partum</label><select v-model="formPf.conseilPostpartum"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>Produit en post-partum immédiat</label><select v-model="formPf.produitPostpartumImmediat"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Produit en post-abortum</label><select v-model="formPf.produitPostAbortum"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>Formée à l'auto-injection</label><select v-model="formPf.femmesFormeesAutoInjection"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>IST présente</label><select v-model="formPf.istPresente"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Femme séropositive sous contraception</label><select v-model="formPf.seropositive"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>Nourrisson 0-6 mois + conseils nutrition</label><select v-model="formPf.nourrisson0_6"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
            <div class="field"><label>Nourrisson 6 mois + alimentation compl.</label><select v-model="formPf.nourrisson6"><option value="">—</option><option :value="true">Oui</option><option :value="false">Non</option></select></div>
          </div>
          <div class="field"><label>Observations</label><textarea v-model.trim="formPf.observations" rows="2"></textarea></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="modalePf = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">💾 Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ Modale : ajout médicament (ordonnance) ============ -->
    <div v-if="modaleAjoutMedicament" class="modal-backdrop">
      <div class="modal">
        <h2>＋ Ajouter un médicament à l'ordonnance</h2>
        <p v-if="ajoutError" class="alert alert-error">{{ ajoutError }}</p>
        <div class="field">
          <label>Médicament du catalogue</label>
          <SelectSearch v-model="ajoutMedicamentId" :options="optionsMedicaments" placeholder="— Choisir un médicament —" @change="onMedicamentChoisi" />
        </div>
        <div class="field">
          <label>Nom (saisie libre)</label>
          <input v-model.trim="ajoutNom" placeholder="Ou saisir un nom librement…" />
        </div>
        <div class="field">
          <label>Posologie</label>
          <input v-model.trim="ajoutPosologie" list="liste-posologie" placeholder="Ex : 1 comprimé matin et soir" />
          <datalist id="liste-posologie">
            <option v-for="p in posologies" :key="p.id" :value="p.libelle" />
          </datalist>
        </div>
        <div class="form-row">
          <div class="field"><label>Quantité</label><input v-model="ajoutQuantite" /></div>
          <div class="field"><label>Durée</label><input v-model.trim="ajoutDuree" placeholder="Ex : 5 jours" /></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleAjoutMedicament = false">✖ Fermer</button>
          <button class="btn btn-primary" :disabled="ajoutEnCours" @click="confirmerAjoutMedicament">
            {{ ajoutEnCours ? 'Ajout…' : '＋ Ajouter' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Zones d'impression des registres (A4 paysage, format officiel) ============ -->
    <!-- CPN -->
    <div v-if="registreImprimable === 'cpn'" id="cpn-print">
      <div class="registre-a4">
        <div class="reg-entete">
          <div class="reg-gauche">
            <div class="reg-ministere">MINISTERE DE LA SANTE ET DE L'HYGIENE PUBLIQUE</div>
            <div class="reg-devise">Union Discipline Travail</div>
          </div>
          <div class="reg-droite">REPUBLIQUE DE COTE D'IVOIRE</div>
        </div>
        <div class="reg-diis">DIRECTION DE L'INFORMATIQUE ET DE L'INFORMATION SANITAIRE</div>
        <div class="reg-sig">SYSTEME D'INFORMATION DE GESTION (SIG)</div>
        <div class="reg-titre">REGISTRE DE CONSULTATIONS PRE-NATALES (CPN) DU SECTEUR PUBLIC</div>
        <div class="reg-infos">
          <span>Région sanitaire : <strong>{{ cliniqueInfos.regionNom }}</strong></span>
          <span>District : <strong>{{ cliniqueInfos.districtNom }}</strong></span>
          <span>Structure : <strong>{{ cliniqueNom }}</strong></span>
          <span>Service : <strong>Maternité</strong></span>
          <span>Code structure : <strong>{{ cliniqueInfos.immatriculation }}</strong></span>
        </div>
        <table class="reg-table">
          <thead>
            <tr>
              <th>Rang</th><th>Date</th><th>N° gestante</th><th>Mode d'entrée</th><th>Nom</th><th>Âge</th>
              <th>DDR</th><th>SA</th><th>G/P</th><th>VAT</th><th>VIH</th><th>Poids</th><th>Taille</th>
              <th>TA</th><th>HU</th><th>BCF</th><th>SP</th><th>MILDA</th><th>Fer</th><th>Vermifuge</th>
              <th>GAR</th><th>Malnutrition</th><th>Anémie</th><th>Syphilis</th><th>AgHBs</th><th>Conseils</th><th>Proch. visite</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in dossier?.visites ?? []" :key="v.id">
              <td>CPN{{ v.numero }}</td>
              <td>{{ formatDate(v.date) }}</td>
              <td>{{ dossier?.numeroGestante || '' }}</td>
              <td>{{ libelleModeEntree(dossier?.modeEntree) }}</td>
              <td>{{ detail?.passage.patient?.nom }} {{ detail?.passage.patient?.prenom }}</td>
              <td>{{ detail?.passage.patient?.age || '' }}</td>
              <td>{{ formatDate(dossier?.ddr) }}</td>
              <td>{{ v.ageGestationnelSA || '' }}</td>
              <td>{{ dossier?.gravidite ?? '' }}/{{ dossier?.parite ?? '' }}</td>
              <td>{{ libelleVat(dossier?.vatStatut) }}</td>
              <td>{{ dossier?.statutVih || '' }}</td>
              <td>{{ v.poids ?? '' }}</td>
              <td>{{ v.taille || '' }}</td>
              <td>{{ v.tensionGauche || '' }}</td>
              <td>{{ v.hauteurUterine || '' }}</td>
              <td>{{ v.bcf || '' }}</td>
              <td>{{ v.spDose ? 'SP' + v.spDose : '' }}</td>
              <td>{{ v.mildaRemise ? 'Oui' : '' }}</td>
              <td>{{ v.ferFolate ? 'Oui' : '' }}</td>
              <td>{{ v.deparasitee ? 'Oui' : '' }}</td>
              <td>{{ v.risqueDepiste ? 'Oui' : '' }}</td>
              <td>{{ v.malnutrition ? 'Oui' : '' }}</td>
              <td>{{ v.anemie ? 'Oui' : '' }}</td>
              <td>{{ v.syphilisPositif ? 'Oui' : '' }}</td>
              <td>{{ v.agHbsPositif ? 'Oui' : '' }}</td>
              <td>{{ v.conseils || '' }}</td>
              <td>{{ v.prochaineVisite ? formatDate(v.prochaineVisite) : '' }}</td>
            </tr>
          </tbody>
        </table>
        <div class="reg-pied">MSHP/DIIS/SIG — Registre de consultations pré-natales (version Août 2020)</div>
      </div>
    </div>

    <!-- CPON -->
    <div v-if="registreImprimable === 'cpon'" id="cpon-print">
      <div class="registre-a4">
        <div class="reg-entete">
          <div class="reg-gauche">
            <div class="reg-ministere">MINISTERE DE LA SANTE ET DE L'HYGIENE PUBLIQUE</div>
            <div class="reg-devise">Union Discipline Travail</div>
          </div>
          <div class="reg-droite">REPUBLIQUE DE COTE D'IVOIRE</div>
        </div>
        <div class="reg-diis">DIRECTION DE L'INFORMATIQUE ET DE L'INFORMATION SANITAIRE</div>
        <div class="reg-sig">SYSTEME D'INFORMATION DE GESTION (SIG)</div>
        <div class="reg-titre">REGISTRE DE CONSULTATIONS POSTNATALES (CPoN) DU SECTEUR PUBLIC</div>
        <div class="reg-infos">
          <span>Région sanitaire : <strong>{{ cliniqueInfos.regionNom }}</strong></span>
          <span>District : <strong>{{ cliniqueInfos.districtNom }}</strong></span>
          <span>Structure : <strong>{{ cliniqueNom }}</strong></span>
          <span>Service : <strong>Maternité</strong></span>
        </div>
        <table class="reg-table">
          <thead>
            <tr>
              <th>Date</th><th>Type de CPoN</th><th>Report N° gestante</th><th>Mode d'entrée</th><th>Nom</th><th>Âge</th>
              <th>Date accouch.</th><th>Lieu</th><th>Mode</th><th>Dépistage/PEC</th><th>VIH</th>
              <th>Examen mère</th><th>Examen enfant</th><th>Conseils</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in cpons" :key="c.id">
              <td>{{ formatDate(c.date) }}</td>
              <td>{{ libelleTypeCpon(c.typeCpon) }}</td>
              <td>{{ c.numeroGestanteReport || '' }}</td>
              <td>{{ libelleModeEntree(c.modeEntree) }}</td>
              <td>{{ detail?.passage.patient?.nom }} {{ detail?.passage.patient?.prenom }}</td>
              <td>{{ detail?.passage.patient?.age || '' }}</td>
              <td>{{ c.dateAccouchement ? formatDate(c.dateAccouchement) : '' }}</td>
              <td>{{ libelleLieu(c.lieuAccouchement) }}</td>
              <td>{{ c.modeAccouchement === 'CESARIENNE' ? 'Césarienne' : c.modeAccouchement ? 'Voie basse' : '' }}</td>
              <td>{{ c.numeroDepistagePec || '' }}</td>
              <td>{{ c.statutVih || '' }}</td>
              <td>{{ c.examenMere || '' }}</td>
              <td>{{ c.examenEnfant || '' }}</td>
              <td>{{ c.conseils || '' }}</td>
            </tr>
          </tbody>
        </table>
        <div class="reg-pied">MSHP/DIIS/SIG — Registre de consultations postnatales (version Août 2020)</div>
      </div>
    </div>

    <!-- ACCOUCHEMENT -->
    <div v-if="registreImprimable === 'accouchement'" id="acc-print">
      <div class="registre-a4">
        <div class="reg-entete">
          <div class="reg-gauche">
            <div class="reg-ministere">MINISTERE DE LA SANTE ET DE L'HYGIENE PUBLIQUE</div>
            <div class="reg-devise">Union Discipline Travail</div>
          </div>
          <div class="reg-droite">REPUBLIQUE DE COTE D'IVOIRE</div>
        </div>
        <div class="reg-diis">DIRECTION DE L'INFORMATIQUE ET DE L'INFORMATION SANITAIRE</div>
        <div class="reg-sig">SYSTEME D'INFORMATION DE GESTION (SIG)</div>
        <div class="reg-titre">REGISTRE D'ACCOUCHEMENT</div>
        <div class="reg-infos">
          <span>Région sanitaire : <strong>{{ cliniqueInfos.regionNom }}</strong></span>
          <span>District : <strong>{{ cliniqueInfos.districtNom }}</strong></span>
          <span>Structure : <strong>{{ cliniqueNom }}</strong></span>
          <span>Service : <strong>Maternité</strong></span>
        </div>
        <table v-if="dossier?.accouchement" class="reg-fiche">
          <tbody>
            <tr><td class="reg-fiche-lib">Identité de la mère</td><td><strong>{{ detail?.passage.patient?.nom }} {{ detail?.passage.patient?.prenom }}</strong> · {{ detail?.passage.patient?.age ?? '—' }} ans · Report N° gestante : {{ dossier.numeroGestante || '—' }}</td></tr>
            <tr><td class="reg-fiche-lib">Arrivée</td><td>N° {{ dossier.accouchement.numeroAccouchement || '—' }} · Accouchée le {{ formatDateHeure(dossier.accouchement.dateHeure) }} · Arrivée {{ dossier.accouchement.heureArrivee ? formatDateHeure(dossier.accouchement.heureArrivee) : '—' }} · Motif : {{ dossier.accouchement.motifAdmission || '—' }} · En travail : {{ ouiNon(dossier.accouchement.enTravail) }} · Contractions : {{ dossier.accouchement.contractions || '—' }} · Poche des eaux intacte : {{ ouiNon(dossier.accouchement.pocheEauxIntacte) }} · Liquide : {{ dossier.accouchement.liquideAspect || '—' }}</td></tr>
            <tr><td class="reg-fiche-lib">Antécédents</td><td>HTA : {{ ouiNon(dossier.accouchement.htaConnue) }} · Diabète : {{ ouiNon(dossier.accouchement.diabeteConnu) }} · G/P : {{ dossier.accouchement.gemellite ?? '—' }} · Enfants vivants : {{ dossier.accouchement.enfantsVivants ?? '—' }} · Césariennes : {{ dossier.accouchement.cesariennes ?? '—' }} · Avortements : {{ dossier.accouchement.avortements ?? '—' }} · {{ dossier.accouchement.antecedentsMedicaux || '' }} {{ dossier.accouchement.antecedentsChirurgicaux || '' }}</td></tr>
            <tr><td class="reg-fiche-lib">PMI</td><td>1ère CPN : {{ dossier.accouchement.ageGrossessePremiereCpn || '—' }} · Nombre de CPN : {{ dossier.accouchement.nombreCpn ?? '—' }} · VAT : {{ libelleVat(dossier.accouchement.vatStatut) }}</td></tr>
            <tr><td class="reg-fiche-lib">VIH</td><td>Statut accueil : {{ dossier.accouchement.statutVihAccueil || '—' }} · TARV en CPN : {{ ouiNon(dossier.accouchement.sousTarvCpn) }} · N° PEC : {{ dossier.accouchement.numeroPec || '—' }} · Test proposé : {{ ouiNon(dossier.accouchement.offreTestVih) }} · Résultat : {{ dossier.accouchement.resultatTestVih || '—' }}</td></tr>
            <tr><td class="reg-fiche-lib">Délivrance</td><td>Délivrance à {{ dossier.accouchement.delivranceLe ? formatDateHeure(dossier.accouchement.delivranceLe) : '—' }} · Révision utérine : {{ ouiNon(dossier.accouchement.revisionUterine) }} · UBT : {{ ouiNon(dossier.accouchement.ubt) }} · HPPI : {{ ouiNon(dossier.accouchement.hppi) }} · Complications : {{ dossier.accouchement.complications || '—' }}</td></tr>
            <tr><td class="reg-fiche-lib">Enfant</td><td>{{ dossier.accouchement.sexeEnfant === 'F' ? 'Fille' : 'Garçon' }} · Poids : {{ dossier.accouchement.poidsEnfant ?? '—' }} kg · APGAR : {{ dossier.accouchement.apgar || '—' }} · Périmètre crânien : {{ dossier.accouchement.perimetreCranienEnfant || '—' }} cm · Terme : {{ dossier.accouchement.termeSA || '—' }} · Réanimation : {{ ouiNon(dossier.accouchement.reanimationNn) }} · Issue : {{ dossier.accouchement.issueEnfant || '—' }} · Décédé à la maternité : {{ ouiNon(dossier.accouchement.decedeMaternite) }}</td></tr>
            <tr><td class="reg-fiche-lib">Sortie de la mère</td><td>Issue : {{ dossier.accouchement.issueMere || '—' }} · Sortie le {{ dossier.accouchement.sortieMereLe ? formatDateHeure(dossier.accouchement.sortieMereLe) : '—' }} · Mode : {{ dossier.accouchement.sortieMereMode || '—' }} · Intervention du médecin : {{ dossier.accouchement.interventionMedecin || '—' }}</td></tr>
          </tbody>
        </table>
        <div class="reg-pied">MSHP/DIIS/SIG — Registre d'accouchements (version Août 2020)</div>
      </div>
    </div>

    <!-- PF -->
    <div v-if="registreImprimable === 'pf'" id="pf-print">
      <div class="registre-a4">
        <div class="reg-entete">
          <div class="reg-gauche">
            <div class="reg-ministere">MINISTERE DE LA SANTE ET DE L'HYGIENE PUBLIQUE</div>
            <div class="reg-devise">Union Discipline Travail</div>
          </div>
          <div class="reg-droite">REPUBLIQUE DE COTE D'IVOIRE</div>
        </div>
        <div class="reg-diis">DIRECTION DE L'INFORMATIQUE ET DE L'INFORMATION SANITAIRE</div>
        <div class="reg-sig">SYSTEME D'INFORMATION DE GESTION (SIG)</div>
        <div class="reg-titre">REGISTRE DE CONSULTATION DE PLANIFICATION FAMILIALE (PF)</div>
        <div class="reg-infos">
          <span>Région sanitaire : <strong>{{ cliniqueInfos.regionNom }}</strong></span>
          <span>District : <strong>{{ cliniqueInfos.districtNom }}</strong></span>
          <span>Structure : <strong>{{ cliniqueNom }}</strong></span>
          <span>Service : <strong>Maternité</strong></span>
        </div>
        <table class="reg-table">
          <thead>
            <tr>
              <th>Date</th><th>Méthode</th><th>Statut</th><th>Protégée</th><th>PDV</th><th>Abandon</th><th>Arrêt</th>
              <th>Post-partum</th><th>Post-abortum</th><th>Auto-injection</th><th>IST</th><th>Séro+</th>
              <th>Nourrisson 0-6 m</th><th>Nourrisson 6 m</th><th>Observations</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in pfs" :key="p.id">
              <td>{{ formatDate(p.date) }}</td>
              <td>{{ p.methode }}</td>
              <td>{{ p.nouvelleUtilisatrice ? 'Nouvelle' : 'Ancienne' }}</td>
              <td>{{ p.protégée ? 'Oui' : '' }}</td>
              <td>{{ p.perdueDeVue ? 'Oui' : '' }}</td>
              <td>{{ p.abandon ? 'Oui' : '' }}</td>
              <td>{{ p.arretRetrait ? 'Oui' : '' }}</td>
              <td>{{ p.conseilPostpartum ? 'Oui' : '' }}</td>
              <td>{{ p.produitPostAbortum ? 'Oui' : '' }}</td>
              <td>{{ p.femmesFormeesAutoInjection ? 'Oui' : '' }}</td>
              <td>{{ p.istPresente ? 'Oui' : '' }}</td>
              <td>{{ p.seropositive ? 'Oui' : '' }}</td>
              <td>{{ p.nourrisson0_6 ? 'Oui' : '' }}</td>
              <td>{{ p.nourrisson6 ? 'Oui' : '' }}</td>
              <td>{{ p.observations || '' }}</td>
            </tr>
          </tbody>
        </table>
        <div class="reg-pied">MSHP/DIIS/SIG — Registre de consultation planification familiale (version Août 2020)</div>
      </div>
    </div>

    <!-- ============ Zone d'impression de l'ordonnance (A4) ============ -->
    <div v-if="registreImprimable === 'ordonnance'" id="ordo-print">
      <div class="ordo-a4">
        <div class="ordo-a4-head">
          <h1>{{ cliniqueNom }}</h1>
          <p v-if="cliniqueAdresse">{{ cliniqueAdresse }}</p>
        </div>
        <div class="ordo-a4-titre">ORDONNANCE MÉDICALE</div>
        <div class="ordo-a4-info">
          <div class="ordo-a4-ligne">
            <span class="ordo-a4-label">Patiente</span>
            <span>
              <strong>{{ passageCourant?.patient?.nom }} {{ passageCourant?.patient?.prenom }}</strong>
              <span v-if="passageCourant?.patient?.age"> ({{ passageCourant.patient.age }} ans)</span>
            </span>
          </div>
          <div class="ordo-a4-ligne">
            <span class="ordo-a4-label">N° d'ordre</span>
            <span>{{ passageCourant?.numeroOrdre }}</span>
          </div>
          <div class="ordo-a4-ligne">
            <span class="ordo-a4-label">Date</span>
            <span>{{ formatDate(new Date()) }}</span>
          </div>
        </div>
        <table class="ordo-a4-table">
          <thead>
            <tr><th>Médicament</th><th>Posologie</th><th>Quantité</th><th>Durée</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in detail?.passage.consultation?.medicaments ?? []" :key="m.id">
              <td>{{ m.nom }}</td>
              <td>{{ m.posologie || '—' }}</td>
              <td>{{ m.quantite || '—' }}</td>
              <td>{{ m.duree || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div class="ordo-a4-sign">
          <div class="ordo-a4-sign-date">Fait le {{ formatDate(new Date()) }}</div>
          <div class="ordo-a4-sign-doc">
            <p>La Sage-femme / Le Médecin</p>
            <div class="ordo-a4-cachet">Signature et cachet</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import http from '../api/http'
import PaginationBar from '../components/PaginationBar.vue'
import SelectSearch from '../components/SelectSearch.vue'
import { useAuthStore } from '../stores/auth'
import { toastError, toastSuccess } from '../utils/notifications'

const auth = useAuthStore()
const router = useRouter()

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')
const cliniqueAdresse = ref('')

const todayLabel = computed(() =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
)

const METHODES_PF = [
  'Pilule (COC)', 'Pilule (COP)', 'Injectable IM 3 mois', 'Injectable IM 2 mois',
  'Injectable sous cutané 3 mois', 'Auto-injection 3 mois', 'DIU', 'DIU-PP',
  'Implant 5 ans', 'Implant 3 ans', 'Condom masculin', 'Condom féminin',
  'Spermicide', 'Contraception d’urgence',
]

// ── Accueil du module ──
const onglet = ref('attente')
const file = ref([])
const traites = ref({ data: [], total: 0, page: 1, perPage: 10, totalPages: 1 })
const jourTraites = ref(new Date().toISOString().slice(0, 10))
const recherche = ref('')
const resultatsRecherche = ref([])
let rechercheTimer = null

async function chargerFile() {
  try {
    const { data } = await http.get('/maternite/file', { params: { cliniqueId: cliniqueId.value } })
    file.value = data
  } catch {
    file.value = []
  }
}

// ── Recherche (debounce 300 ms) ──
function onRecherche() {
  clearTimeout(rechercheTimer)
  rechercheTimer = setTimeout(async () => {
    const q = recherche.value.trim()
    if (q.length < 2) {
      resultatsRecherche.value = []
      return
    }
    try {
      const { data } = await http.get('/maternite/recherche', {
        params: { code: q, cliniqueId: cliniqueId.value },
      })
      resultatsRecherche.value = data
    } catch {
      resultatsRecherche.value = []
    }
  }, 300)
}

async function chargerTraites(page = 1) {
  try {
    const { data } = await http.get('/maternite/traites', {
      params: {
        cliniqueId: cliniqueId.value,
        jour: jourTraites.value || undefined,
        page,
        perPage: traites.value.perPage,
      },
    })
    traites.value = data
  } catch {
    traites.value = { data: [], total: 0, page: 1, perPage: 10, totalPages: 1 }
  }
}

function changerPageTraites(p) {
  chargerTraites(p)
}

// ── Page traitement ──
const passageCourant = ref(null)
const detail = ref(null)
const dossier = ref(null)
const cpons = ref([])
const pfs = ref([])
const ongletTraitement = ref('cpn')
const saving = ref(false)

async function ouvrirTraitement(p) {
  passageCourant.value = p
  ongletTraitement.value = 'cpn'
  recherche.value = ''
  resultatsRecherche.value = []
  await chargerDetail()
}

async function rouvrirTraitement(p) {
  passageCourant.value = p
  ongletTraitement.value = 'cpn'
  await chargerDetail()
}

async function chargerDetail() {
  if (!passageCourant.value) return
  try {
    const { data } = await http.get(`/maternite/passages/${passageCourant.value.id}`)
    detail.value = data
    dossier.value = data.dossier
    cpons.value = data.cpons ?? []
    pfs.value = data.pfs ?? []
    initFormCpn()
    initFormCpon()
    initFormPf()
    initFormAcc()
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger le passage.')
  }
}

// ── Listes déroulantes du registre (profession, nationalité, résidence) ──
const ROUTES_LISTES = {
  PROFESSION: '/professions',
  NATIONALITE: '/nationalites',
  RESIDENCE: '/residences',
}

const listesParams = reactive({
  PROFESSION: [],
  NATIONALITE: [],
  RESIDENCE: [],
})

async function chargerListesParams(cliniqueId) {
  if (!cliniqueId) return
  try {
    const codes = Object.keys(listesParams)
    const reponses = await Promise.all(
      codes.map((code) => http.get(ROUTES_LISTES[code], { params: { cliniqueId } })),
    )
    codes.forEach((code, i) => {
      listesParams[code] = reponses[i].data ?? []
    })
  } catch {
    /* listes vides */
  }
}

function viderForm(obj) {
  Object.keys(obj).forEach((k) => delete obj[k])
}

function quitterTraitement() {
  passageCourant.value = null
  detail.value = null
  dossier.value = null
  cpons.value = []
  pfs.value = []
  chargerFile()
}

async function terminerPassage() {
  try {
    await http.patch(`/maternite/passages/${passageCourant.value.id}/terminer`)
    toastSuccess('Prise en charge terminée — la patiente passe dans « terminés ».')
    quitterTraitement()
    onglet.value = 'termines'
    await chargerTraites()
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de terminer la prise en charge.')
  }
}

// ── Dossier grossesse ──

// ── Registre CPN (formulaire complet en pleine page) ──
const formCpn = reactive({})
const visiteEnEdition = ref(null)

function initFormCpn() {
  const g = dossier.value
  const pat = detail.value?.passage?.patient
  const v = visiteEnEdition.value
  viderForm(formCpn)
  Object.assign(formCpn, {
    date: v?.date ? v.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    // Données administratives
    modeEntree: g?.modeEntree ?? '',
    numeroGestante: g?.numeroGestante ?? '',
    nom: pat?.nom ?? '',
    prenom: pat?.prenom ?? '',
    age: pat?.age != null ? Number(pat.age) : null,
    profession: pat?.profession ?? '',
    nationalite: pat?.nationalite ?? '',
    statutConjugal: pat?.statutConjugal ?? '',
    scolarisation: pat?.scolarisation ?? '',
    residenceHabituelle: pat?.residenceHabituelle ?? '',
    residenceActuelle: pat?.residenceActuelle ?? '',
    telephone: pat?.telephone ?? '',
    // Antécédents
    gravidite: g?.gravidite ?? null,
    parite: g?.parite ?? null,
    enfantsVivants: g?.enfantsVivants ?? null,
    enfantsDecedes: g?.enfantsDecedes ?? null,
    cesariennes: g?.cesariennes ?? null,
    avortements: g?.avortements ?? null,
    toxemie: g?.toxemie ?? '',
    antecedentsMedicaux: g?.antecedentsMedicaux ?? '',
    antecedentsChirurgicaux: g?.antecedentsChirurgicaux ?? '',
    antecedentsObstetricaux: g?.antecedentsObstetricaux ?? '',
    // Grossesse
    ddr: g?.ddr ? g.ddr.slice(0, 10) : '',
    ageGestationnelSA: v?.ageGestationnelSA ?? '',
    // VAT / VIH
    vatStatut: g?.vatStatut ?? '',
    vat1: g?.vat1 ? g.vat1.slice(0, 10) : '',
    vat2: g?.vat2 ? g.vat2.slice(0, 10) : '',
    vatRappel: g?.vatRappel ? g.vatRappel.slice(0, 10) : '',
    statutVih: g?.statutVih ?? '',
    // Examen clinique
    poids: v?.poids != null ? Number(v.poids) : null,
    taille: v?.taille ?? '',
    tensionGauche: v?.tensionGauche ?? '',
    tensionDroite: v?.tensionDroite ?? '',
    oedemes: v?.oedemes ?? '',
    albumine: v?.albumine ?? '',
    sucre: v?.sucre ?? '',
    hauteurUterine: v?.hauteurUterine ?? '',
    bcf: v?.bcf ?? '',
    mouvementsActifs: v?.mouvementsActifs ?? '',
    tv: v?.tv ?? '',
    presentation: v?.presentation ?? '',
    // Prévention de la visite
    spDose: v?.spDose ?? null,
    mildaRemise: v?.mildaRemise ?? '',
    ferFolate: v?.ferFolate ?? '',
    deparasitee: v?.deparasitee ?? '',
    counselingPfppi: v?.counselingPfppi ?? '',
    // Dépistages
    risqueDepiste: v?.risqueDepiste ?? '',
    malnutrition: v?.malnutrition ?? '',
    anemie: v?.anemie ?? '',
    syphilisPositif: v?.syphilisPositif ?? '',
    agHbsPositif: v?.agHbsPositif ?? '',
    // Conseils et RDV
    conseils: v?.conseils ?? '',
    prochaineVisite: v?.prochaineVisite ? v.prochaineVisite.slice(0, 10) : '',
  })
}

function editerVisite(v) {
  visiteEnEdition.value = v
  initFormCpn()
}

function annulerEdition() {
  visiteEnEdition.value = null
  initFormCpn()
}

const termePrevu = computed(() => {
  if (!formCpn.ddr) return ''
  const ddr = new Date(formCpn.ddr)
  const dpa = new Date(ddr.getTime() + 280 * 24 * 3600 * 1000)
  return dpa.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
})

const derniereCpn = computed(() => {
  const visites = dossier.value?.visites ?? []
  if (visites.length === 0) return '—'
  return formatDate(visites[visites.length - 1].date)
})

/** Les champs vides deviennent null (validation class-validator du backend). */
function payloadNettoye(form) {
  const copie = {}
  for (const [k, v] of Object.entries(form)) {
    if (k === 'id') continue
    copie[k] = v === '' ? null : v
  }
  return copie
}

const CHAMPS_DOSSIER = [
  'modeEntree', 'numeroGestante', 'ddr', 'gravidite', 'parite', 'enfantsVivants', 'enfantsDecedes',
  'cesariennes', 'avortements', 'toxemie', 'antecedentsMedicaux', 'antecedentsChirurgicaux',
  'antecedentsObstetricaux', 'vatStatut', 'vat1', 'vat2', 'vatRappel', 'statutVih',
]
const CHAMPS_PATIENT = [
  'nom', 'prenom', 'age', 'profession', 'nationalite', 'statutConjugal',
  'scolarisation', 'residenceHabituelle', 'residenceActuelle', 'telephone',
]
const CHAMPS_VISITE = [
  'date', 'ageGestationnelSA', 'poids', 'taille', 'tensionGauche', 'tensionDroite',
  'hauteurUterine', 'bcf', 'mouvementsActifs', 'oedemes', 'albumine', 'sucre',
  'presentation', 'tv', 'conseils', 'prochaineVisite', 'spDose', 'mildaRemise',
  'ferFolate', 'deparasitee', 'counselingPfppi', 'risqueDepiste', 'malnutrition',
  'anemie', 'syphilisPositif', 'agHbsPositif',
]

function extraire(champs) {
  const out = {}
  for (const c of champs) out[c] = formCpn[c]
  return out
}

async function enregistrerCpn() {
  if (!formCpn.date || !formCpn.ddr) return
  if (!detail.value) return
  saving.value = true
  try {
    // 1. Dossier de grossesse (créé à la CPN1 sinon mis à jour)
    let dossierId = dossier.value?.id
    if (dossierId) {
      await http.patch(`/maternite/grossesses/${dossierId}`, payloadNettoye(extraire(CHAMPS_DOSSIER)))
    } else {
      const { data } = await http.post('/maternite/grossesses', {
        ...payloadNettoye(extraire(CHAMPS_DOSSIER)),
        cliniqueId: cliniqueId.value,
        patientId: detail.value.passage.patientId,
      })
      dossierId = data.id
    }
    // 2. Identité de la mère (données administratives du registre)
    await http.patch(`/accueil/passages/${passageCourant.value.id}`, {
      patient: payloadNettoye(extraire(CHAMPS_PATIENT)),
    })
    // 3. Visite CPN (créée ou corrigée)
    const champsVisite = payloadNettoye(extraire(CHAMPS_VISITE))
    if (visiteEnEdition.value) {
      await http.patch(`/maternite/cpn/${visiteEnEdition.value.id}`, champsVisite)
      toastSuccess('Visite CPN corrigée.')
    } else {
      await http.post(`/maternite/grossesses/${dossierId}/cpn`, champsVisite)
      toastSuccess(`CPN${(dossier.value?.visites?.length ?? 0) + 1} enregistrée.`)
    }
    visiteEnEdition.value = null
    await chargerDetail()
    initFormCpn()
  } catch (e) {
    toastError(e.response?.data?.message || 'Enregistrement impossible.')
  } finally {
    saving.value = false
  }
}

// ── Accouchement (registre complet, en pleine page) ──
const formAccouchement = reactive({})

function initFormAcc() {
  const a = dossier.value?.accouchement
  viderForm(formAccouchement)
  Object.assign(formAccouchement, {
    dateHeure: a?.dateHeure ? new Date(a.dateHeure).toISOString().slice(0, 16) : '',
    numeroAccouchement: a?.numeroAccouchement ?? null,
    modeEntree: a?.modeEntree ?? '',
    heureArrivee: a?.heureArrivee ? new Date(a.heureArrivee).toISOString().slice(0, 16) : '',
    motifAdmission: a?.motifAdmission ?? '',
    enTravail: a?.enTravail ?? '',
    contractions: a?.contractions ?? '',
    pocheEauxIntacte: a?.pocheEauxIntacte ?? '',
    liquideAspect: a?.liquideAspect ?? '',
    ruptureHeures: a?.ruptureHeures ?? null,
    voie: a?.voie ?? 'VOIE_BASSE',
    termeSA: a?.termeSA ?? '',
    htaConnue: a?.htaConnue ?? '',
    diabeteConnu: a?.diabeteConnu ?? '',
    toxemie: a?.toxemie ?? '',
    enfantsVivants: a?.enfantsVivants ?? null,
    enfantsDecedes: a?.enfantsDecedes ?? null,
    cesariennes: a?.cesariennes ?? null,
    avortements: a?.avortements ?? null,
    gemellite: a?.gemellite ?? null,
    prematurite: a?.prematurite ?? null,
    antecedentsMedicaux: a?.antecedentsMedicaux ?? '',
    antecedentsChirurgicaux: a?.antecedentsChirurgicaux ?? '',
    ageGrossessePremiereCpn: a?.ageGrossessePremiereCpn ?? '',
    nombreCpn: a?.nombreCpn ?? null,
    vatStatut: a?.vatStatut ?? '',
    statutVihAccueil: a?.statutVihAccueil ?? '',
    sousTarvCpn: a?.sousTarvCpn ?? '',
    numeroPec: a?.numeroPec ?? '',
    offreTestVih: a?.offreTestVih ?? '',
    resultatTestVih: a?.resultatTestVih ?? '',
    delivranceLe: a?.delivranceLe ? new Date(a.delivranceLe).toISOString().slice(0, 16) : '',
    revisionUterine: a?.revisionUterine ?? '',
    ubt: a?.ubt ?? '',
    hppi: a?.hppi ?? '',
    sexeEnfant: a?.sexeEnfant ?? '',
    poidsEnfant: a?.poidsEnfant != null ? Number(a.poidsEnfant) : null,
    apgar: a?.apgar ?? '',
    perimetreCranienEnfant: a?.perimetreCranienEnfant ?? '',
    reanimationNn: a?.reanimationNn ?? '',
    issueMere: a?.issueMere ?? '',
    issueEnfant: a?.issueEnfant ?? '',
    lieu: a?.lieu ?? '',
    mortNeType: a?.mortNeType ?? '',
    decedeMaternite: a?.decedeMaternite ?? '',
    accouchementMultiple: a?.accouchementMultiple ?? '',
    sortieMereLe: a?.sortieMereLe ? new Date(a.sortieMereLe).toISOString().slice(0, 16) : '',
    sortieMereMode: a?.sortieMereMode ?? '',
    interventionMedecin: a?.interventionMedecin ?? '',
    complications: a?.complications ?? '',
  })
}

async function enregistrerAccouchement() {
  if (!formAccouchement.dateHeure || !dossier.value) return
  saving.value = true
  try {
    await http.post(
      `/maternite/grossesses/${dossier.value.id}/accouchement`,
      payloadNettoye(formAccouchement),
    )
    toastSuccess('Accouchement enregistré.')
    await chargerDetail()
    initFormAcc()
  } catch (e) {
    toastError(e.response?.data?.message || 'Enregistrement impossible.')
  } finally {
    saving.value = false
  }
}

// ── CPoN (registre complet, en pleine page) ──
const formCpon = reactive({})
const cponEnEdition = ref(null)

function initFormCpon() {
  const pat = detail.value?.passage?.patient
  const g = dossier.value
  const c = cponEnEdition.value
  viderForm(formCpon)
  Object.assign(formCpon, {
    date: c?.date ? c.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    typeCpon: c?.typeCpon ?? '',
    modeEntree: c?.modeEntree ?? '',
    numeroGestanteReport: c?.numeroGestanteReport ?? g?.numeroGestante ?? '',
    nom: pat?.nom ?? '',
    prenom: pat?.prenom ?? '',
    age: pat?.age != null ? Number(pat.age) : null,
    statutConjugal: pat?.statutConjugal ?? '',
    scolarisation: pat?.scolarisation ?? '',
    residenceHabituelle: pat?.residenceHabituelle ?? '',
    residenceActuelle: pat?.residenceActuelle ?? '',
    telephone: pat?.telephone ?? '',
    gravidite: g?.gravidite ?? null,
    parite: g?.parite ?? null,
    enfantsVivants: g?.enfantsVivants ?? null,
    enfantsDecedes: g?.enfantsDecedes ?? null,
    cesariennes: g?.cesariennes ?? null,
    avortements: g?.avortements ?? null,
    toxemie: g?.toxemie ?? '',
    antecedentsMedicaux: g?.antecedentsMedicaux ?? '',
    antecedentsChirurgicaux: g?.antecedentsChirurgicaux ?? '',
    dateAccouchement: c?.dateAccouchement
      ? c.dateAccouchement.slice(0, 10)
      : g?.accouchement?.dateHeure
        ? g.accouchement.dateHeure.slice(0, 10)
        : '',
    lieuAccouchement: c?.lieuAccouchement ?? '',
    modeAccouchement: c?.modeAccouchement ?? '',
    numeroDepistagePec: c?.numeroDepistagePec ?? '',
    statutVih: c?.statutVih ?? '',
    examenMere: c?.examenMere ?? '',
    examenEnfant: c?.examenEnfant ?? '',
    conseils: c?.conseils ?? '',
    observations: c?.observations ?? '',
  })
}

function editerCpon(c) {
  cponEnEdition.value = c
  initFormCpon()
}

function annulerEditionCpon() {
  cponEnEdition.value = null
  initFormCpon()
}

async function enregistrerCpon() {
  if (!formCpon.date) return
  saving.value = true
  try {
    // Identité de la mère + antécédents du dossier
    await http.patch(`/accueil/passages/${passageCourant.value.id}`, {
      patient: payloadNettoye(extraireCpon(CHAMPS_PATIENT)),
    })
    if (dossier.value) {
      await http.patch(`/maternite/grossesses/${dossier.value.id}`, payloadNettoye(extraireCpon(CHAMPS_DOSSIER)))
    }
    const champsCpon = payloadNettoye(extraireCpon(CHAMPS_CPON))
    if (cponEnEdition.value) {
      await http.patch(`/maternite/cpon/${cponEnEdition.value.id}`, champsCpon)
      toastSuccess('Consultation postnatale corrigée.')
    } else {
      await http.post(`/maternite/passages/${passageCourant.value.id}/cpon`, {
        ...champsCpon,
        grossesseId: dossier.value?.id ?? undefined,
      })
      toastSuccess('Consultation postnatale enregistrée.')
    }
    cponEnEdition.value = null
    await chargerDetail()
    initFormCpon()
  } catch (e) {
    toastError(e.response?.data?.message || 'Enregistrement impossible.')
  } finally {
    saving.value = false
  }
}

const CHAMPS_CPON = [
  'date', 'typeCpon', 'modeEntree', 'numeroGestanteReport', 'dateAccouchement',
  'lieuAccouchement', 'modeAccouchement', 'numeroDepistagePec', 'statutVih',
  'examenMere', 'examenEnfant', 'conseils', 'observations',
]

function extraireCpon(champs) {
  const out = {}
  for (const c of champs) out[c] = formCpon[c]
  return out
}

// ── PF (registre complet, en pleine page) ──
const formPf = reactive({})
const pfEnEdition = ref(null)

function initFormPf() {
  const p = pfEnEdition.value
  viderForm(formPf)
  Object.assign(formPf, {
    date: p?.date ? p.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    methode: p?.methode ?? '',
    nouvelleUtilisatrice: p?.nouvelleUtilisatrice ?? true,
    protégée: p?.protégée ?? '',
    perdueDeVue: p?.perdueDeVue ?? '',
    abandon: p?.abandon ?? '',
    arretRetrait: p?.arretRetrait ?? '',
    conseilPostpartum: p?.conseilPostpartum ?? '',
    produitPostpartumImmediat: p?.produitPostpartumImmediat ?? '',
    produitPostAbortum: p?.produitPostAbortum ?? '',
    femmesFormeesAutoInjection: p?.femmesFormeesAutoInjection ?? '',
    istPresente: p?.istPresente ?? '',
    seropositive: p?.seropositive ?? '',
    nourrisson0_6: p?.nourrisson0_6 ?? '',
    nourrisson6: p?.nourrisson6 ?? '',
    observations: p?.observations ?? '',
  })
}

function editerPf(p) {
  pfEnEdition.value = p
  initFormPf()
}

function annulerEditionPf() {
  pfEnEdition.value = null
  initFormPf()
}

async function enregistrerPf() {
  if (!formPf.date || !formPf.methode) return
  saving.value = true
  try {
    if (pfEnEdition.value) {
      await http.patch(`/maternite/pf/${pfEnEdition.value.id}`, payloadNettoye(formPf))
      toastSuccess('Consultation PF corrigée.')
    } else {
      await http.post(`/maternite/passages/${passageCourant.value.id}/pf`, payloadNettoye(formPf))
      toastSuccess('Consultation PF enregistrée.')
    }
    pfEnEdition.value = null
    await chargerDetail()
    initFormPf()
  } catch (e) {
    toastError(e.response?.data?.message || 'Enregistrement impossible.')
  } finally {
    saving.value = false
  }
}

// ── Ordonnance (réutilise le flux consultation) ──
const consultation = computed(() => detail.value?.passage.consultation ?? null)
const medicaments = ref([])
const posologies = ref([])
const modaleAjoutMedicament = ref(false)
const ajoutMedicamentId = ref(null)
const ajoutNom = ref('')
const ajoutPosologie = ref('')
const ajoutQuantite = ref('')
const ajoutDuree = ref('')
const ajoutError = ref('')
const ajoutEnCours = ref(false)

const optionsMedicaments = computed(() =>
  medicaments.value.map((m) => ({ value: m.id, label: m.nom })),
)

/** Crée la consultation du passage si elle n'existe pas (nécessaire pour prescrire). */
async function assurerConsultation() {
  if (!passageCourant.value || consultation.value) return
  try {
    await http.post(`/maternite/passages/${passageCourant.value.id}/consultation`)
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible d’ouvrir la consultation.')
  }
}

async function chargerMedicamentsEtPosologies() {
  try {
    const [m, p] = await Promise.all([
      http.get('/medicaments', { params: { cliniqueId: cliniqueId.value } }),
      http.get('/posologies', { params: { cliniqueId: cliniqueId.value } }),
    ])
    medicaments.value = m.data.filter((x) => x.actif)
    posologies.value = p.data ?? []
  } catch {
    medicaments.value = []
    posologies.value = []
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
    ajoutMedicamentId.value = null
    ajoutNom.value = ''
    ajoutPosologie.value = ''
    ajoutQuantite.value = ''
    ajoutDuree.value = ''
    toastSuccess('Médicament ajouté.')
    await chargerDetail()
  } catch (e) {
    ajoutError.value = e.response?.data?.message || 'Erreur lors de l’ajout.'
  } finally {
    ajoutEnCours.value = false
  }
}

async function retirerMedicament(m) {
  try {
    await http.delete(`/consultations/medicaments/${m.id}`)
    toastSuccess('Prescription retirée.')
    await chargerDetail()
  } catch {
    toastError('Erreur lors du retrait.')
  }
}

function imprimerOrdonnance() {
  registreImprimable.value = 'ordonnance'
  nextTick(() => window.print())
  registreImprimable.value = null
}

// ── Examens (imagerie, laboratoire) ──
const nouvelExamenId = ref(null)
const nouvelExamenLibre = ref('')
const ajoutExamenEnCours = ref(false)
const prestationsCatalogue = ref([])

const optionsExamensCatalogue = computed(() => {
  const deja = new Set(
    (detail.value?.passage.prestations ?? []).map((l) => l.prestationId).filter(Boolean),
  )
  return prestationsCatalogue.value
    .filter((p) => p.actif && p.type !== 'CONSULTATION' && p.type !== 'MATERNITE' && !deja.has(p.id))
    .map((p) => ({ value: p.id, label: p.libelle }))
})

const examensPrescrits = computed(() =>
  (detail.value?.passage.prestations ?? []).filter(
    (l) => l.prestation?.type !== 'CONSULTATION' && l.prestation?.type !== 'MATERNITE',
  ),
)

async function chargerPrestations() {
  try {
    const { data } = await http.get('/prestations', {
      params: { perPage: 0, cliniqueId: cliniqueId.value },
    })
    prestationsCatalogue.value = Array.isArray(data) ? data : data.data ?? []
  } catch {
    prestationsCatalogue.value = []
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
    toastError(e.response?.data?.message || 'Impossible d’ajouter l’examen.')
  } finally {
    ajoutExamenEnCours.value = false
  }
}

async function ajouterExamenLibre() {
  const libelle = nouvelExamenLibre.value.trim()
  if (!libelle || !consultation.value) return
  ajoutExamenEnCours.value = true
  try {
    await http.post(`/consultations/${consultation.value.id}/examens/ajouter`, { libelle })
    toastSuccess('Examen externe ajouté à la prescription (non facturable).')
    nouvelExamenLibre.value = ''
    await chargerDetail()
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible d’ajouter l’examen.')
  } finally {
    ajoutExamenEnCours.value = false
  }
}

async function retirerExamen(e) {
  try {
    await http.delete(`/consultations/examens/${e.id}`)
    toastSuccess('Prescription d’examen retirée.')
    await chargerDetail()
  } catch (err) {
    toastError('Erreur lors du retrait.')
  }
}

// ── Helpers ──
function heure(d) {
  return d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateHeure(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function libelleModeEntree(m) {
  const map = {
    VENUE_DIRECTE: 'Venue d’elle-même',
    REFERE_CENTRE: 'Référée d’un centre',
    REFERE_TRADIPRATICIEN: 'Référée par un tradipraticien',
    AUTRE: 'Autre',
  }
  return m ? map[m] ?? m : '—'
}

function libelleVat(v) {
  const map = {
    NON_VACCINEE: 'Non vaccinée',
    INCOMPLETEMENT_VACCINEE: 'Incomplètement vaccinée',
    CORRECTEMENT_VACCINEE: 'Correctement vaccinée',
  }
  return v ? map[v] ?? v : '—'
}

function libelleTypeCpon(t) {
  const map = {
    IMMEDIATE_6_72H: 'Immédiate (6 à 72 h)',
    '6_10_JOURS': '6ᵉ à 10ᵉ jour',
    AUTRES_PERIODES: 'Autres périodes',
    '6_8_SEMAINES': '6ᵉ à 8ᵉ semaine',
  }
  return t ? map[t] ?? t : '—'
}

function libelleLieu(l) {
  return l === 'DOMICILE' ? 'Domicile' : l === 'ETABLISSEMENT' ? 'Établissement' : '—'
}

// ── Impression des registres ──
const registreImprimable = ref(null)

const cliniqueInfos = computed(() => ({
  regionNom: auth.user?.clinique?.regionNom ?? '',
  districtNom: auth.user?.clinique?.districtNom ?? '',
  immatriculation: auth.user?.clinique?.immatriculation ?? '',
}))

function ouiNon(v) {
  if (v === true) return 'Oui'
  if (v === false) return 'Non'
  return '—'
}

function imprimerRegistre(type) {
  registreImprimable.value = type
  nextTick(() => window.print())
  registreImprimable.value = null
}

onMounted(async () => {
  chargerFile()
  chargerMedicamentsEtPosologies()
  chargerListesParams(cliniqueId.value)
  try {
    const { data } = await http.get('/cliniques', { params: { perPage: 0 } })
    const liste = Array.isArray(data) ? data : data.data ?? []
    if (liste.length > 0) cliniqueAdresse.value = liste[0].adresse ?? ''
  } catch {
    /* facultatif */
  }
})
</script>

<style scoped>
.maternite-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
}
.maternite-header {
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
.brand { display: flex; align-items: center; gap: 12px; }
.brand-logo {
  width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;
  font-size: 21px; background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 13px;
}
.brand-text { display: flex; flex-direction: column; }
.brand-text strong { color: #fff; font-size: 16px; letter-spacing: 0.02em; }
.brand-text span { color: rgba(236, 253, 245, 0.75); font-size: 12px; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.date-pill {
  padding: 5px 13px; font-size: 12.5px; font-weight: 600; color: #ecfdf5;
  background: rgba(255, 255, 255, 0.14); border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px; text-transform: capitalize;
}
.btn-back { color: #fff; border-color: rgba(255, 255, 255, 0.45); }
.btn-back:hover { background: rgba(255, 255, 255, 0.16); }

.maternite-content {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 20px 24px;
}

.tabs-nav {
  display: flex; gap: 6px; margin-bottom: 18px;
  border-bottom: 2px solid #d5eee9; flex-wrap: wrap;
}
.tab-btn {
  padding: 10px 20px; font-size: 14px; font-weight: 700; font-family: inherit;
  color: #5f857f; background: transparent; border: none;
  border-bottom: 3px solid transparent; margin-bottom: -2px; cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.tab-btn:hover { color: #0f766e; }
.tab-btn.active { color: #0f766e; border-bottom-color: #0d9488; }

.fiche-barre {
  display: flex; justify-content: space-between; align-items: flex-end;
  gap: 16px; flex-wrap: wrap; margin-bottom: 14px;
}
.fiche-info {
  display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-end;
  background: #f0fdfa; border: 1px solid #c9ece5; border-radius: 10px;
  padding: 12px 14px; flex: 1;
}
.fiche-ligne { display: flex; flex-direction: column; gap: 2px; font-size: 13.5px; }
.fiche-label {
  font-size: 11.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--text-muted);
}
.fiche-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.code-chip {
  font-family: Consolas, monospace; font-weight: 700; color: #0f766e;
  background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px;
  padding: 2px 8px; font-size: 12.5px; width: fit-content;
}
.dossier-vide { padding: 10px 0; }
.section-title {
  font-size: 13px; font-weight: 700; color: #0f766e; text-transform: uppercase;
  letter-spacing: 0.05em; margin: 18px 0 10px; padding-bottom: 6px;
  border-bottom: 1px solid #ddf1ee;
}
.small-note { font-size: 13px; }
.resultats {
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
}
.resultats li {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.resultats li:last-child {
  border-bottom: none;
}
.resultat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.resultat-item > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13.5px;
}
.form-separator {
  margin: 14px 0 8px; padding: 7px 10px; background: #f0fdfa;
  border: 1px solid #c9ece5; border-radius: 8px; font-size: 12px; font-weight: 800;
  color: #0f766e; text-transform: uppercase; letter-spacing: 0.03em;
}

/* Impression : registres en paysage, ordonnance en portrait (pages nommées) */
@media screen {
  #ordo-print { position: fixed; left: -10000px; top: 0; }
  #cpn-print, #cpon-print, #acc-print, #pf-print { position: fixed; left: -10000px; top: 0; }
}
@page registre { size: A4 landscape; margin: 8mm 8mm; }
@page ordo { size: A4 portrait; margin: 16mm 14mm; }
#cpn-print, #cpon-print, #acc-print, #pf-print { page: registre; }
#ordo-print { page: ordo; }
/* ── Registres (A4 paysage, format officiel) ── */
.registre-a4 {
  width: 270mm;
  max-width: 100%;
  margin: 0 auto;
  background: #fff;
  color: #111;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 10px;
  line-height: 1.35;
}
.reg-entete {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}
.reg-gauche { text-align: left; }
.reg-ministere { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
.reg-devise { font-style: italic; font-size: 9px; letter-spacing: 2px; margin-top: 2px; }
.reg-droite { font-weight: 800; font-size: 11px; text-transform: uppercase; text-align: right; }
.reg-diis { text-align: center; font-size: 10px; font-weight: 700; margin-top: 4mm; }
.reg-sig { text-align: center; font-size: 13px; font-weight: 800; letter-spacing: 1px; margin-top: 2mm; }
.reg-titre {
  text-align: center; font-size: 13px; font-weight: 900; text-transform: uppercase;
  letter-spacing: 1px; text-decoration: underline; margin: 4mm 0 3mm;
}
.reg-infos { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-bottom: 3mm; font-size: 10px; }
.reg-table { width: 100%; border-collapse: collapse; font-size: 8px; }
.reg-table th, .reg-table td { border: 0.6px solid #111; padding: 1.5px 2px; text-align: left; }
.reg-table th { background: #eee; font-size: 7.2px; text-transform: uppercase; }
.reg-fiche { width: 100%; border-collapse: collapse; font-size: 10px; }
.reg-fiche td { border: 0.7px solid #111; padding: 4px 6px; vertical-align: top; }
.reg-fiche-lib {
  font-weight: 800; text-transform: uppercase; width: 42mm; background: #eee;
}
.reg-pied {
  text-align: center; font-size: 8px; color: #333;
  border-top: 0.6px solid #999; margin-top: 4mm; padding-top: 2px;
}
@media print {
  .registre-a4 { width: 100%; }
}
.ordo-a4 {
  width: 182mm; max-width: 100%; margin: 0 auto; background: #fff;
  padding: 8mm 10mm; font-family: 'Segoe UI', system-ui, sans-serif;
  color: #111; font-size: 12px; line-height: 1.35;
}
.ordo-a4-head { text-align: center; margin-bottom: 4px; }
.ordo-a4-head h1 {
  font-size: 16px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.5px; margin: 0;
}
.ordo-a4-head p { font-size: 11px; margin: 1px 0 0; color: #333; }
.ordo-a4-titre {
  text-align: center; font-size: 14px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1px; margin: 0 0 6px; text-decoration: underline;
}
.ordo-a4-info { margin-bottom: 4px; }
.ordo-a4-ligne { display: flex; gap: 10px; font-size: 12px; margin: 3px 0; }
.ordo-a4-label { font-weight: 700; min-width: 100px; flex-shrink: 0; }
.ordo-a4-table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 2px 0; }
.ordo-a4-table th, .ordo-a4-table td { border: 1px solid #111; padding: 4px 6px; text-align: left; }
.ordo-a4-table th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; }
.ordo-a4-sign { margin-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
.ordo-a4-sign-date { font-size: 12px; align-self: center; }
.ordo-a4-sign-doc { text-align: center; font-size: 12px; }
.ordo-a4-sign-doc p { margin: 0 0 2px; font-weight: 600; }
.ordo-a4-cachet {
  border: 1px solid #111; border-radius: 6px; width: 160px; height: 52px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: #555; font-style: italic;
}
@media print {
  .ordo-a4 { width: 100%; padding: 0; margin: 0; }
}
</style>
