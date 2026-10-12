<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePresenceSessionStore } from '@/stores/presenceSessions'
import {
  PRESENCE_DEFAULT_MAX_DURATION_SECONDS,
  PRESENCE_MAX_DURATION_SECONDS,
  PRESENCE_MIN_DURATION_SECONDS,
} from '@/types/presenceSession'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { QrCode, Play } from '@lucide/vue'

const props = defineProps<{
  classroomId: string
  classroomName: string
  enrolledUserIds: string[]
}>()

const router = useRouter()
const auth = useAuthStore()
const presenceStore = usePresenceSessionStore()

const durationMinutes = ref('5')
const starting = ref(false)
const error = ref('')

const durationOptions = [
  { value: '2', label: '2 minutes' },
  { value: '5', label: '5 minutes (recommandé)' },
  { value: '10', label: '10 minutes' },
  { value: '15', label: '15 minutes' },
]

const openSession = computed(() => presenceStore.getOpenSessionForClassroom(props.classroomId))

async function startSession() {
  error.value = ''
  if (!auth.currentUser) return
  const minutes = Number(durationMinutes.value)
  const seconds = minutes * 60
  if (seconds < PRESENCE_MIN_DURATION_SECONDS || seconds > PRESENCE_MAX_DURATION_SECONDS) {
    error.value = 'Durée invalide.'
    return
  }
  starting.value = true
  try {
    const session = presenceStore.startSession({
      classroomId: props.classroomId,
      classroomName: props.classroomName,
      teacherId: auth.currentUser.id,
      maxDurationSeconds: seconds || PRESENCE_DEFAULT_MAX_DURATION_SECONDS,
      enrolledUserIds: props.enrolledUserIds,
    })
    await router.push({
      name: 'teacher-presence-live',
      params: { id: props.classroomId, sessionId: session.id },
    })
  } finally {
    starting.value = false
  }
}

function goLive() {
  if (!openSession.value) return
  router.push({
    name: 'teacher-presence-live',
    params: { id: props.classroomId, sessionId: openSession.value.id },
  })
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-ink-muted">
      QR rotatif (~15 s), relais étudiants (CP) sans projecteur, check-in mobile ou web.
      <span class="text-ink-faint"> (Mode local — API à venir.)</span>
    </p>

    <div v-if="openSession" class="flex flex-wrap items-center gap-3 p-4 border border-accent/30 bg-accent-light/30">
      <AppBadge variant="success">Session QR ouverte</AppBadge>
      <AppButton @click="goLive">
        <QrCode class="w-4 h-4" />
        Reprendre l’écran live
      </AppButton>
    </div>

    <div v-else class="flex flex-col sm:flex-row sm:items-end gap-4">
      <div class="flex-1 min-w-[10rem]">
        <AppSelect v-model="durationMinutes" label="Durée max de la session" :options="durationOptions" />
      </div>
      <AppButton :loading="starting" @click="startSession">
        <Play class="w-4 h-4" />
        Démarrer présence QR
      </AppButton>
    </div>

    <p v-if="error" class="text-sm text-danger">{{ error }}</p>
  </div>
</template>
