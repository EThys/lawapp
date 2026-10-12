<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { readPendingRegistrationRoles } from '@/utils/verificationSession'
import { rememberActiveRole } from '@/utils/memberProfile'
import type { UserRole } from '@/types/auth'
import { GraduationCap, BookOpen } from '@lucide/vue'

const auth = useAuthStore()

const pendingRoles = computed(() => readPendingRegistrationRoles(auth.currentUser?.email))

const showTeacher = computed(() => {
  if (auth.hasTeacherQuality) return false
  if (!pendingRoles.value.length) return true
  return pendingRoles.value.includes('teacher')
})

const showStudent = computed(() => {
  if (auth.hasStudentQuality) return false
  if (!pendingRoles.value.length) return true
  return pendingRoles.value.includes('student')
})

const intro = computed(() => {
  if (pendingRoles.value.length > 1) {
    return 'Vous avez choisi les deux espaces à l’inscription. Complétez chaque profil métier — vous pourrez basculer entre les tableaux de bord ensuite.'
  }
  if (showTeacher.value && showStudent.value) {
    return 'Sélectionnez enseignant ou étudiant pour compléter le profil métier requis.'
  }
  if (showTeacher.value) {
    return 'Complétez votre profil enseignant pour accéder à l’espace de création et de suivi.'
  }
  if (showStudent.value) {
    return 'Complétez votre profil étudiant pour rejoindre des groupes et passer des évaluations.'
  }
  return 'Vos profils sont à jour. Choisissez un espace dans le menu ou le sélecteur en haut.'
})

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
        {{ intro }}
      </p>
    </div>

    <div v-if="!showTeacher && !showStudent" class="space-y-4">
      <RouterLink
        v-if="auth.hasTeacherQuality"
        to="/teacher"
        class="inline-flex text-sm font-medium text-accent hover:underline"
      >
        Aller à l’espace enseignant →
      </RouterLink>
      <RouterLink
        v-if="auth.hasStudentQuality"
        to="/student"
        class="inline-flex text-sm font-medium text-accent hover:underline"
      >
        Aller à l’espace étudiant →
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <RouterLink
        v-if="showTeacher"
        to="/teacher/profile"
        class="flex items-start gap-4 p-5 border border-line hover:border-accent/40 hover:bg-accent-light/40 transition-colors"
        @click="rememberIntent('teacher')"
      >
        <span class="mt-0.5 flex h-10 w-10 items-center justify-center bg-accent text-white">
          <GraduationCap class="w-5 h-5" />
        </span>
        <span class="min-w-0">
          <span class="block font-display text-lg text-ink">Profil enseignant</span>
          <span class="mt-1 block text-sm text-ink-muted">
            Département, type et justificatif — puis accès aux cours et évaluations.
          </span>
        </span>
      </RouterLink>

      <RouterLink
        v-if="showStudent"
        to="/student/profile"
        class="flex items-start gap-4 p-5 border border-line hover:border-accent/40 hover:bg-accent-light/40 transition-colors"
        @click="rememberIntent('student')"
      >
        <span class="mt-0.5 flex h-10 w-10 items-center justify-center bg-ink text-white">
          <BookOpen class="w-5 h-5" />
        </span>
        <span class="min-w-0">
          <span class="block font-display text-lg text-ink">Profil étudiant</span>
          <span class="mt-1 block text-sm text-ink-muted">
            Promotion, salle de classe et établissement — puis rejoindre les groupes et examens.
          </span>
        </span>
      </RouterLink>
    </div>
  </AuthLayout>
</template>
