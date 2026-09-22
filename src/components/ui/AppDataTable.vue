<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

export interface DataTableColumn {
  key: string
  label: string
  class?: string
  hideOnMobile?: boolean
  width?: string
}

const props = withDefaults(
  defineProps<{
    columns: DataTableColumn[]
    rows: Record<string, unknown>[]
    emptyMessage?: string
    rowKey?: string
    clickable?: boolean
    /** Style grille type Kendo UI (bordures, zebra, pager). */
    kendo?: boolean
    /** Active la pagination en bas du tableau. */
    pageable?: boolean
    pageSize?: number
    pageSizes?: number[]
  }>(),
  {
    emptyMessage: 'Aucune entrée.',
    rowKey: 'id',
    clickable: false,
    kendo: true,
    pageable: true,
    pageSize: 10,
    pageSizes: () => [5, 10, 20, 50],
  },
)

const emit = defineEmits<{
  rowClick: [row: Record<string, unknown>]
}>()

const pagerSelectId = `app-data-table-page-size-${Math.random().toString(36).slice(2, 9)}`
const skip = ref(0)
const take = ref(props.pageSize)

watch(
  () => props.pageSize,
  (size) => {
    take.value = size
    skip.value = 0
  },
)

watch(
  () => props.rows.length,
  () => {
    const maxSkip = Math.max(0, props.rows.length - 1)
    if (skip.value > maxSkip) {
      skip.value = Math.floor(maxSkip / take.value) * take.value
    }
  },
)

const total = computed(() => props.rows.length)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / take.value) || 1))

const currentPage = computed(() => Math.floor(skip.value / take.value) + 1)

const pagedRows = computed(() => {
  if (!props.pageable) return props.rows
  return props.rows.slice(skip.value, skip.value + take.value)
})

const rangeLabel = computed(() => {
  if (total.value === 0) return '0 élément'
  const from = skip.value + 1
  const to = Math.min(skip.value + take.value, total.value)
  return `${from} – ${to} sur ${total.value}`
})

