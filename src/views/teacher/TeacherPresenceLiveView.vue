<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePresenceSessionStore } from '@/stores/presenceSessions'
import { useStudentStore } from '@/stores/students'
import { studentDisplayName } from '@/api/students'
import PresenceQrDisplay from '@/components/presence/PresenceQrDisplay.vue'
import PresenceRelayList from '@/components/presence/PresenceRelayList.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSuggest, { type SuggestItem } from '@/components/ui/AppSuggest.vue'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import {
  formatPresenceCheckInDateTime,
  resolvePresenceCheckInSnapshot,
} from '@/utils/presenceCheckInProfile'
import { appToast } from '@/utils/toast'
import { ArrowLeft, Maximize2, StopCircle, UserPlus, Users, Radio } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const presenceStore = usePresenceSessionStore()
const studentStore = useStudentStore()

const classroomId = route.params.id as string
const sessionId = route.params.sessionId as string

const tick = ref(0)
const relayQuery = ref('')
const selectedRelayUserId = ref<string | null>(null)
const showAttempts = ref(false)
const lastCheckInCount = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
let syncTimer: ReturnType<typeof setInterval> | null = null

function onStorageSync(e: StorageEvent) {
  if (e.key === 'lawapp_presence_sessions') {
    presenceStore.reloadFromStorage()
  }
}

const session = computed(() => presenceStore.getSession(sessionId))
const display = computed(() => {
  tick.value
  return presenceStore.getDisplayPayload(sessionId)
})

const activeRelays = computed(() =>
  (session.value?.relayGrants ?? []).filter((g) => !g.revokedAt),
)

