<script setup lang="ts">
export interface DataTableColumn {
  key: string
  label: string
  class?: string
  hideOnMobile?: boolean
}

withDefaults(
  defineProps<{
    columns: DataTableColumn[]
    rows: Record<string, unknown>[]
    emptyMessage?: string
    rowKey?: string
    clickable?: boolean
  }>(),
  {
    emptyMessage: 'Aucune entrée.',
    rowKey: 'id',
    clickable: false,
  }
)

const emit = defineEmits<{
  rowClick: [row: Record<string, unknown>]
}>()
</script>

<template>
  <div v-if="rows.length === 0" class="text-center py-10 text-sm text-ink-muted">
    {{ emptyMessage }}
  </div>

  <div v-else class="overflow-x-auto border border-line -mx-5 sm:-mx-6 sm:mx-0">
    <table class="w-full min-w-[640px] text-sm">
      <thead>
        <tr class="bg-paper-warm border-b border-line text-left">
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 sm:px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-faint whitespace-nowrap"
            :class="[col.class, col.hideOnMobile ? 'hidden sm:table-cell' : '']"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-line bg-white">
        <tr
          v-for="row in rows"
          :key="String(row[rowKey] ?? row)"
          class="transition-colors"
          :class="clickable ? 'cursor-pointer hover:bg-paper-warm/80' : ''"
          @click="clickable ? emit('rowClick', row) : undefined"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-4 sm:px-6 py-3.5 text-ink align-top"
            :class="[col.class, col.hideOnMobile ? 'hidden sm:table-cell' : '']"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              {{ row[col.key] ?? '—' }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
