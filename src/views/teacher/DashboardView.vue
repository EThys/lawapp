<script setup lang="ts">

import { computed, watch, onMounted } from 'vue'

import { RouterLink } from 'vue-router'

import { useEvaluationStore } from '@/stores/evaluations'

import { useAuthStore } from '@/stores/auth'

import { useTeacherStore } from '@/stores/teachers'

import { useCourseStore } from '@/stores/courses'

import { useClassroomStore } from '@/stores/classrooms'

import AppButton from '@/components/ui/AppButton.vue'

import AppBadge from '@/components/ui/AppBadge.vue'

import AppCard from '@/components/ui/AppCard.vue'

import AppStatCard from '@/components/ui/AppStatCard.vue'


import DashboardPage from '@/components/layout/DashboardPage.vue'

import DashboardSection from '@/components/layout/DashboardSection.vue'

import AppAttendanceCalendar from '@/components/attendance/AppAttendanceCalendar.vue'

import PresenceSessionPanel from '@/components/teacher/PresenceSessionPanel.vue'

import { useTeacherAttendanceCalendar } from '@/composables/useTeacherAttendanceCalendar'

import { formatDate } from '@/utils/helpers'
import { isApiEnabled } from '@/config/features'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppShimmerStats from '@/components/loading/AppShimmerStats.vue'

import { getGroupShareUrl } from '@/utils/access'

import { ClipboardList, Clock, Users, Copy, Check, Radio, Link, Share2, ShieldAlert, CheckCircle, CalendarCheck, Plus } from '@lucide/vue'

import { ref } from 'vue'



const store = useEvaluationStore()

const auth = useAuthStore()

const teacherStore = useTeacherStore()

const courseStore = useCourseStore()
const classroomStore = useClassroomStore()



const copiedClassLink = ref(false)

const copiedClassCode = ref(false)

const classError = ref('')

const classSuccess = ref('')

const generatingClass = ref(false)

const sharingClass = ref(false)

const showClassroomSection = ref(false)

const presenceCourseFilter = ref('all')

const teacherId = computed(() => auth.currentUser?.id ?? '')

/** Afficher le bandeau seulement si la qualité enseignant n’est vraiment pas acquise. */
const needsTeacherProfile = computed(() => {
  if (!isApiEnabled()) return false
  const u = auth.currentUser
  if (u?.hasTeacherProfile || u?.teacherProfileId) return false
  if (auth.teacherProfile?.teacherId) return false
  if (teacherStore.myProfile?.teacherId) return false
  return true
})

onMounted(() => {
  if (isApiEnabled()) void teacherStore.loadMyProfile()
  if (isApiEnabled()) void store.syncFromApi()
  if (isApiEnabled()) void classroomStore.syncMine()
})

