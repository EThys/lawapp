<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import AuthRoleTabs from '@/components/auth/AuthRoleTabs.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { AlertCircle } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const activeRole = computed<UserRole>(() => {
  const q = route.query.role as UserRole | undefined
  return q === 'student' ? 'student' : 'teacher'
})

async function handleLogin() {
  error.value = ''
  loading.value = true

  const result = await auth.login({ email: email.value, password: password.value })
  loading.value = false

  if (!result.ok) {
    error.value = result.error
    return
  }

  const redirect = route.query.redirect as string | undefined
  if (redirect) {
    router.push(redirect)
  } else if (result.role === 'teacher') {
    router.push('/teacher')
  } else {
    router.push('/student')
  }
}
</script>

<template>
  <AuthLayout>
    <div class="mb-10">
      <p class="label-caps mb-3">Connexion</p>
      <h1 class="font-display text-3xl text-ink tracking-tight">Accéder à votre espace</h1>
      <p class="mt-2 text-sm text-ink-muted leading-relaxed">
        Connectez-vous avec votre compte
        {{ ROLE_LABELS[activeRole].toLowerCase() }} ou un autre profil enregistré.
      </p>
    </div>

    <AuthRoleTabs />

    <form class="space-y-5" @submit.prevent="handleLogin">
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
      />

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
        :to="{ path: '/register', query: { role: activeRole } }"
        class="text-accent font-medium hover:text-accent-hover underline underline-offset-4 decoration-accent/30"
      >
        Créer un compte
      </RouterLink>
    </p>
  </AuthLayout>
</template>
