/**
 * Directive v-data-table : ajoute à un <table> existant
 *  - une case de filtre sous chaque en-tête (filtres cumulables, sans accents ni casse ;
 *    dans une colonne de nombres / montants, un nombre tapé cherche la valeur exacte),
 *  - le tri en cliquant sur l'en-tête (croissant → décroissant → ordre d'origine),
 *  - un bandeau « X lignes sur Y · Effacer les filtres » quand un filtre est actif.
 * Le contenu des cellules (boutons, badges…) n'est pas touché : seules les lignes sont
 * masquées ou réordonnées. Les colonnes sans titre, « Actions » ou marquées
 * data-dt-off n'ont ni filtre ni tri. Le tfoot (totaux) n'est pas recalculé.
 *
 * Usage : <table v-data-table="'stocks-entree'"> — la clé (facultative) conserve
 * les filtres et le tri quand le tableau est recréé (changement d'onglet).
 */

const etatsMemorises = new Map() // clé → { filtres: string[], tri: { col, sens } }

const normaliser = (t) =>
  (t ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/** Valeur comparable : date jj/mm/aaaa, nombre (« 1 500 F », « +3 »), sinon texte. */
function valeurTri(texte) {
  const t = texte.trim()
  const date = t.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
  if (date) return Number(`${date[3]}${date[2]}${date[1]}${date[4] ?? '00'}${date[5] ?? '00'}`)
  const nombre = t.replace(/\s/g, '').match(/^[+-]?\d+(?:[.,]\d+)?/)
  if (nombre && /^[+-]?[\d\s.,]+(f|fcfa|%)?$/i.test(t)) return Number(nombre[0].replace(',', '.'))
  return normaliser(t)
}

/**
 * Valeur d'une cellule nombre / montant (« 0 », « 1 500 F », « +3 », « 12 % », « 0 Sans consommation »),
 * sinon null. Les identifiants tout en chiffres (téléphone « 0787… », numéros longs) restent du texte.
 */
function valeurNumerique(texte) {
  const t = (texte ?? '').replace(/\s+/g, ' ').trim()
  const m = t.match(/^([+-]?\d+(?: \d{3})*(?:[.,]\d+)?)(?: ?(?:f|fcfa|%))?(?: \D.*)?$/i)
  if (!m) return null
  const brut = m[1].replace(/ /g, '')
  if (/^[+-]?0\d/.test(brut) || /^\d{8,}$/.test(brut)) return null
  return Number(brut.replace(',', '.'))
}

const celluleVide = (texte) => ['', '—', '-'].includes((texte ?? '').trim())

function comparer(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'fr', { numeric: true })
}

function colonneActive(th) {
  const libelle = normaliser(th.textContent)
  return libelle && libelle !== 'actions' && !th.hasAttribute('data-dt-off') && th.colSpan === 1
}

