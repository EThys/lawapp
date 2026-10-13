<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import { useClassroomStore, mapClassroomToCourse, persistClassroomAsLocalCourse } from '@/stores/classrooms'
import { useStudentStore } from '@/stores/students'
import { isApiEnabled } from '@/config/features'
import { listClassroomUsers } from '@/api/classrooms'
import { studentDisplayName } from '@/api/students'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import AppSuggest, { type SuggestItem } from '@/components/ui/AppSuggest.vue'
import AppShimmerDetail from '@/components/loading/AppShimmerDetail.vue'
import AppAttendanceCalendar from '@/components/attendance/AppAttendanceCalendar.vue'
import PresenceSessionPanel from '@/components/teacher/PresenceSessionPanel.vue'
import PresenceQrPanel from '@/components/teacher/PresenceQrPanel.vue'
import type { AttendanceCalendarMark } from '@/utils/attendanceCalendar'
import { getGroupShareUrl, getTodayDateString } from '@/utils/access'
import { formatDate } from '@/utils/helpers'
import { appToast } from '@/utils/toast'
import type { User } from '@/types/auth'
import type { Course } from '@/types/course'
import {
  ArrowLeft,
  Copy,
  Check,
  UserCheck,
  UserPlus,
  Plus,
  Link,
  Share2,
  AlertCircle,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const courseStore = useCourseStore()
const classroomStore = useClassroomStore()
const studentStore = useStudentStore()

const courseId = route.params.id as string
const apiClassroomId = computed(() => {
  const n = Number(courseId)
  return Number.isFinite(n) && n > 0 ? n : null
})
const isApiCourse = computed(() => isApiEnabled() && apiClassroomId.value != null)

const apiCourse = ref<(Course & { apiId: number; isFromApi: true }) | null>(null)
const course = computed(() => {
  if (isApiCourse.value) return apiCourse.value
  return courseStore.getById(courseId)
})
const today = getTodayDateString()

const copiedClassCode = ref(false)
const copiedClassLink = ref(false)
const classError = ref('')
const classSuccess = ref('')
const generatingClass = ref(false)
const sharingClass = ref(false)
const pageReady = ref(false)
const pageError = ref('')

const addQuery = ref('')
const selectedUserId = ref<string | null>(null)
/** Salle cible pour l’ajout (API) — choisie explicitement. */
const targetClassroomId = ref('')
const addError = ref('')
const addSuccess = ref('')
const searchResults = ref<User[]>([])
const directoryLoading = ref(false)
/** Liens ClassroomUser (classroomId + userId) pour afficher la salle. */
const memberships = ref<{ classroomId: number; userId: number; createdAt?: string }[]>([])
const salleFilter = ref('')

const studentsByUserId = computed(() => studentStore.catalogByUserId)

const classroomNameById = computed(() => {
  const map = new Map<number, string>()
  for (const c of classroomStore.myClassrooms) {
    map.set(c.id, c.name?.trim() || `Salle #${c.id}`)
  }
  if (apiClassroomId.value && course.value?.name) {
    map.set(apiClassroomId.value, course.value.name)
  }
  return map
})

const classroomOptions = computed(() =>
  classroomStore.myClassrooms.map((c) => ({
    value: String(c.id),
    label: c.name?.trim() || `Salle #${c.id}`,
  })),
)

const salleFilterOptions = computed(() => [
  { value: 'all', label: 'Toutes les salles' },
  ...classroomOptions.value,
])

const enrolledUserIds = computed(() => {
  if (isApiCourse.value) {
    const targetId = Number(targetClassroomId.value)
    if (targetId) {
      return new Set(
        memberships.value.filter((m) => m.classroomId === targetId).map((m) => m.userId),
      )
    }
    return new Set(memberships.value.map((m) => m.userId))
  }
  return new Set(
    (course.value?.studentUserIds ?? [])
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n) && n > 0),
  )
})

