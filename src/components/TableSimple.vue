<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th v-for="c in colonnes" :key="c.cle">{{ c.libelle }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(l, i) in lignes" :key="i">
          <td v-for="c in colonnes" :key="c.cle">{{ l[c.cle] ?? '—' }}</td>
        </tr>
        <tr v-if="lignes.length === 0">
          <td :colspan="colonnes.length" class="empty-state">Aucune donnée sur la période.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  colonnes: { type: Array, default: () => [] },
  lignes: { type: Array, default: () => [] },
})
</script>
