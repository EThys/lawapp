<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppAttendanceCalendar from '@/components/attendance/AppAttendanceCalendar.vue'
import PresenceSessionPanel from '@/components/teacher/PresenceSessionPanel.vue'
import type { AttendanceCalendarMark } from '@/utils/attendanceCalendar'
import { getGroupShareUrl, getTodayDateString } from '@/utils/access'
import { formatDate } from '@/utils/helpers'
import type { User } from '@/types/auth'
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  UserCheck,
  UserPlus,
  Link,
  Share2,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const courseStore = useCourseStore()

const courseId = route.params.id as string
const course = computed(() => courseStore.getById(courseId))
const today = getTodayDateString()

const copiedClassCode = ref(false)
const copiedClassLink = ref(false)
const classError = ref('')
const classSuccess = ref('')
const generatingClass = ref(false)
const sharingClass = ref(false)

const addQuery = ref('')
const addError = ref('')
const addSuccess = ref('')
const searchResults = ref<User[]>([])

const enrolledStudents = computed(() => {
  if (!course.value) return []
  return course.value.studentUserIds
    .map((id) => auth.getUserById(id))
    .filter(Boolean)
    .map((u) => u!)
})

const todayAttendance = computed(() => courseStore.getAttendanceForCourse(courseId, today))
const presentStudentIds = computed(() => new Set(todayAttendance.value.map((a) => a.studentUserId)))

const selectedPresenceDate = ref<string | null>(null)

const attendanceHistory = computed(() => courseStore.getAttendanceHistoryForCourse(courseId))

interface CourseDayRow {
  key: string
  date: string
  presentCount: number
  absentCount: number
  presentRecords: ReturnType<typeof courseStore.getAttendanceHistoryForCourse>
  absentStudents: { userId: string; name: string; studentId: string }[]
}

const courseDayRows = computed((): CourseDayRow[] => {
  if (!course.value) return []
  const grouped = new Map<string, typeof attendanceHistory.value>()
  for (const record of attendanceHistory.value) {
    const list = grouped.get(record.date) ?? []
    list.push(record)
    grouped.set(record.date, list)
  }

  const rows: CourseDayRow[] = []
  for (const [date, dayRecords] of grouped) {
    const presentUserIds = new Set(dayRecords.map((r) => r.studentUserId))
    const absentStudents = course.value.studentUserIds
      .filter((uid) => !presentUserIds.has(uid))
      .map((uid) => {
        const user = auth.getUserById(uid)
        return {
          userId: uid,
          name: user ? `${user.lastName} ${user.firstName}` : 'Étudiant',
          studentId: user?.studentId ?? '—',
        }
      })

    rows.push({
      key: `${courseId}:${date}`,
      date,
      presentCount: dayRecords.length,
      absentCount: absentStudents.length,
      presentRecords: dayRecords,
      absentStudents,
    })
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date))
})

const courseDayRowByKey = computed(() => {
  const map = new Map<string, CourseDayRow>()
  for (const row of courseDayRows.value) map.set(row.key, row)
  return map
})

const courseCalendarMarks = computed((): AttendanceCalendarMark[] =>
  courseDayRows.value.map((row) => ({
    date: row.date,
    id: row.key,
    status: row.absentCount > 0 ? 'partial' : 'session',
    title: course.value?.name ?? 'Salle',
    subtitle: `${row.presentCount}/${enrolledStudents.value.length} présent(s)`,
  }))
)

function courseDayForMark(mark: AttendanceCalendarMark): CourseDayRow | undefined {
  return mark.id ? courseDayRowByKey.value.get(mark.id) : undefined
}

onMounted(() => {
  if (!auth.currentUser) {
    router.replace('/teacher')
    return
  }
  if (!course.value || course.value.teacherId !== auth.currentUser.id) {
    router.replace('/teacher/courses')
  }
})

function copyClassCode() {
  if (!course.value) return
  navigator.clipboard.writeText(course.value.enrollmentCode)
  copiedClassCode.value = true
  setTimeout(() => (copiedClassCode.value = false), 2000)
}

function copyClassLink() {
  if (!course.value) return
  navigator.clipboard.writeText(getGroupShareUrl(course.value.enrollmentCode))
  copiedClassLink.value = true
  setTimeout(() => (copiedClassLink.value = false), 2000)
}

function generateClassLink() {
  classError.value = ''
  classSuccess.value = ''
  generatingClass.value = true
  const result = courseStore.generateClassEnrollment(courseId)
  generatingClass.value = false
  if (!result.ok) {
    classError.value = result.error
    return
  }
  classSuccess.value = 'Lien classe généré. Partagez-le à vos étudiants.'
}