const userSuggestItems = computed((): SuggestItem[] =>
  studentStore.catalog
    .filter((s) => s.userId != null && !enrolledUserIds.value.has(s.userId))
    .map((s) => ({
      value: String(s.userId),
      label: studentDisplayName(s),
      description:
        [s.matricule, s.email, s.promotion?.name, s.etablissement?.name]
          .filter(Boolean)
          .join(' · ') || undefined,
    })),
)

async function loadAllMemberships() {
  const classes = classroomStore.myClassrooms
  if (!classes.length && apiClassroomId.value) {
    const members = classroomStore.currentUsers
    memberships.value = members
      .filter((u) => u.active !== false && u.userId != null)
      .map((u) => ({
        classroomId: apiClassroomId.value!,
        userId: u.userId!,
        createdAt: u.createdAt,
      }))
    return
  }
  const lists = await Promise.all(
    classes.map((c) => listClassroomUsers(c.id).catch(() => [] as Awaited<ReturnType<typeof listClassroomUsers>>)),
  )
  memberships.value = lists.flatMap((members, index) => {
    const classroomId = classes[index]?.id
    if (!classroomId) return []
    return members
      .filter((u) => u.active !== false && u.userId != null)
      .map((u) => ({
        classroomId,
        userId: u.userId!,
        createdAt: u.createdAt,
      }))
  })
}

const enrolledUserIdsForPresence = computed(() => {
  if (!course.value) return [] as string[]
  if (isApiCourse.value && apiClassroomId.value != null) {
    return memberships.value
      .filter((m) => m.classroomId === apiClassroomId.value)
      .map((m) => String(m.userId))
  }
  return [...course.value.studentUserIds]
})

const enrolledStudents = computed(() => {
  if (!course.value) return []
  if (isApiCourse.value) {
    const filter = salleFilter.value || String(apiClassroomId.value ?? '')
    const rows = memberships.value.filter((m) => filter === 'all' || m.classroomId === Number(filter))
    return rows
      .map((m) => {
        const profile = studentsByUserId.value.get(m.userId)
        return {
          id: `${m.classroomId}:${m.userId}`,
          apiUserId: m.userId,
          classroomId: m.classroomId,
          salle: classroomNameById.value.get(m.classroomId) ?? `Salle #${m.classroomId}`,
          firstName: profile?.firstName?.trim() || 'Étudiant',
          lastName: profile?.lastName?.trim() || `#${m.userId}`,
          email: profile?.email ?? '',
          studentId: profile?.matricule ?? String(m.userId),
          role: 'student' as const,
          createdAt: m.createdAt ?? '',
        }
      })
      .sort((a, b) => {
        const bySalle = a.salle.localeCompare(b.salle, 'fr')
        if (bySalle) return bySalle
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr')
      })
  }
  return course.value.studentUserIds
    .map((id) => auth.getUserById(id))
    .filter(Boolean)
    .map((u) => u!)
})

const enrolledColumns = computed(() => {
  const cols: { key: string; label: string; hideOnMobile?: boolean; class?: string }[] = [
    { key: 'name', label: 'Étudiant' },
    { key: 'salle', label: 'Salle' },
    { key: 'username', label: 'Identifiant', hideOnMobile: true },
    { key: 'email', label: 'E-mail' },
  ]
  if (!isApiCourse.value) {
    cols.push({ key: 'presence', label: 'Présence' })
    cols.push({ key: 'actions', label: 'Actions', class: 'text-right whitespace-nowrap' })
  }
  return cols
})

const enrolledTableRows = computed(() =>
  enrolledStudents.value.map((student) => {
    const present = !isApiCourse.value && presentStudentIds.value.has(student.id)
    const markedAt = present
      ? todayAttendance.value.find((a) => a.studentUserId === student.id)?.markedAt
      : null
    const salle =
      'salle' in student && typeof student.salle === 'string'
        ? student.salle
        : course.value?.name ?? '—'
    const usernameRaw = student.studentId ?? ''
    return {
      id: student.id,
      name: `${student.lastName} ${student.firstName}`.trim(),
      salle,
      username: usernameRaw.startsWith('@') ? usernameRaw : usernameRaw ? `@${usernameRaw}` : '—',
      email: student.email || '—',
      presence: present ? 'Présent' : 'Absent',
      present,
      markedAt: markedAt ? formatDate(markedAt) : null,
    }
  }),
)

