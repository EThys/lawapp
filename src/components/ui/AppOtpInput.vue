<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    length?: number
    label?: string
    error?: string
    disabled?: boolean
  }>(),
  { length: 6 },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const digits = ref<string[]>(Array.from({ length: props.length }, () => ''))
const inputs = ref<(HTMLInputElement | null)[]>([])

watch(
  () => props.modelValue,
  (v) => {
    const clean = (v || '').replace(/\D/g, '').slice(0, props.length)
    const next = Array.from({ length: props.length }, (_, i) => clean[i] ?? '')
    if (next.join('') !== digits.value.join('')) digits.value = next
  },
  { immediate: true },
)

function syncEmit() {
  emit('update:modelValue', digits.value.join(''))
}

function setDigit(index: number, value: string) {
  const d = value.replace(/\D/g, '').slice(-1)
  digits.value[index] = d
  syncEmit()
  if (d && index < props.length - 1) {
    void nextTick(() => inputs.value[index + 1]?.focus())
  }
}

function onInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  setDigit(index, target.value)
  target.value = digits.value[index] ?? ''
}

function onKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace') {
    if (digits.value[index]) {
      digits.value[index] = ''
      syncEmit()
      return
    }
    if (index > 0) {
      event.preventDefault()
      digits.value[index - 1] = ''
      syncEmit()
      void nextTick(() => inputs.value[index - 1]?.focus())
    }
    return
  }
  if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault()
    inputs.value[index - 1]?.focus()
  }
  if (event.key === 'ArrowRight' && index < props.length - 1) {
    event.preventDefault()
    inputs.value[index + 1]?.focus()
  }
}

function onPaste(event: ClipboardEvent) {
  event.preventDefault()
  const pasted = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, props.length)
  if (!pasted) return
  digits.value = Array.from({ length: props.length }, (_, i) => pasted[i] ?? '')
  syncEmit()
  const focusAt = Math.min(pasted.length, props.length - 1)
  void nextTick(() => inputs.value[focusAt]?.focus())
}

function setInputRef(el: unknown, index: number) {
  inputs.value[index] = (el as HTMLInputElement | null) ?? null
}
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-xs font-medium text-ink-muted uppercase tracking-wide">
      {{ label }}
      <span class="text-danger normal-case"> *</span>
    </label>
    <div class="flex gap-2 sm:gap-2.5 justify-between" @paste="onPaste">
      <input
        v-for="(_, index) in length"
        :key="index"
        :ref="(el) => setInputRef(el, index)"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="1"
        :disabled="disabled"
        :aria-label="`Chiffre ${index + 1} du code`"
        class="w-full max-w-12 aspect-square min-h-12 text-center font-mono text-lg border border-line bg-white text-ink transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 disabled:bg-paper-warm disabled:cursor-not-allowed"
        :class="error ? 'border-danger/40' : ''"
        :value="digits[index]"
        @input="onInput(index, $event)"
        @keydown="onKeydown(index, $event)"
      />
    </div>
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
  </div>
</template>