function installer(table, cle) {
  const entete = table.tHead?.rows[0]
  if (!entete || table._dt) return
  const ths = [...entete.cells]
  const memo = cle ? etatsMemorises.get(cle) : null
  const etat = {
    filtres: memo?.filtres?.length === ths.length ? [...memo.filtres] : ths.map(() => ''),
    tri: memo?.tri ?? { col: -1, sens: 0 },
  }

  // Ligne de filtres sous les en-têtes
  const ligneFiltres = document.createElement('tr')
  ligneFiltres.className = 'dt-filtres'
  ths.forEach((th, i) => {
    const cellule = document.createElement('th')
    if (colonneActive(th)) {
      const input = document.createElement('input')
      input.type = 'search'
      input.className = 'dt-filtre'
      input.placeholder = 'Filtrer…'
      input.value = etat.filtres[i]
      input.addEventListener('input', () => {
        etat.filtres[i] = input.value
        appliquer()
      })
      cellule.appendChild(input)
    }
    ligneFiltres.appendChild(cellule)
  })
  table.tHead.appendChild(ligneFiltres)

  // Tri au clic sur l'en-tête
  const indicateurs = ths.map((th, i) => {
    if (!colonneActive(th)) return null
    th.classList.add('dt-triable')
    const span = document.createElement('span')
    span.className = 'dt-tri'
    th.appendChild(span)
    th.addEventListener('click', () => {
      etat.tri = etat.tri.col === i ? { col: i, sens: (etat.tri.sens + 1) % 3 } : { col: i, sens: 1 }
      appliquer()
    })
    return span
  })

  // Bandeau : nombre de lignes affichées + effacer les filtres
  const bandeau = document.createElement('caption')
  bandeau.className = 'dt-bandeau'
  const compteur = document.createElement('span')
  const effacer = document.createElement('button')
  effacer.type = 'button'
  effacer.className = 'btn btn-outline btn-sm'
  effacer.textContent = '✖ Effacer les filtres'
  effacer.addEventListener('click', () => {
    etat.filtres = ths.map(() => '')
    ligneFiltres.querySelectorAll('input').forEach((i) => (i.value = ''))
    appliquer()
  })
  bandeau.append(compteur, effacer)
  table.insertBefore(bandeau, table.firstChild)

  const ordreOrigine = new WeakMap() // ligne → rang d'origine (pour revenir sans tri)
  let observateur = null

  function appliquer() {
    observateur?.disconnect()
    const corps = table.tBodies[0]
    if (corps) {
      const lignes = [...corps.rows]
      lignes.forEach((l, i) => {
        if (!ordreOrigine.has(l)) ordreOrigine.set(l, i + 1000000) // nouvelles lignes : fin
      })
      // Ligne « aucune donnée » (une seule cellule fusionnée) : jamais filtrée
      const donnees = lignes.filter((l) => l.cells.length > 1 || l.cells[0]?.colSpan === 1)
      const filtres = etat.filtres.map(normaliser)
      // Colonne de nombres / montants (toutes ses cellules renseignées) : un filtre numérique
      // cherche la valeur EXACTE (« 0 » → 0, pas 10 ni 450) ; sinon recherche « contient ».
      const exacts = filtres.map((f, i) => {
        if (!f) return null
        const cible = valeurNumerique(f)
        if (cible === null || !/^[+-]?[\d ,.]+(?: ?(?:f|fcfa|%))?$/i.test(f)) return null
        const cellules = donnees.map((l) => l.cells[i]?.textContent).filter((t) => !celluleVide(t))
        return cellules.length && cellules.every((t) => valeurNumerique(t) !== null) ? cible : null
      })
      let visibles = 0
      for (const l of donnees) {
        const ok = filtres.every((f, i) => {
          if (!f) return true
          const texte = l.cells[i]?.textContent
          if (exacts[i] !== null) return valeurNumerique(texte) === exacts[i]
          return normaliser(texte).includes(f)
        })
        l.style.display = ok ? '' : 'none'
        if (ok) visibles++
      }
      // Tri : réordonne les lignes entre leurs bornes actuelles (ancres Vue préservées)
      if (lignes.length > 1) {
        const { col, sens } = etat.tri
        const triees = [...donnees].sort((a, b) =>
          sens === 0
            ? ordreOrigine.get(a) - ordreOrigine.get(b)
            : comparer(valeurTri(a.cells[col]?.textContent ?? ''), valeurTri(b.cells[col]?.textContent ?? '')) *
              (sens === 1 ? 1 : -1),
        )
        const apres = lignes[lignes.length - 1].nextSibling
        if (triees.some((l, i) => l !== donnees[i])) triees.forEach((l) => corps.insertBefore(l, apres))
      }
      const actif = filtres.some(Boolean)
      bandeau.style.display = actif ? '' : 'none'
      compteur.textContent = `${visibles} ligne(s) sur ${donnees.length}`
    }
    indicateurs.forEach((s, i) => {
      if (s) s.textContent = etat.tri.col === i && etat.tri.sens ? (etat.tri.sens === 1 ? ' ▲' : ' ▼') : ' ⇅'
    })
    if (cle) etatsMemorises.set(cle, { filtres: [...etat.filtres], tri: { ...etat.tri } })
    // Données rechargées par Vue → on refiltre (après nos propres déplacements)
    if (corps && observateur) observateur.observe(corps, { childList: true, subtree: true, characterData: true })
  }

  observateur = new MutationObserver(() => appliquer())
  table._dt = { appliquer, observateur }
  appliquer()
}

export default {
  mounted(el, binding) {
    installer(el, binding.value)
  },
  updated(el) {
    // tbody recréé (v-if) : l'observateur doit suivre le nouveau corps
    el._dt?.appliquer()
  },
  unmounted(el) {
    el._dt?.observateur.disconnect()
  },
}