const pageButtons = computed(() => {
  const count = pageCount.value
  const current = currentPage.value
  const maxButtons = 5
  if (count <= maxButtons) {
    return Array.from({ length: count }, (_, i) => i + 1)
  }
  let start = Math.max(1, current - Math.floor(maxButtons / 2))
  let end = start + maxButtons - 1
  if (end > count) {
    end = count
    start = Math.max(1, end - maxButtons + 1)
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

function goToPage(page: number) {
  const next = Math.min(Math.max(1, page), pageCount.value)
  skip.value = (next - 1) * take.value
}

function onPageSizeChange(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value)
  take.value = value
  skip.value = 0
}
</script>

<template>
  <div
    class="app-data-table"
    :class="kendo ? 'app-data-table--kendo' : 'app-data-table--plain'"
  >
    <div class="app-data-table__scroll">
      <table class="app-data-table__table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[col.class, col.hideOnMobile ? 'app-data-table__hide-sm' : '']"
              :style="col.width ? { width: col.width } : undefined"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td :colspan="columns.length" class="app-data-table__empty">
              {{ emptyMessage }}
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="(row, index) in pagedRows"
              :key="String(row[rowKey] ?? `${skip}-${index}`)"
              :class="[
                clickable ? 'app-data-table__row--clickable' : '',
                index % 2 === 1 ? 'app-data-table__row--alt' : '',
              ]"
              @click="clickable ? emit('rowClick', row) : undefined"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                :class="[col.class, col.hideOnMobile ? 'app-data-table__hide-sm' : '']"
              >
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                  {{ row[col.key] ?? '-' }}
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div
      v-if="pageable"
      class="app-data-table__pager"
      role="navigation"
      aria-label="Pagination"
    >
      <div class="app-data-table__pager-sizes">
        <label class="app-data-table__pager-label" :for="pagerSelectId">
          Afficher
        </label>
        <select
          :id="pagerSelectId"
          class="app-data-table__pager-select"
          :value="take"
          @change="onPageSizeChange"
        >
          <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
        </select>
        <span class="app-data-table__pager-label">par page</span>
      </div>

      <p class="app-data-table__pager-info">{{ rangeLabel }}</p>

      <div class="app-data-table__pager-nav">
        <button
          type="button"
          class="app-data-table__pager-btn"
          :disabled="currentPage <= 1 || rows.length === 0"
          aria-label="Page précédente"
          @click="goToPage(currentPage - 1)"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          v-for="page in pageButtons"
          :key="page"
          type="button"
          class="app-data-table__pager-btn"
          :class="{ 'app-data-table__pager-btn--active': page === currentPage }"
          :disabled="rows.length === 0"
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
        <button
          type="button"
          class="app-data-table__pager-btn"
          :disabled="currentPage >= pageCount || rows.length === 0"
          aria-label="Page suivante"
          @click="goToPage(currentPage + 1)"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-data-table--plain .app-data-table__scroll {
  overflow-x: auto;
  border: 1px solid var(--color-line);
  margin-inline: -1.25rem;
}

@media (min-width: 640px) {
  .app-data-table--plain .app-data-table__scroll {
    margin-inline: 0;
  }
}

.app-data-table--plain .app-data-table__table {
  width: 100%;
  min-width: 640px;
  font-size: 0.875rem;
  border-collapse: collapse;
}

.app-data-table--plain thead tr {
  background: var(--color-paper-warm);
  border-bottom: 1px solid var(--color-line);
  text-align: left;
}

.app-data-table--plain th {
  padding: 0.75rem 1rem;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
  white-space: nowrap;
}

.app-data-table--plain td {
  padding: 0.875rem 1rem;
  color: var(--color-ink);
  vertical-align: top;
  border-top: 1px solid var(--color-line);
  background: white;
}

.app-data-table--plain .app-data-table__row--clickable {
  cursor: pointer;
}

.app-data-table--plain .app-data-table__row--clickable:hover td {
  background: color-mix(in srgb, var(--color-paper-warm) 80%, white);
}

.app-data-table--kendo {
  border: 1px solid #c5c5c5;
  background: #fff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.app-data-table--kendo .app-data-table__scroll {
  overflow-x: auto;
}

.app-data-table--kendo .app-data-table__table {
  width: 100%;
  min-width: 560px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  line-height: 1.4;
  color: #424242;
}

@media (min-width: 768px) {
  .app-data-table--kendo .app-data-table__table {
    min-width: 720px;
  }
}

.app-data-table--kendo thead tr {
  background: linear-gradient(180deg, #f6f6f6 0%, #ededed 100%);
}

.app-data-table--kendo th {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #c5c5c5;
  border-right: 1px solid #e0e0e0;
  font-size: 12px;
  font-weight: 700;
  color: #424242;
  text-align: left;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.app-data-table--kendo th:last-child {
  border-right: none;
}

.app-data-table--kendo td {
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid #e6e6e6;
  border-right: 1px solid #f0f0f0;
  vertical-align: middle;
  background: #fff;
}

.app-data-table--kendo td:last-child {
  border-right: none;
}

.app-data-table--kendo .app-data-table__row--alt td {
  background: #fafafa;
}

.app-data-table--kendo tbody tr:hover td {
  background: #eef6fc;
}

.app-data-table--kendo .app-data-table__row--clickable {
  cursor: pointer;
}

.app-data-table--kendo .app-data-table__row--clickable:hover td {
  background: #dcebf7;
}

.app-data-table__empty {
  text-align: center !important;
  padding: 2.5rem 1rem !important;
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  background: #fff !important;
}

.app-data-table__hide-sm {
  display: none;
}

@media (min-width: 640px) {
  .app-data-table__hide-sm {
    display: table-cell;
  }
}

.app-data-table__pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 0.85rem;
  padding: 0.55rem 0.75rem;
  border-top: 1px solid #c5c5c5;
  background: linear-gradient(180deg, #f8f8f8 0%, #f0f0f0 100%);
  font-size: 12px;
  color: #555;
}

@media (max-width: 640px) {
  .app-data-table__pager {
    flex-direction: column;
    align-items: stretch;
  }

  .app-data-table__pager-info {
    order: 0;
    text-align: left;
    flex-basis: auto;
  }

  .app-data-table__pager-nav {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .app-data-table__pager-btn {
    min-width: 2.15rem;
    height: 2.15rem;
  }
}

.app-data-table--plain .app-data-table__pager {
  border: 1px solid var(--color-line);
  border-top: none;
  background: var(--color-paper-warm);
  margin-inline: -1.25rem;
}

@media (min-width: 640px) {
  .app-data-table--plain .app-data-table__pager {
    margin-inline: 0;
  }
}

.app-data-table__pager-sizes {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.app-data-table__pager-label {
  color: #666;
  white-space: nowrap;
}

.app-data-table__pager-select {
  appearance: none;
  min-width: 3.25rem;
  padding: 0.2rem 1.4rem 0.2rem 0.45rem;
  border: 1px solid #c5c5c5;
  border-radius: 2px;
  background:
    #fff
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")
    no-repeat right 0.4rem center;
  color: #333;
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
}

.app-data-table__pager-select:focus {
  outline: 2px solid color-mix(in srgb, var(--color-accent) 45%, white);
  outline-offset: 1px;
}

.app-data-table__pager-info {
  margin: 0;
  flex: 1 1 auto;
  text-align: center;
  color: #666;
  white-space: nowrap;
}

.app-data-table__pager-nav {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.app-data-table__pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.85rem;
  height: 1.85rem;
  padding: 0 0.35rem;
  border: 1px solid #c5c5c5;
  border-radius: 2px;
  background: linear-gradient(180deg, #fff 0%, #f3f3f3 100%);
  color: #444;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.app-data-table__pager-btn:hover:not(:disabled):not(.app-data-table__pager-btn--active) {
  background: #fff;
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.app-data-table__pager-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.app-data-table__pager-btn--active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
  cursor: default;
}

@media (max-width: 640px) {
  .app-data-table__pager-info {
    text-align: left;
  }
}
</style>
