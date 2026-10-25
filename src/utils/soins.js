// Soins prescrits par le médecin (onglet « Soins » de la consultation → module Soins)

/** Voies d'administration (valeurs attendues par le backend). */
export const VOIES_SOIN = [
  { value: 'IM', label: 'IM — intramusculaire' },
  { value: 'IV', label: 'IV — intraveineuse' },
  { value: 'SC', label: 'SC — sous-cutanée' },
  { value: 'ID', label: 'ID — intradermique' },
  { value: 'PO', label: 'Voie orale' },
  { value: 'LOCALE', label: 'Application locale' },
  { value: 'AUTRE', label: 'Autre voie' },
]

/** Unités proposées pour la quantité par administration (saisie libre possible). */
export const UNITES_SOIN = ['ampoule', 'flacon', 'poche', 'ml', 'comprimé', 'sachet', 'application']

export function libelleVoie(v) {
  return VOIES_SOIN.find((x) => x.value === v)?.label ?? v ?? ''
}

export function libelleStatutSoin(s) {
  return { EN_COURS: 'En cours', TERMINE: 'Terminé', ARRETE: 'Arrêté' }[s] ?? s
}

export function badgeStatutSoin(s) {
  return { EN_COURS: 'badge-warning', TERMINE: 'badge-success', ARRETE: 'badge-muted' }[s] ?? 'badge-muted'
}

/** « 1 », « 1/2 », « 0,5 », « ½ » → nombre (NaN si illisible). */
export function lireDose(dose) {
  const t = String(dose ?? '').trim().replace(',', '.').replace('½', '1/2').replace('¼', '1/4')
  const fraction = t.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])
  const nombre = t.match(/^\d+(?:\.\d+)?/)
  return nombre ? Number(nombre[0]) : NaN
}

/** Unités à retirer à la pharmacie pour tout le traitement (arrondi au-dessus). */
export function quantiteSuggeree(dose, nbAdministrations) {
  const d = lireDose(dose)
  if (!d || !nbAdministrations) return 1
  return Math.max(1, Math.ceil(d * nbAdministrations))
}

/** Une ligne lisible : « Diclofénac — 1 ampoule IM ». */
export function texteLigneSoin(l) {
  const dose = [l.dose, l.unite].filter(Boolean).join(' ')
  return `${l.medicamentNom} — ${dose}${l.voie ? ' ' + l.voie : ''}`
}
