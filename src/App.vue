<template>
  <router-view />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import http from './api/http'
import { useAuthStore } from './stores/auth'

// Pointage : tant qu'un agent est en service, son poste signale sa présence chaque
// minute (temps de présence réel affiché dans le module Finances).
const auth = useAuthStore()
let minuterie = null
function signalerPresence() {
  if (auth.isAuthenticated) http.post('/finances/mon-service/presence').catch(() => {})
}
onMounted(() => {
  signalerPresence()
  minuterie = setInterval(signalerPresence, 60000)
})
onUnmounted(() => clearInterval(minuterie))
</script>
