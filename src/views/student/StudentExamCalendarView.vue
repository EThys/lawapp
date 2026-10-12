<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEvaluationStore } from '@/stores/evaluations'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppAttendanceCalendar from '@/components/attendance/AppAttendanceCalendar.vue'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppShimmerList from '@/components/loading/AppShimmerList.vue'
import { formatEvaluationPeriod, formatMinutes } from '@/utils/helpers'
import {
  buildExamCalendarIcs,
  buildStudentExamCalendarEvents,
  downloadTextFile,
  examEventsToCalendarMarks,
  googleCalendarUrlForEvent,
  SOURCE_LABELS,
  type ExamCalendarSource,
  type StudentExamCalendarEvent,
} from '@/utils/studentExamCalendar'
import { formatCalendarDayLong } from '@/utils/attendanceCalendar'
import { appToast } from '@/utils/toast'
import {
  CalendarDays,
  Download,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Info,
} from '@lucide/vue'
import type { Evaluation } from '@/types'

const auth = useAuthStore()
const evalStore = useEvaluationStore()

const selectedDate = ref<string | null>(null)

const { showShimmer: loadingShimmer } = useServerShimmer(computed(() => evalStore.apiLoading))

onMounted(async () => {
  await evalStore.syncStudentCatalog().catch(() => undefined)
})

const answerableEvaluations = computed(() =>
  auth.currentUser ? evalStore.getCalendarEvaluationsForStudent(auth.currentUser.id) : [],
)

function sourceForEvaluation(e: Evaluation): ExamCalendarSource {
  const studentId = auth.currentUser?.id
  if (!studentId) return 'other'
  if (evalStore.getPersonalizedEvaluationsForStudent(studentId).some((x) => x.id === e.id)) {
    return 'for_you'
  }
  if (evalStore.getCohortEvaluationsForStudent(studentId).some((x) => x.id === e.id)) {
    return 'cohort'
  }
  if (evalStore.getCatalogEvaluationsForStudent().some((x) => x.id === e.id)) {
    return 'catalog'
  }
  return 'other'
}

const sourceById = computed(() => {
  const map = new Map<string, ExamCalendarSource>()
  for (const e of answerableEvaluations.value) {
    map.set(e.id, sourceForEvaluation(e))
  }
  return map
})

const calendarEvents = computed(() =>
  buildStudentExamCalendarEvents(answerableEvaluations.value, sourceById.value),
)

const unscheduledEvaluations = computed(() => {
  const scheduledIds = new Set(calendarEvents.value.map((e) => e.evaluationId))
  return answerableEvaluations.value.filter((e) => !scheduledIds.has(e.id))
})

const calendarMarks = computed(() => examEventsToCalendarMarks(calendarEvents.value))

const eventsOnSelectedDay = computed((): StudentExamCalendarEvent[] => {
  if (!selectedDate.value) return []
  return calendarEvents.value.filter((e) => e.dateKeys.includes(selectedDate.value!))
})

const upcomingEvents = computed(() => {
  const now = Date.now()
  return calendarEvents.value.filter((e) => e.end.getTime() >= now).slice(0, 8)
})

function downloadIcs() {
  if (!calendarEvents.value.length) {
    appToast.warning('Aucune épreuve datée à exporter.')
    return
  }
  const ics = buildExamCalendarIcs(calendarEvents.value, window.location.origin)
  downloadTextFile(ics, 'lawapp-epreuves.ics', 'text/calendar;charset=utf-8')
  appToast.success('Fichier .ics téléchargé — importez-le dans Google Calendar ou Outlook.')
}

function openGoogle(event: StudentExamCalendarEvent) {
  window.open(googleCalendarUrlForEvent(event, window.location.origin), '_blank', 'noopener')
}

async function refresh() {
  await evalStore.syncStudentCatalog().catch(() => undefined)
  appToast.success('Calendrier actualisé.')
}

function formatEventWindow(ev: StudentExamCalendarEvent): string {
  const opts: Intl.DateTimeFormatOptions = {
    dateStyle: 'short',
    timeStyle: 'short',
  }
  return `${ev.start.toLocaleString('fr-FR', opts)} → ${ev.end.toLocaleString('fr-FR', opts)}`
}
</script>