const todayAttendance = computed(() =>
  isApiCourse.value ? [] : courseStore.getAttendanceForCourse(courseId, today),
)
const presentStudentIds = computed(() => new Set(todayAttendance.value.map((a) => a.studentUserId)))

const selectedPresenceDate = ref<string | null>(null)
const attendanceHistory = computed(() =>
  isApiCourse.value ? [] : courseStore.getAttendanceHistoryForCourse(courseId),
)

interface CourseDayRow {
  key: string
  date: string
  presentCount: number
  absentCount: number
  presentRecords: ReturnType<typeof courseStore.getAttendanceHistoryForCourse>
  absentStudents: { userId: string; name: string; studentId: string }[]
}

const courseDayRows = computed((): CourseDayRow[] => {
  if (!course.value || isApiCourse.value) return []
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
          studentId: user?.studentId ?? '-',
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
  })),
)

function courseDayForMark(mark: AttendanceCalendarMark): CourseDayRow | undefined {
  return mark.id ? courseDayRowByKey.value.get(mark.id) : undefined
}

onMounted(async () => {
  if (!auth.currentUser) {
    await router.replace('/teacher')
    return
  }

  if (isApiCourse.value && apiClassroomId.value != null) {
    directoryLoading.value = true
    targetClassroomId.value = String(apiClassroomId.value)
    const [classroom] = await Promise.all([
      classroomStore.fetchById(apiClassroomId.value),
      classroomStore.syncMine(),
      studentStore.syncCatalog(),
    ])
    directoryLoading.value = false

    if (!classroom) {
      pageError.value = classroomStore.error || 'Classe introuvable.'
      pageReady.value = true
      return
    }
    apiCourse.value = persistClassroomAsLocalCourse(
      classroom,
      classroomStore.currentUsers,
      {
        id: auth.currentUser.id,
        displayName: `${auth.currentUser.firstName} ${auth.currentUser.lastName}`.trim(),
      },
    )
    salleFilter.value = String(apiClassroomId.value)
    await loadAllMemberships()
    pageReady.value = true
    return
  }

  if (!course.value || course.value.teacherId !== auth.currentUser.id) {
    await router.replace('/teacher/courses')
    return
  }
  pageReady.value = true
})

function copyClassCode() {
  if (!course.value) return
  navigator.clipboard.writeText(course.value.enrollmentCode)
  copiedClassCode.value = true
  appToast.success('Code classe copié.')
  setTimeout(() => (copiedClassCode.value = false), 2000)
}

function copyClassLink() {
  if (!course.value) return
  navigator.clipboard.writeText(getGroupShareUrl(course.value.enrollmentCode))
  copiedClassLink.value = true
  appToast.success('Lien classe copié.')
  setTimeout(() => (copiedClassLink.value = false), 2000)
}

function generateClassLink() {
  if (isApiCourse.value) {
    appToast.info('Partagez le code classe à vos étudiants.')
    return
  }
  classError.value = ''
  classSuccess.value = ''
  generatingClass.value = true
  const result = courseStore.generateClassEnrollment(courseId)
  generatingClass.value = false
  if (!result.ok) {
    classError.value = result.error
    appToast.error(result.error)
    return
  }
  classSuccess.value = 'Lien classe généré. Partagez-le à vos étudiants.'
  appToast.success(classSuccess.value)
}

function shareClassLink() {
  if (isApiCourse.value) {
    appToast.info('Partagez le code classe aux étudiants.')
    return
  }
  classError.value = ''
  classSuccess.value = ''
  sharingClass.value = true
  const result = courseStore.shareClassEnrollment(courseId)
  sharingClass.value = false
  if (!result.ok) {
    classError.value = result.error
    appToast.error(result.error)
    return
  }
  classSuccess.value = 'Partagé à votre salle. Les étudiants voient le code sur leur app.'
  appToast.success(classSuccess.value)
}