const { showShimmer: evaluationsShimmer } = useServerShimmer(computed(() => store.apiLoading))

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
  if (isApiEnabled()) {
    const api = classroomStore.myClassrooms[0]
    return api ? classroomStore.getMappedCourse(api.id) : null
  }
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
  auth.currentUser ? store.getTeacherEvaluationsSorted(auth.currentUser.id) : [],
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

  <DashboardPage>

    <DashboardSection spacing="loose">

    <AppCard
      v-if="needsTeacherProfile"
      v-reveal="98"
      class="mb-6 p-4 border-warning/30 bg-warning-bg/40"
    >
      <p class="text-sm text-ink">
        Complétez votre <strong>profil enseignant</strong> pour publier des évaluations sur le serveur.
      </p>
      <RouterLink to="/teacher/profile" class="inline-block mt-3">
        <AppButton size="sm">Configurer mon profil</AppButton>
      </RouterLink>
    </AppCard>

    <div v-reveal class="min-w-0">

      <p class="label-caps mb-2">Espace enseignant</p>

      <h1 class="font-display text-2xl sm:text-3xl text-ink tracking-tight break-words">

        Bonjour, {{ auth.currentUser?.firstName }}

      </h1>

      <p class="mt-1 text-sm text-ink-muted">

        {{ auth.currentUser?.institution || auth.currentUser?.email }}

        <span v-if="myClass" class="text-ink-faint"> · {{ myClass.name }}</span>

      </p>

    </div>

    </DashboardSection>



    <DashboardSection spacing="loose">

    <div v-reveal="100" class="dashboard-stats">

      <AppShimmerStats v-if="evaluationsShimmer" :count="3" :columns="3" />

      <template v-else>

      <RouterLink to="/teacher/evaluations" class="block min-w-0">
        <AppStatCard :value="stats.total" label="Évaluations" :icon="ClipboardList" :delay="0" />
      </RouterLink>

      <AppStatCard :value="stats.active" label="Actives" :icon="Clock" :delay="1" />

      <RouterLink to="/teacher/submissions" class="block min-w-0">
        <AppStatCard :value="stats.sessions" label="Soumissions" :icon="Radio" :delay="2" />
      </RouterLink>

      </template>

    </div>

    </DashboardSection>



    <DashboardSection>

    <AppCard

      v-reveal="90"

      title="Suivi des étudiants"

      subtitle="Réponses, triche et absences"

      hover

    >

      <div class="dashboard-tiles dashboard-tiles--4 mb-5">

        <RouterLink to="/teacher/evaluations" class="dashboard-tile hover:bg-accent-light/30 group">

          <div class="dashboard-tile__label">

            <ClipboardList class="w-4 h-4 text-accent" />

            <p class="dashboard-tile__caption">Évaluations</p>

          </div>

          <p class="dashboard-tile__value">{{ stats.total }}</p>

          <p class="dashboard-tile__hint group-hover:text-accent">Voir la liste</p>

        </RouterLink>

        <RouterLink to="/teacher/submissions" class="dashboard-tile hover:bg-accent-light/30 group">

          <div class="dashboard-tile__label">

            <CheckCircle class="w-4 h-4 text-accent" />

            <p class="dashboard-tile__caption">Soumissions</p>

          </div>

          <p class="dashboard-tile__value">{{ stats.submitted }}</p>

          <p class="dashboard-tile__hint group-hover:text-accent">Voir les copies rendues</p>

        </RouterLink>

        <RouterLink to="/teacher/history?tab=cheaters" class="dashboard-tile hover:bg-danger-bg/40 group">

          <div class="dashboard-tile__label">

            <ShieldAlert class="w-4 h-4 text-danger" />

            <p class="dashboard-tile__caption">Alertes triche</p>

          </div>

          <p class="dashboard-tile__value">{{ stats.cheaters }}</p>

          <p class="dashboard-tile__hint group-hover:text-danger">Violations & échecs</p>

        </RouterLink>

        <RouterLink to="/teacher/attendance" class="dashboard-tile hover:bg-paper group">

          <div class="dashboard-tile__label">

            <Users class="w-4 h-4 text-ink-muted" />

            <p class="dashboard-tile__caption">Absences</p>

          </div>

          <p class="dashboard-tile__value">{{ absenceRows.length }}</p>

          <p class="dashboard-tile__hint group-hover:text-accent">{{ totalAbsences }} absence(s) · calendrier</p>

        </RouterLink>

      </div>

    </AppCard>

    </DashboardSection>



    <DashboardSection v-if="myClass">

    <AppCard

      v-reveal="95"

      title="Calendrier des présences"

      subtitle="Présences et absences par séance"

      hover

    >

      <div v-if="absenceRows.length === 0" class="text-center py-10 px-2 text-sm text-ink-muted">

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

        <RouterLink to="/teacher/attendance">

          <AppButton variant="outline" size="sm">

            <CalendarCheck class="w-4 h-4" />

            Historique complet des présences

          </AppButton>

        </RouterLink>

      </div>

    </AppCard>

    </DashboardSection>



    <DashboardSection>

    <AppCard

      v-reveal="250"

      title="Salle de classe"

      subtitle="Optionnel - présence et groupe d'étudiants"

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

          <div class="flex flex-wrap gap-2">
            <RouterLink to="/teacher/courses?create=1">
              <AppButton variant="outline" size="sm">
                <Plus class="w-4 h-4" />
                Créer une salle
              </AppButton>
            </RouterLink>
            <RouterLink :to="`/teacher/courses/${myClass.id}`">
              <AppButton variant="outline" size="sm">Gérer la salle</AppButton>
            </RouterLink>
          </div>

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



            <div class="space-y-3">
              <p class="text-sm font-medium text-ink">Lien classe</p>

              <div v-if="!myClass.enrollmentPublishedAt">
                <AppButton :disabled="generatingClass" variant="outline" size="sm" @click="generateClassLink">
                  <Link class="w-4 h-4" />
                  {{ generatingClass ? 'Génération…' : 'Générer le code' }}
                </AppButton>
              </div>

              <template v-else>
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex items-center px-2.5 py-1.5 bg-accent-light border border-accent/20 font-mono text-sm font-semibold text-accent tracking-wider"
                  >
                    {{ myClass.enrollmentCode }}
                  </span>
                  <AppButton variant="outline" size="sm" class="!min-h-9 h-9" @click="copyClassCode">
                    <Check v-if="copiedClassCode" class="w-4 h-4 text-accent" />
                    <Copy v-else class="w-4 h-4" />
                    Copier
                  </AppButton>
                  <AppButton variant="outline" size="sm" class="!min-h-9 h-9" @click="copyClassLink">
                    <Check v-if="copiedClassLink" class="w-4 h-4 text-accent" />
                    <Copy v-else class="w-4 h-4" />
                    Lien
                  </AppButton>
                  <AppButton
                    size="sm"
                    class="!min-h-9 h-9"
                    :disabled="sharingClass || !!myClass.enrollmentSharedAt"
                    @click="shareClassLink"
                  >
                    <Share2 class="w-4 h-4" />
                    {{ myClass.enrollmentSharedAt ? 'Partagé' : sharingClass ? '…' : 'Partager' }}
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

    </DashboardSection>

  </DashboardPage>

</template>

