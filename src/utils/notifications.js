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