function searchMembers() {
  addError.value = ''
  searchResults.value = auth.searchStudents(addQuery.value)
  if (addQuery.value.trim() && searchResults.value.length === 0) {
    addError.value = 'Aucun étudiant trouvé.'
    appToast.warning('Aucun étudiant trouvé.')
  }
}

async function addSelectedApiUser() {
  addError.value = ''
  addSuccess.value = ''
  if (!isApiCourse.value) return

  const classroomId = Number(targetClassroomId.value)
  const userId = Number(selectedUserId.value)
  if (!classroomId) {
    addError.value = 'Choisissez une salle.'
    appToast.warning(addError.value)
    return
  }
  if (!userId) {
    addError.value = 'Choisissez un utilisateur dans les suggestions.'
    appToast.warning(addError.value)
    return
  }

  const profile = studentsByUserId.value.get(userId)
  const salleLabel =
    classroomOptions.value.find((o) => o.value === String(classroomId))?.label ?? `Salle #${classroomId}`
  const result = await classroomStore.addUser(classroomId, userId)
  if (!result.ok) {
    addError.value = result.error
    appToast.error(result.error)
    return
  }

  if (classroomId === apiClassroomId.value && classroomStore.current) {
    apiCourse.value = mapClassroomToCourse(
      classroomStore.current,
      classroomStore.currentUsers,
      apiCourse.value?.teacherName,
    )
  }
  await loadAllMemberships()

  addSuccess.value = profile
    ? `${studentDisplayName(profile)} ajouté(e) à « ${salleLabel} ».`
    : `Membre ajouté à « ${salleLabel} ».`
  appToast.success(addSuccess.value)
  addQuery.value = ''
  selectedUserId.value = null

  if (classroomId !== apiClassroomId.value) {
    await router.push(`/teacher/courses/${classroomId}`)
  }
}

async function addMember(student: User) {
  addError.value = ''
  addSuccess.value = ''

  if (isApiCourse.value) {
    const classroomId = Number(targetClassroomId.value) || apiClassroomId.value
    const userId = student.apiUserId
    if (!classroomId) {
      addError.value = 'Choisissez une salle.'
      appToast.warning(addError.value)
      return
    }
    if (!userId) {
      addError.value = 'Impossible d’identifier cet utilisateur.'
      appToast.error(addError.value)
      return
    }
    const salleLabel =
      classroomOptions.value.find((o) => o.value === String(classroomId))?.label ??
      `Salle #${classroomId}`
    const result = await classroomStore.addUser(classroomId, userId)
    if (!result.ok) {
      addError.value = result.error
      appToast.error(result.error)
      return
    }
    if (classroomId === apiClassroomId.value && classroomStore.current) {
      apiCourse.value = mapClassroomToCourse(
        classroomStore.current,
        classroomStore.currentUsers,
        apiCourse.value?.teacherName,
      )
    }
    await loadAllMemberships()
    addSuccess.value = `${student.firstName} ${student.lastName} ajouté(e) à « ${salleLabel} ».`
    appToast.success(addSuccess.value)
    addQuery.value = ''
    selectedUserId.value = null
    searchResults.value = []
    if (classroomId !== apiClassroomId.value) {
      await router.push(`/teacher/courses/${classroomId}`)
    }
    return
  }

  const result = courseStore.addMemberByUserId(courseId, student.id)
  if (!result.ok) {
    addError.value = result.error
    appToast.error(result.error)
    return
  }
  addSuccess.value = `${student.firstName} ${student.lastName} ajouté(e).`
  appToast.success(addSuccess.value)
  addQuery.value = ''
  searchResults.value = []
}

