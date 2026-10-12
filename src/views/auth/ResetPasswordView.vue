<script setup lang="ts">

import { ref, onMounted } from 'vue'

import { useRoute, useRouter, RouterLink } from 'vue-router'

import { useVerificationStore } from '@/stores/verification'

import { useAuthStore } from '@/stores/auth'


import AuthLayout from '@/components/layout/AuthLayout.vue'

import AppButton from '@/components/ui/AppButton.vue'

import AppOtpInput from '@/components/ui/AppOtpInput.vue'

import AppInput from '@/components/ui/AppInput.vue'

import AppStepper from '@/components/ui/AppStepper.vue'

import { AlertCircle, ChevronLeft, KeyRound, ShieldCheck } from '@lucide/vue'

import { dismissKeyboard, missingFieldsMessage } from '@/utils/form'



const route = useRoute()

const router = useRouter()

const verification = useVerificationStore()

const auth = useAuthStore()



const step = ref(0)

const steps = ['Code', 'Mot de passe']



const code = ref('')

const newPassword = ref('')

const confirmPassword = ref('')

const error = ref('')

const success = ref('')

const loading = ref(false)



onMounted(() => {

  verification.hydrateFromRouteOrStorage(

    typeof route.query.email === 'string' ? route.query.email : null,

  )

  if (!verification.identifier) {

    router.replace('/forgot-password')

  }

})



async function handleVerifyCode() {

  dismissKeyboard()

  error.value = ''



  if (!code.value.trim()) {

    error.value = 'Saisissez le code reçu par e-mail.'

    return

  }

  if (code.value.trim().length < 6) {

    error.value = 'Le code doit contenir 6 chiffres.'

    return

  }



  loading.value = true

  try {

    await verification.verifyPasswordResetCode(code.value, { keepIdentifier: true })

    step.value = 1

  } catch {

    error.value = verification.error ?? 'Code invalide.'

  } finally {

    loading.value = false

  }

}



async function handleResetPassword() {

  dismissKeyboard()

  error.value = ''

  success.value = ''



  const missing: string[] = []

  if (!newPassword.value) missing.push('Nouveau mot de passe')

  if (!confirmPassword.value) missing.push('Confirmation du mot de passe')

  if (missing.length) {

    error.value = missingFieldsMessage(missing)

    return

  }

  const pwdError = newPassword.value.length < 8

    ? 'Le mot de passe doit contenir au moins 8 caractères.'

    : newPassword.value !== confirmPassword.value

      ? 'Les mots de passe ne correspondent pas.'

      : null

  if (pwdError) {

    error.value = pwdError

    return

  }



  loading.value = true

  try {

    const resetRes = await auth.resetPasswordAfterOtp(
      verification.identifier,
      code.value,
      newPassword.value,
      confirmPassword.value,
    )

    if (!resetRes.ok) {

      error.value = resetRes.error

      return

    }



    const loginEmail = verification.identifier.trim()
    const message =
      resetRes.message ?? 'Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe.'
    verification.setIdentifier('')
    await router.replace({
      path: '/login',
      query: {
        message,
        ...(loginEmail ? { email: loginEmail } : {}),
      },
    })

  } catch {

    error.value = 'Erreur lors de la réinitialisation.'

  } finally {

    loading.value = false

  }

}



function backToCodeStep() {

  error.value = ''

  success.value = ''

  newPassword.value = ''

  confirmPassword.value = ''

  step.value = 0

}



async function handleResend() {

  error.value = ''

  try {

    await verification.sendPasswordResetCode()

  } catch {

    error.value = verification.error ?? 'Impossible de renvoyer le code.'

  }

}

</script>



<template>

  <AuthLayout>

    <div class="mb-6">

      <p class="label-caps mb-3">Nouveau mot de passe</p>

      <h1 class="font-display text-ink tracking-tight">

        {{ step === 0 ? 'Vérifier le code' : 'Choisir un mot de passe' }}

      </h1>

      <p class="mt-2 text-sm text-ink-muted leading-relaxed">

        <template v-if="step === 0">

          Code envoyé à <span class="font-medium text-ink">{{ verification.identifier }}</span>

        </template>

        <template v-else>

          Code validé. Définissez votre nouveau mot de passe.

        </template>

      </p>

    </div>



    <AppStepper :steps="steps" :current="step" />



    <Transition name="step" mode="out-in">

      <form

        v-if="step === 0"

        key="otp"

        class="space-y-5"

        novalidate

        @submit.prevent="handleVerifyCode"

      >

        <AppOtpInput

          v-model="code"

          label="Code reçu par e-mail"

          :length="6"

          :disabled="loading || verification.loading"

        />



        <div v-if="error" class="flex items-start gap-2.5 p-4 bg-danger-bg border border-danger/20 text-sm text-danger">

          <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />

          {{ error }}

        </div>



        <AppButton type="submit" class="w-full" :loading="loading || verification.loading">

          <ShieldCheck class="w-4 h-4" />

          Vérifier le code

        </AppButton>



        <AppButton

          type="button"

          variant="outline"

          class="w-full"

          :loading="verification.loading"

          @click="handleResend"

        >

          Renvoyer le code

        </AppButton>

      </form>



      <form

        v-else

        key="password"

        class="space-y-5"

        novalidate

        @submit.prevent="handleResetPassword"

      >

        <AppInput

          v-model="newPassword"

          label="Nouveau mot de passe"

          type="password"

          placeholder="8 caractères minimum"

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



        <div v-if="success" class="p-4 bg-accent-light border border-accent/20 text-sm text-accent">

          {{ success }}

        </div>



        <div v-if="error" class="flex items-start gap-2.5 p-4 bg-danger-bg border border-danger/20 text-sm text-danger">

          <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />

          {{ error }}

        </div>



        <AppButton type="submit" class="w-full" :loading="loading">

          <KeyRound class="w-4 h-4" />

          Réinitialiser le mot de passe

        </AppButton>



        <AppButton type="button" variant="ghost" class="w-full" @click="backToCodeStep">

          <ChevronLeft class="w-4 h-4" />

          Modifier le code

        </AppButton>

      </form>

    </Transition>



    <p class="mt-8 text-center text-sm text-ink-muted">

      <RouterLink to="/login" class="text-accent font-medium hover:text-accent-hover underline underline-offset-4">

        Retour à la connexion

      </RouterLink>

    </p>

  </AuthLayout>

</template>


