/**
 * Prépare une photo / un scan de signature ou de cachet pour l'impression :
 * - le fond clair (papier blanc) devient transparent, l'encre est conservée ;
 * - l'image est recadrée au plus près de l'encre ;
 * - elle est réduite (largeur max) pour rester légère.
 * Renvoie une data URL PNG.
 */
export async function preparerImageSignature(fichier, { largeurMax = 700 } = {}) {
  if (!fichier || !/^image\//.test(fichier.type)) {
    throw new Error('Choisissez une image (photo ou scan PNG / JPEG).')
  }
  const img = await chargerImage(fichier)

  // 1. Réduction préalable (les photos de téléphone font plusieurs milliers de pixels)
  const echelle = Math.min(1, 1600 / Math.max(img.width, img.height))
  const l = Math.round(img.width * echelle)
  const h = Math.round(img.height * echelle)
  const canvas = document.createElement('canvas')
  canvas.width = l
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, l, h)
  const donnees = ctx.getImageData(0, 0, l, h)
  const px = donnees.data

  // 2. Seuil adapté à la photo : le papier n'est jamais parfaitement blanc
  const fond = luminositeFond(px)
  const seuilHaut = fond - 18 // au-dessus : papier → transparent
  const seuilBas = fond - 90 // en dessous : encre → opaque ; entre les deux : bord adouci

  let minX = l, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      const i = (y * l + x) * 4
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
      let alpha
      if (lum >= seuilHaut) alpha = 0
      else if (lum <= seuilBas) alpha = 255
      else alpha = Math.round((255 * (seuilHaut - lum)) / (seuilHaut - seuilBas))
      px[i + 3] = Math.min(px[i + 3], alpha)
      if (px[i + 3] > 40) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) throw new Error("Aucune signature ou cachet détecté : l'image semble vide ou trop claire.")
  ctx.putImageData(donnees, 0, 0)

  // 3. Recadrage (avec une petite marge) et réduction finale
  const marge = 6
  const sx = Math.max(0, minX - marge)
  const sy = Math.max(0, minY - marge)
  const sl = Math.min(l, maxX + marge + 1) - sx
  const sh = Math.min(h, maxY + marge + 1) - sy
  const r = Math.min(1, largeurMax / sl)
  const sortie = document.createElement('canvas')
  sortie.width = Math.round(sl * r)
  sortie.height = Math.round(sh * r)
  sortie.getContext('2d').drawImage(canvas, sx, sy, sl, sh, 0, 0, sortie.width, sortie.height)
  return sortie.toDataURL('image/png')
}

function chargerImage(fichier) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Impossible de lire cette image."))
    }
    img.src = url
  })
}

/** Luminosité du papier : valeur haute la plus fréquente (95e centile). */
function luminositeFond(px) {
  const histo = new Array(256).fill(0)
  let n = 0
  for (let i = 0; i < px.length; i += 16) {
    histo[Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2])]++
    n++
  }
  let cumul = 0
  for (let v = 0; v < 256; v++) {
    cumul += histo[v]
    if (cumul >= n * 0.95) return Math.max(v, 120)
  }
  return 255
}
