<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth'
import { readPendingRegistrationRoles } from '@/utils/verificationSession'
import { rememberActiveRole } from '@/utils/memberProfile'
import { markProfileOnboardingSkipped } from '@/utils/profileCompletionSkip'
import type { UserRole } from '@/types/auth'
import { GraduationCap, BookOpen, ArrowRight } from '@lucide/vue'

const auth = useAuthStore()
const router = useRouter()

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

function rememberIntent(role: UserRole) {
  rememberActiveRole(role)
}

function skipForNow() {
  const id = auth.currentUser?.id
  if (id) markProfileOnboardingSkipped(id)
  if (showTeacher.value && !showStudent.value) {
    rememberActiveRole('teacher')
    void router.push('/teacher')
    return
  }
  if (showStudent.value && !showTeacher.value) {
    rememberActiveRole('student')
    void router.push('/student')
    return
  }
  void router.push(auth.homePath())
}
</script>

<template>
  <AuthLayout>
    <div class="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <p class="label-caps mb-2">Profil</p>
        <h1 class="font-display text-2xl sm:text-3xl text-brand-dark tracking-tight">
          Choisissez un espace
        </h1>
        <p class="mt-2 text-sm text-ink-muted max-w-md">
          Activez enseignant ou étudiant maintenant, ou passez cette étape et complétez depuis le menu profil.
        </p>
      </div>
      <AppButton variant="outline" size="sm" class="shrink-0" @click="skipForNow">
        Passer pour l'instant
      </AppButton>
    </div>

    <div v-if="!showTeacher && !showStudent" class="space-y-3">
      <RouterLink
        v-if="auth.hasTeacherQuality"
        to="/teacher"
        class="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        Espace enseignant
        <ArrowRight class="w-4 h-4" />
      </RouterLink>
      <RouterLink
        v-if="auth.hasStudentQuality"
        to="/student"
        class="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        Espace étudiant
        <ArrowRight class="w-4 h-4" />
      </RouterLink>
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <RouterLink
        v-if="showTeacher"
        to="/teacher/profile"
        class="onboarding-pick"
        @click="rememberIntent('teacher')"
      >
        <span class="onboarding-pick__icon onboarding-pick__icon--teacher">
          <GraduationCap class="w-5 h-5" />
        </span>
        <span class="onboarding-pick__body">
          <span class="onboarding-pick__title">Enseignant</span>
          <span class="onboarding-pick__desc">Créer et suivre des évaluations</span>
        </span>
        <ArrowRight class="w-4 h-4 text-ink-faint shrink-0" />
      </RouterLink>

      <RouterLink
        v-if="showStudent"
        to="/student/profile"
        class="onboarding-pick"
        @click="rememberIntent('student')"
      >
        <span class="onboarding-pick__icon onboarding-pick__icon--student">
          <BookOpen class="w-5 h-5" />
        </span>
        <span class="onboarding-pick__body">
          <span class="onboarding-pick__title">Étudiant</span>
          <span class="onboarding-pick__desc">Rejoindre une classe et passer des épreuves</span>
        </span>
        <ArrowRight class="w-4 h-4 text-ink-faint shrink-0" />
      </RouterLink>
    </div>
  </AuthLayout>
</template>

<style scoped>
.onboarding-pick {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-line);
  background: white;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.onboarding-pick:hover {
  border-color: color-mix(in srgb, var(--color-accent) 28%, var(--color-line));
  box-shadow: 0 10px 28px rgb(25 118 210 / 0.08);
  transform: translateY(-1px);
}

.onboarding-pick__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.65rem;
  color: white;
  flex-shrink: 0;
}

.onboarding-pick__icon--teacher {
  background: var(--color-brand);
}

.onboarding-pick__icon--student {
  background: var(--color-brand-dark);
}

.onboarding-pick__body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1;
}

.onboarding-pick__title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--color-ink);
}

.onboarding-pick__desc {
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--color-ink-muted);
}
</style>
