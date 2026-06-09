<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import { captureNetworkFingerprint } from '@/utils/localNetwork'
import { getCurrentWifiSsid } from '@/utils/wifiScan'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { Radio, ArrowRight, AlertCircle, CheckCircle2, Wifi } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const courseStore = useCourseStore()

const selectedCourseId = ref('')
const tunnelCode = ref('')
const error = ref('')
const success = ref('')
const joining = ref(false)

const shareCode = computed(() => {
  const param = route.params.shareCode as string | undefined
  if (param) return param.toUpperCase()
  const query = route.query.code as string | undefined
  return query?.toUpperCase() ?? ''
})

const sessionFromLink = computed(() => {
  if (!shareCode.value) return null
  const tunnel = courseStore.getByShareCode(shareCode.value)
  if (!tunnel) return null
  const course = courseStore.getById(tunnel.courseId)
  return course ? { tunnel, course } : null
})

const myGroups = computed(() =>
  auth.currentUser ? courseStore.getCoursesForStudent(auth.currentUser.id) : []
)

const tunnelActive = computed(() =>
  selectedCourseId.value ? !!courseStore.getActiveTunnel(selectedCourseId.value) : false
)

const profile = computed(() => {
  const user = auth.currentUser
  if (!user) return null
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    studentId: user.studentId ?? user.email,
  }
})

async function confirmJoin() {
  error.value = ''
  success.value = ''
  if (!auth.currentUser) return

  joining.value = true
  try {
    const [fingerprint, currentWifiSsid] = await Promise.all([
      captureNetworkFingerprint(),
      getCurrentWifiSsid(),
    ])

    let result:
      | { ok: true; courseName: string }
      | { ok: false; error: string }

    if (shareCode.value) {
      result = courseStore.joinTunnelByShareCode(
        shareCode.value,
        auth.currentUser.id,
        fingerprint,
        currentWifiSsid
      )
    } else {
      if (!selectedCourseId.value) {
        error.value = 'Sélectionnez votre groupe.'
        return
      }
      result = courseStore.joinTunnel(
        selectedCourseId.value,
        auth.currentUser.id,
        fingerprint,
        tunnelCode.value.trim() || undefined,
        currentWifiSsid
      )
    }

    if (!result.ok) {
      error.value = result.error
      return
    }

    success.value = `Présence enregistrée pour « ${result.courseName} ».`
    setTimeout(() => router.push('/student'), 2000)
  } finally {
    joining.value = false
  }
}

onMounted(() => {
  if (sessionFromLink.value) {
    selectedCourseId.value = sessionFromLink.value.course.id
    return
  }
  if (myGroups.value.length === 1) {
    selectedCourseId.value = myGroups.value[0].id
  }
})
</script>

<template>
  <div class="max-w-lg mx-auto px-4 sm:px-6 py-16">
    <div class="text-center mb-10">
      <div class="w-14 h-14 bg-accent flex items-center justify-center mx-auto mb-4">
        <Radio class="w-7 h-7 text-white" />
      </div>
      <h1 class="font-display text-3xl text-ink">Pointer ma présence</h1>
      <p class="mt-2 text-sm text-ink-muted max-w-md mx-auto">
        Connectez-vous au WiFi de la salle, puis validez. Seuls les appareils sur le même réseau local
        que l'enseignant peuvent pointer — un absent à distance est refusé.
      </p>
    </div>

    <AppCard title="Session de présence">
      <div class="space-y-4">
        <div v-if="myGroups.length === 0 && !sessionFromLink" class="text-center py-6 text-sm text-ink-muted">
          <p>Rejoignez d'abord la classe avec le lien de votre enseignant, ou ouvrez le lien présence partagé en salle.</p>
          <RouterLink to="/join/group" class="text-accent font-medium mt-2 inline-block">
            Rejoindre ma classe
          </RouterLink>
        </div>

        <template v-else-if="sessionFromLink || myGroups.length > 0">
          <div
            v-if="sessionFromLink"
            class="p-4 bg-accent-light border border-accent/20 space-y-2"
          >
            <AppBadge variant="success">Lien de présence</AppBadge>
            <p class="font-medium text-ink">{{ sessionFromLink.course.name }}</p>
            <p class="text-sm text-ink-muted flex items-center gap-2">
              <Wifi class="w-4 h-4" />
              WiFi requis : « {{ sessionFromLink.tunnel.wifiLabel }} »
            </p>
          </div>

          <div
            v-else-if="shareCode && !sessionFromLink"
            class="p-3 bg-danger-bg border border-danger/15 text-sm text-danger"
          >
            Lien de présence invalide ou session terminée.
          </div>

          <template v-if="!sessionFromLink">
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-ink-muted uppercase tracking-wide">Groupe</label>
              <select
                v-model="selectedCourseId"
                class="w-full px-3.5 py-2.5 border border-line bg-white text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              >
                <option value="" disabled>Choisir un groupe</option>
                <option v-for="g in myGroups" :key="g.id" :value="g.id">
                  {{ g.name }} · {{ g.subject }}
                </option>
              </select>
            </div>

            <div
              v-if="selectedCourseId && !tunnelActive"
              class="p-3 bg-warning-bg border border-warning/20 text-sm text-warning"
            >
              Aucune session ouverte pour ce groupe. Attendez la notification de l'enseignant.
            </div>
            <div
              v-else-if="selectedCourseId && tunnelActive"
              class="p-3 bg-accent-light border border-accent/20 text-sm text-accent"
            >
              Session active · connectez-vous au WiFi de la salle puis pointez.
            </div>

            <AppInput
              v-model="tunnelCode"
              label="Code tableau (optionnel)"
              placeholder="ABC123"
              hint="Si l'enseignant affiche un code au tableau"
              class="font-mono uppercase"
              @keyup.enter="confirmJoin"
            />
          </template>

          <div v-if="profile" class="p-3 bg-paper border border-line text-sm">
            <p class="text-xs text-ink-muted uppercase tracking-wide mb-1">Identité</p>
            <p class="font-medium">{{ profile.lastName }} {{ profile.firstName }}</p>
            <p class="text-xs font-mono text-ink-faint">{{ profile.studentId }}</p>
          </div>

          <AppButton
            class="w-full"
            :disabled="joining || (!sessionFromLink && !tunnelActive)"
            @click="confirmJoin"
          >
            {{ joining ? 'Vérification réseau…' : 'Pointer ma présence' }}
            <ArrowRight class="w-4 h-4" />
          </AppButton>
        </template>

        <div v-if="error" class="flex items-start gap-2 p-3 bg-danger-bg border border-danger/15 text-sm text-danger">
          <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
          {{ error }}
        </div>
        <div v-if="success" class="flex items-start gap-2 p-3 bg-accent-light border border-accent/20 text-sm text-accent">
          <CheckCircle2 class="w-4 h-4 flex-shrink-0 mt-0.5" />
          {{ success }}
        </div>
      </div>
    </AppCard>

    <p class="text-center text-sm text-ink-faint mt-8">
      <RouterLink to="/student" class="text-accent hover:text-accent-hover font-medium">
        Retour à l'espace étudiant
      </RouterLink>
    </p>
  </div>
</template>
