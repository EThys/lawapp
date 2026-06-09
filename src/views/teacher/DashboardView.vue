<script setup lang="ts">

import { computed, watch } from 'vue'

import { RouterLink } from 'vue-router'

import { useEvaluationStore } from '@/stores/evaluations'

import { useAuthStore } from '@/stores/auth'

import { useCourseStore } from '@/stores/courses'

import AppButton from '@/components/ui/AppButton.vue'

import AppBadge from '@/components/ui/AppBadge.vue'

import AppCard from '@/components/ui/AppCard.vue'

import AppStatCard from '@/components/ui/AppStatCard.vue'

import AppEmptyState from '@/components/ui/AppEmptyState.vue'

import AppAttendanceCalendar from '@/components/attendance/AppAttendanceCalendar.vue'

import PresenceSessionPanel from '@/components/teacher/PresenceSessionPanel.vue'

import { useTeacherAttendanceCalendar } from '@/composables/useTeacherAttendanceCalendar'

import { EVALUATION_TYPE_LABELS, type EvaluationStatus } from '@/types'

import { formatDate, formatEvaluationPeriod } from '@/utils/helpers'

import { getGroupShareUrl } from '@/utils/access'

import { Plus, ClipboardList, Trash2, Eye, Clock, Users, Copy, Check, Radio, Link, Share2, History, ShieldAlert, CheckCircle, CalendarCheck } from '@lucide/vue'

import { ref } from 'vue'



const store = useEvaluationStore()

const auth = useAuthStore()

const courseStore = useCourseStore()



const copiedClassLink = ref(false)

const copiedClassCode = ref(false)

const classError = ref('')

const classSuccess = ref('')

const generatingClass = ref(false)

const sharingClass = ref(false)

const showClassroomSection = ref(false)

const presenceCourseFilter = ref('all')

const teacherId = computed(() => auth.currentUser?.id ?? '')

const teacherAttendanceRecords = computed(() =>
  teacherId.value ? courseStore.getAttendanceHistoryForTeacher(teacherId.value) : []
)

const {
  selectedDate: selectedPresenceDate,
  absenceRows,
  presenceCalendarMarks,
  absenceRowForMark,
  totalAbsences,
} = useTeacherAttendanceCalendar({
  attendanceRecords: teacherAttendanceRecords,
  courseFilter: presenceCourseFilter,
  getCourseById: (id) => courseStore.getById(id),
  getUserById: (id) => auth.getUserById(id),
})

const myClass = computed(() => {

  if (!auth.currentUser) return null

  const courses = courseStore.getCoursesForTeacher(auth.currentUser.id)

  return courses[0] ?? null

})

watch(
  myClass,
  (course) => {
    if (course && course.studentUserIds.length > 0) {
      showClassroomSection.value = true
    }
  },
  { immediate: true }
)



const myEvaluations = computed(() =>

  auth.currentUser ? store.getEvaluationsForTeacher(auth.currentUser.id) : []

)



const stats = computed(() => {

  const evals = myEvaluations.value

  const evalIds = new Set(evals.map((e) => e.id))

  const sessions = store.sessions.filter((s) => evalIds.has(s.evaluationId))

  return {

    total: evals.length,

    active: evals.filter((e) => e.status === 'active').length,

    sessions: sessions.length,

    submitted: sessions.filter((s) => s.status === 'submitted').length,

    cheaters: sessions.filter((s) => s.violations.length > 0 || s.status === 'failed').length,

  }

})



function statusVariant(status: EvaluationStatus) {

  const map = { draft: 'muted' as const, active: 'success' as const, closed: 'danger' as const }

  return map[status]

}



function statusLabel(status: EvaluationStatus) {

  const map = { draft: 'Brouillon', active: 'Active', closed: 'Fermée' }

  return map[status]

}



function isScheduled(evaluation: { availableFrom?: string | null; availableUntil?: string | null }) {

  return !!(evaluation.availableFrom || evaluation.availableUntil)

}



function deleteEval(id: string) {

  if (confirm('Supprimer cette évaluation et toutes ses sessions ?')) {

    store.deleteEvaluation(id)

  }

}



