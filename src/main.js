import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import dataTable from './directives/dataTable'
import './assets/main.css'

// ── Calibrage global : saisie en MAJUSCULES sur tous les formulaires ──
// Exclusions : mots de passe, e-mails, dates, nombres, fichiers, téléphones,
// et surtout les RADIOS / CASES À COCHER (leurs valeurs true/false seraient
// transformées en chaînes « TRUE »/« FALSE », cassant la sélection).
const EXCLUS_MAJ = [
  'password', 'email', 'date', 'datetime-local', 'number', 'file', 'tel', 'url',
  'radio', 'checkbox',
]
document.addEventListener(
  'input',
  (e) => {
    const t = e.target
    if (!(t instanceof HTMLInputElement) && !(t instanceof HTMLTextAreaElement)) return
    if (EXCLUS_MAJ.includes(t.type)) return
    if (t.classList.contains('search-raw') || t.closest('.no-upper')) return
    const debut = t.selectionStart
    const fin = t.selectionEnd
    const maj = t.value.toUpperCase()
    if (maj !== t.value) {
      t.value = maj
      try {
        t.setSelectionRange(debut, fin)
      } catch {
        /* type non textuel */
      }
    }
  },
  true,
)

const app = createApp(App)

app.use(createPinia())
app.use(router)
// Filtres par colonne + tri sur les tableaux : <table v-data-table>
app.directive('data-table', dataTable)
app.mount('#app')
