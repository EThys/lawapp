<script setup lang="ts">
/** Boutons larges, tactiles — choix unique. */
withDefaults(
  defineProps<{
    modelValue: string
    options: { value: string; label: string; hint?: string }[]
    /** 2 colonnes par défaut ; 3 pour genre (M / F / non précisé). */
    columns?: 2 | 3
  }>(),
  { columns: 2 },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div
    class="grid grid-cols-1 gap-2"
    :class="columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'"
    role="radiogroup"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="modelValue === opt.value"
      class="choice-pill"
      :class="{ 'choice-pill--active': modelValue === opt.value }"
      @click="emit('update:modelValue', opt.value)"
    >
      <span class="block text-sm font-medium">{{ opt.label }}</span>
      <span v-if="opt.hint" class="block text-xs opacity-80 mt-0.5">{{ opt.hint }}</span>
    </button>
  </div>
</template>

<style scoped>
.choice-pill {
  min-height: 2.75rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--color-line);
  background: white;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.choice-pill:hover {
  background: var(--color-paper-warm);
}

.choice-pill--active {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent-light) 45%, white);
}
</style>
