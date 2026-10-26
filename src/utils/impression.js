/**
 * Attend que les images d'une zone d'impression soient chargées (logo, signature, cachet)
 * avant d'appeler window.print() : une image encore en cours de décodage s'imprimerait vide.
 * Ne bloque jamais plus de `delaiMax` millisecondes.
 */
export async function attendreImages(selecteur, delaiMax = 2000) {
  const zone = document.querySelector(selecteur)
  if (!zone) return
  const images = [...zone.querySelectorAll('img')].filter((i) => !(i.complete && i.naturalWidth > 0))
  if (!images.length) return
  const chargement = Promise.all(
    images.map((i) => (i.decode ? i.decode().catch(() => {}) : new Promise((ok) => (i.onload = i.onerror = ok)))),
  )
  await Promise.race([chargement, new Promise((ok) => setTimeout(ok, delaiMax))])
}
