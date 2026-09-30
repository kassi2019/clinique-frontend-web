<template>
  <div class="caisse-page">
    <!-- En-tête -->
    <header class="caisse-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">💰</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Caisse — paiement des prestations</span>
          </div>
        </div>
        <div class="header-actions">
          <span class="date-pill">{{ todayLabel }}</span>
          <button
            class="btn btn-outline btn-sm btn-bascule"
            @click="router.push({ name: 'pharmacie' })"
          >
            💊 Pharmacie
          </button>
          <button
            class="btn btn-outline btn-sm btn-back"
            @click="router.push({ name: 'home' })"
          >
            ← Modules
          </button>
        </div>
      </div>
    </header>

    <main class="caisse-content">
      <!-- File de la caisse : en attente de paiement / payés du jour / recherche -->
      <nav v-if="!passageCourant" class="tabs-nav">
        <button
          class="tab-btn"
          :class="{ active: vueFile === 'attente' }"
          @click="
            vueFile = 'attente';
            chargerFile();
          "
        >
          💰 En attente de paiement
          <span
            class="tab-count"
            :class="{ 'tab-count-actif': vueFile === 'attente' }"
            >{{ file.attente.length }}</span
          >
        </button>
        <button
          class="tab-btn"
          :class="{ active: vueFile === 'payes' }"
          @click="
            vueFile = 'payes';
            chargerPayes();
          "
        >
          ✅ Payés du jour
        </button>
        <button
          class="tab-btn"
          :class="{ active: vueFile === 'credits' }"
          @click="
            vueFile = 'credits';
            chargerCredits();
          "
        >
          🎫 Crédits / Cas sociaux
          <span
            class="tab-count"
            :class="{ 'tab-count-actif': vueFile === 'credits' }"
            >{{ credits.total }}</span
          >
        </button>
        <button
          class="tab-btn"
          :class="{ active: vueFile === 'recherche' }"
          @click="vueFile = 'recherche'"
        >
          🔍 Recherche par code
        </button>
      </nav>

      <!-- Patients en attente de paiement -->
      <section v-if="!passageCourant && vueFile === 'attente'" class="card">
        <div class="card-header">
          <h2>Patients à encaisser (par ordre d'arrivée)</h2>
          <input
            v-model="filtreJourFile"
            type="date"
            class="search-input"
            style="max-width: 160px"
            title="Vide = tous les jours"
            @change="chargerFile"
          />
        </div>
        <div v-if="file.attente.length === 0" class="empty-state">
          Aucun patient en attente de paiement.
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>N° d'ordre</th>
                <th>Service</th>
                <th>À payer</th>
                <th>Prestations</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in file.attente" :key="p.id">
                <td>{{ i + 1 }}</td>
                <td>
                  <strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong>
                </td>
                <td>{{ p.numeroOrdre }}</td>
                <td>{{ p.service?.nom || "—" }}</td>
                <td>
                  <strong>{{ p.totalAPayer.toLocaleString("fr-FR") }} F</strong>
                </td>
                <td>{{ p.nbLignes }}</td>
                <td>
                  <button
                    class="btn btn-primary btn-sm"
                    @click="choisirPassageFile(p)"
                  >
                    💰 Encaisser
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Payés du jour -->
      <section v-else-if="!passageCourant && vueFile === 'payes'" class="card">
        <div class="card-header"><h2>Paiements du jour</h2></div>
        <div v-if="file.payes.length === 0" class="empty-state">
          Aucun paiement aujourd'hui.
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Heure</th>
                <th>Patient</th>
                <th>N° d'ordre</th>
                <th>Reçu</th>
                <th>Mode</th>
                <th>Montant</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in file.payes" :key="p.id">
                <td>{{ formatHeure(p.createdAt) }}</td>
                <td>
                  <strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong>
                </td>
                <td>{{ p.numeroOrdre }}</td>
                <td>{{ p.numeroRecu }}</td>
                <td>{{ p.modePaiement }}</td>
                <td>
                  <strong>{{ p.montant.toLocaleString("fr-FR") }} F</strong>
                </td>
                <td>
                  <div class="actions">
                    <button
                      class="btn btn-outline btn-sm"
                      @click="imprimerRecu(p.id)"
                    >
                      🖨️ Therm.
                    </button>
                    <button
                      class="btn btn-outline btn-sm"
                      @click="imprimerRecuA4(p.id)"
                    >
                      📄 A4
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Recherche unique (§6.1) -->
      <section
        v-if="!passageCourant && vueFile === 'recherche'"
        class="card search-card"
      >
        <div class="toolbar">
          <input
            v-model="recherche"
            class="search-input"
            type="text"
            placeholder="Rechercher par code dossier, nom ou N° d'ordre…"
            @input="onRecherche"
          />
        </div>
        <ul v-if="resultats.length && !passageCourant" class="resultats">
          <li v-for="p in resultats" :key="p.id" @click="choisirPassage(p)">
            <strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong>
            <span
              >{{ p.numeroOrdre }} · code {{ p.patient.code }} ·
              {{ p.service?.nom }} · {{ labelStatut(p.statut) }}</span
            >
          </li>
        </ul>
      </section>

      <!-- Fiche patient courante -->
      <section v-if="passageCourant" class="card fiche-card">
        <div v-if="detail?.assurancePatient" class="assurance-banniere">
          🛡️ <strong>{{ detail.assurancePatient.assurance.libelle }}</strong> —
          {{ detail.assurancePatient.formule.libelle }}
          <span v-if="detail.assurancePatient.numeroAssure">
            · N° assuré {{ detail.assurancePatient.numeroAssure }}
          </span>
          <span
            v-if="detail.assurancePatient.typeBeneficiaire"
            class="text-muted"
          >
            · {{ labelBeneficiaire(detail.assurancePatient.typeBeneficiaire) }}
          </span>
        </div>
        <div class="fiche-info">
          <div class="fiche-ligne">
            <span class="fiche-label">Patient</span>
            <strong
              >{{ passageCourant.patient.nom }}
              {{ passageCourant.patient.prenom }}</strong
            >
          </div>
          <div class="fiche-ligne">
            <span class="fiche-label">Code dossier patient</span>
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
            <span class="fiche-label">Statut</span>
            <span class="badge" :class="badgeStatut(passageCourant.statut)">{{
              labelStatut(passageCourant.statut)
            }}</span>
          </div>
        </div>
        <button
          class="btn btn-outline btn-sm"
          @click="
            passageCourant = null;
            resultats = [];
            recherche = '';
            chargerFile();
            chargerPayes();
          "
        >
          ✕ Changer de patient
        </button>
      </section>

      <!-- Tickets de crédit / cas sociaux (impayés) -->
      <section v-if="!passageCourant && vueFile === 'credits'" class="card">
        <div class="card-header">
          <h2>Tickets de crédit et cas sociaux à solder</h2>
          <button class="btn btn-outline btn-sm" @click="chargerCredits">🔄 Actualiser</button>
        </div>
        <div v-if="credits.data.length === 0" class="empty-state">
          Aucun ticket de crédit ou cas social en cours.
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Patiente / Patient</th>
                <th>N° d'ordre</th>
                <th>Type</th>
                <th>Montant dû</th>
                <th>Motif</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in credits.data" :key="c.id">
                <td><strong>{{ c.numero }}</strong></td>
                <td>
                  {{ c.passage?.patient?.nom }} {{ c.passage?.patient?.prenom }}
                </td>
                <td>{{ c.passage?.numeroOrdre || "—" }}</td>
                <td>
                  <span
                    class="badge"
                    :class="c.type === 'CAS_SOCIAL' ? 'badge-muted' : 'badge-warning'"
                  >
                    {{ c.type === "CAS_SOCIAL" ? "Cas social" : "Crédit" }}
                  </span>
                </td>
                <td>
                  <strong>{{ Number(c.montantTotal).toLocaleString("fr-FR") }} F</strong>
                </td>
                <td>{{ c.motif || "—" }}</td>
                <td>
                  <div class="actions">
                    <button
                      v-if="c.type === 'CREDIT'"
                      class="btn btn-outline btn-sm"
                      title="Ouvrir le passage pour encaisser le crédit"
                      @click="ouvrirPassageParId(c.passageId)"
                    >
                      💵 Encaisser
                    </button>
                    <button
                      class="btn btn-outline btn-sm"
                      title="Annuler le ticket (les prestations repassent en attente)"
                      @click="annulerCredit(c)"
                    >
                      ✕ Annuler
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div v-if="passageCourant" class="caisse-grid">
        <!-- ============ Prestations à régler ============ -->
        <section class="card">
          <div class="card-header">
            <h2>Prestations à régler</h2>
            <button class="btn btn-outline btn-sm" @click="ouvrirAjout">
              + Ajouter une prestation
            </button>
          </div>

          <div v-if="detailLoading" class="empty-state chargement">Chargement…</div>
          <div
            v-else-if="!detail || detail.prestations.length === 0"
            class="empty-state"
          >
            Aucune prestation pour ce passage.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width: 36px"></th>
                  <th>Prestation</th>
                  <th>Service</th>
                  <th>Montant (FCFA)</th>
                  <th>État</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="l in detail.prestations"
                  :key="l.id"
                  :class="{
                    'ligne-payee':
                      l.statut === 'PAYEE' || l.statut === 'ANNULEE',
                    'ligne-non-prescrite':
                      l.statut === 'NON_PRESCRITE' || l.statut === 'EXTERNE',
                  }"
                >
                  <td>
                    <input
                      v-if="l.statut === 'EN_ATTENTE' || l.statut === 'CREDIT'"
                      type="checkbox"
                      :checked="lignesCochees.has(l.id)"
                      @change="toggleLigne(l.id, $event.target.checked)"
                    />
                  </td>
                  <td>{{ l.libelle }}</td>
                  <td>{{ l.service?.nom || "—" }}</td>
                  <td>
                    {{
                      l.statut === "EXTERNE"
                        ? "—"
                        : l.montant.toLocaleString("fr-FR")
                    }}
                    <div v-if="l.couverture" class="partage-assurance">
                      <span class="part-assurance"
                        >Assurance
                        {{
                          l.couverture.partAssurance.toLocaleString("fr-FR")
                        }}
                        F</span
                      >
                      <span class="part-patient"
                        >Patient
                        {{
                          l.couverture.partPatient.toLocaleString("fr-FR")
                        }}
                        F</span
                      >
                      <span class="part-taux">({{ l.couverture.taux }} %)</span>
                    </div>
                  </td>
                  <td>
                    <span
                      v-if="l.statut === 'NON_PRESCRITE'"
                      class="badge badge-muted"
                      title="Cette prestation doit d'abord être prescrite par le médecin"
                    >
                      Pas encore prescrite
                    </span>
                    <span
                      v-else-if="l.statut === 'EXTERNE'"
                      class="badge badge-muted"
                      title="Examen réalisé hors clinique — non facturable"
                    >
                      Externe (non facturable)
                    </span>
                    <span
                      v-else-if="l.statut === 'CREDIT'"
                      class="badge badge-warning"
                      title="Pris en charge à crédit — encaissable plus tard"
                    >
                      Crédit
                    </span>
                    <span
                      v-else-if="l.statut === 'CAS_SOCIAL'"
                      class="badge badge-muted"
                      title="Pris en charge en cas social (non remboursable)"
                    >
                      Cas social
                    </span>
                    <span
                      v-else
                      class="badge"
                      :class="
                        l.statut === 'PAYEE'
                          ? 'badge-success'
                          : l.statut === 'ANNULEE'
                            ? 'badge-danger'
                            : 'badge-warning'
                      "
                    >
                      {{
                        l.statut === "PAYEE"
                          ? "Payée"
                          : l.statut === "ANNULEE"
                            ? "Annulée"
                            : "En attente"
                      }}
                    </span>
                  </td>
                  <td>
                    <button
                      v-if="l.statut === 'EN_ATTENTE'"
                      class="btn btn-danger btn-sm"
                      title="Retirer"
                      @click="retirerLigne(l)"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Récapitulatif + encaissement -->
          <div class="recap">
            <div class="recap-lignes">
              <div class="recap-item">
                <span>Sous-total</span>
                <strong>{{ sousTotal.toLocaleString("fr-FR") }} FCFA</strong>
              </div>
              <div v-if="partAssuranceTotale > 0" class="recap-item">
                <span>Part assurance</span>
                <strong class="part-assurance"
                  >{{
                    partAssuranceTotale.toLocaleString("fr-FR")
                  }}
                  FCFA</strong
                >
              </div>
              <div v-if="partAssuranceTotale > 0" class="recap-item">
                <span>Part patient</span>
                <strong class="part-patient"
                  >{{ partPatientTotale.toLocaleString("fr-FR") }} FCFA</strong
                >
              </div>
              <div class="recap-item recap-total">
                <span>Total à payer par le patient</span>
                <strong
                  >{{ partPatientTotale.toLocaleString("fr-FR") }} FCFA</strong
                >
              </div>
            </div>
            <div v-if="partAssuranceTotale > 0" class="taux-exceptionnel">
              <label>Taux exceptionnel (optionnel) :</label>
              <input
                v-model.number="tauxExceptionnel"
                type="number"
                min="0"
                max="100"
                class="taux-input"
                placeholder="Auto"
              />
              <input
                v-model.trim="motifTaux"
                class="motif-input"
                placeholder="Motif si taux modifié…"
              />
            </div>
            <div class="encaissement">
              <select v-model="modePaiement" class="mode-select">
                <option value="ESPECES">💵 Espèces</option>
                <option value="MOBILE_MONEY">📱 Mobile Money</option>
                <option value="CARTE">💳 Carte bancaire</option>
              </select>
              <button
                class="btn btn-primary btn-encaisser"
                :disabled="encaissementEnCours || lignesCochees.size === 0"
                @click="encaisser"
              >
                {{ encaissementEnCours ? "Encaissement…" : "💵 Encaisser" }}
              </button>
            </div>
            <div class="encaissement" style="margin-top: 10px">
              <span class="text-muted" style="font-size: 12.5px">
                Patient indigent ou accompagnants pas encore arrivés ? Prise en charge sans paiement :
              </span>
              <button
                class="btn btn-outline btn-credit"
                :disabled="encaissementEnCours || lignesCochees.size === 0"
                title="Ticket de crédit : la dette est encaissable plus tard"
                @click="creerCredit('CREDIT')"
              >
                🎫 Crédit
              </button>
              <button
                class="btn btn-outline btn-cas-social"
                :disabled="encaissementEnCours || lignesCochees.size === 0"
                title="Cas social : prise en charge non remboursable (indigent)"
                @click="creerCredit('CAS_SOCIAL')"
              >
                🤝 Cas social
              </button>
            </div>
          </div>
        </section>

        <!-- ============ Historique des paiements ============ -->
        <section class="card">
          <div class="card-header">
            <h2>Historique des paiements</h2>
          </div>
          <div
            v-if="!detail || detail.paiements.length === 0"
            class="empty-state"
          >
            Aucun paiement enregistré pour ce passage.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N° reçu</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Mode</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in detail.paiements" :key="p.id">
                  <td>
                    <strong>{{ p.numeroRecu }}</strong>
                  </td>
                  <td>{{ formatDateHeure(p.createdAt) }}</td>
                  <td>{{ p.montantTotal.toLocaleString("fr-FR") }} FCFA</td>
                  <td>{{ labelMode(p.modePaiement) }}</td>
                  <td>
                    <span
                      class="badge"
                      :class="
                        p.statut === 'VALIDE' ? 'badge-success' : 'badge-danger'
                      "
                    >
                      {{ p.statut === "VALIDE" ? "Validé" : "Annulé" }}
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      <button
                        v-if="p.statut === 'VALIDE'"
                        class="btn btn-outline btn-sm"
                        @click="imprimerRecu(p.id)"
                      >
                        🖨️ Therm.
                      </button>
                      <button
                        v-if="p.statut === 'VALIDE'"
                        class="btn btn-outline btn-sm"
                        @click="imprimerRecuA4(p.id)"
                      >
                        📄 A4
                      </button>
                      <button
                        v-if="p.statut === 'VALIDE' && estAdmin"
                        class="btn btn-danger btn-sm"
                        @click="annulerPaiement(p)"
                      >
                        Annuler
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>

    <!-- ============ Modale : ajout de prestation ============ -->
    <div v-if="ajoutVisible" class="modal-backdrop">
      <div class="modal">
        <h2>Ajouter une prestation</h2>
        <p v-if="ajoutError" class="alert alert-error">{{ ajoutError }}</p>
        <form @submit.prevent="confirmerAjout">
          <div class="field">
            <label>Filtrer par service</label>
            <SelectSearch
              v-model="ajoutFiltreService"
              :options="optionsServices"
              placeholder="Tous les services"
            />
          </div>
          <div class="field">
            <label>Prestation *</label>
            <SelectSearch
              v-model="ajoutPrestationId"
              :options="optionsPrestationsFiltrees"
              placeholder="— Choisir —"
            />
          </div>
          <div class="modal-actions">
            <button
              type="button"
              class="btn btn-outline"
              @click="ajoutVisible = false"
            >
              ✖ Annuler
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="ajoutEnCours"
            >
              {{ ajoutEnCours ? "Ajout…" : "Ajouter" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ Modale : paiement effectué ============ -->
    <div v-if="paiementEffectue" class="modal-backdrop">
      <div class="modal modal-ticket">
        <h2>✓ Paiement enregistré</h2>
        <div class="code-display">
          <span>Reçu</span>
          <strong>{{ paiementEffectue.paiement.numeroRecu }}</strong>
          <small>
            {{ paiementEffectue.patient?.nom }}
            {{ paiementEffectue.patient?.prenom }} — Total :
            {{
              paiementEffectue.paiement.montantTotal.toLocaleString("fr-FR")
            }}
            FCFA
          </small>
        </div>
        <p
          v-if="paiementEffectue.impression && !paiementEffectue.impression.ok"
          class="alert alert-error"
        >
          Impression auto : {{ paiementEffectue.impression.message }}
        </p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="paiementEffectue = null">
            ✖ Fermer
          </button>
          <button class="btn btn-outline" @click="imprimerRecuNavigateur">
            🖥️ Reçu navigateur
          </button>
          <button
            class="btn btn-outline"
            @click="imprimerRecu(paiementEffectue.paiement.id)"
          >
            🖨️ Reçu imprimante (thermique)
          </button>
          <button
            class="btn btn-primary"
            @click="imprimerRecuA4(paiementEffectue.paiement.id)"
          >
            📄 Reçu A4 (logo + cachet)
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Reçu imprimable (navigateur, format thermique) ============ -->
    <div v-if="recuVisuel && zoneImpression === 'thermique'" id="recu-print">
      <div class="recu">
        <div class="recu-head">
          <h1>{{ cliniqueNom }}</h1>
        </div>
        <div class="recu-sep"></div>
        <h2 class="recu-title">REÇU DE PAIEMENT</h2>
        <div class="recu-numero">{{ recuVisuel.numeroRecu }}</div>
        <div class="recu-sep"></div>
        <div class="recu-infos">
          <div>
            <strong
              >Patient : {{ recuVisuel.patient?.nom }}
              {{ recuVisuel.patient?.prenom }}</strong
            >
          </div>
          <div>
            Code Dossier : {{ recuVisuel.patient?.code }} · N° ordre :
            {{ recuVisuel.passage?.numeroOrdre }}
          </div>
        </div>
        <div class="recu-sep"></div>
        <table class="recu-table">
          <tr v-for="l in recuVisuel.lignes" :key="l.id">
            <td>{{ l.libelle }}</td>
            <td class="recu-montant">
              {{ l.montant.toLocaleString("fr-FR") }} F
            </td>
          </tr>
        </table>
        <div class="recu-sep"></div>
        <div class="recu-total">
          TOTAL : {{ recuVisuel.montantTotal.toLocaleString("fr-FR") }} FCFA
        </div>
        <div v-if="recuVisuel.partAssurance != null" class="recu-infos">
          <div class="part-assurance">
            Part assurance :
            {{ recuVisuel.partAssurance.toLocaleString("fr-FR") }} FCFA
          </div>
          <div class="part-patient">
            Part patient :
            {{ (recuVisuel.partPatient ?? 0).toLocaleString("fr-FR") }} FCFA
          </div>
        </div>
        <div class="recu-infos">
          <div>Mode : {{ labelMode(recuVisuel.modePaiement) }}</div>
          <div>{{ formatDateHeure(recuVisuel.createdAt) }}</div>
        </div>
        <div class="recu-sep"></div>
        <div class="recu-foot">Merci de votre visite</div>
      </div>
    </div>

    <!-- ============ Reçu A4 (logo, cachet, caissière) ============ -->
    <div v-if="recuA4 && zoneImpression === 'a4'" id="recu-a4-print">
      <div class="recu-a4">
        <div class="recu-a4-entete">
          <img :src="logoClinique" alt="Logo" class="recu-a4-logo" />
          <div class="recu-a4-entete-texte">
            <h1>{{ recuA4.clinique?.nom || cliniqueNom }}</h1>
            <p v-if="recuA4.clinique?.adresse">{{ recuA4.clinique.adresse }}</p>
            <p v-if="recuA4.clinique?.telephone">
              Tél : {{ recuA4.clinique.telephone }}
            </p>
          </div>
        </div>
        <div class="recu-a4-regle"></div>
        <h2 class="recu-a4-titre">REÇU DE PAIEMENT</h2>
        <div class="recu-a4-numero">
          N° {{ recuA4.numeroRecu }} — {{ formatDateHeure(recuA4.createdAt) }}
        </div>
        <table class="recu-a4-infos">
          <tr>
            <td class="recu-a4-lib">Patient</td>
            <td>
              <strong
                >{{ recuA4.passage?.patient?.nom }}
                {{ recuA4.passage?.patient?.prenom }}</strong
              >
            </td>
            <td class="recu-a4-lib">Code Dossier</td>
            <td>{{ recuA4.passage?.patient?.code }}</td>
          </tr>
          <tr>
            <td class="recu-a4-lib">N° d'ordre</td>
            <td>{{ recuA4.passage?.numeroOrdre }}</td>
            <td class="recu-a4-lib">Mode</td>
            <td>{{ labelMode(recuA4.modePaiement) }}</td>
          </tr>
        </table>
        <table class="recu-a4-table">
          <thead>
            <tr>
              <th>Prestation</th>
              <th class="recu-a4-montant">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in recuA4.lignes" :key="l.id">
              <td>{{ l.libelle }}</td>
              <td class="recu-a4-montant">
                {{ l.montant.toLocaleString("fr-FR") }} F
              </td>
            </tr>
          </tbody>
        </table>
        <div class="recu-a4-total">
          TOTAL : {{ recuA4.montantTotal.toLocaleString("fr-FR") }} FCFA
        </div>
        <div v-if="recuA4.partAssurance != null" class="recu-a4-parts">
          Part assurance :
          {{ recuA4.partAssurance.toLocaleString("fr-FR") }} FCFA · Part patient
          : {{ (recuA4.partPatient ?? 0).toLocaleString("fr-FR") }} FCFA
        </div>
        <div class="recu-a4-regle"></div>
        <div class="recu-a4-signature">
          <div>
            <div class="recu-a4-sign-ligne"></div>
            <div class="recu-a4-sign-nom">La Caissière / Le Caissier</div>
            <div class="recu-a4-sign-qui">
              {{ recuA4.caissier?.personnel?.prenom }}
              {{
                recuA4.caissier?.personnel?.nom || recuA4.caissier?.matricule
              }}
            </div>
          </div>
          <div class="recu-a4-cachet">Signature et cachet</div>
        </div>
        <div class="recu-a4-merci">♥ Merci de votre visite ♥</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import Swal from "sweetalert2";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import http from "../api/http";
import { toastError, toastSuccess } from "../utils/notifications";
import SelectSearch from "../components/SelectSearch.vue";
import logoClinique from "../assets/logoclinique.jpeg";

const auth = useAuthStore();
const router = useRouter();

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null);
const cliniqueNom = computed(
  () => auth.user?.clinique?.nom || "Gestion Clinique",
);
const estAdmin = computed(() => auth.user?.role?.code === "ADMINISTRATEUR");

const todayLabel = computed(() =>
  new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
);

const STATUTS = {
  CREE: { label: "Créé", cls: "badge-muted" },
  EN_ATTENTE_PAIEMENT: {
    label: "En attente de paiement",
    cls: "badge-warning",
  },
  ACTIF: { label: "Actif", cls: "badge-success" },
  UTILISE: { label: "Utilisé", cls: "badge-muted" },
  CLOTURE: { label: "Clôturé", cls: "badge-muted" },
  EXPIRE: { label: "Expiré", cls: "badge-danger" },
};
const badgeStatut = (s) => STATUTS[s]?.cls || "badge-muted";
const labelStatut = (s) => STATUTS[s]?.label || s;

const MODES = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
};
const labelMode = (m) => MODES[m] || m;

