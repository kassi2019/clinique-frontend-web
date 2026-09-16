<template>
  <div class="pagination-bar">
    <span class="pagination-info">
      {{ total === 0 ? 'Aucun résultat' : `${debut}–${fin} sur ${total}` }}
    </span>
    <div class="pagination-controls">
      <button
        class="btn btn-outline btn-sm"
        :disabled="page <= 1"
        @click="$emit('change', page - 1)"
      >
        ‹ Précédent
      </button>
      <span class="pagination-page">Page {{ page }} / {{ totalPages }}</span>
      <button
        class="btn btn-outline btn-sm"
        :disabled="page >= totalPages"
        @click="$emit('change', page + 1)"
      >
        Suivant ›
      </button>
    </div>
    <label class="perpage-label">
      Lignes
      <select :value="perPage" @change="$emit('perPage', Number($event.target.value))">
        <option :value="5">5</option>
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
      </select>
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  perPage: { type: Number, required: true },
  total: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})

defineEmits(['change', 'perPage'])

const debut = computed(() =>
  props.total === 0 ? 0 : (props.page - 1) * props.perPage + 1,
)
const fin = computed(() => Math.min(props.page * props.perPage, props.total))
</script>

<style scoped>
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.pagination-info {
  font-size: 13px;
  color: var(--text-muted);
}
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pagination-page {
  font-size: 13px;
  color: var(--text-muted);
}
.perpage-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
}
.perpage-label select {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: inherit;
  background: var(--surface);
}
</style>