function createClassroom() {

  if (!auth.currentUser) return

  courseStore.createCourse({

    teacherId: auth.currentUser.id,

    teacherName: `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,

    name: 'Ma salle',

    subject: 'Général',

  })

  showClassroomSection.value = true

}



function copyClassLink() {

  if (!myClass.value) return

  navigator.clipboard.writeText(getGroupShareUrl(myClass.value.enrollmentCode))

  copiedClassLink.value = true

  setTimeout(() => (copiedClassLink.value = false), 2000)

}



function copyClassCode() {

  if (!myClass.value) return

  navigator.clipboard.writeText(myClass.value.enrollmentCode)

  copiedClassCode.value = true

  setTimeout(() => (copiedClassCode.value = false), 2000)

}



function generateClassLink() {

  if (!myClass.value) return

  classError.value = ''

  classSuccess.value = ''

  generatingClass.value = true

  const result = courseStore.generateClassEnrollment(myClass.value.id)

  generatingClass.value = false

  if (!result.ok) {

    classError.value = result.error

    return

  }

  classSuccess.value = 'Lien classe généré.'

}



function shareClassLink() {

  if (!myClass.value) return

  classError.value = ''

  classSuccess.value = ''

  sharingClass.value = true

  const result = courseStore.shareClassEnrollment(myClass.value.id)

  sharingClass.value = false

  if (!result.ok) {

    classError.value = result.error

    return

  }

  classSuccess.value = 'Partagé à votre salle.'

}

</script>



<template>

  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

    <div v-reveal class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">

      <div>

        <p class="label-caps mb-2">Espace enseignant</p>

        <h1 class="font-display text-3xl text-ink tracking-tight">

          Bonjour, {{ auth.currentUser?.firstName }}

        </h1>

        <p class="mt-1 text-sm text-ink-muted">

          {{ auth.currentUser?.institution || auth.currentUser?.email }}

          <span v-if="myClass" class="text-ink-faint"> · {{ myClass.name }}</span>

        </p>

      </div>

      <div class="flex flex-wrap gap-2">

        <RouterLink v-if="myClass" :to="`/teacher/courses/${myClass.id}`">

          <AppButton variant="outline" class="hover-lift">

            <Users class="w-4 h-4" />

            Ma salle

          </AppButton>

        </RouterLink>

        <RouterLink to="/teacher/history">

          <AppButton variant="outline" class="hover-lift">

            <History class="w-4 h-4" />

            Suivi & historique

          </AppButton>

        </RouterLink>

        <RouterLink to="/teacher/create">

          <AppButton class="hover-lift animate-fade-up stagger-3">

            <Plus class="w-4 h-4" />

            Nouvelle évaluation

          </AppButton>

        </RouterLink>

      </div>

    </div>



    <div v-reveal="100" class="grid sm:grid-cols-3 gap-px bg-line border border-line mb-10">

      <AppStatCard :value="stats.total" label="Évaluations" :icon="ClipboardList" :delay="0" />

      <AppStatCard :value="stats.active" label="Actives" :icon="Clock" :delay="1" />

      <AppStatCard :value="stats.sessions" label="Sessions" :icon="Radio" :delay="2" />

    </div>



    <AppCard

      v-reveal="90"

      title="Suivi des étudiants"

      subtitle="Réponses, triche et absences"

      class="mb-10"

      hover

    >

      <div class="grid sm:grid-cols-3 gap-4 mb-5">

        <RouterLink to="/teacher/history?tab=submitted" class="p-4 border border-line bg-paper-warm hover:bg-accent-light/30 transition-colors group">

          <div class="flex items-center gap-2 mb-2">

            <CheckCircle class="w-4 h-4 text-accent" />

            <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Soumissions</p>

          </div>

          <p class="text-2xl font-semibold text-ink tabular-nums">{{ stats.submitted }}</p>

          <p class="text-xs text-ink-muted mt-1 group-hover:text-accent">Voir les copies rendues</p>

        </RouterLink>

        <RouterLink to="/teacher/history?tab=cheaters" class="p-4 border border-line bg-paper-warm hover:bg-danger-bg/40 transition-colors group">

          <div class="flex items-center gap-2 mb-2">

            <ShieldAlert class="w-4 h-4 text-danger" />

            <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Alertes triche</p>

          </div>

          <p class="text-2xl font-semibold text-ink tabular-nums">{{ stats.cheaters }}</p>

          <p class="text-xs text-ink-muted mt-1 group-hover:text-danger">Violations & échecs</p>

        </RouterLink>

        <RouterLink to="/teacher/history?tab=absences" class="p-4 border border-line bg-paper-warm hover:bg-paper transition-colors group">

          <div class="flex items-center gap-2 mb-2">

            <Users class="w-4 h-4 text-ink-muted" />

            <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Absences</p>

          </div>

          <p class="text-2xl font-semibold text-ink tabular-nums">{{ absenceRows.length }}</p>

          <p class="text-xs text-ink-muted mt-1 group-hover:text-accent">{{ totalAbsences }} absence(s) · calendrier</p>

        </RouterLink>

      </div>

      <RouterLink to="/teacher/history">

        <AppButton variant="outline" size="sm">

          <History class="w-4 h-4" />

          Ouvrir le suivi complet

        </AppButton>

      </RouterLink>

    </AppCard>



    <AppCard

      v-if="myClass"

      v-reveal="95"

      title="Calendrier des présences"

      subtitle="Présences et absences par séance"

      class="mb-10"

      hover

    >

      <div v-if="absenceRows.length === 0" class="text-center py-10 text-sm text-ink-muted">

        Ouvrez une session de présence pour commencer à enregistrer les séances.

      </div>

      <AppAttendanceCalendar

        v-else

        v-model:selected-date="selectedPresenceDate"

        :marks="presenceCalendarMarks"

      >

        <template #detail="{ marks }">

          <div class="space-y-4 mt-2">

            <article

              v-for="mark in marks"

              :key="mark.id"

              class="border border-line p-4 bg-white text-sm"

            >

              <template v-if="absenceRowForMark(mark)">

                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">

                  <div>

                    <p class="font-medium text-ink">{{ mark.title }}</p>

                    <p class="text-xs text-ink-muted mt-0.5">{{ mark.subtitle }}</p>

                  </div>

                  <div class="flex flex-wrap gap-2">

                    <AppBadge variant="success">

                      {{ absenceRowForMark(mark)!.presentCount }} présent(s)

                    </AppBadge>

                    <AppBadge

                      v-if="absenceRowForMark(mark)!.absentCount > 0"

                      variant="danger"

                    >

                      {{ absenceRowForMark(mark)!.absentCount }} absent(s)

                    </AppBadge>

                  </div>

                </div>

                <div

                  v-if="absenceRowForMark(mark)!.absentStudents.length > 0"

                  class="mb-3"

                >

                  <p class="text-xs font-semibold uppercase tracking-wide text-danger mb-2">

                    Absents

                  </p>

                  <ul class="space-y-1 text-ink-muted">

                    <li

                      v-for="student in absenceRowForMark(mark)!.absentStudents"

                      :key="student.userId"

                    >

                      {{ student.name }}

                      <span class="text-ink-faint font-mono text-xs">· {{ student.studentId }}</span>

                    </li>

                  </ul>

                </div>

                <details>

                  <summary class="text-accent font-medium cursor-pointer hover:text-accent-hover">

                    Voir les présents ({{ absenceRowForMark(mark)!.presentCount }})

                  </summary>

                  <ul class="mt-3 space-y-1 text-ink-muted">

                    <li

                      v-for="record in absenceRowForMark(mark)!.presentRecords"

                      :key="record.id"

                    >

                      {{

                        (() => {

                          const u = auth.getUserById(record.studentUserId)

                          return u ? `${u.lastName} ${u.firstName}` : 'Étudiant'

                        })()

                      }}

                      <span class="text-ink-faint text-xs">· {{ formatDate(record.markedAt) }}</span>

                    </li>

                  </ul>

                </details>

              </template>

            </article>

          </div>

        </template>

      </AppAttendanceCalendar>

      <div v-if="absenceRows.length > 0" class="mt-5 pt-4 border-t border-line">

        <RouterLink to="/teacher/history?tab=absences">

          <AppButton variant="outline" size="sm">

            <CalendarCheck class="w-4 h-4" />

            Historique complet des présences

          </AppButton>

        </RouterLink>

      </div>

    </AppCard>



    <AppEmptyState

      v-if="myEvaluations.length === 0"

      v-reveal="200"

      :icon="ClipboardList"

      title="Aucune évaluation"

      description="Créez votre première épreuve et partagez le code d'accès à vos étudiants. La salle de classe est optionnelle."

      action-label="Créer une évaluation"

      action-to="/teacher/create"

    />



    <div v-else v-reveal="150" class="space-y-px border border-line bg-line mb-10">

      <div

        v-for="(evaluation, i) in myEvaluations"

        :key="evaluation.id"

        class="bg-white p-5 sm:p-6 transition-all duration-300 hover:bg-accent-light/20 hover:pl-7 group"

        :style="{ animationDelay: `${i * 50}ms` }"

      >

        <div class="flex flex-col lg:flex-row lg:items-center gap-4">

          <div class="flex-1 min-w-0">

            <div class="flex items-center gap-2 flex-wrap mb-1">

              <h3 class="font-medium text-ink truncate group-hover:text-accent transition-colors">{{ evaluation.title }}</h3>

              <AppBadge :variant="statusVariant(evaluation.status)">

                {{ statusLabel(evaluation.status) }}

              </AppBadge>

              <AppBadge variant="brand">

                {{ EVALUATION_TYPE_LABELS[evaluation.type] }}

              </AppBadge>

              <AppBadge v-if="isScheduled(evaluation) || evaluation.availableUntil" variant="warning">

                {{ formatEvaluationPeriod(evaluation) }}

              </AppBadge>

              <AppBadge v-if="!evaluation.courseId" variant="muted">Ouverte</AppBadge>

            </div>

            <p class="text-xs text-ink-muted">

              {{ evaluation.subject }} · {{ evaluation.durationMinutes }} min ·

              {{ evaluation.questions.length }} q.

              <span v-if="evaluation.sharedToClassAt" class="font-mono font-semibold text-accent">· {{ evaluation.code }}</span>

              <span v-else class="text-ink-faint">· Code non publié</span>

            </p>

            <p class="text-[11px] text-ink-faint mt-1">{{ formatDate(evaluation.createdAt) }}</p>

          </div>



          <div class="flex items-center gap-2 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">

            <RouterLink :to="`/teacher/evaluation/${evaluation.id}`">

              <AppButton variant="outline" size="sm" class="hover-lift">

                <Eye class="w-4 h-4" />

                Détails

              </AppButton>

            </RouterLink>

            <AppButton variant="ghost" size="sm" @click="deleteEval(evaluation.id)">

              <Trash2 class="w-4 h-4 text-danger" />

            </AppButton>

          </div>

        </div>

      </div>

    </div>



    <AppCard

      v-reveal="250"

      title="Salle de classe"

      subtitle="Optionnel — présence et groupe d'étudiants"

      :hover="false"

    >

      <div v-if="!myClass" class="space-y-4">

        <p class="text-sm text-ink-muted">

          Vous pouvez créer des évaluations sans salle. Créez une salle uniquement si vous souhaitez

          gérer un groupe d'étudiants ou la présence en WiFi.

        </p>

        <AppButton variant="outline" @click="createClassroom">

          <Users class="w-4 h-4" />

          Créer une salle (optionnel)

        </AppButton>

      </div>



      <div v-else class="space-y-6">

        <div class="flex flex-wrap items-center justify-between gap-3">

          <p class="text-sm text-ink-muted">

            {{ myClass.name }} · {{ myClass.studentUserIds.length }} étudiant(s)

          </p>

          <RouterLink :to="`/teacher/courses/${myClass.id}`">

            <AppButton variant="outline" size="sm">Gérer la salle</AppButton>

          </RouterLink>

        </div>



        <details class="group" :open="showClassroomSection">

          <summary class="text-sm font-medium text-accent cursor-pointer hover:text-accent-hover">

            Présence et lien classe

          </summary>

          <div class="mt-6 space-y-8 pt-6 border-t border-line">

            <div>

              <p class="text-sm font-medium text-ink mb-4">Présence en salle</p>

              <PresenceSessionPanel :course-id="myClass.id" :member-count="myClass.studentUserIds.length" />

            </div>



            <div class="space-y-4">

              <p class="text-sm font-medium text-ink">Lien classe</p>

              <p class="text-sm text-ink-muted">

                Générez un code pour que vos étudiants rejoignent la salle.

              </p>



              <div v-if="!myClass.enrollmentPublishedAt">

                <AppButton :disabled="generatingClass" variant="outline" size="sm" @click="generateClassLink">

                  <Link class="w-4 h-4" />

                  {{ generatingClass ? 'Génération…' : 'Générer le lien classe' }}

                </AppButton>

              </div>



              <template v-else>

                <div class="p-4 bg-accent-light border border-accent/20">

                  <p class="text-xs text-ink-muted uppercase tracking-wide mb-1">Code classe</p>

                  <p class="font-mono text-2xl font-semibold text-accent tracking-widest">{{ myClass.enrollmentCode }}</p>

                </div>

                <div class="flex flex-wrap gap-2">

                  <AppButton variant="outline" size="sm" @click="copyClassCode">

                    <Check v-if="copiedClassCode" class="w-4 h-4 text-accent" />

                    <Copy v-else class="w-4 h-4" />

                    Copier le code

                  </AppButton>

                  <AppButton variant="outline" size="sm" @click="copyClassLink">

                    <Check v-if="copiedClassLink" class="w-4 h-4 text-accent" />

                    <Copy v-else class="w-4 h-4" />

                    Copier le lien

                  </AppButton>

                  <AppButton

                    size="sm"

                    :disabled="sharingClass || !!myClass.enrollmentSharedAt"

                    @click="shareClassLink"

                  >

                    <Share2 class="w-4 h-4" />

                    {{ myClass.enrollmentSharedAt ? 'Partagé à ma salle' : sharingClass ? 'Partage…' : 'Partager à ma salle' }}

                  </AppButton>

                </div>

              </template>



              <p v-if="classError" class="text-sm text-danger">{{ classError }}</p>

              <p v-if="classSuccess" class="text-sm text-accent">{{ classSuccess }}</p>

            </div>

          </div>

        </details>

      </div>

    </AppCard>

  </div>

</template>