<template>
  <DashboardPage>
    <RouterLink
      to="/student"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6 transition-colors min-h-11"
    >
      <ArrowRight class="w-4 h-4 rotate-180" />
      Retour au tableau de bord
    </RouterLink>

    <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
      <div>
        <p class="label-caps mb-2">Planning</p>
        <h1 class="font-display text-2xl sm:text-3xl text-ink tracking-tight">Calendrier des épreuves</h1>
        <p class="mt-1 text-sm text-ink-muted">
          Vue mensuelle, export iCal (.ics) et ajout Google Calendar.
        </p>
      </div>
      <AppButton variant="outline" size="sm" :disabled="evalStore.apiLoading" @click="refresh">
        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': evalStore.apiLoading }" />
        Actualiser
      </AppButton>
    </div>

    <AppShimmerList v-if="loadingShimmer" variant="row" :count="4" />

    <div v-else class="space-y-8">
      <AppCard class="p-5 space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex gap-3">
            <CalendarDays class="w-6 h-6 text-accent shrink-0 mt-0.5" />
            <div>
              <h2 class="font-semibold text-ink">Synchroniser votre agenda</h2>
              <p class="text-sm text-ink-muted mt-1 max-w-xl">
                Téléchargez un fichier <strong class="font-medium text-ink">.ics</strong> (iCal) pour
                Google Calendar, Outlook ou Apple Calendar. Les épreuves sans dates de publication n’apparaissent
                pas ici — consultez le tableau de bord.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <AppButton size="sm" variant="outline" @click="downloadIcs">
              <Download class="w-4 h-4" />
              Télécharger .ics
            </AppButton>
          </div>
        </div>
        <p class="text-xs text-ink-faint flex items-start gap-2">
          <Info class="w-4 h-4 shrink-0 mt-0.5" />
          Abonnement automatique (flux URL) : prévu avec l’API
          <code class="text-[10px] bg-paper-warm px-1">GET …/students/me/evaluations/calendar.ics</code>
          — réimportez le .ics après chaque sync en attendant.
        </p>
      </AppCard>

      <div class="grid lg:grid-cols-5 gap-6">
        <AppCard class="lg:col-span-3 p-4 sm:p-6" :hover="false">
          <AppAttendanceCalendar
            v-model:selected-date="selectedDate"
            :marks="calendarMarks"
            :show-month-stats="true"
          />
        </AppCard>

        <div class="lg:col-span-2 space-y-4">
          <AppCard class="p-5 space-y-4" :hover="false">
            <h3 class="font-semibold text-ink">
              {{
                selectedDate
                  ? formatCalendarDayLong(selectedDate)
                  : 'Prochaines épreuves'
              }}
            </h3>

            <div v-if="selectedDate && eventsOnSelectedDay.length" class="space-y-3">
              <div
                v-for="ev in eventsOnSelectedDay"
                :key="ev.evaluationId"
                class="p-3 border border-line space-y-2"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium text-sm text-ink">{{ ev.title }}</p>
                  <AppBadge variant="brand">{{ SOURCE_LABELS[ev.source] }}</AppBadge>
                </div>
                <p class="text-xs text-ink-muted">{{ formatEventWindow(ev) }} · {{ formatMinutes(
                  Math.round((ev.end.getTime() - ev.start.getTime()) / 60000),
                ) }}</p>
                <div class="flex flex-wrap gap-2">
                  <RouterLink :to="ev.joinPath">
                    <AppButton size="sm">
                      Ouvrir
                      <ArrowRight class="w-4 h-4" />
                    </AppButton>
                  </RouterLink>
                  <AppButton size="sm" variant="outline" @click="openGoogle(ev)">
                    <ExternalLink class="w-4 h-4" />
                    Google
                  </AppButton>
                </div>
              </div>
            </div>

            <div v-else-if="!selectedDate && upcomingEvents.length" class="space-y-3">
              <div
                v-for="ev in upcomingEvents"
                :key="ev.evaluationId"
                class="p-3 border border-line space-y-1"
              >
                <p class="font-medium text-sm text-ink">{{ ev.title }}</p>
                <p class="text-xs text-ink-muted">{{ formatEventWindow(ev) }}</p>
              </div>
            </div>

            <p v-else class="text-sm text-ink-muted">
              {{
                selectedDate
                  ? 'Aucune épreuve ce jour-là.'
                  : 'Aucune épreuve datée à venir.'
              }}
            </p>
          </AppCard>

          <AppCard v-if="unscheduledEvaluations.length" class="p-5 space-y-3" :hover="false">
            <h3 class="font-semibold text-ink">Sans créneau publié</h3>
            <p class="text-xs text-ink-muted">
              Pas de dates « disponible du / au » — restent accessibles depuis le dashboard.
            </p>
            <ul class="space-y-2">
              <li
                v-for="e in unscheduledEvaluations.slice(0, 6)"
                :key="e.id"
                class="text-sm flex justify-between gap-2"
              >
                <span class="truncate">{{ e.title }}</span>
                <RouterLink
                  :to="`/student?code=${encodeURIComponent(e.code)}`"
                  class="text-accent text-xs shrink-0"
                >
                  Ouvrir
                </RouterLink>
              </li>
            </ul>
          </AppCard>
        </div>
      </div>

      <AppCard class="p-5" :hover="false">
        <h3 class="font-semibold text-ink mb-3">Liste complète (datées)</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-ink-muted border-b border-line">
                <th class="py-2 pr-4">Épreuve</th>
                <th class="py-2 pr-4 hidden sm:table-cell">Source</th>
                <th class="py-2 pr-4">Période</th>
                <th class="py-2 text-right">Agenda</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ev in calendarEvents"
                :key="ev.evaluationId"
                class="border-b border-line/60"
              >
                <td class="py-3 pr-4">
                  <p class="font-medium text-ink">{{ ev.title }}</p>
                  <p class="text-xs text-ink-muted">{{ ev.subject }}</p>
                </td>
                <td class="py-3 pr-4 hidden sm:table-cell">
                  <AppBadge variant="muted">{{ SOURCE_LABELS[ev.source] }}</AppBadge>
                </td>
                <td class="py-3 pr-4 text-ink-muted whitespace-nowrap">
                  {{
                    formatEvaluationPeriod({
                      availableFrom: ev.start.toISOString(),
                      availableUntil: ev.end.toISOString(),
                    })
                  }}
                </td>
                <td class="py-3 text-right">
                  <AppButton size="sm" variant="outline" @click="openGoogle(ev)">
                    Google
                  </AppButton>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!calendarEvents.length" class="text-sm text-ink-muted py-4">
            Aucune épreuve avec dates. Demandez à vos enseignants de renseigner les créneaux de publication.
          </p>
        </div>
      </AppCard>
    </div>
  </DashboardPage>
</template>
