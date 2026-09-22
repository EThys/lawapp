<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { ChevronDown } from '@lucide/vue'

const props = defineProps<{
  modelValue: string
  label?: string
  options: string[]
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  autocomplete?: string
  /** Nombre max de suggestions affichées (défaut: 12). */
  limit?: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

onClickOutside(rootRef, () => {
  open.value = false
})

const filtered = computed(() => {
  const limit = props.limit ?? 12
  const q = props.modelValue.trim().toLowerCase()
  const list = !q
    ? props.options
    : props.options.filter((o) => o.toLowerCase().includes(q))
  return list.slice(0, limit)
})

watch(
  () => props.modelValue,
  () => {
    if (open.value && filtered.value.length === 0) open.value = false
  },
)

function onInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('update:modelValue', value)
  open.value = true
}

function selectOption(value: string) {
  emit('update:modelValue', value)
  open.value = false
  inputRef.value?.blur()
}

function toggleList() {
  if (props.disabled) return
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
  }
  if (e.key === 'Enter' && open.value && filtered.value.length === 1) {
    e.preventDefault()
    selectOption(filtered.value[0])
  }
}
</script>

<template>
  <div ref="rootRef" class="space-y-1.5 relative">
    <label v-if="label" class="block text-xs font-medium text-ink-muted uppercase tracking-wide">
      {{ label }}
      <span v-if="required" class="text-danger normal-case"> *</span>
    </label>
    <div class="relative">
      <input
        ref="inputRef"
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete ?? 'off'"
        role="combobox"
        :aria-expanded="open"
        aria-autocomplete="list"
        class="w-full px-3.5 py-2.5 pr-11 border border-line bg-white text-ink placeholder:text-ink-faint text-base sm:text-sm min-h-11 transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 disabled:bg-paper-warm disabled:cursor-not-allowed"
        @input="onInput"
        @focus="onFocus"
        @keydown="onKeydown"
      />
      <button
        type="button"
        tabindex="-1"
        class="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-ink-faint hover:text-ink transition-colors"
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

    <ul
      v-if="open && filtered.length > 0"
      role="listbox"
      class="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto border border-line bg-white shadow-lg"
    >
      <li
        v-for="opt in filtered"
        :key="opt"
        role="option"
        :aria-selected="opt === modelValue"
        class="px-3.5 py-2.5 text-sm text-ink cursor-pointer hover:bg-accent-light transition-colors"
        :class="opt.toLowerCase() === modelValue.trim().toLowerCase() ? 'bg-accent-light text-accent font-medium' : ''"
        @mousedown.prevent="selectOption(opt)"
      >
        {{ opt }}
      </li>
    </ul>

    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-ink-faint">{{ hint }}</p>
  </div>
</template>
