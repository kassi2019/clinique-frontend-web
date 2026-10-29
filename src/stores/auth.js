import { defineStore } from 'pinia'
import http from '../api/http'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    // Pointage : service en cours de l'utilisateur (null = pas en service)
    service: null,
    serviceCharge: false,
    // false si le serveur ne gère pas encore le pointage : rien n'est alors verrouillé
    pointageDisponible: true,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    // Modules accessibles via le rôle de l'utilisateur
    allowedModules: (state) => state.user?.role?.modules ?? [],
    canAccess: (state) => (moduleCode) => {
      if (!state.user) return false // déconnecté : aucun module
      const modules = state.user.role?.modules
      if (!modules || modules.length === 0) return true // accès complet si aucune restriction renseignée
      return modules.some((m) => m.code === moduleCode)
    },
    /**
     * Onglet autorisé (ex. 'PHARMACIE.STOCKS') : réglé par utilisateur.
     * Aucun onglet coché pour le module = tous ses onglets ; l'administrateur voit tout.
     */
    canAccessOnglet: (state) => (code) => {
      if (!state.user) return false
      if (state.user.role?.code === 'ADMINISTRATEUR') return true
      const module = code.split('.')[0]
      const duModule = (state.user.onglets ?? []).filter((o) => o.split('.')[0] === module)
      return duModule.length === 0 || duModule.includes(code)
    },
    /** Premier onglet autorisé parmi `cles` (dans l'ordre), ex. premierOnglet('CAISSE', ['attente', 'payes']). */
    premierOnglet() {
      return (module, cles) =>
        cles.find((c) => this.canAccessOnglet(`${module}.${c.toUpperCase()}`)) ?? cles[0]
    },
    /** L'administrateur n'a pas à pointer pour travailler (paramétrage, contrôle). */
    exempteDePointage: (state) => state.user?.role?.code === 'ADMINISTRATEUR',
    /** Les modules restent verrouillés tant que l'agent n'a pas pris son service. */
    doitPrendreService(state) {
      return state.pointageDisponible && !this.exempteDePointage && !state.service
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
    /** Service en cours de l'utilisateur connecté. */
    async chargerService() {
      try {
        const { data } = await http.get('/finances/mon-service')
        this.service = data.service
        this.pointageDisponible = true
      } catch (e) {
        // Serveur sans pointage (ancienne version) : on ne bloque pas l'application
        if (e.response?.status !== 401) this.pointageDisponible = false
        this.service = null
      } finally {
        this.serviceCharge = true
      }
      return this.service
    },
    async logout() {
      const token = this.token
      const etaitMedecin = this.user?.role?.code === 'MEDECIN'
      // La session est vidée AVANT tout appel réseau : sinon, pendant l'attente, la page de
      // connexion renvoyait vers l'accueil (encore « connecté ») avec tous les modules affichés.
      this.token = null
      this.user = null
      this.service = null
      this.serviceCharge = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // Un médecin qui se déconnecte devient indisponible (sinon le heartbeat
      // mettrait 2 minutes à le retirer de la liste des médecins éligibles).
      if (etaitMedecin && token) {
        try {
          await http.put(
            '/consultations/disponibilite',
            { disponibilite: 'INDISPONIBLE' },
            { headers: { Authorization: `Bearer ${token}` } },
          )
        } catch {
          // la déconnexion est faite même si l'API ne répond pas
        }
      }
    },
  },
})
