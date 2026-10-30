<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    disabled?: boolean
    loading?: boolean
    type?: 'button' | 'submit' | 'reset'
    /** Si défini, rend un RouterLink (évite button-dans-lien qui bloque la nav). */
    to?: RouteLocationRaw
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    type: 'button',
  },
)

const isNativeButton = computed(
  () => !props.to && (props.type === 'submit' || props.type === 'reset'),
)

const rootTag = computed(() => {
  if (props.to) return RouterLink
  if (isNativeButton.value) return 'button'
  // span (pas button) : peut vivre dans un RouterLink sans bloquer la nav
  return 'span'
})

const rootClass = computed(() => [
  'inline-flex items-center justify-center gap-2 font-medium cursor-pointer transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
  (props.disabled || props.loading) && 'opacity-40 cursor-not-allowed pointer-events-none',
  'active:scale-[0.98]',
  props.size === 'sm' && 'px-3 py-1.5 text-xs min-h-11',
  props.size === 'md' && 'px-5 py-2.5 text-sm min-h-11',
  props.size === 'lg' && 'px-6 py-3 text-base sm:text-sm min-h-12',
  props.variant === 'primary' &&
    'bg-accent text-white hover:bg-accent-hover hover:shadow-md hover:shadow-accent/20 hover:-translate-y-px',
  props.variant === 'secondary' && 'bg-brand-dark text-white hover:bg-accent-hover',
  props.variant === 'outline' &&
    'border border-line bg-white text-ink hover:bg-paper-warm hover:border-line-strong',
  props.variant === 'ghost' && 'text-ink-muted hover:text-ink hover:bg-paper-warm',
  props.variant === 'danger' && 'bg-danger text-white hover:bg-danger/90',
])

function onKeydown(e: KeyboardEvent) {
  if (props.to || isNativeButton.value || props.disabled || props.loading) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).click()
  }
}
</script>

<template>
  <component
    :is="rootTag"
    :to="to"
    :type="isNativeButton ? type : undefined"
    :disabled="isNativeButton ? disabled || loading : undefined"
    :aria-disabled="!isNativeButton && !to && (disabled || loading) ? true : undefined"
    :role="!to && !isNativeButton ? 'button' : undefined"
    :tabindex="!to && !isNativeButton && !(disabled || loading) ? 0 : undefined"
    :class="rootClass"
    @keydown="onKeydown"
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
  </component>
</template>
