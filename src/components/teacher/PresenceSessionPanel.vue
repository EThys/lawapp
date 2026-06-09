<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { captureNetworkFingerprint, getPresenceShareUrl } from '@/utils/localNetwork'
import { scanWifiNetworks, signalBars, type WifiNetwork } from '@/utils/wifiScan'
import { TUNNEL_CODE_ROTATION_SECONDS, TUNNEL_DURATION_MINUTES } from '@/types/course'
import { Copy, Check, Power, PowerOff, Radio, Wifi, RefreshCw, Loader2, Share2 } from '@lucide/vue'

const props = defineProps<{
  courseId: string
  memberCount?: number
}>()

const auth = useAuthStore()
const courseStore = useCourseStore()

const selectedWifi = ref('')
const wifiNetworks = ref<WifiNetwork[]>([])
const scanning = ref(false)
const scanError = ref('')
const hasScanned = ref(false)
const startingTunnel = ref(false)
const tunnelError = ref('')
const shareError = ref('')
const shareSuccess = ref('')
const sharing = ref(false)
const copiedPresenceLink = ref(false)
const tick = ref(0)

let timer: ReturnType<typeof setInterval> | null = null

const activeTunnel = computed(() => {
  tick.value
  return courseStore.getActiveTunnel(props.courseId)
})

const isSharedToClass = computed(() => !!activeTunnel.value?.sharedToClassAt)

const tunnelCode = computed(() => activeTunnel.value?.code ?? '')
const tunnelShareLink = computed(() => {
  const shareCode = activeTunnel.value?.shareCode
  return shareCode ? getPresenceShareUrl(shareCode) : ''
})

const codeRemaining = computed(() => {
  tick.value
  return courseStore.getTunnelCodeRemainingSeconds(props.courseId)
})

const sessionRemaining = computed(() => {
  tick.value
  return courseStore.getTunnelSessionRemainingSeconds(props.courseId)
})

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

