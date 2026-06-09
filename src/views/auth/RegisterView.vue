<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import AuthRoleTabs from '@/components/auth/AuthRoleTabs.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppStepper from '@/components/ui/AppStepper.vue'
import {
  INSTITUTIONS_CONGO,
  DEFAULT_UNIVERSITY,
  isInstitutionSelectable,
} from '@/data/universities'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { AlertCircle, Check, ChevronLeft, ChevronRight } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const step = ref(0)
const steps = ['Profil', 'Identité', 'Sécurité']

const role = ref<UserRole>((route.query.role as UserRole) || 'teacher')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const firstName = ref('')
const lastName = ref('')
const institution = ref(DEFAULT_UNIVERSITY)
const studentId = ref('')
const error = ref('')
const loading = ref(false)
const acceptTerms = ref(false)

const isTeacher = computed(() => role.value === 'teacher')

function setRole(r: UserRole) {
  role.value = r
  router.replace({ path: route.path, query: { ...route.query, role: r } })
}

watch(
  () => route.query.role,
  (q) => {
    if (q === 'student' || q === 'teacher') role.value = q
  }
)

function validateStep(): boolean {
  error.value = ''
  if (step.value === 1) {
    if (!firstName.value.trim() || !lastName.value.trim()) {
      error.value = 'Le prénom et le nom sont requis.'
      return false
    }
    if (!email.value.trim()) {
      error.value = 'L\'adresse e-mail est requise.'
      return false
    }
    if (!isTeacher.value && !studentId.value.trim()) {
      error.value = 'L\'identifiant étudiant est requis.'
      return false
    }
  }
  if (step.value === 2) {
    if (!acceptTerms.value) {
      error.value = 'Vous devez accepter les conditions d\'utilisation.'
      return false
    }
    if (password.value !== confirmPassword.value) {
      error.value = 'Les mots de passe ne correspondent pas.'
      return false
    }
  }
  return true
}

function nextStep() {
  if (step.value === 0) {
    step.value++
    return
  }
  if (!validateStep()) return
  if (step.value < steps.length - 1) {
    step.value++
  } else {
    handleRegister()
  }
}

function prevStep() {
  error.value = ''
  if (step.value > 0) step.value--
}

async function handleRegister() {
  if (!validateStep()) return
  loading.value = true

  const result = isTeacher.value
    ? await auth.registerTeacher({
        email: email.value,
        password: password.value,
        firstName: firstName.value,
        lastName: lastName.value,
        institution: institution.value || undefined,
      })
    : await auth.registerStudent({
        email: email.value,
        password: password.value,
        firstName: firstName.value,
        lastName: lastName.value,
        studentId: studentId.value,
        institution: institution.value || undefined,
      })

  loading.value = false

  if (!result.ok) {
    error.value = result.error
    return
  }

  router.push(isTeacher.value ? '/teacher' : '/student')
}
</script>

<template>
  <AuthLayout>
    <div class="mb-6">
      <p class="label-caps mb-3">Inscription</p>
      <h1 class="font-display text-3xl text-ink tracking-tight">Créer votre compte</h1>
      <p class="mt-2 text-sm text-ink-muted leading-relaxed">
        Étape {{ step + 1 }} sur {{ steps.length }} · {{ steps[step] }}
      </p>
    </div>

    <AppStepper :steps="steps" :current="step" />

    <AuthRoleTabs v-model="role" />

    <Transition name="step" mode="out-in">
      <div v-if="step === 0" key="0" class="space-y-4">
        <p class="text-sm text-ink-muted">Choisissez le type de compte adapté à votre rôle.</p>
        <div class="grid grid-cols-1 gap-3">
          <button
            type="button"
            class="relative p-4 border text-left transition-all hover-lift"
            :class="isTeacher ? 'border-accent bg-accent-light ring-1 ring-accent' : 'border-line bg-white hover:border-line-strong'"
            @click="setRole('teacher')"
          >
            <Check v-if="isTeacher" class="absolute top-3 right-3 w-4 h-4 text-accent" />
            <p class="text-sm font-semibold text-ink">Enseignant</p>
            <p class="text-xs text-ink-muted mt-1">Créer et gérer des évaluations chronométrées</p>
          </button>
          <button
            type="button"
            class="relative p-4 border text-left transition-all hover-lift"
            :class="!isTeacher ? 'border-accent bg-accent-light ring-1 ring-accent' : 'border-line bg-white hover:border-line-strong'"
            @click="setRole('student')"
          >
            <Check v-if="!isTeacher" class="absolute top-3 right-3 w-4 h-4 text-accent" />
            <p class="text-sm font-semibold text-ink">Étudiant</p>
            <p class="text-xs text-ink-muted mt-1">Passer des évaluations avec contrôles anti-triche</p>
          </button>
        </div>
      </div>

      <div v-else-if="step === 1" key="1" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <AppInput v-model="firstName" label="Prénom" placeholder="Emy" required autocomplete="given-name" />
          <AppInput v-model="lastName" label="Nom" placeholder="Mayumbi" required autocomplete="family-name" />
        </div>
        <AppInput v-model="email" label="Adresse e-mail" type="email" placeholder="emy.mayumbi@ucc.cd" required autocomplete="email" />
        <AppInput v-if="!isTeacher" v-model="studentId" label="N° étudiant / identifiant" placeholder="UCC2024001" required />
        <AppSelect
          v-model="institution"
          label="Établissement"
          :options="INSTITUTIONS_CONGO"
          grouped
          hint="Partenariat UCC : seule l'Université Catholique du Congo est disponible pour l'instant."
          @update:model-value="(v) => { if (!isInstitutionSelectable(v)) institution = DEFAULT_UNIVERSITY }"
        />
      </div>

      <div v-else key="2" class="space-y-4">
        <AppInput v-model="password" label="Mot de passe" type="password" placeholder="8 caractères minimum" hint="Lettres et chiffres requis" required autocomplete="new-password" />
        <AppInput v-model="confirmPassword" label="Confirmer le mot de passe" type="password" placeholder="••••••••" required autocomplete="new-password" />
        <label class="flex items-start gap-3 cursor-pointer pt-1">
          <input v-model="acceptTerms" type="checkbox" class="mt-0.5 w-4 h-4 border-line text-accent focus:ring-accent" />
          <span class="text-xs text-ink-muted leading-relaxed">
            J'accepte les conditions d'utilisation et la politique de confidentialité de LawApp.
          </span>
        </label>
      </div>
    </Transition>

    <div v-if="error" class="flex items-start gap-2.5 p-4 mt-4 bg-danger-bg border border-danger/20 text-sm text-danger animate-scale-in">
      <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
      {{ error }}
    </div>

    <div class="flex gap-3 mt-8">
      <AppButton v-if="step > 0" variant="outline" class="flex-1" @click="prevStep">
        <ChevronLeft class="w-4 h-4" />
        Retour
      </AppButton>
      <AppButton class="flex-1" :loading="loading" @click="nextStep">
        <template v-if="step < steps.length - 1">
          Continuer
          <ChevronRight class="w-4 h-4" />
        </template>
        <template v-else>
          Créer mon compte {{ ROLE_LABELS[role].toLowerCase() }}
        </template>
      </AppButton>
    </div>

    <p class="mt-8 text-center text-sm text-ink-muted">
      Déjà inscrit ?
      <RouterLink
        :to="{ path: '/login', query: { role } }"
        class="text-accent font-medium hover:text-accent-hover underline underline-offset-4 decoration-accent/30"
      >
        Se connecter
      </RouterLink>
    </p>
  </AuthLayout>
</template>