function removeStudent(studentUserId: string) {
  if (isApiCourse.value) {
    addError.value = 'Retrait non disponible via l’API (pas d’endpoint DELETE).'
    appToast.warning(addError.value)
    return
  }
  if (!confirm('Retirer cet étudiant de la salle ?')) return
  courseStore.removeStudent(courseId, studentUserId)
  appToast.success('Étudiant retiré de la salle.')
}

</script>

<template>
  <div v-if="!pageReady" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <AppShimmerDetail />
  </div>

  <div v-else-if="pageError" class="max-w-lg mx-auto px-4 py-16">
    <div class="flex items-start gap-2 p-4 bg-danger-bg border border-danger/20 text-sm text-danger">
      <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
      {{ pageError }}
    </div>
    <RouterLink to="/teacher/courses" class="inline-flex mt-4 text-sm text-accent">
      Retour aux salles
    </RouterLink>
  </div>

  <div v-else-if="course" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <RouterLink
      to="/teacher/courses"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6 transition-colors"
    >
      <ArrowLeft class="w-4 h-4" />
      Mes salles
    </RouterLink>

    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <p class="label-caps mb-2">Ma salle</p>
        <h1 class="font-display text-3xl text-ink">{{ course.name }}</h1>
        <p class="text-sm text-ink-muted mt-1">
          {{ course.subject }} · {{ enrolledStudents.length }} étudiant(s)
        </p>
      </div>
      <RouterLink to="/teacher/courses?create=1">
        <AppButton size="sm" variant="outline">
          <Plus class="w-4 h-4" />
          Créer une salle
        </AppButton>
      </RouterLink>
    </div>

    <AppCard
      v-if="course"
      class="mb-8"
      title="Présence QR"
      subtitle="Session à durée fixe, relais étudiants, scan mobile ou web"
    >
      <PresenceQrPanel
        :classroom-id="courseId"
        :classroom-name="course.name"
        :enrolled-user-ids="enrolledUserIdsForPresence"
      />
    </AppCard>

    <AppCard
      v-if="!isApiCourse"
      class="mb-8"
      title="Présence WiFi (legacy)"
      subtitle="Ancien mode réseau local — remplacé par le QR quand l’API sera branchée"
    >
      <PresenceSessionPanel :course-id="courseId" :member-count="enrolledStudents.length" />
    </AppCard>

    <div class="grid lg:grid-cols-2 gap-6 mb-8">
      <AppCard title="Lien classe" subtitle="Code étudiants" :hover="false" padding="sm">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="inline-flex items-center px-2.5 py-1.5 bg-accent-light border border-accent/20 font-mono text-sm font-semibold text-accent tracking-wider"
          >
            {{ course.enrollmentCode }}
          </span>
          <AppButton variant="outline" size="sm" class="!min-h-9 h-9" @click="copyClassCode">
            <Check v-if="copiedClassCode" class="w-4 h-4 text-accent" />
            <Copy v-else class="w-4 h-4" />
            Copier
          </AppButton>
          <AppButton
            v-if="!isApiCourse"
            variant="outline"
            size="sm"
            class="!min-h-9 h-9"
            @click="copyClassLink"
          >
            <Check v-if="copiedClassLink" class="w-4 h-4 text-accent" />
            <Copy v-else class="w-4 h-4" />
            Lien
          </AppButton>
          <AppButton
            v-if="!isApiCourse && !course.enrollmentPublishedAt"
            size="sm"
            class="!min-h-9 h-9"
            :disabled="generatingClass"
            @click="generateClassLink"
          >
            <Link class="w-4 h-4" />
            Générer
          </AppButton>
          <AppButton
            v-if="!isApiCourse && course.enrollmentPublishedAt"
            size="sm"
            class="!min-h-9 h-9"
            :disabled="sharingClass || !!course.enrollmentSharedAt"
            @click="shareClassLink"
          >
            <Share2 class="w-4 h-4" />
            Partager
          </AppButton>
        </div>
        <p v-if="classError" class="text-xs text-danger mt-2">{{ classError }}</p>
        <p v-if="classSuccess" class="text-xs text-accent mt-2">{{ classSuccess }}</p>
      </AppCard>

      <AppCard
        v-if="!isApiCourse"
        :title="`Présents · ${today}`"
        :subtitle="`${todayAttendance.length} / ${enrolledStudents.length}`"
        padding="sm"
      >
        <div v-if="enrolledStudents.length === 0" class="text-center py-6 text-sm text-ink-muted">
          Aucun étudiant inscrit pour le moment.
        </div>
        <div v-else class="divide-y divide-line -mx-4 max-h-52 overflow-y-auto">
          <div
            v-for="student in enrolledStudents"
            :key="student.id"
            class="px-4 py-2.5 flex items-center justify-between gap-3"
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
      v-if="!isApiCourse"
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
                </div>
              </template>
            </article>
          </div>
        </template>
      </AppAttendanceCalendar>
    </AppCard>

    <AppCard title="Ajouter un étudiant" class="mb-10">
      <div class="space-y-4">
        <template v-if="isApiCourse">
          <div class="flex flex-row flex-wrap items-end gap-2">
            <AppSelect
              v-model="targetClassroomId"
              class="w-full sm:w-52 shrink-0"
              label="Salle"
              required
              placeholder="Choisir une salle"
              :options="classroomOptions"
            />
            <AppSuggest
              v-model="addQuery"
              v-model:selected-value="selectedUserId"
              class="min-w-0 flex-1 max-w-md"
              label="Rechercher par nom"
              placeholder="Nom, prénom, matricule…"
              :items="userSuggestItems"
              :disabled="directoryLoading || studentStore.catalogLoading || !targetClassroomId"
              compact
            />
            <AppButton
              size="sm"
              class="shrink-0 !min-h-9 h-9 px-3"
              :loading="classroomStore.loading"
              :disabled="!selectedUserId || !targetClassroomId"
              @click="addSelectedApiUser"
            >
              <UserPlus class="w-4 h-4" />
              Ajouter
            </AppButton>
          </div>
        </template>
        <template v-else>
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
        </template>
        <p v-if="addError" class="text-sm text-danger">{{ addError }}</p>
        <p v-if="addSuccess" class="text-sm text-accent">{{ addSuccess }}</p>
      </div>
    </AppCard>

    <AppCard title="Étudiants inscrits" :subtitle="`${enrolledStudents.length} personne(s)`" :hover="false">
      <div v-if="isApiCourse && classroomOptions.length" class="mb-4 max-w-xs">
        <AppSelect
          v-model="salleFilter"
          label="Filtrer par salle"
          :options="salleFilterOptions"
        />
      </div>
      <AppDataTable
        :columns="enrolledColumns"
        :rows="enrolledTableRows"
        empty-message="Aucun membre pour le moment."
        :page-size="10"
        :page-sizes="[5, 10, 20, 50]"
      >
        <template #cell-name="{ row }">
          <p class="font-medium text-ink">{{ row.name }}</p>
        </template>
        <template #cell-salle="{ row }">
          <AppBadge variant="brand">{{ row.salle }}</AppBadge>
        </template>
        <template #cell-username="{ row }">
          <span class="font-mono text-xs text-ink-muted">{{ row.username }}</span>
        </template>
        <template #cell-email="{ row }">
          <span class="text-ink-muted">{{ row.email }}</span>
        </template>
        <template #cell-presence="{ row }">
          <div class="space-y-1">
            <AppBadge :variant="row.present ? 'success' : 'muted'">
              {{ row.presence }}
            </AppBadge>
            <p v-if="row.markedAt" class="text-[11px] text-ink-faint flex items-center gap-1">
              <UserCheck class="w-3 h-3" />
              {{ row.markedAt }}
            </p>
          </div>
        </template>
        <template #cell-actions="{ row }">
          <AppButton variant="ghost" size="sm" @click="removeStudent(String(row.id))">
            Retirer
          </AppButton>
        </template>
      </AppDataTable>
    </AppCard>
  </div>
</template>
