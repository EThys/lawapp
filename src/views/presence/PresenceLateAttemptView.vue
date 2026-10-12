<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePresenceSessionStore } from '@/stores/presenceSessions'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { appToast } from '@/utils/toast'
import { AlertTriangle } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const presenceStore = usePresenceSessionStore()

const explanation = ref('')
const loading = ref(false)
const error = ref('')

const sessionId = computed(() => {
  const q = route.query.sessionId
  return typeof q === 'string' ? q : ''
})

const session = computed(() =>
  sessionId.value ? presenceStore.getSession(sessionId.value) : undefined,
)

async function submit() {
  error.value = ''
  if (!auth.currentUser || !sessionId.value) return
  loading.value = true
  try {
    const result = presenceStore.submitLateExplanation(
      sessionId.value,
      auth.currentUser.id,
      explanation.value,
    )
    if (!result.ok) {
      error.value = result.error
      appToast.error(result.error)
      return
    }
    appToast.success('Message envoyé à l’enseignant.')
    await router.replace('/student')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-10 space-y-6">
    <AppCard class="p-6 space-y-4 border-warning/40">
      <div class="flex gap-3 text-warning">
        <AlertTriangle class="w-6 h-6 shrink-0" />
        <div>
          <h1 class="font-display text-xl text-ink">Présence terminée</h1>
          <p class="text-sm text-ink-muted mt-2">
            Vous avez scanné un QR après la fin de la session
            <span v-if="session"> · {{ session.classroomName }}</span>.
            Pourquoi tentez-vous de pointer maintenant ?
          </p>
        </div>
      </div>

      <AppTextarea
        v-model="explanation"
        label="Votre explication"
        required
        :rows="5"
        placeholder="Ex. : j’étais en retard, problème de connexion…"
      />
      <p v-if="error" class="text-sm text-danger">{{ error }}</p>
      <AppButton :loading="loading" :disabled="explanation.trim().length < 10" @click="submit">
        Envoyer au professeur
      </AppButton>
      <RouterLink to="/student" class="block text-sm text-ink-muted hover:text-accent">
        Retour sans envoyer
      </RouterLink>
    </AppCard>
  </div>
</template>
