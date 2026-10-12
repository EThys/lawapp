<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePresenceSessionStore } from '@/stores/presenceSessions'
import PresenceQrDisplay from '@/components/presence/PresenceQrDisplay.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { Smartphone } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const presenceStore = usePresenceSessionStore()

const sessionId = route.params.sessionId as string
const tick = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const session = computed(() => presenceStore.getSession(sessionId))
const display = computed(() => {
  tick.value
  return presenceStore.getDisplayPayload(sessionId)
})

const revoked = computed(() => {
  const uid = auth.currentUser?.id
  if (!session.value || !uid) return true
  const grant = session.value.relayGrants.find((g) => g.userId === uid)
  return !grant || !!grant.revokedAt
})

onMounted(() => {
  const uid = auth.currentUser?.id
  if (!uid || !presenceStore.canDisplaySession(sessionId, uid)) {
    router.replace('/student')
    return
  }
  timer = setInterval(() => {
    tick.value++
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="min-h-app bg-brand-dark text-white flex flex-col">
    <header
      class="px-4 py-3 pt-safe border-b border-white/10 flex items-center justify-between gap-2 px-safe shrink-0"
    >
      <div>
        <p class="text-xs uppercase tracking-widest text-white/60">Relais présence</p>
        <p class="font-medium">{{ session?.classroomName }}</p>
      </div>
      <AppBadge v-if="revoked" variant="warning">Relais coupé</AppBadge>
      <AppBadge v-else-if="session?.status === 'open'" variant="success">Actif</AppBadge>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center p-4 pb-safe min-h-0">
      <div v-if="revoked" class="text-center max-w-sm space-y-2">
        <p class="text-lg font-medium">Relais désactivé</p>
        <p class="text-sm text-white/70">L’enseignant a retiré votre autorisation d’affichage.</p>
      </div>
      <div v-else-if="session?.status === 'closed'" class="text-center">
        <p class="text-lg font-medium">Session terminée</p>
      </div>
      <div v-else class="w-full max-w-md">
        <PresenceQrDisplay :display="display" />
        <p class="mt-6 text-center text-sm text-white/60 flex items-center justify-center gap-2">
          <Smartphone class="w-4 h-4" />
          Montrez cet écran aux rangées · QR change toutes les 15 s
        </p>
      </div>
    </main>
  </div>
</template>
