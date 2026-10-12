<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePresenceSessionStore } from '@/stores/presenceSessions'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { appToast } from '@/utils/toast'
import { parsePresenceToken } from '@/utils/presenceToken'
import AppBadge from '@/components/ui/AppBadge.vue'
import { formatPresenceCheckInDateTime } from '@/utils/presenceCheckInProfile'
import { Camera, Keyboard, CheckCircle2 } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const presenceStore = usePresenceSessionStore()

const mode = ref<'scan' | 'code'>('scan')
const manualSessionId = ref('')
const numericCode = ref('')

const openSessionOptions = computed(() => {
  if (!auth.currentUser) return []
  return presenceStore.getOpenSessionsForStudent(auth.currentUser.id).map((s) => ({
    value: s.id,
    label: s.classroomName,
  }))
})
const scanning = ref(false)
const scanError = ref('')
const successInfo = ref<{
  classroomName: string
  checkedInAt: string
  already: boolean
} | null>(null)

const tokenFromQuery = computed(() => {
  const t = route.query.token
  return typeof t === 'string' ? t : ''
})

async function processToken(token: string) {
  if (!auth.currentUser) return
  scanError.value = ''
  const result = presenceStore.checkInWithToken(token, auth.currentUser.id)
  if (result.ok) {
    const checkedInAt = new Date().toISOString()
    successInfo.value = {
      classroomName: result.classroomName,
      checkedInAt,
      already: result.already,
    }
    appToast.success(
      result.already ? 'Présence déjà pointée aujourd’hui.' : 'Présence pointée avec succès.',
    )
    return
  }
  if (result.code === 'SESSION_CLOSED') {
    const parsed = parsePresenceToken(token)
    await router.replace({
      name: 'presence-late-attempt',
      query: { sessionId: parsed?.sessionId ?? manualSessionId.value },
    })
    return
  }
  scanError.value = result.message
  if (result.code === 'SLOT_EXPIRED') {
    appToast.warning(result.message)
  } else {
    appToast.error(result.message)
  }
}

async function submitNumericCode() {
  if (!auth.currentUser || !manualSessionId.value.trim()) {
    scanError.value = 'Indiquez la session (depuis la salle) ou scannez le QR.'
    return
  }
  const result = presenceStore.checkInWithNumericCode(
    manualSessionId.value.trim(),
    numericCode.value,
    auth.currentUser.id,
  )
  if (result.ok) {
    successInfo.value = {
      classroomName: result.classroomName,
      checkedInAt: new Date().toISOString(),
      already: false,
    }
    appToast.success('Présence pointée avec succès.')
    return
  }
  if (result.code === 'SESSION_CLOSED') {
    await router.replace({
      name: 'presence-late-attempt',
      query: { sessionId: manualSessionId.value },
    })
    return
  }
  scanError.value = result.message
}

