<script setup lang="ts">
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    disabled?: boolean
    loading?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    type: 'button',
  }
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
    :class="[
      size === 'sm' && 'px-3 py-1.5 text-xs min-h-11',
      size === 'md' && 'px-5 py-2.5 text-sm min-h-11',
      size === 'lg' && 'px-6 py-3 text-base sm:text-sm min-h-12',
      variant === 'primary' && 'bg-accent text-white hover:bg-accent-hover hover:shadow-md hover:shadow-accent/20 hover:-translate-y-px',
      variant === 'secondary' && 'bg-green-dark text-white hover:bg-accent-hover',
      variant === 'outline' && 'border border-line bg-white text-ink hover:bg-paper-warm hover:border-line-strong',
      variant === 'ghost' && 'text-ink-muted hover:text-ink hover:bg-paper-warm',
      variant === 'danger' && 'bg-danger text-white hover:bg-danger/90',
    ]"
  >
    <svg
      v-if="loading"
      class="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <slot />
  </button>
</template>
