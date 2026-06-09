<script setup lang="ts">
import { computed } from 'vue'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

const props = defineProps<{
  modelValue: string
  label?: string
  options: SelectOption[]
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  grouped?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()

const groupedOptions = computed(() => {
  if (!props.grouped) return null
  const groups = new Map<string, SelectOption[]>()
  for (const opt of props.options) {
    const key = opt.group ?? 'Autres'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(opt)
  }
  return Array.from(groups.entries()).map(([label, options]) => ({ label, options }))
})
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-xs font-medium text-ink-muted uppercase tracking-wide">
      {{ label }}
      <span v-if="required" class="text-danger normal-case"> *</span>
    </label>
    <select
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      class="w-full px-3.5 py-2.5 border border-line bg-white text-ink text-sm transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 disabled:bg-paper-warm disabled:cursor-not-allowed"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>

      <template v-if="groupedOptions">
        <optgroup v-for="group in groupedOptions" :key="group.label" :label="group.label">
          <option
            v-for="opt in group.options"
            :key="opt.value"
            :value="opt.value"
            :disabled="opt.disabled"
          >
            {{ opt.label }}{{ opt.disabled ? ' (bientôt)' : '' }}
          </option>
        </optgroup>
      </template>

      <template v-else>
        <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}{{ opt.disabled ? ' (bientôt)' : '' }}
        </option>
      </template>
    </select>
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-ink-faint">{{ hint }}</p>
  </div>
</template>