// Recherche + passage courant
const recherche = ref("");
const resultats = ref([]);
const passageCourant = ref(null);
let rechercheTimer = null;

// ── File de la caisse (même logique que la consultation) ──
const vueFile = ref("attente");
const file = ref({ attente: [], payes: [] });
const filtreJourFile = ref(new Date().toISOString().slice(0, 10));

async function chargerFile() {
  try {
    const { data } = await http.get("/caisse/file-attente", {
      params: {
        cliniqueId: cliniqueId.value,
        jour: filtreJourFile.value || undefined,
        perPage: 100,
      },
    });
    file.value = { ...file.value, attente: data.data ?? [] };
  } catch {
    /* file vide */
  }
}

async function chargerPayes() {
  try {
    const { data } = await http.get("/caisse/payes", {
      params: { cliniqueId: cliniqueId.value, perPage: 100 },
    });
    file.value = { ...file.value, payes: data.data ?? [] };
  } catch {
    /* liste vide */
  }
}

// ── Tickets de crédit / cas sociaux ──
const credits = ref({ data: [], total: 0, page: 1, perPage: 20, totalPages: 1 });

async function chargerCredits(page = 1) {
  try {
    const { data } = await http.get("/caisse/credits", {
      params: { cliniqueId: cliniqueId.value, page, perPage: 20 },
    });
    credits.value = data;
  } catch {
    credits.value = { data: [], total: 0, page: 1, perPage: 20, totalPages: 1 };
  }
}

