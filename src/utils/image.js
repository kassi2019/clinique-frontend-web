/**
 * Prépare une image côté client avant envoi au backend :
 * - redimensionne seulement si elle dépasse `maxLargeur` px
 * - compression JPEG légère pour préserver la netteté
 * - fond blanc appliqué aux PNG transparents avant conversion
 *
 * @returns {Promise<{ dataUrl: string, largeur: number, hauteur: number }>}
 */
export function optimiserImage(file, maxLargeur = 2560, qualite = 0.92) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const echelle = Math.min(1, maxLargeur / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * echelle)
        canvas.height = Math.round(img.height * echelle)
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        if (file.type === 'image/png') {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', qualite),
          largeur: img.width,
          hauteur: img.height,
        })
      }
      img.onerror = () => reject(new Error('Fichier image invalide.'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    reader.readAsDataURL(file)
  })
}

/** Initiales d'une personne (fallback quand aucune photo n'est disponible). */
export function initialesDe(prenom, nom) {
  return `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`
}
