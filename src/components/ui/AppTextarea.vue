<script setup lang="ts">
defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  rows?: number
  error?: string
  required?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-xs font-medium text-ink-muted uppercase tracking-wide">
      {{ label }}
      <span v-if="required" class="text-danger normal-case"> *</span>
    </label>
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows || 3"
      :required="required"
      class="w-full px-3.5 py-2.5 border border-line bg-white text-ink placeholder:text-ink-faint text-sm transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 resize-y min-h-[88px]"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
  </div>
</template>
