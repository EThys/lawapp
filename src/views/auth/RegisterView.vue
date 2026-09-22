<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppPhoneInput from '@/components/ui/AppPhoneInput.vue'
import AppCombobox from '@/components/ui/AppCombobox.vue'
import AppStepper from '@/components/ui/AppStepper.vue'
import { CITIES_CONGO, DEFAULT_CITY } from '@/data/cities'
import { useVerificationStore } from '@/stores/verification'
import {
  persistPendingVerification,
  persistPendingLoginCredentials,
  persistRegistrationRole,
  clearPendingRegistrationRole,
} from '@/utils/verificationSession'
import { validateCdPhone } from '@/utils/auth'
import { dismissKeyboard, missingFieldsMessage } from '@/utils/form'
import { clearProfileSnapshot, clearRoleIntent } from '@/utils/memberProfile'
import type { UserRole } from '@/types/auth'
import { AlertCircle, ChevronLeft, ChevronRight, GraduationCap, BookOpen } from '@lucide/vue'

const router = useRouter()
const auth = useAuthStore()

const step = ref(0)
const steps = ['Identité', 'Profil', 'Sécurité']

const stepHint = computed(() => {
  if (step.value === 0) return 'Vos informations personnelles.'
  if (step.value === 1) return 'Vous enseignez ou vous étudiez ?'
  return 'Choisissez un mot de passe sécurisé.'
})
const intendedRole = ref<UserRole | null>(null)

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const firstName = ref('')
const lastName = ref('')
const phoneE164 = ref('')
const city = ref(DEFAULT_CITY)
const error = ref('')
const loading = ref(false)
const acceptTerms = ref(false)

onMounted(() => {
  clearRoleIntent()
  clearProfileSnapshot()
  clearPendingRegistrationRole()
})

function validateStep(): boolean {
  error.value = ''
  if (step.value === 0) {
    const missing: string[] = []
    if (!firstName.value.trim()) missing.push('Prénom')
    if (!lastName.value.trim()) missing.push('Nom')
    if (!email.value.trim()) missing.push('Adresse e-mail')
    if (!phoneE164.value.trim()) missing.push('Téléphone mobile')
    if (!city.value.trim()) missing.push('Ville')
    if (missing.length) {
      error.value = missingFieldsMessage(missing)
      return false
    }
    const phoneErr = validateCdPhone(phoneE164.value)
    if (phoneErr) {
      error.value = phoneErr
      return false
    }
  }
  if (step.value === 1) {
    if (!intendedRole.value) {
      error.value = 'Indiquez si vous êtes enseignant ou étudiant.'
      return false
    }
  }
  if (step.value === 2) {
    const missing: string[] = []
    if (!password.value) missing.push('Mot de passe')
    if (!confirmPassword.value) missing.push('Confirmation du mot de passe')
    if (missing.length) {
      error.value = missingFieldsMessage(missing)
      return false
    }
    if (password.value !== confirmPassword.value) {
      error.value = 'Les mots de passe ne correspondent pas.'
      return false
    }
    if (!acceptTerms.value) {
      error.value = 'Vous devez accepter les conditions d\'utilisation.'
      return false
    }
  }
  return true
}

function nextStep() {
  dismissKeyboard()
  if (!validateStep()) return
  if (step.value < steps.length - 1) {
    step.value++
  } else {
    void handleRegister()
  }
}

function prevStep() {
  error.value = ''
  if (step.value > 0) step.value--
}

function selectRole(role: UserRole) {
  intendedRole.value = role
  error.value = ''
}

async function handleRegister() {
  if (!validateStep()) return
  clearRoleIntent()
  clearProfileSnapshot()
  if (intendedRole.value) {
    persistRegistrationRole(email.value, intendedRole.value)
  }
  loading.value = true

  const result = await auth.registerAccount({
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
    firstName: firstName.value,
    lastName: lastName.value,
    city: city.value,
    phone: phoneE164.value,
  })

  loading.value = false

  if (!result.ok) {
    error.value = result.error
    return
  }

  if (result.requiresVerification) {
    persistPendingVerification(email.value)
    persistPendingLoginCredentials(email.value, password.value)
    useVerificationStore().setIdentifier(email.value)
    await router.push({
      path: '/verify-email',
      query: { email: email.value },
    })
    return
  }

  await router.push('/onboarding/profile')
}
</script>

