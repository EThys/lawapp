<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import Fuse from 'fuse.js'
import { ChevronDown, Search } from '@lucide/vue'

export interface SuggestItem {
  /** Valeur technique envoyée à l’API (ex. userId). */
  value: string
  /** Libellé affiché (ex. nom). */
  label: string
  description?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    /** Id sélectionné en arrière-plan (non affiché comme id brut). */
    selectedValue?: string | null
    label?: string
    items: SuggestItem[]
    placeholder?: string
    hint?: string
    error?: string
    required?: boolean
    disabled?: boolean
    limit?: number
    /** Champ plus compact (hauteur alignée bouton sm). */
    compact?: boolean
    /** Propose de créer l’entrée saisie si elle n’est pas dans la liste. */
    allowCreate?: boolean
    createLabel?: string
    /** Liste ouverte seulement après saisie (autocomplétion). */
    typeToSearch?: boolean
  }>(),
  {
    selectedValue: null,
    limit: 10,
    compact: false,
    allowCreate: false,
    createLabel: 'Créer',
    typeToSearch: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:selectedValue': [value: string | null]
  select: [item: SuggestItem]
  create: [query: string]
}>()

const open = ref(false)
const highlight = ref(0)
const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

onClickOutside(rootRef, () => {
  open.value = false
})

const fuse = computed(
  () =>
    new Fuse(props.items, {
      keys: [
        { name: 'label', weight: 0.7 },
        { name: 'description', weight: 0.3 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    }),
)

const resultCap = computed(() =>
  props.limit <= 0 ? props.items.length : props.limit,
)

const filtered = computed(() => {
  const q = props.modelValue.trim()
  const cap = resultCap.value
  if (props.typeToSearch && !q) return []
  if (!q) return props.items.slice(0, cap)
  return fuse.value.search(q).slice(0, cap).map((r) => r.item)
})

const showTypeHint = computed(
  () => props.typeToSearch && open.value && !props.modelValue.trim(),
)

const exactMatch = computed(() => {
  const q = props.modelValue.trim().toLowerCase()
  if (!q) return false
  return props.items.some((item) => item.label.trim().toLowerCase() === q)
})

const canCreate = computed(
  () => props.allowCreate && !!props.modelValue.trim() && !exactMatch.value,
)

function createTyped() {
  const query = props.modelValue.trim()
  if (!query) return
  emit('create', query)
  open.value = false
  inputRef.value?.blur()
}

watch(filtered, () => {
  highlight.value = 0
})

function onInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('update:modelValue', value)
  emit('update:selectedValue', null)
  open.value = true
}

function selectItem(item: SuggestItem) {
  emit('update:modelValue', item.label)
  emit('update:selectedValue', item.value)
  emit('select', item)
  open.value = false
  inputRef.value?.blur()
}

function toggleList() {
  if (props.disabled) return
  if (props.typeToSearch && !props.modelValue.trim()) {
    inputRef.value?.focus()
    open.value = false
    return
  }
  open.value = !open.value
  if (open.value) inputRef.value?.focus()
}

function onFocus() {
  open.value = true
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    open.value = false
    inputRef.value?.blur()
    return
  }
  if (!open.value && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    open.value = true
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!filtered.value.length) return
    highlight.value = (highlight.value + 1) % filtered.value.length
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (!filtered.value.length) return
    highlight.value = (highlight.value - 1 + filtered.value.length) % filtered.value.length
  }
  if (e.key === 'Enter' && open.value) {
    e.preventDefault()
    if (filtered.value[highlight.value]) {
      selectItem(filtered.value[highlight.value])
      return
    }
    if (canCreate.value) createTyped()
  }
}
</script>

<template>
  <div ref="rootRef" class="relative" :class="compact ? 'space-y-1' : 'space-y-1.5'">
    <label v-if="label" class="block text-xs font-medium text-ink-muted uppercase tracking-wide">
      {{ label }}
      <span v-if="required" class="text-danger normal-case"> *</span>
    </label>
    <div class="relative">
      <Search
        class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-faint"
        :class="compact ? 'left-2.5 w-3.5 h-3.5' : 'left-3 w-4 h-4'"
      />
      <input
        ref="inputRef"
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        autocomplete="off"
        role="combobox"
        :aria-expanded="open"
        aria-autocomplete="list"
        class="w-full border border-line bg-white text-ink placeholder:text-ink-faint transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 disabled:bg-paper-warm disabled:cursor-not-allowed"
        :class="
          compact
            ? 'h-9 pl-8 pr-9 py-1.5 text-sm'
            : 'min-h-11 pl-10 pr-11 py-2.5 text-base sm:text-sm'
        "
        @input="onInput"
        @focus="onFocus"
        @keydown="onKeydown"
      />
      <button
        type="button"
        tabindex="-1"
        class="absolute right-0 top-0 flex h-full items-center justify-center text-ink-faint hover:text-ink transition-colors"
        :class="compact ? 'w-9' : 'w-11'"
        :disabled="disabled"
        :aria-label="open ? 'Fermer la liste' : 'Ouvrir la liste'"
        @click="toggleList"
      >
        <ChevronDown
          class="w-4 h-4 transition-transform duration-200"
          :class="open ? 'rotate-180' : ''"
        />
      </button>
    </div>

    <template v-if="open">
      <p
        v-if="showTypeHint"
        class="absolute z-30 left-0 right-0 mt-1 border border-line bg-white px-3 py-2 text-xs text-ink-muted shadow-lg"
      >
        Tapez pour filtrer la liste des inscrits.
      </p>
      <ul
        v-else-if="filtered.length > 0 || canCreate"
        role="listbox"
        class="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto border border-line bg-white shadow-lg"
      >
      <li
        v-for="(item, index) in filtered"
        :key="item.value"
        role="option"
        :aria-selected="item.value === selectedValue"
        class="px-3 py-2 cursor-pointer transition-colors"
        :class="
          index === highlight || item.value === selectedValue
            ? 'bg-accent-light text-accent'
            : 'text-ink hover:bg-paper-warm'
        "
        @mousedown.prevent="selectItem(item)"
        @mouseenter="highlight = index"
      >
        <p class="text-sm font-medium">{{ item.label }}</p>
        <p v-if="item.description" class="text-xs text-ink-faint mt-0.5 truncate">
          {{ item.description }}
        </p>
      </li>
      <li
        v-if="canCreate"
        role="option"
        class="px-3 py-2.5 cursor-pointer border-t border-line text-sm font-medium text-accent hover:bg-accent-light"
        @mousedown.prevent="createTyped"
      >
        {{ createLabel }} « {{ modelValue.trim() }} »
      </li>
      </ul>
    </template>

    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-ink-faint">{{ hint }}</p>
  </div>
</template>
