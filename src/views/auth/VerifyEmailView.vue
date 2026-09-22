<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useVerificationStore } from '@/stores/verification'
import { useAuthStore, postAuthHome } from '@/stores/auth'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppOtpInput from '@/components/ui/AppOtpInput.vue'
import {
  clearPendingLoginCredentials,
  clearPendingRegistrationSession,
  readPendingLoginCredentials,
  readPendingRegistrationRole,
} from '@/utils/verificationSession'
import { ShieldCheck } from '@lucide/vue'
import { dismissKeyboard } from '@/utils/form'
import { appToast } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const verification = useVerificationStore()
const auth = useAuthStore()

const code = ref('')
const codeError = ref('')
const autoLoggingIn = ref(false)

const displayEmail = computed(() => verification.identifier || 'votre adresse')

async function tryAutoLogin(email: string): Promise<boolean> {
  const pending = readPendingLoginCredentials()
  if (!pending || pending.email.toLowerCase() !== email.toLowerCase()) return false

  autoLoggingIn.value = true
  try {
    const result = await auth.login({ email: pending.email, password: pending.password })
    if (!result.ok) return false
    clearPendingLoginCredentials()
    clearPendingRegistrationSession()
    const u = auth.currentUser
    await router.push(
      postAuthHome(result.role, {
        hasTeacherProfile: u?.hasTeacherProfile,
        hasStudentProfile: u?.hasStudentProfile,
        email: u?.email ?? email,
        pendingRegistrationRole: readPendingRegistrationRole(u?.email ?? email),
      }),
    )
    return true
  } catch {
    return false
  } finally {
    autoLoggingIn.value = false
  }
}

async function handleValidate() {
  dismissKeyboard()
  verification.clearFeedback()
  codeError.value = ''
  const c = code.value.trim()
  if (!c) {
    codeError.value = 'Saisissez le code reçu par e-mail.'
    return
  }
  if (c.length < 6) {
    codeError.value = 'Le code doit contenir 6 chiffres.'
    return
  }

  const email = verification.identifier?.trim()
  if (!email) {
    appToast.error('Adresse e-mail manquante.')
    return
  }

  try {
    const res = await verification.confirmCode(code.value)
    appToast.success(res.message ?? 'Compte validé avec succès.')
    const loggedIn = await tryAutoLogin(email)
    if (!loggedIn) {
      clearPendingRegistrationSession()
      await router.push({ path: '/login', query: { verified: '1' } })
    }
  } catch {
    appToast.error(verification.error ?? 'Code invalide.')
  }
}

async function handleResend() {
  verification.clearFeedback()
  try {
    const res = await verification.sendCode()
    appToast.success(res?.message ?? 'Code renvoyé par e-mail.')
  } catch {
    appToast.error(verification.error ?? 'Impossible de renvoyer le code.')
  }
}

onMounted(() => {
  verification.clearFeedback()
  verification.hydrateFromRouteOrStorage(
    typeof route.query.email === 'string' ? route.query.email : null,
  )
  if (!verification.identifier) {
    void router.replace('/register')
  }
})
</script>

<template>
  <AuthLayout>
    <div class="mb-10">
      <p class="label-caps mb-3">Vérification</p>
      <h1 class="font-display text-3xl text-ink tracking-tight">Valider votre compte</h1>
      <p class="mt-2 text-sm text-ink-muted leading-relaxed">
        Saisissez le code à 6 chiffres envoyé à
        <span class="font-medium text-ink">{{ displayEmail }}</span>.
        Ensuite, vous pourrez compléter votre profil enseignant ou étudiant.
      </p>
    </div>

    <form class="space-y-5" novalidate @submit.prevent="handleValidate">
      <AppOtpInput
        v-model="code"
        label="Code reçu par e-mail"
        :length="6"
        :error="codeError"
        :disabled="verification.loading || autoLoggingIn"
      />

      <AppButton type="submit" class="w-full" :loading="verification.loading || autoLoggingIn">
        <ShieldCheck class="w-4 h-4" />
        Confirmer le code
      </AppButton>
    </form>

    <div class="mt-8 space-y-3">
      <p class="text-xs text-ink-muted">Rien reçu ? Vérifiez les courriers indésirables.</p>
      <AppButton variant="outline" class="w-full" :loading="verification.loading" @click="handleResend">
        Renvoyer le code
      </AppButton>
    </div>

    <p class="mt-8 text-center text-sm text-ink-muted">
      <RouterLink to="/login" class="text-accent font-medium hover:text-accent-hover underline underline-offset-4">
        Retour à la connexion
      </RouterLink>
    </p>
  </AuthLayout>
</template>
