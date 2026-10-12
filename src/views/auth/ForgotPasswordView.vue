<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useVerificationStore } from '@/stores/verification'
import { isApiEnabled } from '@/config/features'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { AlertCircle, Mail } from '@lucide/vue'
import { dismissKeyboard } from '@/utils/form'

const router = useRouter()
const verification = useVerificationStore()

const email = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  dismissKeyboard()
  error.value = ''
  const value = email.value.trim()
  if (!value) {
    error.value = 'Le champ « Adresse e-mail » est requis.'
    return
  }

  if (!isApiEnabled()) {
    error.value = 'La réinitialisation par e-mail nécessite le mode API (VITE_USE_API=true).'
    return
  }

  loading.value = true
  verification.setIdentifier(value)
  try {
    await verification.sendPasswordResetCode()
    await router.push({ path: '/reset-password', query: { email: value } })
  } catch {
    error.value = verification.error ?? 'Impossible d\'envoyer le code.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="mb-10">
      <p class="label-caps mb-3">Mot de passe oublié</p>
      <h1 class="font-display text-ink tracking-tight">Réinitialiser l'accès</h1>
      <p class="mt-2 text-sm text-ink-muted leading-relaxed">
        Nous enverrons un code de vérification à votre adresse e-mail.
      </p>
    </div>

    <form class="space-y-5" novalidate @submit.prevent="handleSubmit">
      <AppInput
        v-model="email"
        label="Adresse e-mail"
        type="email"
        placeholder="vous@exemple.cd"
        required
        autocomplete="email"
      />

      <div v-if="error" class="flex items-start gap-2.5 p-4 bg-danger-bg border border-danger/20 text-sm text-danger">
        <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
        {{ error }}
      </div>

      <AppButton type="submit" class="w-full" :loading="loading">
        <Mail class="w-4 h-4" />
        Envoyer le code
      </AppButton>
    </form>

    <p class="mt-8 text-center text-sm text-ink-muted">
      <RouterLink to="/login" class="text-accent font-medium hover:text-accent-hover underline underline-offset-4">
        Retour à la connexion
      </RouterLink>
    </p>
  </AuthLayout>
</template>
