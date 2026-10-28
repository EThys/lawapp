<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppLogo from '@/components/brand/AppLogo.vue'
</script>

<template>
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-line pt-safe">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
      <RouterLink
        to="/student"
        class="flex items-center gap-2 min-h-11 min-w-11 -ml-2 pl-2 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft class="w-5 h-5 flex-shrink-0" />
        <span class="sr-only sm:not-sr-only sm:inline">Mon espace</span>
      </RouterLink>

      <RouterLink to="/" class="absolute left-1/2 -translate-x-1/2" aria-label="LawApp50, accueil">
        <AppLogo size="sm" class="max-sm:[&_.app-logo__text]:hidden" />
      </RouterLink>

      <div class="w-11" aria-hidden="true" />
    </div>
  </header>
</template>