function shareClassLink() {
  classError.value = ''
  classSuccess.value = ''
  sharingClass.value = true
  const result = courseStore.shareClassEnrollment(courseId)
  sharingClass.value = false
  if (!result.ok) {
    classError.value = result.error
    return
  }
  classSuccess.value = 'Partagé à votre salle. Les étudiants voient le code sur leur app.'
}

function searchMembers() {
  addError.value = ''
  searchResults.value = auth.searchStudents(addQuery.value)
  if (addQuery.value.trim() && searchResults.value.length === 0) {
    addError.value = 'Aucun étudiant trouvé.'
  }
}

function addMember(student: User) {
  addError.value = ''
  addSuccess.value = ''
  const result = courseStore.addMemberByUserId(courseId, student.id)
  if (!result.ok) {
    addError.value = result.error
    return
  }
  addSuccess.value = `${student.firstName} ${student.lastName} ajouté(e).`
  addQuery.value = ''
  searchResults.value = []
}

function removeStudent(studentUserId: string) {
  if (!confirm('Retirer cet étudiant de la salle ?')) return
  courseStore.removeStudent(courseId, studentUserId)
}
</script>

<template>
  <div v-if="course" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <RouterLink
      to="/teacher"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6 transition-colors"
    >
      <ArrowLeft class="w-4 h-4" />
      Tableau de bord
    </RouterLink>

    <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-10">
      <div>
        <p class="label-caps mb-2">Ma salle</p>
        <h1 class="font-display text-3xl text-ink">{{ course.name }}</h1>
        <p class="text-sm text-ink-muted mt-1">
          {{ course.subject }} · {{ enrolledStudents.length }} étudiant(s)
        </p>
      </div>
    </div>

    <AppCard class="mb-10" title="Présence en salle" subtitle="Choisissez le WiFi, partagez le lien généré">
      <PresenceSessionPanel :course-id="courseId" :member-count="enrolledStudents.length" />
    </AppCard>

    <div class="grid lg:grid-cols-2 gap-8 mb-10">
      <AppCard title="Lien classe" subtitle="Générez puis partagez à vos étudiants">
        <div class="space-y-4">
          <p class="text-sm text-ink-muted">
            Générez un code et un lien pour que vos étudiants rejoignent la salle, puis partagez-leur sur leur app.
          </p>

          <div v-if="!course.enrollmentPublishedAt" class="text-center py-6">
            <AppButton :disabled="generatingClass" @click="generateClassLink">
              <Link class="w-4 h-4" />
              {{ generatingClass ? 'Génération…' : 'Générer le lien classe' }}
            </AppButton>
          </div>

          <template v-else>
            <div class="p-4 bg-accent-light border border-accent/20">
              <p class="text-xs text-ink-muted uppercase tracking-wide mb-1">Code classe</p>
              <p class="font-mono text-2xl font-semibold text-accent tracking-widest">{{ course.enrollmentCode }}</p>
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
                :disabled="sharingClass || !!course.enrollmentSharedAt"
                @click="shareClassLink"
              >
                <Share2 class="w-4 h-4" />
                {{ course.enrollmentSharedAt ? 'Partagé à ma salle' : sharingClass ? 'Partage…' : 'Partager à ma salle' }}
              </AppButton>
            </div>
            <p class="text-xs text-ink-faint break-all">{{ getGroupShareUrl(course.enrollmentCode) }}</p>
          </template>

          <p v-if="classError" class="text-sm text-danger">{{ classError }}</p>
          <p v-if="classSuccess" class="text-sm text-accent">{{ classSuccess }}</p>
        </div>
      </AppCard>

      <AppCard :title="`Présents · ${today}`" :subtitle="`${todayAttendance.length} / ${enrolledStudents.length}`">
        <div v-if="enrolledStudents.length === 0" class="text-center py-8 text-sm text-ink-muted">
          Aucun étudiant inscrit pour le moment.
        </div>
        <div v-else class="divide-y divide-line -mx-6 max-h-64 overflow-y-auto">
          <div
            v-for="student in enrolledStudents"
            :key="student.id"
            class="px-6 py-3 flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-sm font-medium text-ink">{{ student.lastName }} {{ student.firstName }}</p>
              <p class="text-xs text-ink-faint font-mono">{{ student.studentId }}</p>
            </div>
            <AppBadge :variant="presentStudentIds.has(student.id) ? 'success' : 'muted'">
              {{ presentStudentIds.has(student.id) ? 'Présent' : 'Absent' }}
            </AppBadge>
          </div>
        </div>
      </AppCard>
    </div>

    <AppCard
      class="mb-10"
      title="Calendrier des présences"
      :subtitle="`${courseDayRows.length} séance(s) enregistrée(s)`"
    >
      <div v-if="courseDayRows.length === 0" class="text-center py-10 text-sm text-ink-muted">
        Les séances de présence apparaîtront ici après vos premiers pointages.
      </div>
      <AppAttendanceCalendar
        v-else
        v-model:selected-date="selectedPresenceDate"
        :marks="courseCalendarMarks"
      >
        <template #detail="{ marks }">
          <div class="space-y-4 mt-2">
            <article
              v-for="mark in marks"
              :key="mark.id"
              class="border border-line p-4 bg-white text-sm"
            >
              <template v-if="courseDayForMark(mark)">
                <div class="flex flex-wrap gap-2 mb-3">
                  <AppBadge variant="success">
                    {{ courseDayForMark(mark)!.presentCount }} présent(s)
                  </AppBadge>
                  <AppBadge
                    v-if="courseDayForMark(mark)!.absentCount > 0"
                    variant="danger"
                  >
                    {{ courseDayForMark(mark)!.absentCount }} absent(s)
                  </AppBadge>
                </div>
                <div v-if="courseDayForMark(mark)!.absentStudents.length > 0" class="mb-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-danger mb-2">Absents</p>
                  <ul class="space-y-1 text-ink-muted">
                    <li
                      v-for="student in courseDayForMark(mark)!.absentStudents"
                      :key="student.userId"
                    >
                      {{ student.name }}
                      <span class="text-ink-faint font-mono text-xs">· {{ student.studentId }}</span>
                    </li>
                  </ul>
                </div>
                <details>
                  <summary class="text-accent font-medium cursor-pointer hover:text-accent-hover">
                    Voir les présents
                  </summary>
                  <ul class="mt-3 space-y-1 text-ink-muted">
                    <li
                      v-for="record in courseDayForMark(mark)!.presentRecords"
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
    </AppCard>

    <AppCard title="Ajouter un étudiant" class="mb-10">
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row gap-3">
          <AppInput
            v-model="addQuery"
            label="E-mail ou n° étudiant"
            placeholder="E2024001"
            class="flex-1"
            @keyup.enter="searchMembers"
          />
          <AppButton class="sm:self-end" @click="searchMembers">
            <UserPlus class="w-4 h-4" />
            Rechercher
          </AppButton>
        </div>
        <p v-if="addError" class="text-sm text-danger">{{ addError }}</p>
        <p v-if="addSuccess" class="text-sm text-accent">{{ addSuccess }}</p>
        <div v-if="searchResults.length" class="divide-y divide-line border border-line -mx-6">
          <div
            v-for="student in searchResults"
            :key="student.id"
            class="px-6 py-3 flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-sm font-medium text-ink">{{ student.lastName }} {{ student.firstName }}</p>
              <p class="text-xs text-ink-faint">{{ student.studentId }} · {{ student.email }}</p>
            </div>
            <AppButton
              size="sm"
              variant="outline"
              :disabled="course.studentUserIds.includes(student.id)"
              @click="addMember(student)"
            >
              {{ course.studentUserIds.includes(student.id) ? 'Inscrit' : 'Ajouter' }}
            </AppButton>
          </div>
        </div>
      </div>
    </AppCard>

    <AppCard title="Étudiants inscrits" :subtitle="`${enrolledStudents.length} personne(s)`">
      <div v-if="enrolledStudents.length === 0" class="flex flex-col items-center py-12 text-ink-muted">
        <Users class="w-10 h-10 text-ink-faint mb-3" />
        <p class="text-sm">Les étudiants apparaissent après avoir rejoint via le lien classe ou le lien présence.</p>
      </div>
      <div v-else class="divide-y divide-line -mx-6">
        <div
          v-for="student in enrolledStudents"
          :key="student.id"
          class="px-6 py-4 flex items-center justify-between gap-4"
        >
          <div>
            <p class="font-medium text-ink">{{ student.lastName }} {{ student.firstName }}</p>
            <p class="text-xs text-ink-muted">{{ student.studentId }} · {{ student.email }}</p>
            <p v-if="presentStudentIds.has(student.id)" class="text-xs text-accent mt-1 flex items-center gap-1">
              <UserCheck class="w-3 h-3" />
              Présent · réseau local
              · {{ formatDate(todayAttendance.find((a) => a.studentUserId === student.id)!.markedAt) }}
            </p>
          </div>
          <AppButton variant="ghost" size="sm" @click="removeStudent(student.id)">
            Retirer
          </AppButton>
        </div>
      </div>
    </AppCard>
  </div>
</template>
