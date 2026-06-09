<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { ArrowRight } from '@lucide/vue'
</script>

<template>
  <div class="hero-aside-content">
    <h2 class="hero-aside-content__title font-display hero-anim hero-anim--1">
      Apprendre le droit.<br />
      <span class="hero-aside-content__title-muted">De façon ludique.</span>
    </h2>

    <p class="hero-aside-content__lead hero-anim hero-anim--2">
      Étudiants, professionnels du droit et citoyens : découvrez le droit
      en capsules courtes, quiz et fil vertical.
    </p>

    <div class="hero-aside-content__actions hero-anim hero-anim--3">
      <RouterLink to="/discover" class="group">
        <AppButton variant="outline" size="lg" class="hover-lift hero-aside-content__btn">
          Explorer le fil
          <ArrowRight class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </AppButton>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.hero-aside-content {
  position: relative;
  z-index: 1;
}

.hero-aside-content__title {
  font-size: clamp(2.5rem, 5vw, 3.25rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--color-ink);
  max-width: 12ch;
}

.hero-aside-content__title-muted {
  color: var(--color-brand);
  font-weight: 400;
}

.hero-aside-content__lead {
  margin-top: 1.5rem;
  max-width: 28rem;
  font-size: 1rem;
  line-height: 1.75;
  color: var(--color-ink-muted);
}

@media (min-width: 640px) {
  .hero-aside-content__lead {
    font-size: 1.0625rem;
  }
}

.hero-aside-content__actions {
  margin-top: 2.25rem;
}

.hero-aside-content__btn {
  background: color-mix(in srgb, var(--color-paper) 88%, white) !important;
  border-color: var(--color-line-strong) !important;
}

.hero-aside-content__btn:hover {
  background: var(--color-accent-light) !important;
  border-color: var(--color-accent) !important;
}
</style>
