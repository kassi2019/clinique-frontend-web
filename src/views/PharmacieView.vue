<template>
  <div class="pharmacie-page">
    <!-- En-tête -->
    <header class="pharmacie-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">💊</div>
          <div class="brand-text">
            <strong>{{ cliniqueNom }}</strong>
            <span>Module Pharmacie — ordonnances, stocks et consommables</span>
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

    <main class="pharmacie-content">
      <!-- Onglets -->
      <nav class="tabs-nav tabs-fixe">
        <button class="tab-btn" :class="{ active: onglet === 'ordonnances' }" @click="onglet = 'ordonnances'">
          Ordonnances
        </button>
        <button class="tab-btn" :class="{ active: onglet === 'stocks' }" @click="onglet = 'stocks'; chargerStocks()">
          Stocks
        </button>
      </nav>

      <!-- ============ ORDONNANCES ============ -->
      <section v-if="onglet === 'ordonnances'" class="card">
        <div class="card-header"><h2>Ordonnances (§9.1)</h2></div>
        <div class="toolbar">
          <input
            v-model="recherche"
            class="search-input"
            type="text"
            placeholder="Rechercher par code patient, nom ou N° d'ordre…"
            @input="onRecherche"
          />
        </div>

        <!-- Liste des ordonnances en attente (sans recherche) -->
        <div v-if="!recherche.trim() && !ordonnance" class="ordo-attente">
          <div class="toolbar">
            <select v-model="filtreStatutOrdo" class="search-input" style="max-width: 170px; flex: none" @change="chargerOrdonnancesAttente">
              <option value="EN_ATTENTE">En attente</option>
              <option value="TRAITEE">Traitées</option>
            </select>
            <input
              v-model="filtreDateOrdo"
              type="date"
              class="search-input"
              style="max-width: 170px; flex: none"
              title="Vide = aujourd'hui"
              @change="chargerOrdonnancesAttente"
            />
            <button class="btn btn-outline btn-sm" @click="chargerOrdonnancesAttente">🔄 Actualiser</button>
          </div>
          <div v-if="ordonnancesAttente.length === 0" class="empty-state">
            Aucune ordonnance en attente.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N° ordonnance</th>
                  <th>Patient</th>
                  <th>Médecin</th>
                  <th>Date / heure</th>
                  <th>Médicaments</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in ordonnancesAttente" :key="o.id">
                  <td><strong>{{ o.numeroOrdonnance }}</strong></td>
                  <td>
                    <strong>{{ o.patient.nom }} {{ o.patient.prenom }}</strong>
                    <span class="text-muted"> ({{ o.patient.code }})</span>
                  </td>
                  <td>Dr {{ o.medecin?.personnel?.nom || '—' }}</td>
                  <td>{{ formatDateHeure(o.createdAt) }}</td>
                  <td>{{ o.nbMedicaments }}</td>
                  <td>
                    <span class="badge" :class="o.ordonnanceStatut === 'TRAITEE' ? 'badge-success' : 'badge-warning'">
                      {{ o.ordonnanceStatut === 'TRAITEE' ? 'Traitée' : 'En attente' }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-primary btn-sm" @click="ouvrirOrdonnanceListe(o)">
                      {{ o.ordonnanceStatut === 'TRAITEE' ? '👁️ Voir' : '💊 Traiter' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ul v-if="resultats.length && !ordonnance" class="resultats">
          <li v-for="p in resultats" :key="p.id">
            <strong>{{ p.patient.nom }} {{ p.patient.prenom }}</strong>
            <span>{{ p.numeroOrdre }} · code {{ p.patient.code }}</span>
            <div v-for="c in p.consultations" :key="c.id" class="ordo-line" @click="choisirOrdonnance(c, p)">
              💊 Ordonnance {{ c.numeroOrdonnance ? `n° ${c.numeroOrdonnance} — ` : '' }}du {{ formatDate(c.valideeLe || p.createdAt) }}
              ({{ c.medicaments.length }} médicament(s)) — {{ c.ordonnanceStatut === 'TRAITEE' ? 'traitée' : 'en attente' }}
            </div>
          </li>
        </ul>

        <div v-if="ordonnance" class="ordonnance-detail">
          <div class="fiche-info">
            <div class="fiche-ligne">
              <span class="fiche-label">Patient</span>
              <strong>{{ ordonnance.consultation.patient.nom }} {{ ordonnance.consultation.patient.prenom }}</strong>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">Code</span>
              <span class="code-chip">{{ ordonnance.consultation.patient.code }}</span>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">Médecin</span>
              <span>Dr {{ ordonnance.consultation.medecin?.personnel?.nom || '—' }}</span>
            </div>
            <div class="fiche-ligne">
              <span class="fiche-label">Service</span>
              <span>{{ ordonnance.consultation.service?.nom }}</span>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Médicament</th>
                  <th>Prescription</th>
                  <th>Stock</th>
                  <th>Prix unitaire</th>
                  <th>Qté (boîte/plaque)</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in ordonnance.prescriptions" :key="p.id">
                  <td><strong>{{ p.medicamentNom }}</strong><span v-if="p.forme" class="text-muted"> ({{ p.forme }})</span></td>
                  <td>{{ [p.posologie, p.quantite, p.duree].filter(Boolean).join(' · ') || '—' }}</td>
                  <td>
                    <span v-if="p.medicament" class="badge" :class="p.medicament.stock > 0 ? 'badge-success' : 'badge-danger'">
                      {{ p.medicament.stock }}
                    </span>
                    <span v-else class="badge badge-warning">Hors catalogue</span>
                  </td>
                  <td>
                    <span v-if="p.medicament?.prixVente">
                      {{ p.medicament.prixVente.toLocaleString('fr-FR') }} F /
                      {{ p.medicament.uniteVente === 'PLAQUE' ? 'plaque' : 'boîte' }}
                    </span>
                    <span v-else class="text-muted">—</span>
                  </td>
                  <td style="width: 130px">
                    <input
                      v-if="p.medicament"
                      v-model.number="quantites[p.id]"
                      type="number"
                      min="0"
                      class="qte-input"
                      :max="p.medicament.stock"
                      placeholder="0"
                    />
                    <span v-else class="text-muted">Non délivrable</span>
                  </td>
                  <td>
                    <strong v-if="p.medicament?.consommable && quantites[p.id]" class="text-muted">
                      Consommable — non facturé
                    </strong>
                    <strong v-else-if="p.medicament?.prixVente && quantites[p.id]">
                      {{ (p.medicament.prixVente * (quantites[p.id] || 0)).toLocaleString('fr-FR') }} F
                    </strong>
                    <span v-else>—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="recap">
            <div class="recap-item">
              <span>Total à payer</span>
              <strong>{{ totalOrdonnance.toLocaleString('fr-FR') }} FCFA</strong>
            </div>
            <div class="dispense-actions">
              <select v-model="modePaiement" class="mode-select">
                <option value="ESPECES">💵 Espèces</option>
                <option value="MOBILE_MONEY">📱 Mobile Money</option>
                <option value="CARTE">💳 Carte bancaire</option>
              </select>
              <button
                class="btn btn-primary"
                :disabled="dispenseEnCours || totalOrdonnance === 0"
                @click="dispenser"
              >
                {{ dispenseEnCours ? 'Dispensation…' : '💊 Dispenser & encaisser' }}
              </button>
              <button class="btn btn-outline btn-sm" @click="ordonnance = null; resultats = []">
                ✕ Autre ordonnance
              </button>
            </div>
          </div>

          <!-- Historique des dispensations -->
          <h3 class="section-title">Dispensations de cette ordonnance</h3>
          <div v-if="ordonnance.dispensations.length === 0" class="text-muted small-note">
            Aucune dispensation enregistrée.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Lignes</th>
                  <th>Total</th>
                  <th>Reçu</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in ordonnance.dispensations" :key="d.id">
                  <td>{{ formatDateHeure(d.createdAt) }}</td>
                  <td>
                    {{ d.lignes
                      .map(
                        (l) =>
                          `${l.medicamentNom} x${l.quantiteDelivree} ${l.uniteVente === 'PLAQUE' ? 'plaque(s)' : 'boîte(s)'}`,
                      )
                      .join(', ') }}
                  </td>
                  <td>{{ d.montantTotal.toLocaleString('fr-FR') }} FCFA</td>
                  <td>{{ d.paiement?.numeroRecu || '—' }}</td>
                  <td>
                    <span class="badge" :class="d.statut === 'CLOTUREE' ? 'badge-success' : 'badge-warning'">
                      {{ d.statut === 'CLOTUREE' ? 'Clôturée' : 'En cours' }}
                    </span>
                  </td>
                  <td>
                    <button
                      v-if="d.paiement"
                      class="btn btn-outline btn-sm"
                      @click="imprimerRecuPharmacie(d.paiement.id)"
                    >
                      🖨️ Reçu
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ============ STOCKS ============ -->
      <section v-else-if="onglet === 'stocks'" class="card card-stocks">
        <div class="card-header">
          <h2>Stocks de médicaments</h2>
          <div class="header-actions">
            <button
              class="btn btn-outline btn-sm"
              title="Seuil = consommation des 60 derniers jours ÷ 120"
              @click="recalculerSeuils"
            >
              🎯 Recalculer les seuils
            </button>
            <button class="btn btn-outline btn-sm" @click="chargerAlertes">⚠️ Alertes</button>
          </div>
        </div>

        <!-- Barre figée pendant le défilement : sous-onglets + recherche + action -->
        <div class="stock-fixe">
          <nav class="tabs-nav" style="margin-bottom: 0">
            <button
              class="tab-btn"
              :class="{ active: sousOnglet === 'entree' }"
              @click="sousOnglet = 'entree'"
            >
              📥 Entrée
            </button>
            <button
              class="tab-btn"
              :class="{ active: sousOnglet === 'inventaire' }"
              @click="sousOnglet = 'inventaire'; chargerInventaireLots()"
            >
              🔢 Inventaire
            </button>
            <button
              class="tab-btn"
              :class="{ active: sousOnglet === 'mouvement' }"
              @click="sousOnglet = 'mouvement'; chargerMouvementsMed()"
            >
              📜 Mouvements
            </button>
          </nav>

          <div v-if="sousOnglet === 'entree'" class="toolbar">
            <input
              v-model="filtreStock"
              class="search-input"
              type="text"
              placeholder="Rechercher un médicament…"
              @input="onRechercheStock"
            />
          </div>
          <div v-else-if="sousOnglet === 'inventaire'" class="toolbar">
            <input
              v-model="filtreStock"
              class="search-input"
              type="text"
              placeholder="Rechercher un médicament…"
              @input="onRechercheStock"
            />
            <button
              class="btn btn-success btn-sm"
              :disabled="nbSaisies === 0"
              @click="validerInventaireGlobal"
            >
              ✅ Valider tout l'inventaire ({{ nbSaisies }})
            </button>
          </div>
          <div v-else class="toolbar">
            <SelectSearch
              v-model="mouvementMedId"
              :options="optionsStocks"
              placeholder="— Choisir un médicament —"
              @update:model-value="chargerMouvementsMed"
            />
          </div>
        </div>

        <p v-if="alertes && (alertes.stockBas.length || alertes.peremptions.length)" class="alert alert-error">
          ⚠️ {{ alertes.stockBas.length }} médicament(s) sous le seuil minimum ·
          {{ alertes.peremptions.length }} lot(s) périmé(s) ou proches de la péremption
        </p>

        <!-- ── ENTREE : le tableau actuel ── -->
        <template v-if="sousOnglet === 'entree'">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Médicament</th>
                  <th>Stock</th>
                  <th>Seuil</th>
                  <th>Prix vente</th>
                  <th>Lots</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in stocks" :key="m.id">
                  <td><strong>{{ m.nom }}</strong><span v-if="m.dosage" class="text-muted"> {{ m.dosage }}</span></td>
                  <td>
                    <span class="badge" :class="m.alerteStock ? 'badge-danger' : m.stock > 0 ? 'badge-success' : 'badge-warning'">
                      {{ m.stock }}
                    </span>
                  </td>
                  <td>{{ m.seuilAlerte }}</td>
                  <td>{{ m.prixVente ? m.prixVente.toLocaleString('fr-FR') + ' F' : '—' }}</td>
                  <td>
                    <div v-for="l in m.lots.slice(0, 3)" :key="l.id" class="lot-line">
                      <span class="badge badge-muted">{{ l.numeroLot }}</span>
                      <span class="text-muted" :class="{ 'perime': l.perime, 'proche': l.peremptionProche }">
                        {{ l.quantiteRestante }} · péremption {{ formatDate(l.datePeremption) }}
                        {{ l.perime ? ' ⚠️ PÉRIMÉ' : l.peremptionProche ? ' ⚠️ proche' : '' }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-outline btn-sm" @click="ouvrirEntree(m)">📥 Entrée</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- ── INVENTAIRE : liste des produits et de leurs lots ── -->
        <template v-else-if="sousOnglet === 'inventaire'">
          <div v-if="stocks.length === 0" class="empty-state">
            Aucun médicament en stock.
          </div>
          <div v-else class="inventaire-produits">
            <div v-for="m in stocks" :key="m.id" class="inventaire-produit">
              <div class="inventaire-produit-entete">
                <strong>{{ m.nom }}</strong>
                <span v-if="m.dosage" class="text-muted">{{ m.dosage }}</span>
                <span class="badge" :class="m.stock > 0 ? 'badge-success' : 'badge-warning'">
                  Stock total : {{ m.stock }}
                </span>
              </div>
              <table class="inventaire-lots">
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Péremption</th>
                    <th>Stock actuel</th>
                    <th>Stock réel (compté)</th>
                    <th>Écart</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="l in lotsDe(m.id)" :key="l.id">
                    <td>
                      <span class="badge badge-muted">{{ l.numeroLot }}</span>
                      <span v-if="l.fournisseur" class="text-muted lot-fournisseur">{{ l.fournisseur }}</span>
                    </td>
                    <td>{{ formatDate(l.datePeremption) }}</td>
                    <td>{{ l.quantiteRestante }}</td>
                    <td>
                      <input
                        v-model="inventaireSaisies[l.id]"
                        type="number"
                        min="0"
                        class="inventaire-input"
                        :placeholder="String(l.quantiteRestante)"
                      />
                    </td>
                    <td>
                      <span
                        class="badge"
                        :class="ecartLot(l) === 0 ? 'badge-success' : ecartLot(l) > 0 ? 'badge-warning' : 'badge-danger'"
                      >
                        {{ ecartLot(l) > 0 ? '+' : '' }}{{ ecartLot(l) }}
                      </span>
                    </td>
                    <td>
                      <button
                        class="btn btn-primary btn-sm"
                        :disabled="inventaireSaisies[l.id] === undefined || inventaireSaisies[l.id] === ''"
                        @click="validerInventaireLot(l)"
                      >
                      ✅ Valider
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </template>

        <!-- ── MOUVEMENTS : historique par médicament ── -->
        <template v-else>
          <div v-if="mouvements.length === 0" class="empty-state">
            Choisissez un médicament pour voir ses mouvements.
          </div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantité</th>
                  <th>Lot / référence</th>
                  <th>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mv in mouvements" :key="mv.id">
                  <td>{{ formatDate(mv.createdAt) }} {{ new Date(mv.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}</td>
                  <td>
                    <span
                      class="badge"
                      :class="mv.type === 'ENTREE' ? 'badge-success' : mv.type === 'SORTIE' ? 'badge-warning' : 'badge-muted'"
                    >
                      {{ mv.type }}
                    </span>
                  </td>
                  <td>{{ mv.quantite > 0 ? '+' : '' }}{{ mv.quantite }}</td>
                  <td>{{ mv.reference || mv.lot?.numeroLot || '—' }}</td>
                  <td class="text-muted">{{ mv.commentaire || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>
    </main>

    <!-- Modale : entrée de stock -->
    <div v-if="entreeVisible" class="modal-backdrop">
      <div class="modal">
        <h2>📥 Entrée de stock — {{ entreeCible?.nom }}</h2>
        <p v-if="entreeError" class="alert alert-error">{{ entreeError }}</p>
        <form @submit.prevent="confirmerEntree">
          <div class="form-row">
            <div class="field">
              <label>Numéro de lot *</label>
              <input v-model.trim="entreeForm.numeroLot" required />
            </div>
            <div class="field">
              <label>Quantité *</label>
              <input v-model.number="entreeForm.quantite" type="number" min="1" required />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Date de péremption *</label>
              <input v-model="entreeForm.datePeremption" type="date" required />
            </div>
            <div class="field">
              <label>Prix d'achat (FCFA)</label>
              <input v-model.number="entreeForm.prixAchat" type="number" min="0" step="1" />
            </div>
            <div class="field">
              <label>Fournisseur</label>
              <input
                v-model.trim="entreeForm.fournisseur"
                list="liste-fournisseurs"
                placeholder="Ex : COPHARMED, Laborex…"
              />
              <datalist id="liste-fournisseurs">
                <option v-for="f in fournisseurs" :key="f.id" :value="f.libelle" />
              </datalist>
              <small class="text-muted">Nouveau fournisseur ? Il sera ajouté automatiquement à la liste.</small>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="entreeVisible = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="entreeEnCours">Enregistrer l'entrée</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modale : inventaire -->
    <div v-if="inventaireVisible" class="modal-backdrop">
      <div class="modal">
        <h2>🔢 Inventaire — {{ inventaireCible?.nom }}</h2>
        <p class="text-muted">Stock actuel : {{ inventaireCible?.stock }}</p>
        <form @submit.prevent="confirmerInventaire">
          <div class="field">
            <label>Quantité réelle comptée *</label>
            <input v-model.number="inventaireQuantite" type="number" min="0" required />
          </div>
          <div class="field">
            <label>Commentaire</label>
            <input v-model.trim="inventaireCommentaire" placeholder="Ex : comptage mensuel" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="inventaireVisible = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary">Valider l'inventaire</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modale : mouvements -->
    <div v-if="mouvementsVisible" class="modal-backdrop">
      <div class="modal modal-lg">
        <h2>📜 Mouvements — {{ mouvementsCible?.nom }}</h2>
        <div v-if="mouvementsModal.length === 0" class="empty-state">Aucun mouvement.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Quantité</th>
                <th>Lot / Référence</th>
                <th>Par</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mv in mouvementsModal" :key="mv.id">
                <td>{{ formatDateHeure(mv.createdAt) }}</td>
                <td>
                  <span class="badge" :class="mv.type === 'ENTREE' ? 'badge-success' : mv.type === 'SORTIE' ? 'badge-danger' : 'badge-warning'">
                    {{ mv.type }}
                  </span>
                </td>
                <td>{{ mv.quantite > 0 ? '+' + mv.quantite : mv.quantite }}</td>
                <td>{{ mv.lot?.numeroLot || mv.reference || '—' }}</td>
                <td>{{ mv.utilisateur ? mv.utilisateur.prenom + ' ' + mv.utilisateur.nom : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" @click="mouvementsVisible = false">✖ Fermer</button>
        </div>
      </div>
    </div>

    <!-- Modale : mouvement consommable -->
    <div v-if="mouvementConsomVisible" class="modal-backdrop">
      <div class="modal">
        <h2>{{ mouvementType === 'ENTREE' ? '📥 Entrée' : '📤 Sortie' }} — {{ mouvementCible?.nom }}</h2>
        <p class="text-muted">Quantité actuelle : {{ mouvementCible?.quantite }} {{ mouvementCible?.unite || '' }}</p>
        <form @submit.prevent="confirmerMouvementConsommable">
          <div class="field">
            <label>Quantité *</label>
            <input v-model.number="mouvementQuantite" type="number" min="1" required />
          </div>
          <div class="field">
            <label>Commentaire</label>
            <input v-model.trim="mouvementCommentaire" placeholder="Ex : service maternité" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="mouvementConsomVisible = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary">✅ Valider</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modale : consommable -->
    <div v-if="consomFormVisible" class="modal-backdrop">
      <div class="modal">
        <h2>Nouveau consommable</h2>
        <form @submit.prevent="confirmerConsommable">
          <div class="form-row">
            <div class="field">
              <label>Nom *</label>
              <input v-model.trim="consomForm.nom" required placeholder="Ex : Alcool 90°" />
            </div>
            <div class="field">
              <label>Unité</label>
              <input v-model.trim="consomForm.unite" placeholder="Ex : flacon, paquet" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Quantité initiale</label>
              <input v-model.number="consomForm.quantite" type="number" min="0" />
            </div>
            <div class="field">
              <label>Seuil d'alerte</label>
              <input v-model.number="consomForm.seuilAlerte" type="number" min="0" />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="consomFormVisible = false">✖ Annuler</button>
            <button type="submit" class="btn btn-primary">Créer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Reçu pharmacie imprimable -->
    <div v-if="recuPharma" id="recu-print">
      <div class="recu">
        <div class="recu-head"><h1>{{ cliniqueNom }}</h1></div>
        <div class="recu-sep"></div>
        <h2 class="recu-title">REÇU PHARMACIE</h2>
        <div class="recu-numero">{{ recuPharma.paiement.numeroRecu }}</div>
        <div class="recu-sep"></div>
        <div class="recu-infos">
          <div><strong>Patient : {{ ordonnance?.consultation?.patient?.nom }} {{ ordonnance?.consultation?.patient?.prenom }}</strong></div>
        </div>
        <div class="recu-sep"></div>
        <div class="recu-lignes">
          <div v-for="l in recuPharma.lignes" :key="l.id" class="recu-ligne">
            <span class="recu-ligne-nom">{{ l.medicamentNom }}</span>
            <span class="recu-ligne-detail">
              {{ l.prixUnitaire.toLocaleString('fr-FR') }} F × {{ l.quantiteDelivree }} =
              {{ l.montant.toLocaleString('fr-FR') }} F
            </span>
          </div>
        </div>
        <div class="recu-sep"></div>
        <div class="recu-total">TOTAL : {{ recuPharma.paiement.montantTotal.toLocaleString('fr-FR') }} FCFA</div>
        <div class="recu-infos">
          <div>Mode : {{ labelMode(recuPharma.paiement.modePaiement) }}</div>
          <div>Caissière : {{ auth.user?.personnel?.prenom }} {{ auth.user?.personnel?.nom }}</div>
          <div>{{ formatDateHeure(recuPharma.paiement.createdAt) }}</div>
        </div>
        <div class="recu-sep"></div>
        <div class="recu-foot">Merci de votre visite</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { useAuthStore } from '../stores/auth'
import http from '../api/http'
import { toastError, toastSuccess } from '../utils/notifications'

const auth = useAuthStore()
const router = useRouter()

const cliniqueId = computed(() => auth.user?.clinique?.id ?? null)
const cliniqueNom = computed(() => auth.user?.clinique?.nom || 'Gestion Clinique')

const todayLabel = computed(() =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
)

const MODES = { ESPECES: 'Espèces', MOBILE_MONEY: 'Mobile Money', CARTE: 'Carte bancaire' }
const labelMode = (m) => MODES[m] || m

const onglet = ref('ordonnances')

// Ordonnances
const recherche = ref('')
const resultats = ref([])
const ordonnance = ref(null)
const quantites = reactive({})
const modePaiement = ref('ESPECES')
const dispenseEnCours = ref(false)
const recuPharma = ref(null)
let rechercheTimer = null

const totalOrdonnance = computed(() => {
  if (!ordonnance.value) return 0
  return ordonnance.value.prescriptions.reduce((somme, p) => {
    const qte = quantites[p.id] || 0
    // Les consommables ne sont pas facturés (montant = 0, comme le backend)
    if (p.medicament?.consommable) return somme
    return somme + (p.medicament?.prixVente || 0) * qte
  }, 0)
})

function onRecherche() {
  clearTimeout(rechercheTimer)
  rechercheTimer = setTimeout(async () => {
    if (recherche.value.trim().length < 2) {
      resultats.value = []
      return
    }
    try {
      const { data } = await http.get('/pharmacie/ordonnances', {
        params: { code: recherche.value, cliniqueId: cliniqueId.value },
      })
      resultats.value = data
    } catch {
      resultats.value = []
    }
  }, 300)
}

async function choisirOrdonnance(c) {
  try {
    const { data } = await http.get(`/pharmacie/consultations/${c.id}`)
    ordonnance.value = data
    resultats.value = []
    recherche.value = ''
    Object.keys(quantites).forEach((k) => delete quantites[k])
  } catch (e) {
    toastError(e.response?.data?.message || 'Impossible de charger l\'ordonnance.')
  }
}

// ── Liste des ordonnances en attente (nouveau cahier des charges) ──
const ordonnancesAttente = ref([])
const filtreStatutOrdo = ref('EN_ATTENTE')
const filtreDateOrdo = ref('')

async function chargerOrdonnancesAttente() {
  try {
    const { data } = await http.get('/pharmacie/ordonnances', {
      params: {
        cliniqueId: cliniqueId.value,
        statut: filtreStatutOrdo.value,
        debut: filtreDateOrdo.value || undefined,
        fin: filtreDateOrdo.value || undefined,
      },
    })
    ordonnancesAttente.value = data.liste ? data.ordonnances ?? [] : []
  } catch {
    ordonnancesAttente.value = []
  }
}

async function ouvrirOrdonnanceListe(o) {
  await choisirOrdonnance({ id: o.id })
}

async function dispenser() {
  if (!ordonnance.value) return
  const lignes = ordonnance.value.prescriptions
    .filter((p) => p.medicament && quantites[p.id] > 0)
    .map((p) => ({ prescriptionId: p.id, quantiteDelivree: quantites[p.id] }))
  if (lignes.length === 0) {
    toastError('Saisissez au moins une quantité à délivrer.')
    return
  }
  dispenseEnCours.value = true
  try {
    const { data } = await http.post(
      `/pharmacie/dispensations/${ordonnance.value.consultation.id}`,
      { lignes },
    )
    const { data: paiement } = await http.post(
      `/pharmacie/dispensations/${data.id}/payer`,
      { modePaiement: modePaiement.value },
    )
    recuPharma.value = paiement
    toastSuccess(`Dispensation encaissée : ${paiement.paiement.numeroRecu}`)
    if (paiement.impression?.ok) {
      toastSuccess(`Reçu imprimé : ${paiement.impression.message}`)
    }
    chargerOrdonnancesAttente()
    await choisirOrdonnance(ordonnance.value.consultation)
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de la dispensation.')
  } finally {
    dispenseEnCours.value = false
  }
}

async function imprimerRecuPharmacie(paiementId) {
  try {
    const { data } = await http.post(`/impression/pharmacie-paiements/${paiementId}`)
    if (data.ok) toastSuccess(data.message)
    else toastError(data.message)
  } catch (e) {
    toastError(`Erreur d'impression : ${e.response?.data?.message || e.message}`)
  }
}

/** Recalcule les seuils automatiques (consommation 60 j ÷ 120) de tous les médicaments. */
async function recalculerSeuils() {
  try {
    const { data } = await http.post('/pharmacie/seuils/recalculer', null, {
      params: { cliniqueId: cliniqueId.value },
    })
    toastSuccess(`${data.recalcules} seuil(s) recalculé(s) — consommation 60 j ÷ 120.`)
    await chargerStocks()
    await chargerAlertes()
  } catch (e) {
    toastError(e.response?.data?.message || 'Recalcul impossible.')
  }
}

// Stocks
const stocks = ref([])
const alertes = ref(null)
const filtreStock = ref('')
let stockTimer = null

// ── Sous-onglets Stock : Entrée / Inventaire (par lot) / Mouvements ──
const sousOnglet = ref('entree')
const tousLots = ref([])
const inventaireSaisies = ref({})
const mouvementMedId = ref(null)
const mouvements = ref([])

const optionsStocks = computed(() =>
  stocks.value.map((m) => ({ value: m.id, label: `${m.nom}${m.dosage ? ` (${m.dosage})` : ''}` })),
)

/** Lots du produit (liste Inventaire). */
function lotsDe(medicamentId) {
  return tousLots.value.filter((l) => l.medicamentId === medicamentId)
}

function ecartLot(l) {
  const saisie = inventaireSaisies.value[l.id]
  if (saisie === undefined || saisie === '') return 0
  return Number(saisie) - l.quantiteRestante
}

/** Charge tous les lots de la clinique (groupés par produit). */
async function chargerInventaireLots() {
  tousLots.value = []
  inventaireSaisies.value = {}
  try {
    const { data } = await http.get('/pharmacie/lots', {
      params: { cliniqueId: cliniqueId.value },
    })
    tousLots.value = data ?? []
  } catch {
    tousLots.value = []
  }
}

/** Nombre de lots avec une quantité réelle saisie (inventaire). */
const nbSaisies = computed(() =>
  Object.values(inventaireSaisies.value).filter((s) => s !== '' && s !== undefined && s !== null).length,
)

/** Valide d'un coup toutes les quantités réelles saisies. */
async function validerInventaireGlobal() {
  const lignes = tousLots.value
    .filter((l) => {
      const s = inventaireSaisies.value[l.id]
      return s !== '' && s !== undefined && s !== null
    })
    .map((l) => ({ lotId: l.id, quantiteReelle: Number(inventaireSaisies.value[l.id]) }))
  if (lignes.length === 0) return
  const reponse = await Swal.fire({
    title: `Valider tout l'inventaire ?`,
    text: `${lignes.length} lot(s) seront ajustés.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui, valider',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#16a34a',
  })
  if (!reponse.isConfirmed) return
  try {
    const { data } = await http.post('/pharmacie/lots/inventaire-multiple', { lignes })
    toastSuccess(`${data.ajustes} lot(s) ajusté(s) sur ${data.total}.`)
    await chargerInventaireLots()
    await chargerStocks()
    await chargerAlertes()
  } catch (e) {
    toastError(e.response?.data?.message || 'Inventaire impossible.')
  }
}

async function validerInventaireLot(l) {
  const saisie = inventaireSaisies.value[l.id]
  if (saisie === undefined || saisie === '') return
  try {
    await http.post(`/pharmacie/lots/${l.id}/inventaire`, {
      quantiteReelle: Number(saisie),
    })
    toastSuccess(`Lot ${l.numeroLot} : stock ajusté à ${saisie}.`)
    inventaireSaisies.value = { ...inventaireSaisies.value, [l.id]: '' }
    await chargerInventaireLots()
    await chargerStocks()
    await chargerAlertes()
  } catch (e) {
    toastError(e.response?.data?.message || 'Inventaire impossible.')
  }
}

async function chargerMouvementsMed() {
  mouvements.value = []
  if (!mouvementMedId.value) return
  try {
    const { data } = await http.get(`/pharmacie/mouvements/${mouvementMedId.value}`)
    mouvements.value = data
  } catch {
    mouvements.value = []
  }
}

async function chargerStocks() {
  try {
    const { data } = await http.get('/pharmacie/stocks', {
      params: { cliniqueId: cliniqueId.value, search: filtreStock.value || undefined },
    })
    stocks.value = data
  } catch {
    stocks.value = []
  }
}

function onRechercheStock() {
  clearTimeout(stockTimer)
  stockTimer = setTimeout(chargerStocks, 300)
}

async function chargerAlertes() {
  try {
    const { data } = await http.get('/pharmacie/alertes', { params: { cliniqueId: cliniqueId.value } })
    alertes.value = data
    if (data.stockBas.length === 0 && data.peremptions.length === 0) {
      toastSuccess('Aucune alerte : stocks et péremptions OK.')
    }
  } catch {
    alertes.value = null
  }
}

const entreeVisible = ref(false)
const entreeCible = ref(null)
const entreeForm = reactive({})
const entreeEnCours = ref(false)
const entreeError = ref('')

function ouvrirEntree(m) {
  entreeCible.value = m
  Object.keys(entreeForm).forEach((k) => delete entreeForm[k])
  Object.assign(entreeForm, { numeroLot: '', quantite: null, datePeremption: '', prixAchat: null, fournisseur: '' })
  entreeError.value = ''
  chargerFournisseurs()
  entreeVisible.value = true
}

async function confirmerEntree() {
  entreeEnCours.value = true
  entreeError.value = ''
  try {
    await http.post('/pharmacie/entrees', {
      medicamentId: entreeCible.value.id,
      ...entreeForm,
    })
    // Fournisseur saisi librement : ajouté automatiquement à la liste
    if (entreeForm.fournisseur?.trim()) {
      try {
        await http.post('/fournisseurs', {
          cliniqueId: cliniqueId.value,
          libelle: entreeForm.fournisseur.trim(),
        })
      } catch {
        /* facultatif */
      }
    }
    entreeVisible.value = false
    toastSuccess('Entrée de stock enregistrée.')
    await chargerStocks()
    await chargerAlertes()
  } catch (e) {
    entreeError.value = e.response?.data?.message || 'Erreur lors de l\'entrée.'
  } finally {
    entreeEnCours.value = false
  }
}

// Fournisseurs (datalist de l'entrée de stock)
const fournisseurs = ref([])

async function chargerFournisseurs() {
  try {
    const { data } = await http.get('/fournisseurs', {
      params: { cliniqueId: cliniqueId.value },
    })
    fournisseurs.value = data ?? []
  } catch {
    fournisseurs.value = []
  }
}

const inventaireVisible = ref(false)
const inventaireCible = ref(null)
const inventaireQuantite = ref(null)
const inventaireCommentaire = ref('')

function ouvrirInventaire(m) {
  inventaireCible.value = m
  inventaireQuantite.value = m.stock
  inventaireCommentaire.value = ''
  inventaireVisible.value = true
}

async function confirmerInventaire() {
  try {
    await http.post('/pharmacie/inventaire', {
      medicamentId: inventaireCible.value.id,
      quantiteReelle: inventaireQuantite.value,
      commentaire: inventaireCommentaire.value,
    })
    inventaireVisible.value = false
    toastSuccess('Inventaire validé.')
    await chargerStocks()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de l\'inventaire.')
  }
}

const mouvementsVisible = ref(false)
const mouvementsCible = ref(null)
const mouvementsModal = ref([])

async function ouvrirMouvements(m) {
  mouvementsCible.value = m
  try {
    const { data } = await http.get(`/pharmacie/mouvements/${m.id}`)
    mouvementsModal.value = data
  } catch {
    mouvementsModal.value = []
  }
  mouvementsVisible.value = true
}

// Consommables
const consommables = ref([])
const mouvementConsomVisible = ref(false)
const mouvementCible = ref(null)
const mouvementType = ref('ENTREE')
const mouvementQuantite = ref(null)
const mouvementCommentaire = ref('')
const consomFormVisible = ref(false)
const consomForm = reactive({})

async function chargerConsommables() {
  try {
    const { data } = await http.get('/pharmacie/consommables', { params: { cliniqueId: cliniqueId.value } })
    consommables.value = data
  } catch {
    consommables.value = []
  }
}

function ouvrirMouvementConsommable(c, type) {
  mouvementCible.value = c
  mouvementType.value = type
  mouvementQuantite.value = null
  mouvementCommentaire.value = ''
  mouvementConsomVisible.value = true
}

async function confirmerMouvementConsommable() {
  try {
    await http.post(`/pharmacie/consommables/${mouvementCible.value.id}/mouvement`, {
      type: mouvementType.value,
      quantite: mouvementQuantite.value,
      commentaire: mouvementCommentaire.value,
    })
    mouvementConsomVisible.value = false
    toastSuccess('Mouvement enregistré.')
    await chargerConsommables()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors du mouvement.')
  }
}

function ouvrirConsommable() {
  Object.keys(consomForm).forEach((k) => delete consomForm[k])
  Object.assign(consomForm, { nom: '', unite: '', quantite: 0, seuilAlerte: 0 })
  consomFormVisible.value = true
}

async function confirmerConsommable() {
  try {
    await http.post('/pharmacie/consommables', {
      cliniqueId: cliniqueId.value,
      ...consomForm,
    })
    consomFormVisible.value = false
    toastSuccess('Consommable créé.')
    await chargerConsommables()
  } catch (e) {
    toastError(e.response?.data?.message || 'Erreur lors de la création.')
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR')
}
function formatDateHeure(d) {
  return new Date(d).toLocaleString('fr-FR')
}

onMounted(() => {
  chargerStocks()
  chargerConsommables()
  chargerAlertes()
  chargerOrdonnancesAttente()
})
onUnmounted(() => {
  clearTimeout(rechercheTimer)
  clearTimeout(stockTimer)
})
</script>

<style scoped>
.pharmacie-page {
  min-height: 100vh;
  background: linear-gradient(170deg, #ffffff 0%, #eef9f7 55%, #e3f4f0 100%);
  display: flex;
  flex-direction: column;
}
.pharmacie-header {
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

.pharmacie-content {
  flex: 1;
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 20px 24px;
}

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

.resultats {
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 260px;
  overflow-y: auto;
}
.resultats li {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border);
}
.resultats span {
  font-size: 12px;
  color: var(--text-muted);
}
.ordo-line {
  margin-top: 6px;
  padding: 8px 12px;
  background: #f0fdfa;
  border: 1px solid #c9ece5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}
.ordo-line:hover {
  background: #e6f8f4;
}

.ordonnance-detail {
  margin-top: 16px;
}
.fiche-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  background: #f0fdfa;
  border: 1px solid #c9ece5;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 16px;
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
.qte-input {
  width: 80px;
  padding: 6px 8px;
  border: 1.5px solid var(--border-champ);
  border-radius: 8px;
  font-size: 13.5px;
  font-family: inherit;
}

.recap {
  margin-top: 16px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}
.recap-item {
  display: flex;
  gap: 24px;
  font-size: 16px;
  color: #134e4a;
}
.dispense-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.mode-select {
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: var(--surface);
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
.small-note {
  font-size: 13px;
}

.lot-line {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12.5px;
  margin-bottom: 2px;
  flex-wrap: wrap;
}
.perime {
  color: var(--danger);
  font-weight: 700;
}
.proche {
  color: var(--warning);
  font-weight: 700;
}

/* Reçu navigateur */
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
  font-family: 'Segoe UI', system-ui, sans-serif;
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
}
.recu-numero {
  font-size: 20px;
  font-weight: 800;
  font-family: Consolas, monospace;
  color: #134e4a;
  margin-top: 6px;
}
.recu-infos {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13px;
  text-align: left;
}
.recu-lignes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.recu-ligne {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  text-align: left;
}
.recu-ligne-nom {
  font-weight: 700;
  font-size: 13.5px;
}
.recu-ligne-detail {
  font-size: 12.5px;
  color: #475569;
  white-space: nowrap;
}
.recu-total {
  font-size: 15px;
  font-weight: 800;
  color: #134e4a;
  text-align: right;
}
.recu-foot {
  font-size: 13px;
  font-weight: 700;
  color: #134e4a;
}
</style>
