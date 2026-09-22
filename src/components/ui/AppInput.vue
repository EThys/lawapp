<script setup lang="ts">
import { ref, computed } from 'vue'
import { Eye, EyeOff } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    label?: string
    placeholder?: string
    type?: string
    error?: string
    hint?: string
    required?: boolean
    disabled?: boolean
    autocomplete?: string
    /** Affiche l'icône œil pour les champs type password (défaut: true). */
    showPasswordToggle?: boolean
  }>(),
  {
    showPasswordToggle: true,
  },
)

defineEmits<{ 'update:modelValue': [value: string] }>()

const showPassword = ref(false)

const isPasswordField = computed(() => props.type === 'password')
const canTogglePassword = computed(() => isPasswordField.value && props.showPasswordToggle)
const inputType = computed(() => {
  if (!isPasswordField.value) return props.type || 'text'
  return showPassword.value ? 'text' : 'password'
})

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-xs font-medium text-ink-muted uppercase tracking-wide">
      {{ label }}
      <span v-if="required" class="text-danger normal-case"> *</span>
    </label>
    <div class="relative">
      <input
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete"
        class="w-full px-3.5 py-2.5 border border-line bg-white text-ink placeholder:text-ink-faint text-base sm:text-sm min-h-11 transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 disabled:bg-paper-warm disabled:cursor-not-allowed"
        :class="canTogglePassword ? 'pr-12' : ''"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="canTogglePassword"
        type="button"
        class="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center text-ink-muted hover:text-ink cursor-pointer transition-colors disabled:cursor-not-allowed"
        :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
        :aria-pressed="showPassword"
        :disabled="disabled"
        @click.stop.prevent="togglePasswordVisibility"
      >
        <EyeOff v-if="showPassword" class="w-5 h-5" aria-hidden="true" />
        <Eye v-else class="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-ink-faint">{{ hint }}</p>
  </div>
</template>