/** Crée un ticket de crédit (remboursable) ou cas social (non remboursable). */
async function creerCredit(type) {
  if (!passageCourant.value || lignesCochees.value.size === 0) return;
  const libelle = type === "CAS_SOCIAL" ? "cas social" : "crédit";
  const motifParDefaut =
    type === "CAS_SOCIAL"
      ? "Patient indigent"
      : "Argent pas encore disponible";
  let motif = "";
  try {
    const res = await Swal.fire({
      title: type === "CAS_SOCIAL" ? "🤝 Cas social" : "🎫 Ticket de crédit",
      text: "Les prestations cochées seront prises en charge sans paiement immédiat. Indiquez le motif :",
      input: "text",
      inputValue: motifParDefaut,
      inputPlaceholder: `Ex. ${motifParDefaut}`,
      showCancelButton: true,
      confirmButtonText: `Créer le ${libelle}`,
      cancelButtonText: "Annuler",
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#64748b",
    });
    motif = res?.value ?? "";
  } catch {
    return; // modalité fermée sans confirmation
  }
  const motifFinal = (motif || motifParDefaut).trim();
  encaissementEnCours.value = true;
  try {
    const { data } = await http.post(
      `/caisse/passages/${passageCourant.value.id}/credits`,
      {
        lignesIds: [...lignesCochees.value],
        type,
        motif: motifFinal,
      },
    );
    toastSuccess(
      `${libelle === "crédit" ? "Ticket de crédit" : "Cas social"} ${data.numero} créé — prise en charge activée.`,
    );
    await chargerDetail();
  } catch (e) {
    toastError(e.response?.data?.message || "Impossible de créer le ticket.");
  } finally {
    encaissementEnCours.value = false;
  }
}

