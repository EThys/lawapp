<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { GraduationCap, BookOpen } from '@lucide/vue'
import { rememberActiveRole } from '@/utils/memberProfile'
import type { UserRole } from '@/types/auth'

function rememberIntent(role: UserRole) {
  rememberActiveRole(role)
}
</script>

<template>
  <AuthLayout>
    <div class="mb-10">
      <p class="label-caps mb-3">Profil</p>
      <h1 class="font-display text-3xl text-ink tracking-tight">Complétez votre profil</h1>
      <p class="mt-2 text-sm text-ink-muted leading-relaxed">
        Votre compte est créé mais la qualité n’a pas encore été choisie à l’inscription.
        Sélectionnez enseignant ou étudiant pour compléter le profil métier requis par l’API.
      </p>
    </div>

    <div class="space-y-4">
      <RouterLink
        to="/teacher/profile"
        class="flex items-start gap-4 p-5 border border-line hover:border-accent/40 hover:bg-accent-light/40 transition-colors"
        @click="rememberIntent('teacher')"
      >
        <span class="mt-0.5 flex h-10 w-10 items-center justify-center bg-accent text-white">
          <GraduationCap class="w-5 h-5" />
        </span>
        <span class="min-w-0">
          <span class="block font-display text-lg text-ink">Je suis enseignant</span>
          <span class="mt-1 block text-sm text-ink-muted">
            Département, type et justificatif - puis accès aux cours et évaluations.
          </span>
        </span>
      </RouterLink>

      <RouterLink
        to="/student/profile"
        class="flex items-start gap-4 p-5 border border-line hover:border-accent/40 hover:bg-accent-light/40 transition-colors"
        @click="rememberIntent('student')"
      >
        <span class="mt-0.5 flex h-10 w-10 items-center justify-center bg-ink text-white">
          <BookOpen class="w-5 h-5" />
        </span>
        <span class="min-w-0">
          <span class="block font-display text-lg text-ink">Je suis étudiant</span>
          <span class="mt-1 block text-sm text-ink-muted">
            Promotion, salle de classe et établissement — puis rejoindre les groupes et examens.
          </span>
        </span>
      </RouterLink>
    </div>
  </AuthLayout>
</template>
