<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/ui/AppButton.vue'

const auth = useAuthStore()
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-20 text-center">
    <p class="label-caps mb-2">404</p>
    <h1 class="font-display text-3xl text-ink mb-3">Page introuvable</h1>
    <p class="text-sm text-ink-muted mb-8">
      Cette adresse n'existe pas dans LawApp. Vérifiez l'URL ou retournez à l'accueil.
    </p>
    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <RouterLink to="/">
        <AppButton variant="outline">Accueil</AppButton>
      </RouterLink>
      <RouterLink v-if="auth.isTeacher" to="/teacher">
        <AppButton>Tableau de bord</AppButton>
      </RouterLink>
      <RouterLink v-else-if="auth.isStudent" to="/student">
        <AppButton>Mon espace</AppButton>
      </RouterLink>
      <RouterLink v-else to="/login">
        <AppButton>Connexion</AppButton>
      </RouterLink>
    </div>
  </div>
</template>
