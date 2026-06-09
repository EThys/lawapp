<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Scale } from '@lucide/vue'
import AppDecorativeBg from '@/components/ui/AppDecorativeBg.vue'
</script>

<template>
  <div class="min-h-screen flex">
    <aside class="hidden lg:flex lg:w-[44%] xl:w-[42%] bg-green-darker text-white flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
      <AppDecorativeBg />
      <div class="absolute inset-0 auth-grid-bg opacity-[0.07]" />

      <div class="relative">
        <RouterLink to="/" class="inline-flex items-center gap-3 group">
          <div class="w-10 h-10 border border-white/20 flex items-center justify-center">
            <Scale class="w-5 h-5 text-white/90" />
          </div>
          <span class="text-lg font-semibold tracking-tight">LawApp</span>
        </RouterLink>
      </div>

      <div class="relative space-y-8">
        <blockquote class="font-display text-3xl xl:text-4xl leading-snug text-white/95">
          « L'évaluation en ligne exige rigueur, clarté et confiance. »
        </blockquote>
        <div class="rule-line border-white/15 pt-6">
          <p class="text-sm text-white/50 leading-relaxed max-w-sm">
            Votre application pour créer et diffuser des évaluations auprès de vos étudiants,
            élèves et formations — avec un module Droit Ludique pour découvrir le droit en format court.
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
    <main class="flex-1 flex flex-col min-h-screen bg-paper">
      <div class="lg:hidden flex items-center justify-between px-6 py-5 border-b border-line bg-white">
        <RouterLink to="/" class="inline-flex items-center gap-2.5">
          <div class="w-8 h-8 bg-accent flex items-center justify-center">
            <Scale class="w-4 h-4 text-white" />
          </div>
          <span class="font-semibold text-ink">LawApp</span>
        </RouterLink>
      </div>

      <div class="flex-1 flex items-center justify-center px-6 py-12 sm:px-12">
        <div class="w-full max-w-[420px]">
          <slot />
        </div>
      </div>

      <footer class="px-6 py-5 border-t border-line text-center text-xs text-ink-faint">
        © {{ new Date().getFullYear() }} LawApp · Plateforme d'évaluation
      </footer>
    </main>
  </div>
</template>