const checkIns = computed(() => {
  tick.value
  return [...presenceStore.getCheckInsForSession(sessionId)].sort(
    (a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime(),
  )
})
const attempts = computed(() => presenceStore.getAttemptsForSession(sessionId))

const lateAttempts = computed(() =>
  attempts.value.filter((a) => a.reasonCode === 'SESSION_CLOSED' && a.explanation),
)

const slotAttempts = computed(() => attempts.value.filter((a) => a.reasonCode === 'SLOT_EXPIRED'))

function labelForUserId(userId: string): string {
  const n = Number(userId)
  const fromCatalog = Number.isFinite(n) ? studentStore.catalogByUserId.get(n) : undefined
  if (fromCatalog) return studentDisplayName(fromCatalog)
  const local = auth.getUserById(userId)
  if (local) return `${local.firstName} ${local.lastName}`.trim()
  return userId
}

const presentRows = computed(() =>
  checkIns.value.map((c) => {
    const snap = c.snapshot ?? resolvePresenceCheckInSnapshot(c.studentUserId)
    const { date, time } = formatPresenceCheckInDateTime(c.checkedInAt)
    return {
      id: c.id,
      date,
      time,
      firstName: snap.firstName,
      lastName: snap.lastName,
      gender: snap.genderLabel,
      university: snap.university,
      faculty: snap.faculty,
      promotion: snap.promotion,
    }
  }),
)

const presenceTableColumns = [
  { key: 'date', label: 'Date', hideOnMobile: true },
  { key: 'time', label: 'Heure' },
  { key: 'lastName', label: 'Nom' },
  { key: 'firstName', label: 'Prénom', hideOnMobile: true },
  { key: 'gender', label: 'Sexe', hideOnMobile: true },
  { key: 'university', label: 'Université' },
  { key: 'faculty', label: 'Faculté', hideOnMobile: true },
  { key: 'promotion', label: 'Promotion', hideOnMobile: true },
]

watch(
  () => checkIns.value.length,
  (count) => {
    if (count > lastCheckInCount.value && lastCheckInCount.value > 0) {
      const latest = checkIns.value[0]
      if (latest) {
        const snap = latest.snapshot ?? resolvePresenceCheckInSnapshot(latest.studentUserId)
        appToast.success(`Présence · ${snap.firstName} ${snap.lastName}`)
      }
    }
    lastCheckInCount.value = count
  },
)

const relaySuggestItems = computed((): SuggestItem[] => {
  const enrolled = session.value?.enrolledUserIds ?? []
  const activeIds = new Set(activeRelays.value.map((g) => g.userId))
  return enrolled
    .filter((id) => !activeIds.has(id))
    .map((id) => {
      const label = labelForUserId(id)
      return { value: id, label }
    })
    .filter((item) => {
      const q = relayQuery.value.trim().toLowerCase()
      if (!q) return true
      return item.label.toLowerCase().includes(q)
    })
})

onMounted(() => {
  if (!session.value || session.value.teacherId !== auth.currentUser?.id) {
    router.replace({ name: 'teacher-course', params: { id: classroomId } })
    return
  }
  void studentStore.syncCatalog()
  lastCheckInCount.value = checkIns.value.length
  timer = setInterval(() => {
    tick.value++
  }, 1000)
  syncTimer = setInterval(() => {
    presenceStore.reloadFromStorage()
  }, 2000)
  window.addEventListener('storage', onStorageSync)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (syncTimer) clearInterval(syncTimer)
  window.removeEventListener('storage', onStorageSync)
})

function closeSession() {
  if (!auth.currentUser) return
  presenceStore.closeSession(sessionId, auth.currentUser.id)
  appToast.success('Session de présence terminée.')
  tick.value++
}

function grantRelay() {
  if (!auth.currentUser || !selectedRelayUserId.value) return
  const uid = selectedRelayUserId.value
  const name = labelForUserId(uid)
  const result = presenceStore.grantRelay(sessionId, auth.currentUser.id, uid, name)
  if (!result.ok) {
    appToast.error(result.error)
    return
  }
  appToast.success(`Relais activé pour ${name}.`)
  selectedRelayUserId.value = null
  relayQuery.value = ''
}

function revokeRelay(userId: string) {
  if (!auth.currentUser) return
  presenceStore.revokeRelay(sessionId, auth.currentUser.id, userId)
  appToast.info('Relais coupé.')
}

function revokeAll() {
  if (!auth.currentUser) return
  presenceStore.revokeAllRelays(sessionId, auth.currentUser.id)
  appToast.info('Tous les relais sont désactivés.')
}

function openFullscreenQr() {
  const el = document.getElementById('presence-qr-stage')
  el?.requestFullscreen?.().catch(() => {})
}
</script>

<template>
  <div v-if="session" class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <RouterLink
          :to="{ name: 'teacher-course', params: { id: classroomId } }"
          class="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-accent mb-2"
        >
          <ArrowLeft class="w-4 h-4" />
          Retour salle
        </RouterLink>
        <p class="label-caps mb-1">Présence QR</p>
        <h1 class="font-display text-2xl text-ink">{{ session.classroomName }}</h1>
        <div class="mt-2 flex flex-wrap gap-2">
          <AppBadge :variant="session.status === 'open' ? 'success' : 'muted'">
            {{ session.status === 'open' ? 'En cours' : 'Terminée' }}
          </AppBadge>
          <span v-if="display && session.status === 'open'" class="text-sm text-ink-muted">
            Fin session · {{ display.sessionRemainingSeconds }} s
          </span>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton v-if="session.status === 'open'" variant="outline" size="sm" @click="openFullscreenQr">
          <Maximize2 class="w-4 h-4" />
          Plein écran QR
        </AppButton>
        <AppButton
          v-if="session.status === 'open'"
          variant="danger"
          size="sm"
          @click="closeSession"
        >
          <StopCircle class="w-4 h-4" />
          Terminer
        </AppButton>
      </div>
    </div>

    <div id="presence-qr-stage">
      <PresenceQrDisplay :display="display" />
    </div>

    <AppCard v-if="session.status === 'open'" class="p-5 space-y-4">
      <div class="flex items-center gap-2">
        <UserPlus class="w-5 h-5 text-accent" />
        <h2 class="font-semibold text-ink">Relais étudiants (CP)</h2>
      </div>
      <p class="text-sm text-ink-muted">
        Autorisez un inscrit à afficher le même QR dans les rangées (sans projecteur).
      </p>
      <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div class="flex-1">
          <AppSuggest
            v-model="relayQuery"
            v-model:selected-value="selectedRelayUserId"
            label="Rechercher un étudiant"
            placeholder="Nom…"
            :items="relaySuggestItems"
            @select="(item) => { selectedRelayUserId = item.value }"
          />
        </div>
        <AppButton :disabled="!selectedRelayUserId" @click="grantRelay">Autoriser relais</AppButton>
      </div>
      <PresenceRelayList :grants="activeRelays" @revoke="revokeRelay" />
      <AppButton v-if="activeRelays.length" size="sm" variant="outline" @click="revokeAll">
        Couper tous les relais
      </AppButton>
    </AppCard>

    <AppCard class="p-5 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Users class="w-5 h-5 text-accent" />
          <h2 class="font-semibold text-ink">Registre des présents · {{ checkIns.length }}</h2>
        </div>
        <span class="text-xs text-ink-muted inline-flex items-center gap-1.5">
          <Radio class="w-3.5 h-3.5 text-accent animate-pulse" />
          Mise à jour en temps réel
        </span>
      </div>
      <AppDataTable
        v-if="presentRows.length"
        :columns="presenceTableColumns"
        :rows="presentRows"
        :pageable="presentRows.length > 15"
        :page-size="20"
      />
      <p v-else class="text-sm text-ink-muted">Aucun pointage pour l’instant — les lignes apparaissent dès le premier scan.</p>
    </AppCard>

    <AppCard class="p-5 space-y-3">
      <button
        type="button"
        class="w-full flex items-center justify-between text-left"
        @click="showAttempts = !showAttempts"
      >
        <h2 class="font-semibold text-ink">Tentatives · {{ attempts.length }}</h2>
        <span class="text-sm text-ink-muted">{{ showAttempts ? 'Masquer' : 'Afficher' }}</span>
      </button>
      <template v-if="showAttempts">
        <div v-if="lateAttempts.length" class="space-y-2">
          <p class="text-xs label-caps text-warning">Après fin de session</p>
          <div
            v-for="a in lateAttempts"
            :key="a.id"
            class="p-3 border border-warning/30 bg-paper-warm text-sm"
          >
            <p class="font-medium">{{ labelForUserId(a.studentUserId) }}</p>
            <p class="text-ink-muted mt-1">{{ a.explanation }}</p>
          </div>
        </div>
        <p v-if="slotAttempts.length" class="text-sm text-ink-muted">
          QR expiré (slot) : {{ slotAttempts.length }} tentative(s) — voir logs agrégés.
        </p>
        <p v-if="!attempts.length" class="text-sm text-ink-muted">Aucune tentative refusée.</p>
      </template>
    </AppCard>
  </div>
</template>