/** Annule un ticket : les prestations repassent en attente de paiement. */
async function annulerCredit(ticket) {
  const conf = await Swal.fire({
    title: "Annuler le ticket ?",
    html: `Le ticket <strong>${ticket.numero}</strong> sera annulé et ses prestations repasseront en attente de paiement.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Oui, annuler",
    cancelButtonText: "Non",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#64748b",
  });
  if (!conf.isConfirmed) return;
  try {
    await http.post(`/caisse/credits/${ticket.id}/annuler`);
    toastSuccess("Ticket annulé.");
    await chargerCredits();
  } catch (e) {
    toastError(e.response?.data?.message || "Impossible d'annuler le ticket.");
  }
}

/** Ouvre un passage à la caisse depuis la liste des crédits (pour encaisser). */
async function ouvrirPassageParId(id) {
  vueFile.value = "attente";
  passageCourant.value = { id };
  lignesCochees.value = new Set();
  await chargerDetail();
}

async function choisirPassageFile(p) {
  await choisirPassage(p);
}

async function imprimerRecu(paiementId) {
  try {
    const { data } = await http.post(`/impression/paiements/${paiementId}`);
    if (data.ok) toastSuccess(data.message);
    else toastError(data.message);
  } catch (e) {
    toastError(
      `Erreur d'impression : ${e.response?.data?.message || e.message}`,
    );
  }
}

