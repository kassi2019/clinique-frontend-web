<template>
  <div>
    <div class="card-header">
      <h2>🛡️ Assurances & prises en charge</h2>
      <div v-if="vue === 'assurances'" class="header-actions">
        <button class="btn btn-outline btn-sm" @click="telechargerModeleAssurance">📄 Modèle Excel</button>
        <label class="btn btn-outline btn-sm" style="cursor: pointer">
          📥 Charger (Excel)
          <input
            type="file"
            accept=".xlsx,.xls"
            style="display: none"
            @change="importerAssurancesExcel"
          />
        </label>
        <button class="btn btn-primary btn-sm" @click="ouvrirAjoutAssurance">＋ Ajouter une assurance</button>
      </div>
    </div>

    <!-- Canevas du fichier Excel (assurances) -->
    <div v-if="vue === 'assurances'" class="alert" style="background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534">
      <strong>📄 Canevas du fichier Excel :</strong> colonnes
      <strong>Code · Libellé · Téléphone · Email · Adresse · Agrément</strong>
      (une assurance par ligne, en-têtes en ligne 1). Les codes déjà présents sont ignorés.
      Téléchargez le <strong>Modèle Excel</strong> pour partir du bon format.
    </div>

    <!-- Modale : règlement reçu d'une assurance -->
    <div v-if="modaleReglement" class="modal-backdrop">
      <div class="modal">
        <h2>💰 Règlement reçu d'une assurance</h2>
        <div class="form-row">
          <div class="field">
            <label>Assurance *</label>
            <select v-model="formReglement.assuranceId">
              <option :value="null" disabled>— Choisir —</option>
              <option v-for="a in assurances" :key="a.id" :value="a.id">{{ a.libelle }}</option>
            </select>
          </div>
          <div class="field">
            <label>Date du règlement *</label>
            <input v-model="formReglement.dateReglement" type="date" />
          </div>
          <div class="field">
            <label>Montant reçu (FCFA) *</label>
            <input v-model.number="formReglement.montant" type="number" min="1" />
          </div>
          <div class="field">
            <label>Mode</label>
            <select v-model="formReglement.modeReglement">
              <option value="VIREMENT">Virement</option>
              <option value="CHEQUE">Chèque</option>
              <option value="ESPECES">Espèces</option>
            </select>
          </div>
          <div class="field">
            <label>Référence (n° de chèque, de virement…)</label>
            <input v-model.trim="formReglement.reference" />
          </div>
          <div class="field">
            <label>Commentaire</label>
            <input v-model.trim="formReglement.commentaire" placeholder="Ex : factures de septembre" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleReglement = false">✖ Annuler</button>
          <button class="btn btn-primary" @click="enregistrerReglement">💾 Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Feuille A4 imprimable (liste des assurés ou état de facturation), sortie du cadre d'administration -->
    <Teleport to="body">
      <div v-if="etatImpression" id="rapport-print" class="assur-print">
        <div class="assur-a4">
          <h1 class="assur-a4-clinique">{{ cliniqueNom }}</h1>
          <h2 class="assur-a4-titre">{{ etatImpression.titre }}</h2>
          <p class="assur-a4-periode">{{ etatImpression.sousTitre }}</p>

          <!-- Liste des patients assurés -->
          <template v-if="etatImpression.type === 'assures'">
            <table>
              <thead>
                <tr>
                  <th>N°</th><th>Patient</th><th>Code</th><th>Téléphone</th><th>Assurance</th>
                  <th>Formule</th><th>N° assuré</th><th>Bénéficiaire</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in etatImpression.assures" :key="r.id">
                  <td>{{ i + 1 }}</td>
                  <td>{{ r.patient.nom }} {{ r.patient.prenom }}</td>
                  <td>{{ r.patient.code }}</td>
                  <td>{{ r.patient.telephone || '—' }}</td>
                  <td>{{ r.assurance.libelle }}</td>
                  <td>{{ r.formule.libelle }}</td>
                  <td>{{ r.numeroAssure || '—' }}</td>
                  <td>{{ LIBELLES_BENEFICIAIRE[r.typeBeneficiaire] || r.typeBeneficiaire || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p class="assur-a4-total">Total : {{ etatImpression.assures.length }} patient(s) assuré(s)</p>
          </template>

          <!-- État du recouvrement -->
          <template v-else-if="etatImpression.type === 'recouvrement'">
            <table>
              <thead>
                <tr><th>Assurance</th><th>Factures</th><th>Montant facturé</th><th>Montant reçu</th><th>Reste à recouvrer</th></tr>
              </thead>
              <tbody>
                <tr v-for="a in etatImpression.parAssurance" :key="a.assuranceId">
                  <td>{{ a.assurance }}</td>
                  <td>{{ a.nbFactures }}</td>
                  <td class="num">{{ a.facture.toLocaleString('fr-FR') }}</td>
                  <td class="num">{{ a.recu.toLocaleString('fr-FR') }}</td>
                  <td class="num"><strong>{{ a.reste.toLocaleString('fr-FR') }}</strong></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2">TOTAL</td>
                  <td class="num">{{ etatImpression.totaux.facture.toLocaleString('fr-FR') }}</td>
                  <td class="num">{{ etatImpression.totaux.recu.toLocaleString('fr-FR') }}</td>
                  <td class="num">{{ etatImpression.totaux.reste.toLocaleString('fr-FR') }}</td>
                </tr>
              </tfoot>
            </table>
            <h3>Règlements reçus</h3>
            <table>
              <thead>
                <tr><th>Date</th><th>Assurance</th><th>Montant</th><th>Mode</th><th>Référence</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in etatImpression.reglements" :key="r.id">
                  <td>{{ formatDate(r.dateReglement) }}</td>
                  <td>{{ r.assurance.libelle }}</td>
                  <td class="num">{{ r.montant.toLocaleString('fr-FR') }}</td>
                  <td>{{ LIBELLES_MODE_REGLEMENT[r.modeReglement] || r.modeReglement || '—' }}</td>
                  <td>{{ r.reference || '—' }}</td>
                </tr>
                <tr v-if="etatImpression.reglements.length === 0"><td colspan="5">Aucun règlement enregistré.</td></tr>
              </tbody>
            </table>
            <p class="assur-a4-total">Reste à recouvrer : {{ etatImpression.totaux.reste.toLocaleString('fr-FR') }} F</p>
          </template>

          <!-- État de facturation : un tableau par compagnie, avec sous-total -->
          <template v-else>
            <div v-for="g in etatImpression.groupes" :key="g.assurance" class="assur-a4-groupe">
              <h3>{{ g.assurance }}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Patient</th><th>N° assuré / code</th><th>Reçu</th><th>Formule</th><th>Taux</th>
                    <th>Montant total</th><th>Part assurance</th><th>Part patient</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="l in g.lignes" :key="l.id">
                    <td>{{ formatDate(l.createdAt) }}</td>
                    <td>{{ l.patient.nom }} {{ l.patient.prenom }}</td>
                    <td>{{ l.patient.code }}</td>
                    <td>{{ l.numeroRecu }}</td>
                    <td>{{ l.formule?.libelle || '—' }}</td>
                    <td>{{ l.tauxApplique }} %</td>
                    <td class="num">{{ l.montantTotal.toLocaleString('fr-FR') }}</td>
                    <td class="num"><strong>{{ l.montantAssurance.toLocaleString('fr-FR') }}</strong></td>
                    <td class="num">{{ l.montantPatient.toLocaleString('fr-FR') }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="6">Sous-total {{ g.assurance }} ({{ g.lignes.length }} ligne(s))</td>
                    <td class="num">{{ g.totalFacture.toLocaleString('fr-FR') }}</td>
                    <td class="num">{{ g.totalAssurance.toLocaleString('fr-FR') }}</td>
                    <td class="num">{{ g.totalPatient.toLocaleString('fr-FR') }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p class="assur-a4-total">
              Total à facturer aux assurances : {{ etatImpression.totalAssurance.toLocaleString('fr-FR') }} F
              — part des patients : {{ etatImpression.totalPatient.toLocaleString('fr-FR') }} F
            </p>
          </template>

          <div class="assur-a4-sign">
            <span>Imprimé le {{ formatDateHeure(new Date()) }}</span>
            <div>Le responsable<br /><small>Signature et cachet</small></div>
          </div>
        </div>
      </div>
    </Teleport>

    <nav class="tabs-nav">
      <button class="tab-btn" :class="{ active: vue === 'assurances' }" @click="vue = 'assurances'">
        Assurances & formules
      </button>
      <button class="tab-btn" :class="{ active: vue === 'facturation' }" @click="vue = 'facturation'; chargerFacturation()">
        Facturation des assurances
      </button>
      <button class="tab-btn" :class="{ active: vue === 'assures' }" @click="vue = 'assures'; chargerAssures()">
        Patients assurés
      </button>
      <button class="tab-btn" :class="{ active: vue === 'recouvrement' }" @click="vue = 'recouvrement'; chargerRecouvrement()">
        Recouvrement
      </button>
    </nav>

    <!-- ============ FACTURATION ============ -->
    <div v-if="vue === 'facturation'">
      <div class="toolbar">
        <input v-model="factDebut" type="date" class="search-input" style="max-width: 160px; flex: none" @change="chargerFacturation" />
        <span>→</span>
        <input v-model="factFin" type="date" class="search-input" style="max-width: 160px; flex: none" @change="chargerFacturation" />
        <select v-model="factAssuranceId" class="search-input" style="max-width: 220px; flex: none" @change="chargerFacturation">
          <option :value="null">Toutes les assurances</option>
          <option v-for="a in assurances" :key="a.id" :value="a.id">{{ a.libelle }}</option>
        </select>
        <button class="btn btn-outline btn-sm" @click="chargerFacturation">🔄 Actualiser</button>
        <button class="btn btn-outline btn-sm" :disabled="facturation.total === 0" @click="exporterFacturationExcel">📊 Excel</button>
        <button class="btn btn-primary btn-sm" :disabled="facturation.total === 0" @click="imprimerFacturation">🖨️ Imprimer (A4)</button>
      </div>
      <div v-if="factPatient" class="alert assures-filtre">
        🧾 Factures de <strong>{{ factPatient.nom }} {{ factPatient.prenom }}</strong> ({{ factPatient.code }})
        <button class="btn btn-outline btn-sm" @click="retirerFiltrePatient">✕ Voir tous les patients</button>
      </div>

      <div v-if="facturation.parAssurance.length === 0" class="empty-state">
        Aucune prise en charge sur la période.
      </div>
      <template v-else>
        <div class="kpi-grid">
          <div v-for="a in facturation.parAssurance" :key="a.assurance" class="kpi-card">
            <div class="kpi-titre">{{ a.assurance }}</div>
            <div class="kpi-lignes">
              <span class="part-assurance">{{ a.totalAssurance.toLocaleString('fr-FR') }} F</span> à facturer
              <span class="text-muted">({{ a.nbLignes }} ligne(s) · part patient {{ a.totalPatient.toLocaleString('fr-FR') }} F)</span>
            </div>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Reçu</th>
                <th>Assurance</th>
                <th>Formule</th>
                <th>Taux</th>
                <th>Part assurance</th>
                <th>Part patient</th>
                <th>Motif</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in facturation.lignes" :key="l.id">
                <td>{{ formatDateHeure(l.createdAt) }}</td>
                <td>
                  <strong>{{ l.patient.nom }} {{ l.patient.prenom }}</strong>
                  <span class="text-muted"> ({{ l.numeroOrdre }})</span>
                </td>
                <td>
                  {{ l.numeroRecu }}
                  <span v-if="l.source === 'PHARMACIE'" class="badge badge-muted" title="Médicaments délivrés à la pharmacie">💊 Pharmacie</span>
                </td>
                <td>{{ l.assurance?.libelle || '—' }}</td>
                <td>{{ l.formule?.libelle || '—' }}</td>
                <td>
                  <span v-if="l.tauxApplique !== l.tauxParametre" class="text-muted" :title="'Taux paramétré : ' + l.tauxParametre + ' %'">
                    ⚠️ {{ l.tauxApplique }} %*
                  </span>
                  <span v-else>{{ l.tauxApplique }} %</span>
                </td>
                <td><strong class="part-assurance">{{ l.montantAssurance.toLocaleString('fr-FR') }} F</strong></td>
                <td><span class="part-patient">{{ l.montantPatient.toLocaleString('fr-FR') }} F</span></td>
                <td>{{ l.motifModification || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <PaginationBar
          v-if="facturation.total > facturation.perPage"
          :page="facturation.page"
          :per-page="facturation.perPage"
          :total="facturation.total"
          :total-pages="facturation.totalPages"
          @change="changerPageFact"
          @per-page="changerPerPageFact"
        />
      </template>
    </div>

    <!-- ============ RECOUVREMENT ============ -->
    <div v-else-if="vue === 'recouvrement'">
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" @click="ouvrirReglement(null)">＋ Enregistrer un règlement reçu</button>
        <button class="btn btn-outline btn-sm" @click="chargerRecouvrement">🔄 Actualiser</button>
        <button class="btn btn-outline btn-sm" :disabled="recouvrement.parAssurance.length === 0" @click="exporterRecouvrementExcel">📊 Excel</button>
        <button class="btn btn-outline btn-sm" :disabled="recouvrement.parAssurance.length === 0" @click="imprimerRecouvrement">🖨️ Imprimer (A4)</button>
      </div>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-titre">Facturé aux assurances</div>
          <div class="kpi-lignes"><span class="part-assurance">{{ recouvrement.totaux.facture.toLocaleString('fr-FR') }} F</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-titre">Déjà reçu</div>
          <div class="kpi-lignes"><span class="part-patient">{{ recouvrement.totaux.recu.toLocaleString('fr-FR') }} F</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-titre">Reste à recouvrer</div>
          <div class="kpi-lignes"><strong class="reste-recouvrer">{{ recouvrement.totaux.reste.toLocaleString('fr-FR') }} F</strong></div>
        </div>
      </div>

      <div v-if="recouvrement.parAssurance.length === 0" class="empty-state">
        Aucune prise en charge facturée pour le moment.
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Assurance</th><th>Factures</th><th>Montant facturé</th><th>Montant reçu</th><th>Reste à recouvrer</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in recouvrement.parAssurance" :key="a.assuranceId">
              <td><strong>{{ a.assurance }}</strong> <span class="text-muted">({{ a.code }})</span></td>
              <td>{{ a.nbFactures }}</td>
              <td>{{ a.facture.toLocaleString('fr-FR') }} F</td>
              <td>{{ a.recu.toLocaleString('fr-FR') }} F</td>
              <td>
                <strong :class="a.reste > 0 ? 'reste-recouvrer' : 'part-patient'">{{ a.reste.toLocaleString('fr-FR') }} F</strong>
                <span v-if="a.reste <= 0" class="badge badge-success">Soldé</span>
              </td>
              <td>
                <button class="btn btn-outline btn-sm" @click="ouvrirReglement(a)">＋ Règlement</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="section-title">Règlements reçus</h3>
      <div v-if="recouvrement.reglements.length === 0" class="text-muted small-note">Aucun règlement enregistré.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Assurance</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Commentaire</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="r in recouvrement.reglements" :key="r.id">
              <td>{{ formatDate(r.dateReglement) }}</td>
              <td>{{ r.assurance.libelle }}</td>
              <td><strong>{{ r.montant.toLocaleString('fr-FR') }} F</strong></td>
              <td>{{ LIBELLES_MODE_REGLEMENT[r.modeReglement] || r.modeReglement || '—' }}</td>
              <td>{{ r.reference || '—' }}</td>
              <td>{{ r.commentaire || '—' }}</td>
              <td>
                <button class="btn btn-danger btn-sm" title="Supprimer ce règlement (saisi par erreur)" @click="supprimerReglement(r)">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ PATIENTS ASSURÉS ============ -->
    <div v-else-if="vue === 'assures'">
      <div class="toolbar">
        <input
          v-model="assuresRecherche"
          class="search-input"
          type="text"
          placeholder="Rechercher par nom, prénoms ou code patient…"
          @input="onRechercheAssures"
        />
        <select v-model="assuresAssuranceId" class="search-input" style="max-width: 220px; flex: none" @change="chargerAssures">
          <option :value="null">Toutes les assurances</option>
          <option v-for="a in assurances" :key="a.id" :value="a.id">{{ a.libelle }}</option>
        </select>
        <button class="btn btn-outline btn-sm" :disabled="listeAssures.total === 0" @click="exporterAssuresExcel">📊 Excel</button>
        <button class="btn btn-primary btn-sm" :disabled="listeAssures.total === 0" @click="imprimerAssures">🖨️ Imprimer (A4)</button>
      </div>

      <div v-if="listeAssures.total === 0" class="empty-state">Aucun patient assuré trouvé.</div>
      <template v-else>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-titre">Total</div>
            <div class="kpi-lignes"><span class="part-assurance">{{ listeAssures.total }}</span> patient(s) assuré(s)</div>
          </div>
          <div v-for="a in listeAssures.parAssurance" :key="a.assurance" class="kpi-card">
            <div class="kpi-titre">{{ a.assurance }}</div>
            <div class="kpi-lignes"><span class="part-assurance">{{ a.nbAssures }}</span> assuré(s)</div>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Code</th>
                <th>Téléphone</th>
                <th>Assurance</th>
                <th>Formule</th>
                <th>N° assuré</th>
                <th>Bénéficiaire</th>
                <th>Validité</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in listeAssures.assures" :key="r.id">
                <td><strong>{{ r.patient.nom }} {{ r.patient.prenom }}</strong></td>
                <td>{{ r.patient.code }}</td>
                <td>{{ r.patient.telephone || '—' }}</td>
                <td>{{ r.assurance.libelle }}</td>
                <td>{{ r.formule.libelle }}</td>
                <td>{{ r.numeroAssure || '—' }}</td>
                <td>{{ LIBELLES_BENEFICIAIRE[r.typeBeneficiaire] || r.typeBeneficiaire || '—' }}</td>
                <td>{{ validiteAssure(r) }}</td>
                <td>
                  <button class="btn btn-outline btn-sm" title="Voir les factures prises en charge pour ce patient" @click="voirFacturesPatient(r)">
                    🧾 Factures
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- ============ ASSURANCES ============ -->
    <div v-else>

    <div v-if="chargement" class="empty-state chargement">Chargement…</div>
    <div v-else-if="assurances.length === 0" class="empty-state">
      Aucune assurance paramétrée (SUNU, NSIA, MUGEF…).
    </div>
    <div v-else class="assurances-liste">
      <div v-for="a in assurances" :key="a.id" class="assurance-card">
        <div class="assurance-tete" @click="basculerOuverture(a.id)">
          <div class="assurance-titre">
            <span class="chevron">{{ assuranceOuverte === a.id ? '▾' : '▸' }}</span>
            <strong>{{ a.libelle }}</strong>
            <span class="text-muted"> ({{ a.code }})</span>
            <span v-if="a.telephone" class="text-muted"> · {{ a.telephone }}</span>
            <span class="text-muted nb-formules">({{ a.formules.length }} formule(s))</span>
          </div>
          <div class="actions">
            <span class="badge" :class="a.statut === 'ACTIF' ? 'badge-success' : 'badge-muted'">
              {{ a.statut === 'ACTIF' ? 'Active' : 'Inactive' }}
            </span>
            <button class="btn btn-outline btn-sm" @click.stop="ouvrirAjoutFormule(a)">＋ Formule</button>
            <button class="btn btn-sm" :class="a.statut === 'ACTIF' ? 'btn-danger' : 'btn-success'" @click.stop="basculerAssurance(a)">
              {{ a.statut === 'ACTIF' ? 'Désactiver' : 'Réactiver' }}
            </button>
          </div>
        </div>

        <div v-if="assuranceOuverte === a.id">
          <div v-for="f in a.formules" :key="f.id" class="formule-card">
          <div class="formule-tete">
            <div>
              <strong>{{ f.libelle }}</strong>
              <span class="text-muted"> ({{ f.code }})</span>
              <span v-if="f.dateDebut || f.dateFin" class="text-muted">
                · {{ f.dateDebut ? formatDate(f.dateDebut) : '…' }} → {{ f.dateFin ? formatDate(f.dateFin) : '…' }}
              </span>
              <span class="badge" :class="f.tauxPharmacie ? 'badge-success' : 'badge-muted'" title="Part des médicaments prise en charge à la pharmacie">
                💊 Médicaments : {{ f.tauxPharmacie ? f.tauxPharmacie + ' %' : 'non couverts' }}
              </span>
            </div>
            <div class="actions">
              <span class="badge" :class="f.statut === 'ACTIF' ? 'badge-success' : 'badge-muted'">
                {{ f.statut === 'ACTIF' ? 'Active' : 'Inactive' }}
              </span>
              <button class="btn btn-outline btn-sm" title="Taux de prise en charge des médicaments à la pharmacie" @click="modifierTauxPharmacie(f)">💊 Taux médicaments</button>
              <button class="btn btn-outline btn-sm" @click="ouvrirAjoutCouverture(f)">＋ Couverture</button>
              <button class="btn btn-sm" :class="f.statut === 'ACTIF' ? 'btn-danger' : 'btn-success'" @click="basculerFormule(f)">
                {{ f.statut === 'ACTIF' ? 'Désactiver' : 'Réactiver' }}
              </button>
            </div>
          </div>

          <div v-if="f.couvertures.length === 0" class="small-note text-muted">
            Aucune prestation couverte pour cette formule.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Prestation</th>
                  <th>Taux</th>
                  <th>Plafond</th>
                  <th>Validité</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in f.couvertures" :key="c.id">
                  <td>{{ c.prestation?.libelle || '—' }}</td>
                  <td><strong>{{ c.tauxCouverture }} %</strong></td>
                  <td>{{ c.plafond ? Number(c.plafond).toLocaleString('fr-FR') + ' F' : '—' }}</td>
                  <td>
                    {{ c.dateDebut ? formatDate(c.dateDebut) : '—' }} → {{ c.dateFin ? formatDate(c.dateFin) : '—' }}
                  </td>
                  <td>
                    <span class="badge" :class="c.statut === 'ACTIF' ? 'badge-success' : 'badge-muted'">
                      {{ c.statut === 'ACTIF' ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-outline btn-sm" @click="ouvrirModifCouverture(c)">✏️</button>
                      <button class="btn btn-sm" :class="c.statut === 'ACTIF' ? 'btn-danger' : 'btn-success'" @click="basculerCouverture(c)">
                        {{ c.statut === 'ACTIF' ? 'Désactiver' : 'Réactiver' }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Modale : assurance -->
    <div v-if="modaleAssurance" class="modal-backdrop">
      <div class="modal">
        <h2>🛡️ Nouvelle assurance</h2>
        <div class="form-row">
          <div class="field">
            <label>Code *</label>
            <input v-model.trim="formAssurance.code" placeholder="SUNU" />
          </div>
          <div class="field">
            <label>Libellé *</label>
            <input v-model.trim="formAssurance.libelle" placeholder="SUNU ASSURANCES" />
          </div>
          <div class="field">
            <label>Téléphone</label>
            <input v-model.trim="formAssurance.telephone" />
          </div>
          <div class="field">
            <label>Email</label>
            <input v-model.trim="formAssurance.email" />
          </div>
          <div class="field">
            <label>Adresse</label>
            <input v-model.trim="formAssurance.adresse" />
          </div>
          <div class="field">
            <label>N° d'agrément</label>
            <input v-model.trim="formAssurance.numeroAgrement" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleAssurance = false">✖ Annuler</button>
          <button class="btn btn-primary" @click="enregistrerAssurance">💾 Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Modale : formule -->
    <div v-if="modaleFormule" class="modal-backdrop">
      <div class="modal">
        <h2>📋 Formule — {{ assuranceFormule?.libelle }}</h2>
        <div class="form-row">
          <div class="field">
            <label>Code *</label>
            <input v-model.trim="formFormule.code" placeholder="STANDARD" />
          </div>
          <div class="field">
            <label>Libellé *</label>
            <input v-model.trim="formFormule.libelle" placeholder="Formule Standard" />
          </div>
          <div class="field">
            <label>Description</label>
            <input v-model.trim="formFormule.description" />
          </div>
          <div class="field">
            <label>Médicaments couverts à la pharmacie (%)</label>
            <input v-model.number="formFormule.tauxPharmacie" type="number" min="0" max="100" placeholder="Ex : 80 (vide = non couverts)" />
          </div>
          <div class="field">
            <label>Date de début</label>
            <input v-model="formFormule.dateDebut" type="date" />
          </div>
          <div class="field">
            <label>Date de fin</label>
            <input v-model="formFormule.dateFin" type="date" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleFormule = false">✖ Annuler</button>
          <button class="btn btn-primary" @click="enregistrerFormule">💾 Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Modale : couverture -->
    <div v-if="modaleCouverture" class="modal-backdrop">
      <div class="modal">
        <h2>🧾 Couverture — {{ formuleCouverture?.libelle }}</h2>
        <div class="form-row">
          <div class="field" style="grid-column: span 2">
            <label>Prestation *</label>
            <SelectSearch
              v-model="formCouverture.prestationId"
              :options="optionsPrestations"
              placeholder="— Choisir une prestation —"
            />
          </div>
          <div class="field">
            <label>Taux de couverture (%) *</label>
            <input v-model.number="formCouverture.tauxCouverture" type="number" min="0" max="100" />
          </div>
          <div class="field">
            <label>Plafond (F)</label>
            <input v-model.number="formCouverture.plafond" type="number" min="0" />
          </div>
          <div class="field">
            <label>Date de début</label>
            <input v-model="formCouverture.dateDebut" type="date" />
          </div>
          <div class="field">
            <label>Date de fin</label>
            <input v-model="formCouverture.dateFin" type="date" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modaleCouverture = false">✖ Annuler</button>
          <button class="btn btn-primary" @click="enregistrerCouverture">💾 Enregistrer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import * as XLSX from 'xlsx'
import http from '../../api/http'
import PaginationBar from '../../components/PaginationBar.vue'
import SelectSearch from '../../components/SelectSearch.vue'
import { useAuthStore } from '../../stores/auth'
import { toastError, toastSuccess } from '../../utils/notifications'

const auth = useAuthStore()
const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)

const assurances = ref([])
const prestations = ref([])
const chargement = ref(false)
const assuranceOuverte = ref(null)
const vue = ref('assurances')

// Facturation des assurances
const factDebut = ref(new Date().toISOString().slice(0, 10))
const factFin = ref(new Date().toISOString().slice(0, 10))
const factAssuranceId = ref(null)
const facturation = ref({ lignes: [], total: 0, page: 1, perPage: 20, totalPages: 1, parAssurance: [] })
const factPage = ref(1)
const factPerPage = ref(20)

async function chargerFacturation() {
  try {
    const { data } = await http.get('/assurances/facturation', {
      params: {
        cliniqueId: cliniqueId.value,
        debut: factDebut.value,
        fin: factFin.value,
        assuranceId: factAssuranceId.value ?? undefined,
        patientId: factPatient.value?.id ?? undefined,
        page: factPage.value,
        perPage: factPerPage.value,
      },
    })
    facturation.value = data
  } catch {
    facturation.value = { lignes: [], total: 0, page: 1, perPage: 20, totalPages: 1, parAssurance: [] }
  }
}

// ── Patients assurés + états imprimables / exportables ──
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')
const LIBELLES_BENEFICIAIRE = { ASSURE: 'Assuré principal', CONJOINT: 'Conjoint(e)', ENFANT: 'Enfant', AUTRE: 'Autre' }
const assuresRecherche = ref('')
const assuresAssuranceId = ref(null)
const listeAssures = ref({ assures: [], total: 0, parAssurance: [] })
let assuresTimer = null

async function chargerAssures() {
  try {
    const { data } = await http.get('/assurances/assures', {
      params: {
        cliniqueId: cliniqueId.value,
        assuranceId: assuresAssuranceId.value ?? undefined,
        search: assuresRecherche.value.trim() || undefined,
      },
    })
    listeAssures.value = data
  } catch {
    listeAssures.value = { assures: [], total: 0, parAssurance: [] }
  }
}

function onRechercheAssures() {
  clearTimeout(assuresTimer)
  assuresTimer = setTimeout(chargerAssures, 300)
}

function validiteAssure(r) {
  if (!r.dateDebut && !r.dateFin) return 'Sans limite'
  return `${r.dateDebut ? formatDate(r.dateDebut) : '…'} → ${r.dateFin ? formatDate(r.dateFin) : '…'}`
}

function libelleAssuranceFiltre(id) {
  return id ? (assurances.value.find((a) => a.id === id)?.libelle ?? '') : 'Toutes les assurances'
}

// Factures d'un seul assuré : la facturation est filtrée sur ce patient
const factPatient = ref(null)
function voirFacturesPatient(r) {
  factPatient.value = r.patient
  factAssuranceId.value = null
  factDebut.value = `${new Date().getFullYear()}-01-01`
  factFin.value = new Date().toISOString().slice(0, 10)
  factPage.value = 1
  vue.value = 'facturation'
  chargerFacturation()
}
function retirerFiltrePatient() {
  factPatient.value = null
  factPage.value = 1
  chargerFacturation()
}

/** Toutes les lignes de facturation de la période (sans pagination) pour l'impression et l'export. */
async function facturationComplete() {
  const { data } = await http.get('/assurances/facturation', {
    params: {
      cliniqueId: cliniqueId.value,
      debut: factDebut.value,
      fin: factFin.value,
      assuranceId: factAssuranceId.value ?? undefined,
      patientId: factPatient.value?.id ?? undefined,
      perPage: 0,
    },
  })
  return data
}

const jourFr = (iso) => iso.split('-').reverse().join('/')
function sousTitreFacturation() {
  const periode = `Période du ${jourFr(factDebut.value)} au ${jourFr(factFin.value)}`
  const patient = factPatient.value ? ` — ${factPatient.value.nom} ${factPatient.value.prenom}` : ''
  return `${periode} — ${libelleAssuranceFiltre(factAssuranceId.value)}${patient}`
}

// ── Taux « médicaments » d'une formule (pharmacie) ──
async function modifierTauxPharmacie(f) {
  const saisie = window.prompt(
    `Part des médicaments prise en charge à la pharmacie pour « ${f.libelle} » (0 à 100 %).\nLaisser vide = médicaments non couverts.`,
    f.tauxPharmacie ?? '',
  )
  if (saisie === null) return
  try {
    await http.patch(`/assurances/formules/${f.id}/taux-pharmacie`, { tauxPharmacie: saisie.trim() })
    toastSuccess('Taux « médicaments » enregistré.')
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Taux invalide.')
  }
}

// ── Recouvrement : facturé / reçu / reste à recouvrer par assurance ──
const LIBELLES_MODE_REGLEMENT = { VIREMENT: 'Virement', CHEQUE: 'Chèque', ESPECES: 'Espèces' }
const RECOUVREMENT_VIDE = { parAssurance: [], totaux: { facture: 0, recu: 0, reste: 0 }, reglements: [] }
const recouvrement = ref(RECOUVREMENT_VIDE)
const modaleReglement = ref(false)
const formReglement = reactive({
  assuranceId: null, dateReglement: '', montant: null, modeReglement: 'VIREMENT', reference: '', commentaire: '',
})

async function chargerRecouvrement() {
  try {
    const { data } = await http.get('/assurances/recouvrement', { params: { cliniqueId: cliniqueId.value } })
    recouvrement.value = data
  } catch {
    recouvrement.value = RECOUVREMENT_VIDE
  }
}

function ouvrirReglement(a) {
  Object.assign(formReglement, {
    assuranceId: a?.assuranceId ?? null,
    dateReglement: new Date().toISOString().slice(0, 10),
    montant: a && a.reste > 0 ? a.reste : null,
    modeReglement: 'VIREMENT',
    reference: '',
    commentaire: '',
  })
  modaleReglement.value = true
}

async function enregistrerReglement() {
  if (!formReglement.assuranceId || !formReglement.dateReglement || !(formReglement.montant > 0)) {
    toastError("L'assurance, la date et le montant sont obligatoires.")
    return
  }
  try {
    await http.post('/assurances/reglements', { ...formReglement })
    toastSuccess('Règlement enregistré.')
    modaleReglement.value = false
    await chargerRecouvrement()
  } catch (e) {
    toastError(e.response?.data?.message || "Erreur lors de l'enregistrement.")
  }
}

async function supprimerReglement(r) {
  if (!window.confirm(`Supprimer le règlement de ${r.montant.toLocaleString('fr-FR')} F (${r.assurance.libelle}) ?`)) return
  try {
    await http.delete(`/assurances/reglements/${r.id}`)
    toastSuccess('Règlement supprimé.')
    await chargerRecouvrement()
  } catch (e) {
    toastError(e.response?.data?.message || 'Suppression impossible.')
  }
}

function imprimerRecouvrement() {
  imprimerEtat({
    type: 'recouvrement',
    titre: 'ÉTAT DU RECOUVREMENT DES ASSURANCES',
    sousTitre: `Situation au ${new Date().toLocaleDateString('fr-FR')}`,
    parAssurance: recouvrement.value.parAssurance,
    totaux: recouvrement.value.totaux,
    reglements: recouvrement.value.reglements,
  })
}

function exporterRecouvrementExcel() {
  const situation = recouvrement.value.parAssurance.map((a) => ({
    'Assurance': a.assurance,
    'Nombre de factures': a.nbFactures,
    'Montant facturé': a.facture,
    'Montant reçu': a.recu,
    'Reste à recouvrer': a.reste,
  }))
  const reglements = recouvrement.value.reglements.map((r) => ({
    'Date': formatDate(r.dateReglement),
    'Assurance': r.assurance.libelle,
    'Montant': r.montant,
    'Mode': LIBELLES_MODE_REGLEMENT[r.modeReglement] ?? r.modeReglement ?? '',
    'Référence': r.reference ?? '',
    'Commentaire': r.commentaire ?? '',
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(situation), 'Recouvrement')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reglements), 'Règlements reçus')
  XLSX.writeFile(wb, `recouvrement_assurances_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// Feuille A4 : rendue hors écran, puis envoyée à l'imprimante
const etatImpression = ref(null)
async function imprimerEtat(etat) {
  etatImpression.value = etat
  await nextTick()
  setTimeout(() => window.print(), 300)
}

function imprimerAssures() {
  imprimerEtat({
    type: 'assures',
    titre: 'LISTE DES PATIENTS ASSURÉS',
    sousTitre: libelleAssuranceFiltre(assuresAssuranceId.value),
    assures: listeAssures.value.assures,
  })
}

async function imprimerFacturation() {
  try {
    const data = await facturationComplete()
    // Regroupement par compagnie d'assurance, avec sous-totaux
    const groupes = new Map()
    for (const l of data.lignes) {
      const nom = l.assurance?.libelle ?? '—'
      const g = groupes.get(nom) ?? { assurance: nom, lignes: [], totalFacture: 0, totalAssurance: 0, totalPatient: 0 }
      g.lignes.push(l)
      g.totalFacture += l.montantTotal
      g.totalAssurance += l.montantAssurance
      g.totalPatient += l.montantPatient
      groupes.set(nom, g)
    }
    const liste = [...groupes.values()]
    imprimerEtat({
      type: 'facturation',
      titre: 'ÉTAT DE FACTURATION DES ASSURANCES',
      sousTitre: sousTitreFacturation(),
      groupes: liste,
      totalAssurance: liste.reduce((s, g) => s + g.totalAssurance, 0),
      totalPatient: liste.reduce((s, g) => s + g.totalPatient, 0),
    })
  } catch {
    toastError("Impossible de préparer l'état de facturation.")
  }
}

function exporterAssuresExcel() {
  const lignes = listeAssures.value.assures.map((r) => ({
    'Patient': `${r.patient.nom} ${r.patient.prenom}`,
    'Code patient': r.patient.code,
    'Sexe': r.patient.sexe ?? '',
    'Téléphone': r.patient.telephone ?? '',
    'Assurance': r.assurance.libelle,
    'Formule': r.formule.libelle,
    'N° assuré': r.numeroAssure ?? '',
    'N° carte': r.numeroCarte ?? '',
    'Assuré principal': r.nomAssurePrincipal ?? '',
    'Bénéficiaire': LIBELLES_BENEFICIAIRE[r.typeBeneficiaire] ?? r.typeBeneficiaire ?? '',
    'Validité': validiteAssure(r),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lignes), 'Patients assurés')
  XLSX.writeFile(wb, `patients_assures_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

async function exporterFacturationExcel() {
  try {
    const data = await facturationComplete()
    const details = data.lignes.map((l) => ({
      'Date': formatDateHeure(l.createdAt),
      'Origine': l.source === 'PHARMACIE' ? 'Pharmacie' : 'Caisse',
      'Assurance': l.assurance?.libelle ?? '',
      'Formule': l.formule?.libelle ?? '',
      'Patient': `${l.patient.nom} ${l.patient.prenom}`,
      'Code patient': l.patient.code,
      'N° de passage': l.numeroOrdre,
      'Reçu': l.numeroRecu,
      'Taux appliqué (%)': l.tauxApplique,
      'Montant total': l.montantTotal,
      'Part assurance': l.montantAssurance,
      'Part patient': l.montantPatient,
      'Motif': l.motifModification ?? '',
    }))
    const totaux = data.parAssurance.map((a) => ({
      'Assurance': a.assurance,
      'Nombre de lignes': a.nbLignes,
      'Montant total': a.totalFacture,
      'À facturer à l\'assurance': a.totalAssurance,
      'Part des patients': a.totalPatient,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(totaux), 'Totaux par assurance')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(details), 'Détail des factures')
    XLSX.writeFile(wb, `facturation_assurances_${factDebut.value}_${factFin.value}.xlsx`)
  } catch {
    toastError("Impossible d'exporter la facturation.")
  }
}

function changerPageFact(p) {
  factPage.value = p
  chargerFacturation()
}

function changerPerPageFact(n) {
  factPerPage.value = n
  factPage.value = 1
  chargerFacturation()
}

function basculerOuverture(id) {
  assuranceOuverte.value = assuranceOuverte.value === id ? null : id
}

const modaleAssurance = ref(false)
const formAssurance = reactive({ code: '', libelle: '', telephone: '', email: '', adresse: '', numeroAgrement: '' })

const modaleFormule = ref(false)
const assuranceFormule = ref(null)
const formFormule = reactive({ code: '', libelle: '', description: '', tauxPharmacie: '', dateDebut: '', dateFin: '' })

const modaleCouverture = ref(false)
const formuleCouverture = ref(null)
const couvertureEditee = ref(null)
const formCouverture = reactive({ prestationId: null, tauxCouverture: null, plafond: null, dateDebut: '', dateFin: '' })

const optionsPrestations = computed(() =>
  prestations.value
    .filter((p) => p.actif)
    .map((p) => ({ value: p.id, label: p.libelle })),
)

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateHeure(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function charger() {
  chargement.value = true
  try {
    const [a, p] = await Promise.all([
      http.get('/assurances', { params: { cliniqueId: cliniqueId.value } }),
      http.get('/prestations', { params: { perPage: 0, cliniqueId: cliniqueId.value } }),
    ])
    assurances.value = a.data
    prestations.value = p.data.data ?? []
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger les assurances.')
  } finally {
    chargement.value = false
  }
}

/** Télécharge le modèle Excel des assurances. */
function telechargerModeleAssurance() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Code', 'Libellé', 'Téléphone', 'Email', 'Adresse', 'Agrément'],
    ['SUNU', 'SUNU Assurances', '27 22 50 00 00', 'contact@sunu.ci', 'Abidjan', 'AGR-001'],
    ['NSIA', 'NSIA Assurances', '', '', '', ''],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Assurances')
  XLSX.writeFile(wb, 'modele_assurances.xlsx')
}

/** Import Excel : colonnes Code, Libellé, Téléphone, Email, Adresse, Agrément. */
async function importerAssurancesExcel(event) {
  const fichier = event.target.files?.[0]
  event.target.value = ''
  if (!fichier) return
  try {
    const buffer = await fichier.arrayBuffer()
    const classeur = XLSX.read(buffer, { type: 'array' })
    const premiere = classeur.SheetNames[0]
    if (!premiere) {
      toastError('Fichier vide.')
      return
    }
    const lignes = XLSX.utils.sheet_to_json(classeur.Sheets[premiere])
    if (lignes.length === 0) {
      toastError('Aucune ligne trouvée.')
      return
    }
    const { data } = await http.post('/assurances/import', {
      lignes: lignes.map((l) => ({
        code: l.code ?? l['Code'],
        libelle: l.libelle ?? l['Libellé'],
        telephone: l.telephone ?? l['Téléphone'],
        email: l.email ?? l['Email'],
        adresse: l.adresse ?? l['Adresse'],
        numeroAgrement: l.numeroAgrement ?? l['Agrément'],
      })),
    }, { params: { cliniqueId: cliniqueId.value } })
    toastSuccess(`${data.ajoutes} assurance(s) ajoutée(s) (${data.total} ligne(s) lue(s)).`)
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Import impossible.')
  }
}

// ── Assurance ──
function ouvrirAjoutAssurance() {
  Object.assign(formAssurance, { code: '', libelle: '', telephone: '', email: '', adresse: '', numeroAgrement: '' })
  modaleAssurance.value = true
}

async function enregistrerAssurance() {
  if (!formAssurance.code.trim() || !formAssurance.libelle.trim()) {
    toastError('Le code et le libellé sont obligatoires.')
    return
  }
  try {
    await http.post('/assurances', { ...formAssurance }, { params: { cliniqueId: cliniqueId.value } })
    toastSuccess('Assurance créée.')
    modaleAssurance.value = false
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  }
}

async function basculerAssurance(a) {
  try {
    await http.delete(`/assurances/${a.id}`)
    toastSuccess('Statut mis à jour.')
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Opération impossible.')
  }
}

// ── Formule ──
function ouvrirAjoutFormule(a) {
  assuranceFormule.value = a
  Object.assign(formFormule, { code: '', libelle: '', description: '', tauxPharmacie: '', dateDebut: '', dateFin: '' })
  modaleFormule.value = true
}

async function enregistrerFormule() {
  if (!formFormule.code.trim() || !formFormule.libelle.trim()) {
    toastError('Le code et le libellé sont obligatoires.')
    return
  }
  try {
    await http.post('/assurances/formules', {
      assuranceId: assuranceFormule.value.id,
      ...formFormule,
    })
    toastSuccess('Formule créée.')
    modaleFormule.value = false
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  }
}

async function basculerFormule(f) {
  try {
    await http.delete(`/assurances/formules/${f.id}`)
    toastSuccess('Statut mis à jour.')
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Opération impossible.')
  }
}

// ── Couverture ──
function ouvrirAjoutCouverture(f) {
  formuleCouverture.value = f
  couvertureEditee.value = null
  Object.assign(formCouverture, { prestationId: null, tauxCouverture: null, plafond: null, dateDebut: '', dateFin: '' })
  modaleCouverture.value = true
}

function ouvrirModifCouverture(c) {
  formuleCouverture.value = null
  couvertureEditee.value = c
  Object.assign(formCouverture, {
    prestationId: c.prestationId,
    tauxCouverture: c.tauxCouverture,
    plafond: c.plafond ? Number(c.plafond) : null,
    dateDebut: c.dateDebut ? c.dateDebut.slice(0, 10) : '',
    dateFin: c.dateFin ? c.dateFin.slice(0, 10) : '',
  })
  modaleCouverture.value = true
}

async function enregistrerCouverture() {
  if (!formCouverture.prestationId || formCouverture.tauxCouverture == null) {
    toastError('La prestation et le taux sont obligatoires.')
    return
  }
  try {
    if (couvertureEditee.value) {
      await http.patch(`/assurances/couvertures/${couvertureEditee.value.id}`, { ...formCouverture })
      toastSuccess('Couverture modifiée.')
    } else {
      await http.post('/assurances/couvertures', {
        formuleId: formuleCouverture.value.id,
        ...formCouverture,
      })
      toastSuccess('Couverture créée.')
    }
    modaleCouverture.value = false
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'enregistrement.')
  }
}

async function basculerCouverture(c) {
  try {
    await http.delete(`/assurances/couvertures/${c.id}`)
    toastSuccess('Statut mis à jour.')
    await charger()
  } catch (e) {
    toastError(e.response?.data?.message || 'Opération impossible.')
  }
}

onMounted(charger)
</script>

<style scoped>
.reste-recouvrer {
  color: #b91c1c;
}
/* ---------- États d'assurance imprimables (A4) ---------- */
.assures-filtre {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
}
@media screen {
  .assur-print {
    position: fixed;
    left: -10000px;
    top: 0;
    width: 190mm;
  }
}
/* À l'impression d'un état, le reste de l'application est retiré (pas de page blanche) */
@media print {
  :global(body:has(.assur-print) #app) {
    display: none !important;
  }
}
.assur-a4 {
  background: #fff;
  color: #111;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 11px;
}
.assur-a4-clinique {
  margin: 0 0 8px;
  padding-bottom: 6px;
  font-size: 17px;
  font-weight: 800;
  text-align: center;
  text-transform: uppercase;
  border-bottom: 1.2px solid #111;
}
.assur-a4-titre {
  margin: 0;
  font-size: 14px;
  text-align: center;
}
.assur-a4-periode {
  margin: 2px 0 12px;
  text-align: center;
  color: #475569;
}
.assur-a4 h3 {
  margin: 12px 0 4px;
  font-size: 12.5px;
}
.assur-a4 table {
  width: 100%;
  border-collapse: collapse;
}
.assur-a4 th,
.assur-a4 td {
  padding: 4px 6px;
  text-align: left;
  border: 1px solid #94a3b8;
}
.assur-a4 th,
.assur-a4 tfoot td {
  font-weight: 700;
  background: #f1f5f9;
}
.assur-a4 .num {
  text-align: right;
  white-space: nowrap;
}
.assur-a4-groupe {
  page-break-inside: auto;
}
.assur-a4-total {
  margin-top: 12px;
  font-size: 12.5px;
  font-weight: 800;
  text-align: right;
}
.assur-a4-sign {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 24px;
  page-break-inside: avoid;
}
.assur-a4-sign div {
  min-width: 220px;
  min-height: 80px;
  padding: 8px 10px;
  font-weight: 700;
  border: 1px solid #94a3b8;
}
.assur-a4-sign small {
  font-weight: 400;
  color: #64748b;
}

.assurances-liste {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.assurance-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  background: #f8fdfb;
}
.assurance-tete,
.formule-tete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.assurance-tete {
  cursor: pointer;
}
.assurance-titre {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.chevron {
  color: #0d9488;
  font-weight: 800;
  font-size: 15px;
}
.nb-formules {
  font-size: 12px;
}
.formule-card {
  border: 1px solid #d5eee9;
  border-radius: 10px;
  padding: 10px;
  margin-top: 8px;
  background: #fff;
}
.small-note {
  font-size: 13px;
}
.tabs-nav {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  border-bottom: 2px solid #d5eee9;
  flex-wrap: wrap;
}
.tab-btn {
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  color: #5f857f;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
}
.tab-btn.active {
  color: #0f766e;
  border-bottom-color: #0d9488;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.kpi-card {
  border: 1px solid #c9ece5;
  border-radius: 10px;
  padding: 12px;
  background: #f0fdfa;
}
.kpi-titre {
  font-weight: 800;
  color: #134e4a;
  margin-bottom: 4px;
}
.kpi-lignes {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}
.part-assurance {
  color: #166534;
  font-weight: 700;
}
.part-patient {
  color: #991b1b;
  font-weight: 700;
}
</style>
