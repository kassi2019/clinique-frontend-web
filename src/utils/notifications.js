import Swal from 'sweetalert2'

// Toasts SweetAlert2 (notifications discrètes en haut à droite)
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

/** Notification de succès. */
export function toastSuccess(message) {
  Toast.fire({ icon: 'success', title: message })
}

/** Notification d'erreur. */
export function toastError(message) {
  Toast.fire({ icon: 'error', title: message })
}

/** Notification d'information / avertissement. */
export function toastInfo(message) {
  Toast.fire({ icon: 'info', title: message })
}

/**
 * Confirmation (boîte de dialogue SweetAlert2, à la place de window.confirm).
 * Renvoie true si l'utilisateur confirme.
 */
export async function confirmer({ titre, texte = '', html, boutonOui = 'Confirmer', boutonNon = 'Annuler', danger = false, icone = 'question' }) {
  const reponse = await Swal.fire({
    title: titre,
    text: html ? undefined : texte,
    html,
    icon: danger ? 'warning' : icone,
    showCancelButton: true,
    confirmButtonText: boutonOui,
    cancelButtonText: boutonNon,
    confirmButtonColor: danger ? '#dc2626' : '#0d9488',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: danger,
  })
  return reponse.isConfirmed
}

/**
 * Saisie d'une valeur (boîte de dialogue SweetAlert2, à la place de window.prompt).
 * Renvoie la valeur saisie, ou null si l'utilisateur annule.
 */
export async function saisir({ titre, texte = '', valeur = '', type = 'text', placeholder = '', boutonOui = 'Enregistrer', validation }) {
  const reponse = await Swal.fire({
    title: titre,
    text: texte,
    input: type,
    inputValue: valeur ?? '',
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: boutonOui,
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#0d9488',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    inputValidator: validation,
  })
  return reponse.isConfirmed ? reponse.value : null
}
