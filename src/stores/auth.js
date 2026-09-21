import { defineStore } from 'pinia'
import http from '../api/http'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    // Modules accessibles via le rôle de l'utilisateur
    allowedModules: (state) => state.user?.role?.modules ?? [],
    canAccess: (state) => (moduleCode) => {
      const modules = state.user?.role?.modules
      if (!modules || modules.length === 0) return true // accès complet si aucune restriction renseignée
      return modules.some((m) => m.code === moduleCode)
    },
  },
  actions: {
    async login(matricule, motDePasse) {
      const { data } = await http.post('/auth/login', { matricule, motDePasse })
      this.token = data.access_token
      this.user = data.user
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      return data
    },
    /** Rafraîchit le profil (ex. photo mise à jour par l'administrateur). */
    async refreshMe() {
      try {
        const { data } = await http.get('/auth/me')
        this.user = data
        localStorage.setItem('user', JSON.stringify(data))
      } catch {
        // token invalide : l'intercepteur redirige vers la connexion
      }
    },
    async logout() {
      // Un médecin qui se déconnecte devient indisponible (sinon le heartbeat
      // mettrait 2 minutes à le retirer de la liste des médecins éligibles).
      if (this.user?.role?.code === 'MEDECIN') {
        try {
          await http.put('/consultations/disponibilite', { disponibilite: 'INDISPONIBLE' })
        } catch {
          // la déconnexion continue même si l'API ne répond pas
        }
      }
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
  },
})
