<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore, postAuthHome } from '@/stores/auth'
import { readPendingRegistrationRole } from '@/utils/verificationSession'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { isApiEnabled } from '@/config/features'
import { dismissKeyboard, missingFieldsMessage } from '@/utils/form'
import { AlertCircle } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref(typeof route.query.email === 'string' ? route.query.email.trim() : '')
const password = ref('')
const error = ref('')
const loading = ref(false)
const infoMessage = ref(
  typeof route.query.message === 'string'
    ? route.query.message
    : route.query.registered
      ? 'Compte créé. Connectez-vous après validation de votre e-mail.'
      : route.query.verified
        ? 'Compte validé. Connectez-vous pour finaliser votre profil.'
        : '',
)

async function handleLogin() {
  dismissKeyboard()
  error.value = ''

  const missing: string[] = []
  if (!email.value.trim()) missing.push('Adresse e-mail')
  if (!password.value) missing.push('Mot de passe')
  if (missing.length) {
    error.value = missingFieldsMessage(missing)
    return
  }

  loading.value = true

  const result = await auth.login({ email: email.value, password: password.value })
  loading.value = false

  if (!result.ok) {
    error.value = result.error
    return
  }

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
  const u = auth.currentUser
  await router.push(
    postAuthHome(result.role, {
      redirect: result.needsProfile ? null : redirect,
      hasTeacherProfile: u?.hasTeacherProfile,
      hasStudentProfile: u?.hasStudentProfile,
      email: u?.email ?? email.value,
      pendingRegistrationRole: readPendingRegistrationRole(u?.email ?? email.value),
    }),
  )
}
</script>

<template>
  <AuthLayout>
    <div class="mb-10">
      <p class="label-caps mb-3">Connexion</p>
      <h1 class="font-display text-3xl text-ink tracking-tight">Accéder à votre espace</h1>
      <p class="mt-2 text-sm text-ink-muted leading-relaxed">
        Connexion à votre compte. Votre espace enseignant ou étudiant est détecté automatiquement
        si le profil existe déjà sur votre compte.
      </p>
    </div>

    <form class="space-y-5" novalidate @submit.prevent="handleLogin">
      <AppInput
        v-model="email"
        label="Adresse e-mail"
        type="email"
        placeholder="emy.mayumbi@ucc.cd"
        required
        autocomplete="email"
      />
      <AppInput
        v-model="password"
        label="Mot de passe"
        type="password"
        placeholder="••••••••"
        required
        autocomplete="current-password"
        :show-password-toggle="true"
      />

      <p v-if="isApiEnabled()" class="text-right -mt-2">
        <RouterLink
          to="/forgot-password"
          class="text-xs text-accent hover:text-accent-hover underline underline-offset-4"
        >
          Mot de passe oublié ?
        </RouterLink>
      </p>

      <div v-if="infoMessage" class="flex items-start gap-2.5 p-4 bg-accent-light border border-accent/20 text-sm text-accent">
        {{ infoMessage }}
      </div>

      <div v-if="error" class="flex items-start gap-2.5 p-4 bg-danger-bg border border-danger/20 text-sm text-danger">
        <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
        {{ error }}
      </div>

      <AppButton type="submit" class="w-full" :loading="loading">
        Se connecter
      </AppButton>
    </form>

    <p class="mt-8 text-center text-sm text-ink-muted">
      Pas encore de compte ?
      <RouterLink
        to="/register"
        class="text-accent font-medium hover:text-accent-hover underline underline-offset-4 decoration-accent/30"
      >
        Créer un compte
      </RouterLink>
    </p>
  </AuthLayout>
</template>
