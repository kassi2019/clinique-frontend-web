// Quantité à acheter prescrite par le médecin, dans l'unité de vente de la pharmacie

/** « BOITE » / « PLAQUE » → « boîte(s) » / « plaquette(s) ». */
export function uniteVenteTexte(uniteVente, n = 2) {
  const pluriel = Number(n) > 1
  if (uniteVente === 'PLAQUE') return pluriel ? 'plaquettes' : 'plaquette'
  return pluriel ? 'boîtes' : 'boîte'
}

/** Quantité demandée par le médecin : « 2 plaquettes » (ancienne saisie libre affichée telle quelle). */
export function quantiteDemandee(p) {
  const t = String(p?.quantite ?? '').trim()
  if (!t) return '—'
  if (/^\d+$/.test(t)) return p.medicament ? `${t} ${uniteVenteTexte(p.medicament.uniteVente, t)}` : t
  return t
}
