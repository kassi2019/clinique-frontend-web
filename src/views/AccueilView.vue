<template>
  <div class="accueil-page">
    <!-- En-tête -->
    <header class="accueil-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">🏥</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>
              {{ posteConstante ? 'Poste Constantes' : 'Module Accueil — enregistrement des patients' }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <span class="date-pill">{{ todayLabel }}</span>
          <button
            v-if="peutBasculer"
            class="btn btn-outline btn-sm btn-bascule"
            @click="basculerPoste"
          >
            ⚡ Basculer vers {{ posteConstante ? 'Enregistrement' : 'Constante' }}
          </button>
          <button class="btn btn-outline btn-sm btn-back" @click="router.push({ name: 'home' })">
            ← Modules
          </button>
        </div>
      </div>
    </header>

    <main class="accueil-content">
      <!-- ============ Onglets ============ -->
      <nav class="tabs-nav">
        <button
          v-if="!posteConstante"
          class="tab-btn"
          :class="{ active: onglet === 'formulaire' }"
          @click="onglet = 'formulaire'"
        >
          Nouveau passage
        </button>
        <button
          class="tab-btn"
          :class="{ active: onglet === 'attente' }"
          @click="changerOnglet('attente')"
        >
          En attente de constante
          <span class="tab-count" :class="{ 'tab-count-actif': onglet === 'attente' }">{{ compteurs.attente }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: onglet === 'terminee' }"
          @click="changerOnglet('terminee')"
        >
          Constante terminée
          <span class="tab-count" :class="{ 'tab-count-actif': onglet === 'terminee' }">{{ compteurs.terminee }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: onglet === 'historique' }"
          @click="changerOnglet('historique')"
        >
          Historique
          <span class="tab-count" :class="{ 'tab-count-actif': onglet === 'historique' }">{{ compteurs.historique }}</span>
        </button>
      </nav>

      <!-- ============ Onglet : En attente de constante ============ -->
      <section v-if="onglet === 'attente'" class="card">
        <div class="card-header">
          <h2>En attente de constante</h2>
          <span class="count-pill">{{ total }} passage(s)</span>
        </div>

        <!-- Poste constantes : recherche rapide par code -->
        <div v-if="posteConstante" class="toolbar">
          <input
            v-model="rechercheCode"
            class="search-input"
            type="text"
            placeholder="Ou rechercher par code patient ou N° d'ordre (ex. B9M48Y, MED-004092026)…"
            @keyup.enter="rechercherParCode"
          />
          <button class="btn btn-outline btn-sm" :disabled="rechercheEnCours" @click="rechercherParCode">
            Rechercher
          </button>
        </div>

        <!-- Filtres de la liste -->
        <div class="toolbar">
          <input
            v-model="filtreRecherche"
            class="search-input"
            type="text"
            placeholder="Filtrer (nom, prénom, code, N° d'ordre)…"
            @input="onRechercheListe"
          />
          <select v-model="filtreService" @change="page = 1; chargerListe()">
            <option :value="null">Tous les services</option>
            <option v-for="s in services" :key="s.id" :value="s.id">{{ s.nom }}</option>
          </select>
        </div>

        <div v-if="loading" class="empty-state">Chargement…</div>
        <div v-else-if="error" class="alert alert-error">{{ error }}</div>
        <div v-else-if="passages.length === 0" class="empty-state">
          Aucun passage en attente de constante. 🎉
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N° ordre</th>
                <th>Code</th>
                <th>Patient</th>
                <th>Service</th>
                <th v-if="!posteConstante">Type</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pg in passages" :key="pg.id">
                <td><strong>{{ pg.numeroOrdre }}</strong></td>
                <td><span class="code-chip">{{ pg.patient.code }}</span></td>
                <td>{{ pg.patient.nom }} {{ pg.patient.prenom }}</td>
                <td>{{ pg.service?.nom }}</td>
                <td v-if="!posteConstante">
                  <span class="badge" :class="pg.typePatient === 'EXTERNE' ? 'badge-warning' : 'badge-muted'">
                    {{ pg.typePatient === 'EXTERNE' ? 'Externe' : 'Interne' }}
                  </span>
                </td>
                <td><span class="badge" :class="badgeStatut(pg.statut)">{{ labelStatut(pg.statut) }}</span></td>
                <td>
                  <div class="actions">
                    <button v-if="posteConstante" class="btn btn-primary btn-sm" @click="ouvrirConstantes(pg)">
                      ✍️ Saisir
                    </button>
                    <template v-else>
                      <button class="btn btn-outline btn-sm" @click="ouvrirModification(pg)">✏️ Modifier</button>
                      <button class="btn btn-outline btn-sm" @click="imprimerImprimante(pg.id)">🖨️ Ticket</button>
                    </template>
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
      </section>

      <!-- ============ Onglet : Constante terminée ============ -->
      <section v-else-if="onglet === 'terminee'" class="card">
        <div class="card-header">
          <h2>Constante terminée</h2>
          <span class="count-pill">{{ total }} passage(s)</span>
        </div>

        <!-- Filtres de la liste -->
        <div class="toolbar">
          <input
            v-model="filtreRecherche"
            class="search-input"
            type="text"
            placeholder="Filtrer (nom, prénom, code, N° d'ordre)…"
            @input="onRechercheListe"
          />
          <select v-model="filtreService" @change="page = 1; chargerListe()">
            <option :value="null">Tous les services</option>
            <option v-for="s in services" :key="s.id" :value="s.id">{{ s.nom }}</option>
          </select>
        </div>

        <div v-if="loading" class="empty-state">Chargement…</div>
        <div v-else-if="error" class="alert alert-error">{{ error }}</div>
        <div v-else-if="passages.length === 0" class="empty-state">
          Aucun passage avec constantes pour aujourd'hui.
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N° ordre</th>
                <th>Code</th>
                <th>Patient</th>
                <th>Service</th>
                <th v-if="!posteConstante">Statut</th>
                <th v-if="posteConstante">Constantes saisies</th>
                <th v-if="!posteConstante">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pg in passages" :key="pg.id">
                <td><strong>{{ pg.numeroOrdre }}</strong></td>
                <td><span class="code-chip">{{ pg.patient.code }}</span></td>
                <td>{{ pg.patient.nom }} {{ pg.patient.prenom }}</td>
                <td>{{ pg.service?.nom }}</td>
                <td v-if="!posteConstante">
                  <span class="badge" :class="badgeStatut(pg.statut)">{{ labelStatut(pg.statut) }}</span>
                </td>
                <td v-if="posteConstante" class="constantes-cell">
                  {{ resumeConstantes(pg) }}
                </td>
                <td v-if="!posteConstante">
                  <div class="actions">
                    <button class="btn btn-outline btn-sm" @click="ouvrirModification(pg)">✏️ Modifier</button>
                    <button class="btn btn-outline btn-sm" @click="imprimerImprimante(pg.id)">🖨️ Ticket</button>
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
      </section>

      <!-- ============ Onglet : Historique ============ -->
      <section v-else-if="onglet === 'historique'" class="card">
        <div class="card-header">
          <h2>Historique des passages</h2>
        </div>

        <div class="toolbar">
          <label class="periode-label">Du</label>
          <input v-model="filtreDebut" type="date" class="date-input" @change="page = 1; chargerListe()" />
          <label class="periode-label">Au</label>
          <input v-model="filtreFin" type="date" class="date-input" @change="page = 1; chargerListe()" />
          <input
            v-model="filtreRecherche"
            class="search-input"
            type="text"
            placeholder="Filtrer (nom, prénom, code, N° d'ordre)…"
            @input="onRechercheListe"
          />
          <select v-model="filtreService" @change="page = 1; chargerListe()">
            <option :value="null">Tous les services</option>
            <option v-for="s in services" :key="s.id" :value="s.id">{{ s.nom }}</option>
          </select>
          <span class="count-pill">{{ total }} passage(s)</span>
        </div>

        <div v-if="loading" class="empty-state">Chargement…</div>
        <div v-else-if="error" class="alert alert-error">{{ error }}</div>
        <div v-else-if="passages.length === 0" class="empty-state">
          Aucun passage sur cette période.
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>N° ordre</th>
                <th>Code du patient</th>
                <th>Patient</th>
                <th>Service</th>
                <th>Constantes</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pg in passages" :key="pg.id">
                <td>{{ formatDate(pg.createdAt) }}</td>
                <td><strong>{{ pg.numeroOrdre }}</strong></td>
                <td><span class="code-chip">{{ pg.patient.code }}</span></td>
                <td>{{ pg.patient.nom }} {{ pg.patient.prenom }}</td>
                <td>{{ pg.service?.nom }}</td>
                <td>
                  <span class="badge" :class="constantesRenseignees(pg) ? 'badge-success' : 'badge-warning'">
                    {{ constantesRenseignees(pg) ? '✓ Saisies' : 'En attente' }}
                  </span>
                </td>
                <td><span class="badge" :class="badgeStatut(pg.statut)">{{ labelStatut(pg.statut) }}</span></td>
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
      </section>

      <!-- ============ Onglet : Nouveau passage (enregistrement) ============ -->
      <section v-else class="card form-card">
        <div class="card-header"><h2>Nouveau passage</h2></div>
        <div class="field">
          <div class="segmented">
            <button
              type="button"
              class="seg-btn"
              :class="{ active: !patientExistant }"
              @click="basculerPatient(false)"
            >
              Nouveau patient
            </button>
            <button
              type="button"
              class="seg-btn"
              :class="{ active: patientExistant }"
              @click="basculerPatient(true)"
            >
              Patient existant
            </button>
          </div>
        </div>
        <p v-if="formError" class="alert alert-error">{{ formError }}</p>
        <form @submit.prevent="enregistrer">
          <!-- Patient existant : recherche -->
          <div v-if="patientExistant" class="field">
            <label>Rechercher le patient (nom, prénom, n° de dossier ou N° d'ordre)</label>
            <input
              v-model="recherchePatient"
              type="text"
              placeholder="Tapez au moins 2 caractères…"
              @input="onRecherchePatient"
            />
            <ul v-if="resultatsPatients.length" class="patient-results">
              <li v-for="pt in resultatsPatients" :key="pt.id" @click="choisirPatient(pt)">
                <strong>{{ pt.nom }} {{ pt.prenom }}</strong>
                <span>{{ pt.numeroDossier }} · code {{ pt.code }} · {{ pt.sexe || '—' }} · {{ pt.age || '?' }} ans</span>
              </li>
            </ul>
            <div v-if="patientChoisi" class="patient-choisi">
              ✓ {{ patientChoisi.nom }} {{ patientChoisi.prenom }}
              ({{ patientChoisi.numeroDossier }})
              <button type="button" class="btn btn-outline btn-sm" @click="patientChoisi = null">Changer</button>
              <button type="button" class="btn btn-outline btn-sm" @click="ouvrirAssurancePatient(patientChoisi.id)">
                🛡️ Assurance
              </button>
            </div>
          </div>

          <!-- Nouveau patient : identification -->
          <div v-else>
            <h3 class="section-title">Identification</h3>
            <div class="form-row">
              <div class="field champ-large">
                <label>Nom *</label>
                <input v-model.trim="form.nom" required />
              </div>
              <div class="field champ-large">
                <label>Prénom *</label>
                <input v-model.trim="form.prenom" required />
              </div>
              <div class="field">
                <label>Âge</label>
                <input v-model="form.age" type="number" min="0" max="150" placeholder="ans" />
              </div>
              <div class="field">
                <label>Sexe</label>
                <select v-model="form.sexe">
                  <option value="">—</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div class="field">
                <label>Ville</label>
                <input v-model.trim="form.ville" />
              </div>
              <div class="field">
                <label>Quartier</label>
                <input v-model.trim="form.quartier" />
              </div>
              <div class="field champ-large">
                <label>Profession</label>
                <input v-model.trim="form.profession" />
              </div>
              <div class="field champ-large">
                <label>Téléphone</label>
                <input v-model.trim="form.telephone" />
              </div>
            </div>
          </div>

          <h3 class="section-title">Passage</h3>
          <div class="form-row">
            <div class="field champ-large">
              <label>Service à consulter *</label>
              <SelectSearch
                v-model="form.serviceId"
                :options="optionsServices"
                placeholder="— Choisir un service —"
              />
            </div>
            <div class="field">
              <label>Type de patient</label>
              <select v-model="form.typePatient">
                <option value="INTERNE">Patient interne</option>
                <option value="EXTERNE">Patient externe</option>
              </select>
            </div>
            <div class="field">
              <label>Motif</label>
              <input v-model.trim="form.motif" placeholder="Ex : fièvre, suivi grossesse…" />
            </div>
          </div>
          <div class="form-row">
            <div v-if="consultationsDuService.length > 1" class="field champ-large">
              <label>Type de consultation *</label>
              <select v-model="form.consultationPrestationId" required>
                <option :value="null" disabled>— Choisir —</option>
                <option v-for="c in consultationsDuService" :key="c.id" :value="c.id">
                  {{ c.libelle }}
                </option>
              </select>
            </div>
            <div v-else-if="consultationsDuService.length === 1" class="field champ-large">
              <label>Consultation</label>
              <span class="consultation-seule-info">
                {{ consultationsDuService[0].libelle }}
              </span>
            </div>
          </div>
          <div v-if="form.typePatient === 'EXTERNE'" class="form-row">
            <div class="field">
              <label>Structure / professionnel référent</label>
              <input v-model.trim="form.referent" placeholder="Ex : CS de Yopougon, Dr Kouamé" />
            </div>
            <div v-if="actesDuService.length > 0" class="field">
              <label>Acte à payer (l'examen prescrit)</label>
              <SelectSearch
                v-model="form.actePrestationId"
                :options="optionsActes"
                placeholder="— Choisir l'examen de l'ordonnance —"
              />
            </div>
            <div class="field">
              <label>Précision sur la prestation (facultatif)</label>
              <input v-model.trim="form.prestationDemandee" placeholder="Ex : contrôle, suivi…" />
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="annulerFormulaire">
              🗑️ Annuler
            </button>
            <button class="btn btn-primary" type="submit" :disabled="saving">
              {{ saving ? 'Enregistrement…' : 'Enregistrer le passage' }}
            </button>
          </div>
        </form>
      </section>
    </main>

    <!-- ============ Modale : assurance du patient ============ -->
    <div v-if="modaleAssurance" class="modal-backdrop">
      <div class="modal">
        <h2>🛡️ Assurance du patient</h2>
        <div class="field">
          <label>Assurance *</label>
          <SelectSearch
            v-model="formPatientAssurance.assuranceId"
            :options="optionsAssurances"
            placeholder="— Choisir une assurance —"
          />
        </div>
        <div class="field">
          <label>Formule *</label>
          <SelectSearch
            v-model="formPatientAssurance.formuleId"
            :options="optionsFormulesAssurance"
            placeholder="— Choisir une formule —"
          />
        </div>
        <div class="form-row">
          <div class="field">
            <label>N° d'assuré</label>
            <input v-model.trim="formPatientAssurance.numeroAssure" />
          </div>
          <div class="field">
            <label>N° de carte</label>
            <input v-model.trim="formPatientAssurance.numeroCarte" />
          </div>
          <div class="field">
            <label>Assuré principal</label>
            <input v-model.trim="formPatientAssurance.nomAssurePrincipal" />
          </div>
          <div class="field">
            <label>Type de bénéficiaire</label>
            <select v-model="formPatientAssurance.typeBeneficiaire">
              <option value="">—</option>
              <option value="ASSURE">Assuré</option>
              <option value="CONJOINT">Conjoint</option>
              <option value="ENFANT">Enfant</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
          <div class="field">
            <label>Début de couverture</label>
            <input v-model="formPatientAssurance.dateDebut" type="date" />
          </div>
          <div class="field">
            <label>Fin de couverture</label>
            <input v-model="formPatientAssurance.dateFin" type="date" />
          </div>
        </div>

        <h3 class="section-title">Rattachements existants</h3>
        <div v-if="rattachementsPatient.length === 0" class="small-note text-muted">
          Aucun rattachement.
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Assurance</th>
                <th>Formule</th>
                <th>N° assuré</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rattachementsPatient" :key="r.id">
                <td>{{ r.assurance?.libelle }}</td>
                <td>{{ r.formule?.libelle }}</td>
                <td>{{ r.numeroAssure || '—' }}</td>
                <td>
                  <span class="badge" :class="r.statut === 'ACTIF' ? 'badge-success' : 'badge-muted'">
                    {{ r.statut === 'ACTIF' ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-outline btn-sm" @click="basculerRattachement(r)">
                    {{ r.statut === 'ACTIF' ? 'Désactiver' : 'Réactiver' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleAssurance = false">✖ Fermer</button>
          <button class="btn btn-primary" @click="enregistrerPatientAssurance">💾 Rattacher</button>
        </div>
      </div>
    </div>

    <!-- ============ Modale : saisie des constantes (poste constantes) ============ -->
    <div v-if="passageConstante" class="modal-backdrop">
      <div class="modal modal-lg">
        <h2>✍️ Constantes — {{ passageConstante.patient.nom }} {{ passageConstante.patient.prenom }}</h2>
        <p class="text-muted">
          {{ passageConstante.numeroOrdre }} · {{ passageConstante.patient.code }} · {{ passageConstante.service?.nom }}
        </p>
        <form @submit.prevent="enregistrerConstantes">
          <div class="form-row">
            <div class="field">
              <label>Taille (cm)</label>
              <input v-model.trim="formConstantes.taille" placeholder="ex : 165" />
            </div>
            <div class="field">
              <label>Température (T°)</label>
              <input v-model="formConstantes.temperature" type="number" step="0.1" min="30" max="45" placeholder="°C" />
            </div>
            <div class="field">
              <label>Pouls (bpm)</label>
              <input v-model="formConstantes.pouls" type="number" min="0" max="300" placeholder="ex : 72" />
            </div>
            <div class="field">
              <label>Tension art. gauche (TAg)</label>
              <input v-model.trim="formConstantes.tensionGauche" placeholder="ex : 12/8" />
            </div>
            <div class="field">
              <label>Tension art. droite (TAd)</label>
              <input v-model.trim="formConstantes.tensionDroite" placeholder="ex : 12/8" />
            </div>
            <div class="field">
              <label>Poids (kg)</label>
              <input v-model="formConstantes.poids" type="number" step="0.1" min="0" placeholder="ex : 62.5" />
            </div>
            <div class="field">
              <label>Périm. brachial (cm)</label>
              <input v-model="formConstantes.perimetreBrachial" placeholder="ex : 28" />
            </div>
            <div class="field">
              <label>Périm. crânien (cm)</label>
              <input v-model="formConstantes.perimetreCranien" placeholder="ex : 54" />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="passageConstante = null">✖ Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="savingConstante">
              {{ savingConstante ? 'Enregistrement…' : 'Enregistrer les constantes' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ Modale : passage créé ============ -->
    <div v-if="passageCree" class="modal-backdrop">
      <div class="modal modal-ticket">
        <h2>✓ Passage enregistré</h2>
        <div class="code-display">
          <span>Code patient (permanent)</span>
          <strong>{{ passageCree.patient.code }}</strong>
          <small>N° d'ordre {{ passageCree.numeroOrdre }} — valable 10 jours</small>
        </div>
        <p class="ticket-recap">
          {{ passageCree.patient.nom }} {{ passageCree.patient.prenom }} →
          {{ passageCree.service?.nom }}
        </p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="passageCree = null">✖ Fermer</button>
          <button class="btn btn-outline" @click="imprimer">🖥️ Imprimer (navigateur)</button>
          <button class="btn btn-primary" :disabled="impressionEnCours" @click="imprimerImprimante(passageCree.id)">
            🖨️ {{ impressionEnCours ? 'Impression…' : 'Imprimer (imprimante)' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Modale : modification d'un passage ============ -->
    <div v-if="editVisible" class="modal-backdrop">
      <div class="modal modal-lg">
        <h2>✏️ Modifier le passage — {{ editCible?.numeroOrdre }}</h2>
        <p v-if="editError" class="alert alert-error">{{ editError }}</p>
        <form @submit.prevent="enregistrerModification">
          <div class="edit-assurance">
            <button
              type="button"
              class="btn btn-outline btn-sm"
              @click="ouvrirAssurancePatient(editCible?.patient?.id)"
            >
              🛡️ Assurance du patient
            </button>
          </div>
          <h3 class="section-title">Patient</h3>
          <div class="form-row">
            <div class="field">
              <label>Nom *</label>
              <input v-model.trim="formEdit.nom" required />
            </div>
            <div class="field">
              <label>Prénom *</label>
              <input v-model.trim="formEdit.prenom" required />
            </div>
            <div class="field">
              <label>Âge</label>
              <input v-model="formEdit.age" type="number" min="0" max="150" />
            </div>
            <div class="field">
              <label>Sexe</label>
              <select v-model="formEdit.sexe">
                <option value="">—</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div class="field">
              <label>Ville</label>
              <input v-model.trim="formEdit.ville" />
            </div>
            <div class="field">
              <label>Quartier</label>
              <input v-model.trim="formEdit.quartier" />
            </div>
            <div class="field">
              <label>Profession</label>
              <input v-model.trim="formEdit.profession" />
            </div>
            <div class="field">
              <label>Téléphone</label>
              <input v-model.trim="formEdit.telephone" />
            </div>
          </div>

          <h3 class="section-title">Passage</h3>
          <div class="form-row">
            <div class="field">
              <label>Service à consulter *</label>
              <SelectSearch
                v-model="formEdit.serviceId"
                :options="optionsServices"
                placeholder="— Choisir un service —"
              />
            </div>
            <div class="field">
              <label>Type de patient</label>
              <select v-model="formEdit.typePatient">
                <option value="INTERNE">Patient interne</option>
                <option value="EXTERNE">Patient externe</option>
              </select>
            </div>
            <div class="field">
              <label>Motif</label>
              <input v-model.trim="formEdit.motif" />
            </div>
          </div>
          <div v-if="formEdit.typePatient === 'EXTERNE'" class="form-row">
            <div class="field">
              <label>Référent</label>
              <input v-model.trim="formEdit.referent" />
            </div>
            <div class="field">
              <label>Précision sur la prestation (facultatif)</label>
              <input v-model.trim="formEdit.prestationDemandee" />
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="editVisible = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="savingEdit">
              {{ savingEdit ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ Ticket imprimable (seul élément visible à l'impression) ============ -->
    <div v-if="ticket" id="ticket-print">
      <div class="ticket">
        <div class="ticket-head">
          <h1>{{ cliniqueNom }}</h1>
          <p v-if="cliniqueAdresse">{{ cliniqueAdresse }}</p>
        </div>
        <div class="ticket-sep"></div>
        <h2 class="ticket-title">TICKET DE PASSAGE</h2>
        <div class="ticket-code">
          <strong>{{ ticket.numeroOrdre }}</strong>
        </div>
        <div class="ticket-patient-row">
          <span class="ticket-avatar">👤</span>
          <span class="ticket-patient">{{ ticket.patient.nom }} {{ ticket.patient.prenom }}</span>
        </div>
        <div v-if="ticket.patient.age || ticket.patient.sexe" class="ticket-infos">
          {{ [ticket.patient.age ? ticket.patient.age + ' ans' : '', ticket.patient.sexe === 'M' ? 'Masculin' : ticket.patient.sexe === 'F' ? 'Féminin' : ''].filter(Boolean).join(' | ') }}
        </div>
        <div class="ticket-service">{{ ticket.service?.nom }}</div>
        <div class="ticket-date-label">Date de passage</div>
        <div class="ticket-date">{{ formatDateHeure(ticket.createdAt) }}</div>
        <div class="ticket-sep"></div>
        <div class="ticket-foot">Merci de votre visite</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import http from '../api/http'
import { toastError, toastInfo, toastSuccess } from '../utils/notifications'
import PaginationBar from '../components/PaginationBar.vue'
import SelectSearch from '../components/SelectSearch.vue'

const auth = useAuthStore()
const router = useRouter()

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')
const cliniqueAdresse = ref('')

// Poste de travail : service « Constante » (code CON).
// Basculable temporairement pour les agents ACC/CON (sans toucher à la base).
const serviceCode = computed(() => auth.user?.personnel?.service?.code)
const posteConstante = ref(serviceCode.value === 'CON')
// Le bouton « Basculer » est visible pour les agents Accueil/Constantes
// ET pour l'administrateur (pour vérifier/paramétrer les deux postes).
const peutBasculer = computed(
  () =>
    ['ACC', 'CON'].includes(serviceCode.value) ||
    auth.user?.role?.code === 'ADMINISTRATEUR',
)

function basculerPoste() {
  posteConstante.value = !posteConstante.value
  // Revenir sur l'onglet par défaut du poste cible
  onglet.value = posteConstante.value ? 'attente' : 'formulaire'
  page.value = 1
  chargerListe()
}

const services = ref([])
const prestationsList = ref([])
const passages = ref([])
const loading = ref(false)
const error = ref('')

// Compteurs des onglets (badges)
const compteurs = reactive({ attente: 0, terminee: 0, historique: 0 })

const optionsServices = computed(() =>
  services.value.map((s) => ({ value: s.id, label: s.nom })),
)

/** Consultations actives du service choisi : une seule est payable par passage. */
const consultationsDuService = computed(() =>
  prestationsList.value.filter(
    (p) => p.actif && p.type === 'CONSULTATION' && p.serviceId === form.serviceId,
  ),
)

/** Actes du service (échographies, examens…) : l'agent peut en choisir un à payer. */
const actesDuService = computed(() =>
  prestationsList.value.filter(
    (p) => p.actif && p.type !== 'CONSULTATION' && p.serviceId === form.serviceId,
  ),
)

const optionsActes = computed(() =>
  actesDuService.value.map((p) => ({
    value: p.id,
    label: p.libelle,
  })),
)

// Onglet actif par défaut : le premier de la barre selon le poste
const onglet = ref(posteConstante.value ? 'attente' : 'formulaire')
const filtreDebut = ref('')
const filtreFin = ref('')
const filtreRecherche = ref('')
const filtreService = ref(null)
let listeTimer = null
let refreshTimer = null

// Pagination des listes
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPages = ref(1)
const todayLabel = computed(() =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
)

// Formulaire de passage
const form = reactive({})
const formError = ref('')
const saving = ref(false)
const patientExistant = ref(false)
const recherchePatient = ref('')
const resultatsPatients = ref([])
const patientChoisi = ref(null)
let rechercheTimer = null

// Assurance du patient (rattachement à une assurance et une formule)
const modaleAssurance = ref(false)
const patientAssuranceCible = ref(null)
const assurancesListe = ref([])
const rattachementsPatient = ref([])
const formPatientAssurance = reactive({
  assuranceId: null, formuleId: null, numeroAssure: '', numeroCarte: '',
  nomAssurePrincipal: '', typeBeneficiaire: '', dateDebut: '', dateFin: '',
})

const optionsAssurances = computed(() =>
  assurancesListe.value
    .filter((a) => a.statut === 'ACTIF')
    .map((a) => ({ value: a.id, label: a.libelle })),
)
const optionsFormulesAssurance = computed(() => {
  const a = assurancesListe.value.find((x) => x.id === formPatientAssurance.assuranceId)
  return (a?.formules ?? [])
    .filter((f) => f.statut === 'ACTIF')
    .map((f) => ({ value: f.id, label: f.libelle }))
})

async function ouvrirAssurancePatient(patientId) {
  patientAssuranceCible.value = patientId
  Object.assign(formPatientAssurance, {
    assuranceId: null, formuleId: null, numeroAssure: '', numeroCarte: '',
    nomAssurePrincipal: '', typeBeneficiaire: '', dateDebut: '', dateFin: '',
  })
  try {
    const [a, r] = await Promise.all([
      http.get('/assurances', { params: { cliniqueId: cliniqueId.value } }),
      http.get(`/assurances/patients/${patientId}`),
    ])
    assurancesListe.value = a.data
    rattachementsPatient.value = r.data
  } catch {
    assurancesListe.value = []
    rattachementsPatient.value = []
  }
  modaleAssurance.value = true
}

async function enregistrerPatientAssurance() {
  if (!formPatientAssurance.assuranceId || !formPatientAssurance.formuleId) {
    toastError('Choisissez l\'assurance et la formule.')
    return
  }
  try {
    await http.post(`/assurances/patients/${patientAssuranceCible.value}`, {
      ...formPatientAssurance,
    })
    toastSuccess('Patient rattaché à l\'assurance.')
    await ouvrirAssurancePatient(patientAssuranceCible.value)
  } catch (e) {
    toastError(e.response?.data?.message || 'Rattachement impossible.')
  }
}

async function basculerRattachement(r) {
  try {
    await http.delete(`/assurances/patients/rattachements/${r.id}`)
    toastSuccess('Statut mis à jour.')
    await ouvrirAssurancePatient(patientAssuranceCible.value)
  } catch (e) {
    toastError(e.response?.data?.message || 'Opération impossible.')
  }
}

// Constantes (poste dédié)
const rechercheCode = ref('')
const passageConstante = ref(null)
const formConstantes = reactive({})
const rechercheEnCours = ref(false)
const savingConstante = ref(false)

// Passage créé + ticket
const passageCree = ref(null)
const ticket = ref(null)
const impressionEnCours = ref(false)

// Modification d'un passage
const editVisible = ref(false)
const editCible = ref(null)
const formEdit = reactive({})
const editError = ref('')
const savingEdit = ref(false)

const STATUTS = {
  CREE: { label: 'Créé', cls: 'badge-muted' },
  EN_ATTENTE_PAIEMENT: { label: 'En attente de paiement', cls: 'badge-warning' },
  ACTIF: { label: 'Actif', cls: 'badge-success' },
  UTILISE: { label: 'Utilisé', cls: 'badge-muted' },
  CLOTURE: { label: 'Clôturé', cls: 'badge-muted' },
  EXPIRE: { label: 'Expiré', cls: 'badge-danger' },
}
const badgeStatut = (s) => STATUTS[s]?.cls || 'badge-muted'
const labelStatut = (s) => STATUTS[s]?.label || s

function constantesRenseignees(pg) {
  return Boolean(
    pg.taille || pg.temperature || pg.pouls || pg.tensionGauche || pg.tensionDroite || pg.poids,
  )
}

/** Résumé compact des constantes pour la colonne du poste constantes. */
function resumeConstantes(pg) {
  const parts = []
  if (pg.temperature) parts.push(`T° ${pg.temperature}`)
  if (pg.pouls) parts.push(`Pouls ${pg.pouls}`)
  if (pg.tensionGauche) parts.push(`TA ${pg.tensionGauche}${pg.tensionDroite ? '/' + pg.tensionDroite : ''}`)
  if (pg.poids) parts.push(`Poids ${pg.poids} kg`)
  if (pg.taille) parts.push(`${pg.taille} cm`)
  return parts.join(' · ') || '—'
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR')
}

function formatDateHeure(d) {
  return new Date(d).toLocaleString('fr-FR')
}

function resetForm() {
  Object.keys(form).forEach((k) => delete form[k])
  Object.assign(form, {
    nom: '', prenom: '', age: '', sexe: '', ville: '', quartier: '',
    profession: '', telephone: '', serviceId: null, typePatient: 'INTERNE',
    motif: '', referent: '', prestationDemandee: '', consultationPrestationId: null,
    actePrestationId: null,
  })
}

function changerOnglet(o) {
  onglet.value = o
  page.value = 1
  chargerListe()
}

async function chargerListe() {
  if (!cliniqueId.value) return
  loading.value = true
  error.value = ''
  try {
    const params = {
      cliniqueId: cliniqueId.value,
      search: filtreRecherche.value || undefined,
      serviceId: filtreService.value ?? undefined,
      page: page.value,
      perPage: perPage.value,
    }
    if (onglet.value === 'historique') {
      params.debut = filtreDebut.value || undefined
      params.fin = filtreFin.value || undefined
    } else {
      // Données du jour par défaut (backend) : en attente / terminée
      params.constantes = onglet.value === 'attente' ? 'NON' : 'OUI'
    }
    const { data } = await http.get('/accueil/passages', { params })
    passages.value = data.data
    total.value = data.total
    totalPages.value = data.totalPages
    chargerCompteurs()
  } catch (e) {
    error.value = 'Impossible de charger les passages.'
  } finally {
    loading.value = false
  }
}

/** Nombre d'éléments de chaque onglet (badges). */
async function chargerCompteurs() {
  try {
    const [a, t, h] = await Promise.all([
      http.get('/accueil/passages', {
        params: { cliniqueId: cliniqueId.value, constantes: 'NON', perPage: 1 },
      }),
      http.get('/accueil/passages', {
        params: { cliniqueId: cliniqueId.value, constantes: 'OUI', perPage: 1 },
      }),
      http.get('/accueil/passages', {
        params: {
          cliniqueId: cliniqueId.value,
          debut: filtreDebut.value || undefined,
          fin: filtreFin.value || undefined,
          perPage: 1,
        },
      }),
    ])
    compteurs.attente = a.data.total
    compteurs.terminee = t.data.total
    compteurs.historique = h.data.total
  } catch {
    /* compteurs inchangés */
  }
}

function onRechercheListe() {
  clearTimeout(listeTimer)
  listeTimer = setTimeout(() => {
    page.value = 1
    chargerListe()
  }, 300)
}

function changerPage(p) {
  page.value = p
  chargerListe()
}

function changerPerPage(n) {
  perPage.value = n
  page.value = 1
  chargerListe()
}

/** Vide le formulaire d'enregistrement. */
function annulerFormulaire() {
  resetForm()
  patientChoisi.value = null
  recherchePatient.value = ''
  resultatsPatients.value = []
  formError.value = ''
  toastInfo('Formulaire réinitialisé.')
}

function basculerPatient(existant) {
  patientExistant.value = existant
  patientChoisi.value = null
  recherchePatient.value = ''
  resultatsPatients.value = []
}

function onRecherchePatient() {
  clearTimeout(rechercheTimer)
  rechercheTimer = setTimeout(async () => {
    if (recherchePatient.value.trim().length < 2) {
      resultatsPatients.value = []
      return
    }
    try {
      const { data } = await http.get('/accueil/patients', {
        params: { search: recherchePatient.value, cliniqueId: cliniqueId.value },
      })
      resultatsPatients.value = data
    } catch {
      resultatsPatients.value = []
    }
  }, 300)
}

function choisirPatient(pt) {
  patientChoisi.value = pt
  resultatsPatients.value = []
  recherchePatient.value = ''
}

async function enregistrer() {
  if (!cliniqueId.value) return
  formError.value = ''
  if (patientExistant.value && !patientChoisi.value) {
    formError.value = 'Sélectionnez un patient existant.'
    return
  }
  if (!patientExistant.value && !form.nom.trim()) {
    formError.value = 'Le nom du patient est obligatoire.'
    return
  }
  saving.value = true
  try {
    const payload = {
      cliniqueId: cliniqueId.value,
      serviceId: form.serviceId,
      typePatient: form.typePatient,
      motif: form.motif || undefined,
      referent: form.referent || undefined,
      prestationDemandee: form.prestationDemandee || undefined,
      consultationPrestationId: form.consultationPrestationId || undefined,
      actePrestationId: form.actePrestationId || undefined,
    }
    if (patientExistant.value) {
      payload.patientId = patientChoisi.value.id
    } else {
      payload.nouveauPatient = {
        nom: form.nom,
        prenom: form.prenom,
        age: form.age || undefined,
        sexe: form.sexe || undefined,
        ville: form.ville || undefined,
        quartier: form.quartier || undefined,
        profession: form.profession || undefined,
        telephone: form.telephone || undefined,
      }
    }
    const { data } = await http.post('/accueil/passages', payload)
    passageCree.value = data
    ticket.value = data
    if (data.impression) {
      if (data.impression.ok) {
        toastSuccess(`Ticket imprimé : ${data.impression.message}`)
      } else {
        toastError(`Impression auto : ${data.impression.message}`)
      }
    }
    resetForm()
    patientChoisi.value = null
    await chargerListe()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    saving.value = false
  }
}

// ─── Poste Constantes ─────────────────────────────────────────────

async function rechercherParCode() {
  const code = rechercheCode.value.trim().toUpperCase()
  if (!code) return
  rechercheEnCours.value = true
  try {
    const { data } = await http.get(`/accueil/passages/code/${encodeURIComponent(code)}`)
    ouvrirConstantes(data)
    rechercheCode.value = ''
  } catch (e) {
    toastError(
      e.response?.status === 404
        ? 'Aucun passage trouvé avec ce code.'
        : 'Erreur lors de la recherche du passage.',
    )
  } finally {
    rechercheEnCours.value = false
  }
}

function ouvrirConstantes(pg) {
  passageConstante.value = pg
  Object.keys(formConstantes).forEach((k) => delete formConstantes[k])
  Object.assign(formConstantes, {
    taille: pg.taille ?? '',
    temperature: pg.temperature ?? null,
    pouls: pg.pouls ?? null,
    tensionGauche: pg.tensionGauche ?? '',
    tensionDroite: pg.tensionDroite ?? '',
    poids: pg.poids ?? null,
    perimetreBrachial: pg.perimetreBrachial ?? '',
    perimetreCranien: pg.perimetreCranien ?? '',
  })
}

async function enregistrerConstantes() {
  if (!passageConstante.value) return
  savingConstante.value = true
  try {
    await http.patch(`/accueil/passages/${passageConstante.value.id}`, {
      taille: formConstantes.taille || undefined,
      temperature: formConstantes.temperature || undefined,
      pouls: formConstantes.pouls || undefined,
      tensionGauche: formConstantes.tensionGauche || undefined,
      tensionDroite: formConstantes.tensionDroite || undefined,
      poids: formConstantes.poids || undefined,
      perimetreBrachial: formConstantes.perimetreBrachial || undefined,
      perimetreCranien: formConstantes.perimetreCranien || undefined,
    })
    toastSuccess(
      `Constantes enregistrées — ${passageConstante.value.patient.nom} ${passageConstante.value.patient.prenom} (${passageConstante.value.numeroOrdre})`,
    )
    passageConstante.value = null
    await chargerListe()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  } finally {
    savingConstante.value = false
  }
}

// ─── Modification ─────────────────────────────────────────────────

function ouvrirModification(pg) {
  editCible.value = pg
  editError.value = ''
  Object.keys(formEdit).forEach((k) => delete formEdit[k])
  Object.assign(formEdit, {
    nom: pg.patient?.nom ?? '',
    prenom: pg.patient?.prenom ?? '',
    age: pg.patient?.age ?? '',
    sexe: pg.patient?.sexe ?? '',
    ville: pg.patient?.ville ?? '',
    quartier: pg.patient?.quartier ?? '',
    profession: pg.patient?.profession ?? '',
    telephone: pg.patient?.telephone ?? '',
    serviceId: pg.serviceId,
    typePatient: pg.typePatient,
    motif: pg.motif ?? '',
    referent: pg.referent ?? '',
    prestationDemandee: pg.prestationDemandee ?? '',
  })
  editVisible.value = true
}

async function enregistrerModification() {
  if (!editCible.value) return
  savingEdit.value = true
  editError.value = ''
  try {
    const { data } = await http.patch(`/accueil/passages/${editCible.value.id}`, {
      serviceId: formEdit.serviceId,
      typePatient: formEdit.typePatient,
      motif: formEdit.motif || undefined,
      referent: formEdit.referent || undefined,
      prestationDemandee: formEdit.prestationDemandee || undefined,
      patient: {
        nom: formEdit.nom,
        prenom: formEdit.prenom,
        age: formEdit.age || undefined,
        sexe: formEdit.sexe || undefined,
        ville: formEdit.ville || undefined,
        quartier: formEdit.quartier || undefined,
        profession: formEdit.profession || undefined,
        telephone: formEdit.telephone || undefined,
      },
    })
    editVisible.value = false
    if (ticket.value?.id === data.id) {
      ticket.value = data
      passageCree.value = data
    }
    await chargerListe()
    toastSuccess('Passage modifié.')
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de la modification.')
  } finally {
    savingEdit.value = false
  }
}

// ─── Impression ───────────────────────────────────────────────────

async function imprimerImprimante(passageId) {
  impressionEnCours.value = true
  try {
    const { data } = await http.post(`/impression/passages/${passageId}`)
    if (data.ok) {
      toastSuccess(data.message)
    } else {
      toastError(data.message)
    }
    if (data.bluetooth) {
      toastInfo('Ticket prêt pour Bluetooth')
      console.info('Ticket Bluetooth prêt', data.contenu)
    }
  } catch (e) {
    toastError(`Erreur d'impression : ${e.response?.data?.message || e.message}`)
  } finally {
    impressionEnCours.value = false
  }
}

function imprimer() {
  window.print()
}

onMounted(async () => {
  resetForm()
  // Historique : du jour et des 30 derniers jours par défaut (aujourd'hui inclus)
  const aujourdHui = new Date()
  filtreFin.value = aujourdHui.toISOString().slice(0, 10)
  filtreDebut.value = new Date(aujourdHui.getTime() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  chargerListe()
  // Affichage en temps réel : rafraîchissement automatique des listes
  refreshTimer = setInterval(() => {
    if (['attente', 'terminee', 'historique'].includes(onglet.value)) {
      chargerListe()
    }
  }, 15000)
  // Chaque liste est chargée indépendamment : une erreur sur l'une
  // (droits, réseau) ne doit pas vider les autres — en particulier la
  // liste déroulante des services.
  const [s, c, p] = await Promise.allSettled([
    http.get('/services', { params: { perPage: 0 } }),
    http.get('/cliniques'),
    http.get('/prestations', { params: { perPage: 0 } }),
  ])
  if (s.status === 'fulfilled') services.value = s.value.data.data
  if (p.status === 'fulfilled') prestationsList.value = p.value.data.data
  if (c.status === 'fulfilled')
    cliniqueAdresse.value = c.value.data.find((x) => x.id === cliniqueId.value)?.adresse ?? ''
})

// Service choisi : si une seule consultation, elle est retenue automatiquement ;
// si plusieurs, l'agent doit choisir le type de consultation.
watch(
  () => form.serviceId,
  () => {
    const cs = consultationsDuService.value
    form.consultationPrestationId = cs.length === 1 ? cs[0].id : null
  },
)

onUnmounted(() => {
  clearInterval(refreshTimer)
  clearTimeout(listeTimer)
  clearTimeout(rechercheTimer)
})
</script>

<style scoped>
.accueil-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
  display: flex;
  flex-direction: column;
}

/* ---------- Header ---------- */
.accueil-header {
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
.btn-bascule {
  color: #1b3a1e;
  background: linear-gradient(135deg, #b5dc5f, #8bc34a);
  border-color: rgba(255, 255, 255, 0.35);
  font-weight: 700;
}
.btn-bascule:hover {
  filter: brightness(1.06);
}

/* ---------- Contenu ---------- */
.accueil-content {
  flex: 1;
  width: 100%;
  margin: 0 auto;
  padding: 20px 24px;
}

/* ---------- Onglets ---------- */
.tabs-nav {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
  border-bottom: 2px solid #d5eee9;
  flex-wrap: wrap;
}
.tab-btn {
  padding: 10px 20px;
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

/* Badge compteur des onglets */
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

.count-pill {
  padding: 3px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: #0f766e;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
}
.periode-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}

/* ---------- Formulaire ---------- */
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
.segmented {
  display: flex;
  gap: 0;
  border: 1.5px solid #bfe3dd;
  border-radius: 10px;
  overflow: hidden;
  width: fit-content;
}
.seg-btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  border: none;
  background: #fbfefd;
  color: #0f766e;
  cursor: pointer;
  transition: background 0.15s;
}
.seg-btn.active {
  background: #0f766e;
  color: #fff;
}
.patient-results {
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 180px;
  overflow-y: auto;
  margin-top: 4px;
}
.patient-results li {
  padding: 9px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border);
}
.patient-results li:last-child {
  border-bottom: none;
}
.patient-results li:hover {
  background: var(--primary-light);
}
.patient-results span {
  font-size: 12px;
  color: var(--text-muted);
}
.patient-choisi {
  margin-top: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  font-size: 13.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

/* ---------- Liste ---------- */
.date-input {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
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
}
.constantes-cell {
  font-size: 13px;
  color: #334155;
}

/* ---------- Modale ticket ---------- */
.modal-ticket {
  text-align: center;
}
.code-display {
  margin: 18px 0;
  padding: 18px;
  background: #ecfdf5;
  border: 1.5px dashed #14b8a6;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.code-display span {
  font-size: 12.5px;
  color: #0f766e;
  font-weight: 600;
}
.code-display strong {
  font-size: 30px;
  letter-spacing: 3px;
  color: #134e4a;
  font-family: Consolas, monospace;
}
.code-display small {
  color: var(--text-muted);
}
.ticket-recap {
  font-size: 14px;
  color: var(--text);
  margin-bottom: 6px;
}

/* ---------- Ticket imprimé ---------- */
@media screen {
  #ticket-print {
    position: fixed;
    left: -10000px;
    top: 0;
  }
}
.ticket {
  max-width: 340px;
  margin: 24px auto;
  padding: 30px 22px;
  border: 1px solid #134e4a;
  border-radius: 8px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #1e293b;
  text-align: center;
}
.ticket-head h1 {
  font-size: 24px;
  color: #134e4a;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.ticket-head p {
  font-size: 13px;
  color: #475569;
  margin-top: 2px;
}
.ticket-sep {
  border-top: 1.5px dashed #94a3b8;
  margin: 16px 0;
}
.ticket-title {
  font-size: 16px;
  letter-spacing: 3px;
  color: #134e4a;
  margin: 0 0 26px;
  font-weight: 700;
}
.ticket-code {
  margin-bottom: 24px;
}
.ticket-code strong {
  font-size: 34px;
  letter-spacing: 1.5px;
  color: #134e4a;
  font-family: Consolas, monospace;
  font-weight: 800;
}
.ticket-patient-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 4px;
}
.ticket-avatar {
  font-size: 30px;
  line-height: 1;
}
.ticket-patient {
  font-size: 17px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.ticket-infos {
  font-size: 14px;
  color: #475569;
  margin-bottom: 8px;
}
.ticket-service {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 22px;
}
.ticket-date-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ticket-date {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  margin: 4px 0 0;
}
.ticket-foot {
  font-size: 14px;
  font-weight: 700;
  color: #134e4a;
}

/* Consultation unique du service : affichée en info */
.consultation-seule-info {
  padding: 8px 12px;
  background: #f0fdfa;
  border: 1px solid #c9ece5;
  border-radius: 8px;
  font-size: 13.5px;
  color: #0f766e;
  font-weight: 600;
}

/* Champs larges du formulaire de passage (occupent 2 colonnes) */
.champ-large {
  grid-column: span 2;
}
.edit-assurance {
  margin-bottom: 10px;
}
</style>