function formatHeure(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labelBeneficiaire(t) {
  if (t === "ASSURE") return "Assuré";
  if (t === "CONJOINT") return "Conjoint";
  if (t === "ENFANT") return "Enfant";
  return "Autre bénéficiaire";
}

// Détail du passage
const detail = ref(null);
const detailLoading = ref(false);
const lignesCochees = ref(new Set());
const modePaiement = ref("ESPECES");
const encaissementEnCours = ref(false);

// Ajout de prestation
const ajoutVisible = ref(false);
const ajoutPrestationId = ref(null);
const ajoutFiltreService = ref(null);
const ajoutEnCours = ref(false);
const ajoutError = ref("");
const prestations = ref([]);
const services = ref([]);

// Paiement effectué + reçu visuel
const paiementEffectue = ref(null);
const recuVisuel = ref(null);

const sousTotal = computed(() => {
  if (!detail.value) return 0;
  return detail.value.prestations
    .filter((l) => l.statut === "EN_ATTENTE" && lignesCochees.value.has(l.id))
    .reduce((s, l) => s + l.montant, 0);
});

// Assurance : parts calculées sur les lignes cochées couvertes
const partAssuranceTotale = computed(() => {
  if (!detail.value) return 0;
  return detail.value.prestations
    .filter(
      (l) =>
        l.statut === "EN_ATTENTE" &&
        lignesCochees.value.has(l.id) &&
        l.couverture,
    )
    .reduce((s, l) => s + l.couverture.partAssurance, 0);
});
const partPatientTotale = computed(() =>
  Math.max(0, sousTotal.value - partAssuranceTotale.value),
);
const tauxExceptionnel = ref(null);
const motifTaux = ref("");

const prestationsFiltrees = computed(() => {
  if (!ajoutFiltreService.value) return prestations.value;
  return prestations.value.filter(
    (p) => p.serviceId === ajoutFiltreService.value,
  );
});

const optionsServices = computed(() => [
  { value: null, label: "Tous les services" },
  ...services.value.map((s) => ({ value: s.id, label: s.nom })),
]);

const optionsPrestationsFiltrees = computed(() =>
  prestationsFiltrees.value.map((p) => ({
    value: p.id,
    label: `${p.libelle} — ${p.montant.toLocaleString("fr-FR")} FCFA`,
  })),
);

function onRecherche() {
  clearTimeout(rechercheTimer);
  rechercheTimer = setTimeout(async () => {
    if (recherche.value.trim().length < 2) {
      resultats.value = [];
      return;
    }
    try {
      const { data } = await http.get("/caisse/recherche", {
        params: { search: recherche.value, cliniqueId: cliniqueId.value },
      });
      resultats.value = data;
    } catch {
      resultats.value = [];
    }
  }, 300);
}

async function choisirPassage(p) {
  passageCourant.value = p;
  resultats.value = [];
  recherche.value = "";
  lignesCochees.value = new Set();
  await chargerDetail();
}

async function chargerDetail() {
  if (!passageCourant.value) return;
  detailLoading.value = true;
  try {
    const { data } = await http.get(
      `/caisse/passages/${passageCourant.value.id}`,
    );
    detail.value = data;
    passageCourant.value = {
      ...passageCourant.value,
      statut: data.statut,
      patient: data.patient,
      service: data.service,
    };
    // Pré-cocher les prestations en attente
    lignesCochees.value = new Set(
      data.prestations
        .filter((l) => l.statut === "EN_ATTENTE")
        .map((l) => l.id),
    );
  } catch (e) {
    toastError("Impossible de charger le passage.");
  } finally {
    detailLoading.value = false;
  }
}

function toggleLigne(id, coche) {
  if (coche) {
    lignesCochees.value = new Set([...lignesCochees.value, id]);
  } else {
    const n = new Set(lignesCochees.value);
    n.delete(id);
    lignesCochees.value = n;
  }
}

async function ouvrirAjout() {
  ajoutVisible.value = true;
  ajoutPrestationId.value = null;
  ajoutError.value = "";
  try {
    const { data } = await http.get("/prestations", { params: { perPage: 0 } });
    prestations.value = data.data.filter((p) => p.actif);
  } catch {
    prestations.value = [];
  }
}

async function confirmerAjout() {
  if (!ajoutPrestationId.value || !passageCourant.value) return;
  ajoutEnCours.value = true;
  ajoutError.value = "";
  try {
    await http.post(`/caisse/passages/${passageCourant.value.id}/prestations`, {
      prestationId: ajoutPrestationId.value,
    });
    ajoutVisible.value = false;
    toastSuccess("Prestation ajoutée.");
    await chargerDetail();
  } catch (e) {
    ajoutError.value = e.response?.data?.message || "Erreur lors de l'ajout.";
  } finally {
    ajoutEnCours.value = false;
  }
}

async function retirerLigne(l) {
  const reponse = await Swal.fire({
    title: `Retirer « ${l.libelle} » ?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Oui, retirer",
    cancelButtonText: "Annuler",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#64748b",
  });
  if (!reponse.isConfirmed) return;
  try {
    await http.delete(`/caisse/prestations/${l.id}`);
    toastSuccess("Prestation retirée.");
    await chargerDetail();
  } catch (e) {
    toastError(e.response?.data?.message || "Erreur lors du retrait.");
  }
}

async function encaisser() {
  if (!passageCourant.value || lignesCochees.value.size === 0) return;
  encaissementEnCours.value = true;
  try {
    const { data } = await http.post(
      `/caisse/passages/${passageCourant.value.id}/encaisser`,
      {
        lignesIds: [...lignesCochees.value],
        modePaiement: modePaiement.value,
        tauxApplique: tauxExceptionnel.value ?? undefined,
        motifTaux: motifTaux.value || undefined,
      },
    );
    paiementEffectue.value = data;
    recuVisuel.value = {
      ...data.paiement,
      lignes: data.lignes,
      patient: data.patient,
      passage: data.passage,
    };
    tauxExceptionnel.value = null;
    motifTaux.value = "";
    if (data.impression?.ok) {
      toastSuccess(`Reçu imprimé : ${data.impression.message}`);
    }
    chargerFile();
    chargerPayes();
    await chargerDetail();
  } catch (e) {
    toastError(e.response?.data?.message || "Erreur lors de l'encaissement.");
  } finally {
    encaissementEnCours.value = false;
  }
}

// Zone d'impression active (UNE seule à la fois)
const zoneImpression = ref(null); // 'thermique' | 'a4'
const recuA4 = ref(null);

async function lancerImpression(zone) {
  zoneImpression.value = zone;
  await nextTick();
  window.print();
  zoneImpression.value = null;
}

function imprimerRecuNavigateur() {
  lancerImpression("thermique");
}

/** Charge les données complètes du paiement et imprime le reçu A4. */
async function imprimerRecuA4(paiementId) {
  try {
    const { data } = await http.get(`/caisse/paiements/${paiementId}`);
    recuA4.value = data;
    await lancerImpression("a4");
  } catch (e) {
    toastError(
      e.response?.data?.message || "Impossible de charger le reçu A4.",
    );
  }
}

async function annulerPaiement(p) {
  const { value: motif } = await Swal.fire({
    title: `Annuler le paiement ${p.numeroRecu} ?`,
    text: "Les prestations reviendront « en attente ». Indiquez le motif :",
    input: "text",
    inputPlaceholder: "Ex : erreur de saisie, patient mécontent…",
    showCancelButton: true,
    confirmButtonText: "Annuler le paiement",
    cancelButtonText: "Retour",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#64748b",
    inputValidator: (v) =>
      !v || v.trim().length < 3
        ? "Motif obligatoire (3 caractères min.)"
        : null,
  });
  if (!motif) return;
  try {
    await http.post(`/caisse/paiements/${p.id}/annuler`, { motif });
    toastSuccess("Paiement annulé.");
    await chargerDetail();
  } catch (e) {
    toastError(e.response?.data?.message || "Erreur lors de l'annulation.");
  }
}

function formatDateHeure(d) {
  return new Date(d).toLocaleString("fr-FR");
}

onMounted(async () => {
  chargerFile();
  chargerPayes();
  try {
    const { data } = await http.get("/services", { params: { perPage: 0 } });
    services.value = data.data;
  } catch {
    // liste vide si l'API ne répond pas
  }
});

onUnmounted(() => {
  clearTimeout(rechercheTimer);
});
</script>

<style scoped>
/* File de la caisse (même logique que la consultation) */
.tabs-nav {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
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
  transition:
    color 0.15s,
    border-color 0.15s;
}
.tab-btn:hover {
  color: #0f766e;
}
.tab-btn.active {
  color: #0f766e;
  border-bottom-color: #0d9488;
}
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

.caisse-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
  display: flex;
  flex-direction: column;
}

/* ---------- Header ---------- */
.caisse-header {
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
.btn-bascule {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.55);
  font-weight: 700;
}
.btn-bascule:hover {
  background: rgba(255, 255, 255, 0.18);
}
.btn-back {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.45);
}
.btn-back:hover {
  background: rgba(255, 255, 255, 0.16);
}

/* ---------- Contenu ---------- */
.caisse-content {
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
.resultats li:last-child {
  border-bottom: none;
}
.resultats li:hover {
  background: var(--primary-light);
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

.caisse-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 1000px) {
  .caisse-grid {
    grid-template-columns: 1fr;
  }
}

.ligne-payee {
  opacity: 0.6;
}
.ligne-non-prescrite {
  opacity: 0.55;
  background: #fafafa;
}

/* ---------- Récapitulatif ---------- */
.recap {
  margin-top: 16px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.recap-lignes {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

/* Assurance : partage des montants */
.assurance-banniere {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 10px;
  padding: 9px 14px;
  margin-bottom: 12px;
  font-size: 13.5px;
  color: #134e4a;
}
.partage-assurance {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 3px;
  font-size: 12px;
}
.part-assurance {
  color: #166534;
  font-weight: 700;
}
.part-patient {
  color: #991b1b;
  font-weight: 700;
}
.part-taux {
  color: var(--text-muted);
  font-size: 11px;
}
.taux-exceptionnel {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-muted);
  flex-wrap: wrap;
}
.taux-input {
  width: 80px;
  padding: 6px 8px;
  border: 1.5px solid var(--border-champ);
  border-radius: 8px;
  font-size: 13.5px;
}
.motif-input {
  flex: 1;
  min-width: 200px;
  padding: 6px 10px;
  border: 1.5px solid var(--border-champ);
  border-radius: 8px;
  font-size: 13.5px;
}
.recap-item {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: var(--text-muted);
}
.recap-total {
  font-size: 17px;
  color: #134e4a;
}
.encaissement {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
}
.mode-select {
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: var(--surface);
}
.btn-encaisser {
  padding: 10px 22px;
  font-size: 15px;
}

/* ---------- Modale ticket ---------- */
.modal-ticket {
  text-align: center;
}
.modal-ticket .modal-actions {
  flex-wrap: wrap;
  justify-content: center;
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
  font-size: 28px;
  letter-spacing: 2px;
  color: #134e4a;
  font-family: Consolas, monospace;
}
.code-display small {
  color: var(--text-muted);
}

/* ---------- Reçu A4 (logo, cachet, caissière) ---------- */
@media screen {
  #recu-a4-print {
    position: fixed;
    left: -10000px;
    top: 0;
  }
}
.recu-a4 {
  width: 182mm;
  max-width: 100%;
  margin: 0 auto;
  background: #fff;
  padding: 10mm 12mm;
  font-family: "Segoe UI", system-ui, sans-serif;
  color: #111;
  font-size: 12px;
}
.recu-a4-entete {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}
.recu-a4-logo {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 12px;
}
.recu-a4-entete-texte h1 {
  margin: 4px 0 0;
  font-size: 17px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.recu-a4-entete-texte p {
  margin: 1px 0;
  font-size: 11px;
  color: #333;
}
.recu-a4-regle {
  border-bottom: 1.5px solid #111;
  margin: 8px 0;
}
.recu-a4-titre {
  text-align: center;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 2px;
  text-decoration: underline;
  margin: 4px 0;
}
.recu-a4-numero {
  text-align: center;
  font-weight: 700;
  margin-bottom: 8px;
}
.recu-a4-infos {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 6px;
}
.recu-a4-infos td {
  border: 0.8px solid #111;
  padding: 4px 6px;
}
.recu-a4-lib {
  font-weight: 800;
  width: 26mm;
  background: #f1f5f9;
  text-transform: uppercase;
  font-size: 10px;
}
.recu-a4-table {
  width: 100%;
  border-collapse: collapse;
}
.recu-a4-table th,
.recu-a4-table td {
  border: 0.8px solid #111;
  padding: 5px 8px;
  text-align: left;
}
.recu-a4-table th {
  background: #f1f5f9;
  text-transform: uppercase;
  font-size: 10px;
}
.recu-a4-montant {
  text-align: right !important;
  width: 35mm;
}
.recu-a4-total {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 900;
  text-align: right;
}
.recu-a4-parts {
  text-align: right;
  font-size: 11.5px;
  margin-top: 2px;
}
.recu-a4-signature {
  margin-top: 22mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.recu-a4-sign-ligne {
  border-bottom: 1px solid #111;
  width: 70mm;
  margin-bottom: 3px;
}
.recu-a4-sign-nom {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 10.5px;
}
.recu-a4-sign-qui {
  margin-top: 10mm;
  font-size: 11px;
}
.recu-a4-cachet {
  border: 1px solid #111;
  border-radius: 8px;
  width: 52mm;
  height: 30mm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #555;
  font-style: italic;
  text-align: center;
}
.recu-a4-merci {
  margin-top: 16mm;
  text-align: center;
  font-weight: 700;
}
@media print {
  .recu-a4 {
    width: 100%;
    padding: 0;
  }
}

/* ---------- Reçu navigateur (impression) ---------- */
@media screen {
  #recu-print {
    position: fixed;
    left: -10000px;
    top: 0;
  }
}
.recu {
  max-width: 320px;
  margin: 24px auto;
  padding: 24px 20px;
  border: 1px solid #134e4a;
  border-radius: 8px;
  font-family: "Segoe UI", system-ui, sans-serif;
  color: #1e293b;
  text-align: center;
}
.recu-head h1 {
  font-size: 22px;
  color: #134e4a;
  font-weight: 800;
}
.recu-sep {
  border-top: 1.5px dashed #94a3b8;
  margin: 12px 0;
}
.recu-title {
  font-size: 15px;
  letter-spacing: 3px;
  color: #134e4a;
  margin-bottom: 8px;
}
.recu-numero {
  font-size: 20px;
  font-weight: 800;
  font-family: Consolas, monospace;
  color: #134e4a;
}
.recu-table {
  width: 100%;
  font-size: 13px;
  border-collapse: collapse;
  text-align: left;
}
.recu-table td {
  padding: 4px 0;
}
.recu-montant {
  text-align: right;
  font-weight: 600;
  white-space: nowrap;
}
.recu-total {
  font-size: 15px;
  font-weight: 800;
  color: #134e4a;
  text-align: right;
}
.recu-infos {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12.5px;
  text-align: left;
}
.recu-foot {
  font-size: 13px;
  font-weight: 700;
  color: #134e4a;
}
</style>
