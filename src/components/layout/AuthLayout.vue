<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/brand/AppLogo.vue'
import AppDecorativeBg from '@/components/ui/AppDecorativeBg.vue'
</script>

<template>
  <div class="min-h-app flex w-full min-w-0">
    <aside class="hidden lg:flex lg:w-[44%] xl:w-[42%] bg-brand-dark text-white flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
      <AppDecorativeBg />
      <div class="absolute inset-0 auth-grid-bg opacity-[0.07]" />

      <div class="relative">
        <RouterLink to="/" class="inline-flex" aria-label="LawApp50, accueil">
          <AppLogo tone="on-dark" size="md" caption="Évaluation & Formation" />
        </RouterLink>
      </div>

      <div class="relative space-y-8">
        <blockquote class="font-display text-3xl xl:text-4xl leading-snug text-white/95">
          « L'évaluation en ligne exige rigueur, clarté et confiance. »
        </blockquote>
        <div class="rule-line border-white/15 pt-6">
          <p class="text-sm text-white/50 leading-relaxed max-w-sm">
            Votre application pour créer et diffuser des évaluations auprès de vos étudiants,
            élèves et formations - avec un module Droit Ludique pour découvrir le droit en format court.
          </p>
        </div>
      </div>

      <div class="relative flex gap-8 text-xs text-white/40 uppercase tracking-widest">
        <span>Sécurisé</span>
        <span>Conforme RGPD</span>
        <span>Multi-établissements</span>
      </div>
    </aside>

    <!-- Right panel: form -->
    <main class="flex-1 flex flex-col min-h-app min-w-0 bg-paper pt-safe">
      <div class="lg:hidden flex items-center justify-between py-4 border-b border-line bg-white auth-mobile-gutter">
        <RouterLink to="/" class="inline-flex" aria-label="LawApp50, accueil">
          <AppLogo size="sm" caption="Évaluation & Formation" />
        </RouterLink>
      </div>

      <div
        class="flex-1 flex min-h-0 overflow-y-auto overscroll-contain items-start sm:items-center justify-center py-8 sm:py-12 auth-mobile-gutter"
      >
        <div class="auth-panel w-full max-w-[420px] my-auto sm:my-0">
          <slot />
        </div>
      </div>

      <footer class="py-4 pb-safe border-t border-line text-center text-xs text-ink-faint auth-mobile-gutter shrink-0">
        © {{ new Date().getFullYear() }} LawApp50 · Plateforme d'évaluation
      </footer>
    </main>
  </div>
</template>