onMounted(() => {
  timer = setInterval(() => {
    tick.value++
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

async function scanWifi() {
  scanning.value = true
  scanError.value = ''
  try {
    const networks = await scanWifiNetworks()
    wifiNetworks.value = networks
    hasScanned.value = true
    const connected = networks.find((n) => n.isConnected)
    const strongest = networks[0]
    selectedWifi.value = connected?.ssid ?? strongest?.ssid ?? ''
  } catch (err) {
    scanError.value = err instanceof Error ? err.message : 'Scan WiFi impossible.'
    wifiNetworks.value = []
  } finally {
    scanning.value = false
  }
}

function selectWifi(ssid: string) {
  selectedWifi.value = ssid
  tunnelError.value = ''
}

async function startTunnel() {
  if (!auth.currentUser || startingTunnel.value) return
  tunnelError.value = ''
  shareError.value = ''
  shareSuccess.value = ''
  if (!selectedWifi.value) {
    tunnelError.value = 'Scannez les réseaux WiFi et sélectionnez celui de la salle.'
    return
  }

  startingTunnel.value = true
  try {
    const fingerprint = await captureNetworkFingerprint()
    if (!fingerprint.publicIp && !fingerprint.localIpPrefix) {
      tunnelError.value = 'Connectez-vous au WiFi de la salle avant d\'ouvrir la session.'
      return
    }
    const tunnel = courseStore.startTunnel(
      props.courseId,
      auth.currentUser.id,
      selectedWifi.value,
      fingerprint
    )
    if (!tunnel) {
      tunnelError.value = 'Impossible d\'ouvrir la session.'
      return
    }
    tick.value++
  } finally {
    startingTunnel.value = false
  }
}

function stopTunnel() {
  courseStore.stopTunnel(props.courseId)
  shareSuccess.value = ''
  tick.value++
}

function shareToClass() {
  shareError.value = ''
  shareSuccess.value = ''
  sharing.value = true
  const result = courseStore.sharePresenceToClass(props.courseId)
  sharing.value = false
  if (!result.ok) {
    shareError.value = result.error
    return
  }
  shareSuccess.value = 'Partagé à votre salle. Les étudiants voient le code sur leur app.'
  tick.value++
}

function copyPresenceLink() {
  if (!tunnelShareLink.value) return
  navigator.clipboard.writeText(tunnelShareLink.value)
  copiedPresenceLink.value = true
  setTimeout(() => (copiedPresenceLink.value = false), 2000)
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-ink-muted">
      Scannez le WiFi de la salle, ouvrez la session, puis partagez à vos étudiants inscrits.
      Le lien ne fonctionne que sur le réseau local de la salle.
    </p>

    <div v-if="!activeTunnel" class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <AppButton variant="outline" :disabled="scanning" @click="scanWifi">
          <Loader2 v-if="scanning" class="w-4 h-4 animate-spin" />
          <RefreshCw v-else class="w-4 h-4" />
          {{ scanning ? 'Scan en cours…' : hasScanned ? 'Rescanner' : 'Scanner les réseaux WiFi' }}
        </AppButton>
        <span v-if="hasScanned && wifiNetworks.length" class="text-xs text-ink-faint">
          {{ wifiNetworks.length }} réseau(x) détecté(s)
        </span>
      </div>

      <p v-if="scanError" class="text-sm text-danger">{{ scanError }}</p>

      <div v-if="wifiNetworks.length" class="border border-line divide-y divide-line">
        <button
          v-for="network in wifiNetworks"
          :key="network.ssid"
          type="button"
          class="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-paper-warm"
          :class="selectedWifi === network.ssid ? 'bg-accent-light/50 border-l-2 border-l-accent' : ''"
          @click="selectWifi(network.ssid)"
        >
          <Wifi class="w-5 h-5 flex-shrink-0" :class="selectedWifi === network.ssid ? 'text-accent' : 'text-ink-faint'" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-ink truncate">{{ network.ssid }}</p>
            <p class="text-xs text-ink-faint">
              {{ network.secured ? 'Sécurisé' : 'Ouvert' }}
              <span v-if="network.isConnected" class="text-accent"> · Connecté</span>
            </p>
          </div>
          <div class="flex items-end gap-0.5 h-4 flex-shrink-0" aria-hidden="true">
            <span
              v-for="bar in 4"
              :key="bar"
              class="w-1 rounded-sm"
              :class="bar <= signalBars(network.signalLevel) ? 'bg-accent' : 'bg-line'"
              :style="{ height: `${bar * 25}%` }"
            />
          </div>
        </button>
      </div>

      <p v-else-if="hasScanned && !scanning" class="text-sm text-ink-muted">
        Aucun réseau détecté. Vérifiez que le WiFi est activé.
      </p>

      <p v-if="tunnelError" class="text-sm text-danger">{{ tunnelError }}</p>

      <AppButton :disabled="startingTunnel || !selectedWifi" @click="startTunnel">
        <Power class="w-4 h-4" />
        {{ startingTunnel ? 'Ouverture…' : `Générer la session (${TUNNEL_DURATION_MINUTES} min)` }}
      </AppButton>
    </div>

    <div v-else class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <AppBadge variant="success">Session active</AppBadge>
        <AppBadge v-if="isSharedToClass" variant="brand">Partagé à la salle</AppBadge>
        <span class="text-sm text-ink-muted">
          WiFi « {{ activeTunnel.wifiLabel }} » · fin dans {{ formatCountdown(sessionRemaining) }}
        </span>
        <AppButton variant="outline" size="sm" @click="stopTunnel">
          <PowerOff class="w-4 h-4" />
          Fermer
        </AppButton>
      </div>

      <div class="p-4 bg-accent-light border border-accent/20 space-y-3">
        <p class="text-xs text-ink-muted uppercase tracking-wide">Lien présence généré</p>
        <p class="text-sm font-mono break-all text-accent">{{ tunnelShareLink }}</p>
        <AppButton variant="outline" size="sm" @click="copyPresenceLink">
          <Check v-if="copiedPresenceLink" class="w-4 h-4 text-accent" />
          <Copy v-else class="w-4 h-4" />
          Copier le lien
        </AppButton>
      </div>

      <div class="p-8 bg-brand-dark text-center border border-accent/30">
        <p class="text-xs text-white/70 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
          <Radio class="w-4 h-4" />
          Code tableau · {{ TUNNEL_CODE_ROTATION_SECONDS }} s
        </p>
        <p class="font-mono text-5xl sm:text-6xl font-bold text-white tracking-[0.3em]">
          {{ tunnelCode }}
        </p>
        <p class="text-sm text-white/60 mt-4">
          Nouveau code dans {{ codeRemaining }} s
        </p>
      </div>

      <div class="p-4 border border-line bg-paper-warm space-y-3">
        <p class="text-sm text-ink-muted">
          Partagez le code et le lien à vos étudiants inscrits. Ils les verront sur leur application.
        </p>
        <AppButton :disabled="sharing || isSharedToClass" @click="shareToClass">
          <Share2 class="w-4 h-4" />
          {{ isSharedToClass ? 'Déjà partagé à ma salle' : sharing ? 'Partage…' : 'Partager à ma salle' }}
        </AppButton>
        <p v-if="shareError" class="text-sm text-danger">{{ shareError }}</p>
        <p v-if="shareSuccess" class="text-sm text-accent">{{ shareSuccess }}</p>
        <p v-if="memberCount !== undefined" class="text-xs text-ink-faint">
          {{ memberCount }} étudiant(s) inscrit(s) recevront le code sur leur app.
        </p>
      </div>
    </div>
  </div>
</template>
