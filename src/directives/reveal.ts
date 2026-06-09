import type { Directive } from 'vue'

type RevealBinding =
  | number
  | undefined
  | { delay?: number; from?: 'up' | 'left' | 'right' }

function parseRevealBinding(value: RevealBinding) {
  if (typeof value === 'number') {
    return { delay: value, from: 'up' as const }
  }
  if (value && typeof value === 'object') {
    return { delay: value.delay ?? 0, from: value.from ?? 'up' }
  }
  return { delay: 0, from: 'up' as const }
}

export const vReveal: Directive<HTMLElement, RevealBinding> = {
  mounted(el, binding) {
    const { delay, from } = parseRevealBinding(binding.value)
    el.classList.add('reveal', `reveal--${from}`)
    if (delay) el.style.transitionDelay = `${delay}ms`

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          observer.unobserve(el)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
  },
}
