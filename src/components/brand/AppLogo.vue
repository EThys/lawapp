<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    caption?: string
    /** Surfaces sombres : pastille blanche pour garder les couleurs du logo. */
    tone?: 'default' | 'on-dark'
  }>(),
  { size: 'md', tone: 'default' },
)
</script>

<template>
  <span class="app-logo" :class="[`app-logo--${size}`, `app-logo--${tone}`]">
    <span class="app-logo__plate">
      <img src="/logo.png" alt="" class="app-logo__mark" width="584" height="640" />
    </span>
    <span class="app-logo__text">
      <span class="app-logo__name">LawApp<span class="app-logo__fifty">50</span></span>
      <span v-if="caption" class="app-logo__caption">{{ caption }}</span>
    </span>
  </span>
</template>

<style scoped>
.app-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  color: inherit;
}

.app-logo__plate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 0.7rem;
  background: white;
}

.app-logo--sm .app-logo__plate {
  width: 2.85rem;
  height: 2.85rem;
  border-radius: 0.7rem;
}

.app-logo--md .app-logo__plate {
  width: 2.55rem;
  height: 2.55rem;
}

.app-logo--lg .app-logo__plate {
  width: 3.35rem;
  height: 3.35rem;
  border-radius: 0.9rem;
}

.app-logo--default .app-logo__plate {
  background: transparent;
}

.app-logo--on-dark .app-logo__plate {
  background: white;
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.16);
}

.app-logo__mark {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.app-logo--on-dark .app-logo__mark {
  width: 78%;
  height: 78%;
}

.app-logo__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.05;
}

.app-logo__name {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--color-ink);
}

.app-logo--sm .app-logo__name {
  font-size: 0.98rem;
}

.app-logo--lg .app-logo__name {
  font-size: 1.35rem;
}

.app-logo--on-dark .app-logo__name {
  color: white;
}

.app-logo__fifty {
  color: var(--color-accent);
  font-weight: 700;
}

.app-logo--on-dark .app-logo__fifty {
  color: #93c5fd;
}

.app-logo__caption {
  margin-top: 0.18rem;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

.app-logo--on-dark .app-logo__caption {
  color: rgb(255 255 255 / 0.62);
}
</style>