<template>
  <AuthLayout>
    <div class="mb-6">
      <p class="label-caps mb-3">Inscription</p>
      <h1 class="font-display text-3xl text-ink tracking-tight">Créer votre compte</h1>
      <p class="mt-2 text-sm text-ink-muted leading-relaxed">
        Étape {{ step + 1 }} sur {{ steps.length }} — {{ stepHint }}
      </p>
    </div>

    <AppStepper :steps="steps" :current="step" />

    <Transition name="step" mode="out-in">
      <div v-if="step === 0" key="0" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <AppInput v-model="firstName" label="Prénom" placeholder="Emy" required autocomplete="given-name" />
          <AppInput v-model="lastName" label="Nom" placeholder="Mayumbi" required autocomplete="family-name" />
        </div>
        <AppInput v-model="email" label="Adresse e-mail" type="email" placeholder="emy.mayumbi@ucc.cd" required autocomplete="email" />
        <AppPhoneInput
          v-model="phoneE164"
          label="Téléphone mobile"
          required
          default-country="CD"
        />
        <AppCombobox
          v-model="city"
          label="Ville"
          :options="CITIES_CONGO"
          placeholder="Kinshasa ou autre ville…"
          required
          autocomplete="address-level2"
        />
      </div>

      <div v-else-if="step === 1" key="1" class="space-y-3">
        <button
          type="button"
          class="flex w-full cursor-pointer items-start gap-4 p-5 border text-left transition-colors"
          :class="intendedRole === 'teacher' ? 'border-accent bg-accent-light/40' : 'border-line hover:bg-paper-warm'"
          @click="selectRole('teacher')"
        >
          <span class="mt-0.5 flex h-10 w-10 items-center justify-center bg-accent text-white">
            <GraduationCap class="w-5 h-5" />
          </span>
          <span class="min-w-0">
            <span class="block font-display text-lg text-ink">Je suis enseignant</span>
            <span class="mt-1 block text-sm text-ink-muted">Cours, évaluations et suivi des étudiants.</span>
          </span>
        </button>
        <button
          type="button"
          class="flex w-full cursor-pointer items-start gap-4 p-5 border text-left transition-colors"
          :class="intendedRole === 'student' ? 'border-accent bg-accent-light/40' : 'border-line hover:bg-paper-warm'"
          @click="selectRole('student')"
        >
          <span class="mt-0.5 flex h-10 w-10 items-center justify-center bg-ink text-white">
            <BookOpen class="w-5 h-5" />
          </span>
          <span class="min-w-0">
            <span class="block font-display text-lg text-ink">Je suis étudiant</span>
            <span class="mt-1 block text-sm text-ink-muted">Rejoindre les groupes, examens et présences.</span>
          </span>
        </button>
      </div>

      <div v-else key="2" class="space-y-4">
        <AppInput
          v-model="password"
          label="Mot de passe"
          type="password"
          placeholder="8 caractères minimum"
          hint="Lettres et chiffres requis"
          required
          autocomplete="new-password"
          :show-password-toggle="true"
        />
        <AppInput
          v-model="confirmPassword"
          label="Confirmer le mot de passe"
          type="password"
          placeholder="••••••••"
          required
          autocomplete="new-password"
          :show-password-toggle="true"
        />
        <label class="flex items-start gap-3 cursor-pointer pt-1">
          <input v-model="acceptTerms" type="checkbox" class="mt-0.5 w-4 h-4 border-line text-accent focus:ring-accent cursor-pointer" />
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
          Créer mon compte
        </template>
      </AppButton>
    </div>

    <p class="mt-8 text-center text-sm text-ink-muted">
      Déjà inscrit ?
      <RouterLink
        to="/login"
        class="text-accent font-medium hover:text-accent-hover underline underline-offset-4 decoration-accent/30"
      >
        Se connecter
      </RouterLink>
    </p>
  </AuthLayout>
</template>
