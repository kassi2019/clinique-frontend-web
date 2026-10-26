import { defineStore } from 'pinia'
import http from '../api/http'
import { useAuthStore } from './auth'

const cleChoix = (utilisateurId) => `apposerSignature:${utilisateurId}`

/**
 * Signature et cachet du prescripteur connecté, et son choix « Apposer ma signature
 * et mon cachet » (mémorisé sur ce poste). Ils ne s'impriment que sur les documents
 * dont il est le prescripteur.
 */
export const useSignatureStore = defineStore('signature', {
  state: () => ({
    signature: null,
    cachet: null,
    charge: false,
    pourUtilisateur: null, // compte pour lequel la signature a été chargée
    apposer: false,
  }),
  getters: {
    disponible: (state) => !!(state.signature || state.cachet),
  },
  actions: {
    async charger(forcer = false) {
      const auth = useAuthStore()
      if (!auth.user?.personnel) return this.vider()
      if (this.charge && !forcer && this.pourUtilisateur === auth.user.id) return
      try {
        const { data } = await http.get('/ma-signature')
        this.signature = data.signature
        this.cachet = data.cachet
      } catch {
        this.signature = this.cachet = null
      }
      try {
        this.apposer = localStorage.getItem(cleChoix(auth.user.id)) === '1'
      } catch {
        this.apposer = false
      }
      this.charge = true
      this.pourUtilisateur = auth.user.id
    },
    definir({ signature, cachet }) {
      this.signature = signature ?? null
      this.cachet = cachet ?? null
    },
    choisirApposer(valeur) {
      this.apposer = !!valeur
      const auth = useAuthStore()
      try {
        localStorage.setItem(cleChoix(auth.user?.id), valeur ? '1' : '0')
      } catch {
        /* choix non mémorisé */
      }
    },
    /** Le compte connecté est-il le prescripteur du document ? */
    estPrescripteur(prescripteurId) {
      const auth = useAuthStore()
      return !!prescripteurId && auth.user?.id === prescripteurId
    },
    vider() {
      this.signature = this.cachet = null
      this.charge = false
      this.pourUtilisateur = null
      this.apposer = false
    },
  },
})