async function startCameraScan() {
  scanning.value = true
  scanError.value = ''
  try {
    if (!('BarcodeDetector' in window)) {
      scanError.value =
        'Scan caméra indisponible sur ce navigateur. Utilisez le code numérique ou ouvrez le lien du QR sur votre téléphone.'
      mode.value = 'code'
      return
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    const video = document.createElement('video')
    video.srcObject = stream
    await video.play()
    type BarcodeDetectorLike = {
      detect: (src: HTMLVideoElement) => Promise<{ rawValue?: string }[]>
    }
    type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    if (!Detector) {
      scanError.value = 'Scan QR non supporté ici. Utilisez le code numérique.'
      mode.value = 'code'
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    const detector = new Detector({ formats: ['qr_code'] })

    const deadline = Date.now() + 45000
    while (Date.now() < deadline) {
      const codes = await detector.detect(video)
      if (codes[0]?.rawValue) {
        const url = new URL(codes[0].rawValue, window.location.origin)
        const token = url.searchParams.get('token')
        stream.getTracks().forEach((t) => t.stop())
        if (token) {
          await processToken(token)
          return
        }
      }
      await new Promise((r) => setTimeout(r, 300))
    }
    stream.getTracks().forEach((t) => t.stop())
    scanError.value = 'Aucun QR détecté. Réessayez ou saisissez le code numérique.'
  } catch {
    scanError.value = 'Accès caméra refusé ou indisponible.'
    mode.value = 'code'
  } finally {
    scanning.value = false
  }
}

onMounted(async () => {
  if (openSessionOptions.value.length === 1) {
    manualSessionId.value = openSessionOptions.value[0]!.value
  }
  if (tokenFromQuery.value && auth.currentUser) {
    await processToken(tokenFromQuery.value)
  }
})

watch(tokenFromQuery, async (t) => {
  if (t && auth.currentUser) await processToken(t)
})
</script>

<template>
  <div class="min-h-app flex flex-col bg-paper pb-safe px-safe">
    <div class="flex-1 w-full max-w-lg mx-auto px-4 py-6 sm:py-10 space-y-6">
    <AppCard v-if="successInfo" class="p-6 space-y-4 border-accent/40 bg-accent-light/20">
      <div class="flex gap-3">
        <CheckCircle2 class="w-10 h-10 text-accent shrink-0" />
        <div>
          <AppBadge variant="success" class="mb-2">
            {{ successInfo.already ? 'Déjà enregistré' : 'Présence pointée' }}
          </AppBadge>
          <h1 class="font-display text-xl text-ink">
            {{ successInfo.already ? 'Vous étiez déjà marqué présent' : 'Présence enregistrée' }}
          </h1>
          <p class="text-sm text-ink-muted mt-2">
            {{ successInfo.classroomName }} ·
            {{ formatPresenceCheckInDateTime(successInfo.checkedInAt).date }}
            à {{ formatPresenceCheckInDateTime(successInfo.checkedInAt).time }}
          </p>
          <p class="text-xs text-ink-faint mt-2">
            Votre enseignant voit votre ligne dans le registre en direct.
          </p>
        </div>
      </div>
      <RouterLink to="/student">
        <AppButton class="w-full sm:w-auto">Retour au tableau de bord</AppButton>
      </RouterLink>
    </AppCard>

    <template v-else>
    <div>
      <p class="label-caps mb-2">Présence</p>
      <h1 class="font-display text-2xl text-ink">Pointer ma présence</h1>
      <p class="text-sm text-ink-muted mt-2">
        Scannez le QR affiché en salle (mobile recommandé) ou saisissez le code à 6 chiffres.
      </p>
    </div>

    <div class="flex gap-2">
      <AppButton :variant="mode === 'scan' ? 'primary' : 'outline'" size="sm" @click="mode = 'scan'">
        <Camera class="w-4 h-4" />
        Scanner
      </AppButton>
      <AppButton :variant="mode === 'code' ? 'primary' : 'outline'" size="sm" @click="mode = 'code'">
        <Keyboard class="w-4 h-4" />
        Code manuel
      </AppButton>
    </div>

    <AppCard v-if="mode === 'scan'" class="p-6 space-y-4 text-center">
      <p class="text-sm text-ink-muted">
        Sur ordinateur, préférez le scan avec votre téléphone connecté au même compte.
      </p>
      <AppButton :loading="scanning" @click="startCameraScan">
        {{ scanning ? 'Recherche QR…' : 'Activer la caméra' }}
      </AppButton>
      <p v-if="scanError" class="text-sm text-danger">{{ scanError }}</p>
    </AppCard>

    <AppCard v-else class="p-6 space-y-4">
      <AppSelect
        v-if="openSessionOptions.length"
        v-model="manualSessionId"
        label="Cours"
        :options="openSessionOptions"
      />
      <AppInput
        v-else
        v-model="manualSessionId"
        label="ID session"
        hint="Demandez l’ID à l’enseignant si aucune session n’apparaît."
        placeholder="uuid session"
      />
      <AppInput
        v-model="numericCode"
        label="Code à 6 chiffres"
        inputmode="numeric"
        maxlength="6"
        placeholder="482901"
      />
      <AppButton @click="submitNumericCode">Valider la présence</AppButton>
      <p v-if="scanError" class="text-sm text-danger">{{ scanError }}</p>
    </AppCard>

    <RouterLink to="/student" class="text-sm text-accent hover:underline">Retour tableau de bord</RouterLink>
    </template>
    </div>
  </div>
</template>
