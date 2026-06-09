import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Course, AttendanceRecord, PresenceTunnel } from '@/types/course'
import type { NetworkFingerprint } from '@/utils/localNetwork'
import { verifyLocalNetwork } from '@/utils/localNetwork'
import { useNotificationStore } from '@/stores/notifications'
import { getPresenceShareUrl } from '@/utils/localNetwork'
import { TUNNEL_CODE_ROTATION_SECONDS, TUNNEL_DURATION_MINUTES } from '@/types/course'
import { generateId, generateCode } from '@/utils/helpers'
import { getTodayDateString, getGroupShareUrl } from '@/utils/access'

const COURSES_KEY = 'lawapp_courses'
const ATTENDANCE_KEY = 'lawapp_attendance'
const TUNNELS_KEY = 'lawapp_tunnels'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data))
}

function newTunnelCodeExpiry(): string {
  return new Date(Date.now() + TUNNEL_CODE_ROTATION_SECONDS * 1000).toISOString()
}

export const useCourseStore = defineStore('courses', () => {
  const courses = ref<Course[]>(loadFromStorage(COURSES_KEY, []))
  const attendance = ref<AttendanceRecord[]>(loadFromStorage(ATTENDANCE_KEY, []))
  const tunnels = ref<PresenceTunnel[]>(loadFromStorage(TUNNELS_KEY, []))

  function persistCourses() {
    saveToStorage(COURSES_KEY, courses.value)
  }

  function persistAttendance() {
    saveToStorage(ATTENDANCE_KEY, attendance.value)
  }

  function persistTunnels() {
    saveToStorage(TUNNELS_KEY, tunnels.value)
  }

  function deactivateExpiredTunnels() {
    const now = Date.now()
    let changed = false
    for (const tunnel of tunnels.value) {
      if (tunnel.isActive && new Date(tunnel.expiresAt).getTime() <= now) {
        tunnel.isActive = false
        changed = true
      }
    }
    if (changed) persistTunnels()
  }

  function rotateTunnelCodeIfNeeded(tunnel: PresenceTunnel): void {
    if (!tunnel.isActive) return
    if (new Date(tunnel.codeExpiresAt).getTime() <= Date.now()) {
      tunnel.code = generateCode()
      tunnel.codeExpiresAt = newTunnelCodeExpiry()
      persistTunnels()
    }
  }

  function getCoursesForTeacher(teacherId: string): Course[] {
    return courses.value.filter((c) => c.teacherId === teacherId)
  }

  function ensureTeacherClass(data: {
    teacherId: string
    teacherName: string
    name?: string
    subject?: string
  }): Course {
    const existing = getCoursesForTeacher(data.teacherId)[0]
    if (existing) return existing

    return createCourse({
      teacherId: data.teacherId,
      teacherName: data.teacherName,
      name: data.name?.trim() || 'L2 Droit',
      subject: data.subject?.trim() || 'Droit',
    })
  }

  function getCoursesForStudent(studentUserId: string): Course[] {
    return courses.value.filter((c) => c.studentUserIds.includes(studentUserId))
  }

  function getById(id: string): Course | undefined {
    return courses.value.find((c) => c.id === id)
  }

  function getByEnrollmentCode(code: string): Course | undefined {
    return courses.value.find(
      (c) => c.enrollmentCode.toUpperCase() === code.toUpperCase()
    )
  }

  function getByShareCode(shareCode: string): PresenceTunnel | undefined {
    deactivateExpiredTunnels()
    return tunnels.value.find(
      (t) =>
        t.isActive &&
        t.shareCode?.toUpperCase() === shareCode.toUpperCase()
    )
  }

  function getActiveTunnel(courseId: string): PresenceTunnel | undefined {
    deactivateExpiredTunnels()
    const tunnel = tunnels.value.find((t) => t.courseId === courseId && t.isActive)
    if (!tunnel) return undefined
    rotateTunnelCodeIfNeeded(tunnel)
    return tunnel
  }

  function startTunnel(
    courseId: string,
    teacherId: string,
    wifiLabel: string,
    networkFingerprint: NetworkFingerprint
  ): PresenceTunnel | null {
    const course = getById(courseId)
    if (!course || course.teacherId !== teacherId) return null
    if (!wifiLabel.trim()) return null

    deactivateExpiredTunnels()
    for (const t of tunnels.value) {
      if (t.courseId === courseId && t.isActive) t.isActive = false
    }

    const now = new Date()
    const shareCode = generateCode()
    const tunnel: PresenceTunnel = {
      id: generateId(),
      courseId,
      teacherId,
      shareCode,
      wifiLabel: wifiLabel.trim(),
      networkFingerprint: {
        publicIp: networkFingerprint.publicIp,
        localIpPrefix: networkFingerprint.localIpPrefix,
      },
      code: generateCode(),
      startedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + TUNNEL_DURATION_MINUTES * 60 * 1000).toISOString(),
      codeExpiresAt: newTunnelCodeExpiry(),
      isActive: true,
      sharedToClassAt: null,
    }
    tunnels.value.unshift(tunnel)
    persistTunnels()

    return tunnel
  }

  function sharePresenceToClass(
    courseId: string
  ): { ok: true } | { ok: false; error: string } {
    const course = getById(courseId)
    if (!course) return { ok: false, error: 'Salle introuvable.' }

    const tunnel = getActiveTunnel(courseId)
    if (!tunnel) {
      return { ok: false, error: 'Ouvrez d\'abord une session de présence.' }
    }

    tunnel.sharedToClassAt = new Date().toISOString()
    persistTunnels()

    const notifications = useNotificationStore()
    const link = getPresenceShareUrl(tunnel.shareCode)
    notifications.pushToMany(course.studentUserIds, {
      title: `Présence · ${course.name}`,
      body: `WiFi « ${tunnel.wifiLabel} ». Code : ${tunnel.code}. Pointez votre présence depuis l'app.`,
      link,
      type: 'presence',
    })

    return { ok: true }
  }

  function getSharedPresenceForStudent(
    studentUserId: string
  ): Array<{ course: Course; tunnel: PresenceTunnel }> {
    deactivateExpiredTunnels()
    return getCoursesForStudent(studentUserId)
      .map((course) => {
        const tunnel = getActiveTunnel(course.id)
        if (!tunnel?.sharedToClassAt) return null
        return { course, tunnel }
      })
      .filter((item): item is { course: Course; tunnel: PresenceTunnel } => item !== null)
  }

  function generateClassEnrollment(
    courseId: string
  ): { ok: true } | { ok: false; error: string } {
    const course = getById(courseId)
    if (!course) return { ok: false, error: 'Salle introuvable.' }

    course.enrollmentCode = generateCode()
    course.enrollmentPublishedAt = new Date().toISOString()
    course.enrollmentSharedAt = null
    course.updatedAt = new Date().toISOString()
    persistCourses()
    return { ok: true }
  }

  function shareClassEnrollment(
    courseId: string
  ): { ok: true } | { ok: false; error: string } {
    const course = getById(courseId)
    if (!course) return { ok: false, error: 'Salle introuvable.' }
    if (!course.enrollmentPublishedAt) {
      return { ok: false, error: 'Générez d\'abord le lien classe.' }
    }

    course.enrollmentSharedAt = new Date().toISOString()
    course.updatedAt = new Date().toISOString()
    persistCourses()

    const notifications = useNotificationStore()
    const link = getGroupShareUrl(course.enrollmentCode)
    notifications.pushToMany(course.studentUserIds, {
      title: `Lien classe · ${course.name}`,
      body: `Code classe : ${course.enrollmentCode}. Retrouvez-le dans votre espace étudiant.`,
      link,
      type: 'info',
    })

    return { ok: true }
  }

  function stopTunnel(courseId: string): void {
    for (const t of tunnels.value) {
      if (t.courseId === courseId && t.isActive) t.isActive = false
    }
    persistTunnels()
  }

  function getTunnelCodeRemainingSeconds(courseId: string): number {
    const tunnel = getActiveTunnel(courseId)
    if (!tunnel) return 0
    return Math.max(0, Math.ceil((new Date(tunnel.codeExpiresAt).getTime() - Date.now()) / 1000))
  }

  function getTunnelSessionRemainingSeconds(courseId: string): number {
    const tunnel = getActiveTunnel(courseId)
    if (!tunnel) return 0
    return Math.max(0, Math.ceil((new Date(tunnel.expiresAt).getTime() - Date.now()) / 1000))
  }

  function joinTunnel(
    courseId: string,
    studentUserId: string,
    networkFingerprint: NetworkFingerprint,
    code?: string,
    currentWifiSsid?: string | null
  ): { ok: true; courseName: string } | { ok: false; error: string } {
    const course = getById(courseId)
    if (!course) return { ok: false, error: 'Groupe introuvable.' }
    if (!course.studentUserIds.includes(studentUserId)) {
      return { ok: false, error: 'Vous n\'êtes pas membre de ce groupe (matricule non inscrit).' }
    }

    const tunnel = getActiveTunnel(courseId)
    if (!tunnel) {
      return {
        ok: false,
        error: 'Aucune session de présence ouverte. Attendez que l\'enseignant ouvre le réseau local en salle.',
      }
    }

    const networkCheck = verifyLocalNetwork(
      tunnel.networkFingerprint,
      networkFingerprint,
      tunnel.wifiLabel,
      currentWifiSsid
    )
    if (!networkCheck.ok) return networkCheck

    if (code && tunnel.code.toUpperCase() !== code.trim().toUpperCase()) {
      return { ok: false, error: 'Code incorrect ou expiré.' }
    }

    return recordPresence(course, tunnel, studentUserId)
  }

  function joinTunnelByShareCode(
    shareCode: string,
    studentUserId: string,
    networkFingerprint: NetworkFingerprint,
    currentWifiSsid?: string | null
  ): { ok: true; courseName: string } | { ok: false; error: string } {
    const tunnel = getByShareCode(shareCode)
    if (!tunnel) {
      return {
        ok: false,
        error: 'Lien de présence invalide ou session terminée.',
      }
    }

    const course = getById(tunnel.courseId)
    if (!course) return { ok: false, error: 'Classe introuvable.' }

    const networkCheck = verifyLocalNetwork(
      tunnel.networkFingerprint,
      networkFingerprint,
      tunnel.wifiLabel,
      currentWifiSsid
    )
    if (!networkCheck.ok) return networkCheck

    if (!course.studentUserIds.includes(studentUserId)) {
      course.studentUserIds.push(studentUserId)
      course.updatedAt = new Date().toISOString()
      persistCourses()
    }

    return recordPresence(course, tunnel, studentUserId)
  }

  function recordPresence(
    course: Course,
    tunnel: PresenceTunnel,
    studentUserId: string
  ): { ok: true; courseName: string } | { ok: false; error: string } {
    const day = getTodayDateString()
    const existing = attendance.value.find(
      (a) => a.courseId === course.id && a.studentUserId === studentUserId && a.date === day
    )
    if (existing) {
      return { ok: false, error: 'Présence déjà enregistrée aujourd\'hui.' }
    }

    attendance.value.push({
      id: generateId(),
      courseId: course.id,
      studentUserId,
      tunnelId: tunnel.id,
      date: day,
      markedAt: new Date().toISOString(),
    })
    persistAttendance()
    return { ok: true, courseName: course.name }
  }

  function createCourse(data: {
    teacherId: string
    teacherName: string
    name: string
    subject: string
  }): Course {
    const now = new Date().toISOString()
    const course: Course = {
      id: generateId(),
      teacherId: data.teacherId,
      teacherName: data.teacherName,
      name: data.name.trim(),
      subject: data.subject.trim(),
      enrollmentCode: generateCode(),
      enrollmentPublishedAt: null,
      enrollmentSharedAt: null,
      studentUserIds: [],
      createdAt: now,
      updatedAt: now,
    }
    courses.value.unshift(course)
    persistCourses()
    return course
  }

  function updateCourse(id: string, updates: Partial<Pick<Course, 'name' | 'subject'>>) {
    const idx = courses.value.findIndex((c) => c.id === id)
    if (idx === -1) return
    courses.value[idx] = {
      ...courses.value[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    persistCourses()
  }

  function deleteCourse(id: string) {
    courses.value = courses.value.filter((c) => c.id !== id)
    attendance.value = attendance.value.filter((a) => a.courseId !== id)
    tunnels.value = tunnels.value.filter((t) => t.courseId !== id)
    persistCourses()
    persistAttendance()
    persistTunnels()
  }

  function isEnrolled(courseId: string, studentUserId: string): boolean {
    const course = getById(courseId)
    return course?.studentUserIds.includes(studentUserId) ?? false
  }

  function enrollStudent(courseId: string, studentUserId: string): { ok: true } | { ok: false; error: string } {
    const course = getById(courseId)
    if (!course) return { ok: false, error: 'Groupe introuvable.' }
    if (course.studentUserIds.includes(studentUserId)) {
      return { ok: false, error: 'Vous êtes déjà membre de ce groupe.' }
    }
    course.studentUserIds.push(studentUserId)
    course.updatedAt = new Date().toISOString()
    persistCourses()
    return { ok: true }
  }

  function addMemberByUserId(courseId: string, studentUserId: string): { ok: true } | { ok: false; error: string } {
    return enrollStudent(courseId, studentUserId)
  }

  function removeStudent(courseId: string, studentUserId: string) {
    const course = getById(courseId)
    if (!course) return
    course.studentUserIds = course.studentUserIds.filter((id) => id !== studentUserId)
    course.updatedAt = new Date().toISOString()
    attendance.value = attendance.value.filter(
      (a) => !(a.courseId === courseId && a.studentUserId === studentUserId)
    )
    persistCourses()
    persistAttendance()
  }

  function isPresent(courseId: string, studentUserId: string, date?: string): boolean {
    const day = date ?? getTodayDateString()
    return attendance.value.some(
      (a) => a.courseId === courseId && a.studentUserId === studentUserId && a.date === day
    )
  }

  function getAttendanceForCourse(courseId: string, date?: string): AttendanceRecord[] {
    const day = date ?? getTodayDateString()
    return attendance.value.filter((a) => a.courseId === courseId && a.date === day)
  }

  function getAttendanceHistoryForCourse(courseId: string): AttendanceRecord[] {
    return attendance.value
      .filter((a) => a.courseId === courseId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.markedAt.localeCompare(a.markedAt))
  }

  function getAttendanceHistoryForTeacher(teacherId: string): AttendanceRecord[] {
    const courseIds = new Set(getCoursesForTeacher(teacherId).map((c) => c.id))
    return attendance.value
      .filter((a) => courseIds.has(a.courseId))
      .sort((a, b) => b.date.localeCompare(a.date) || b.markedAt.localeCompare(a.markedAt))
  }

  function getAttendanceHistoryForStudent(studentUserId: string): AttendanceRecord[] {
    return attendance.value
      .filter((a) => a.studentUserId === studentUserId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.markedAt.localeCompare(a.markedAt))
  }

  function getAbsenceDaysForStudent(studentUserId: string): { courseId: string; courseName: string; date: string }[] {
    const courses = getCoursesForStudent(studentUserId)
    const absences: { courseId: string; courseName: string; date: string }[] = []

    for (const course of courses) {
      const datesWithSession = [
        ...new Set(
          attendance.value.filter((a) => a.courseId === course.id).map((a) => a.date)
        ),
      ]
      for (const date of datesWithSession) {
        if (!isPresent(course.id, studentUserId, date)) {
          absences.push({ courseId: course.id, courseName: course.name, date })
        }
      }
    }

    return absences.sort((a, b) => b.date.localeCompare(a.date))
  }

  const todayAttendanceCount = computed(() => {
    const day = getTodayDateString()
    return attendance.value.filter((a) => a.date === day).length
  })

  return {
    courses,
    attendance,
    tunnels,
    todayAttendanceCount,
    getCoursesForTeacher,
    ensureTeacherClass,
    getCoursesForStudent,
    getById,
    getByEnrollmentCode,
    getByShareCode,
    getActiveTunnel,
    startTunnel,
    stopTunnel,
    sharePresenceToClass,
    getSharedPresenceForStudent,
    generateClassEnrollment,
    shareClassEnrollment,
    getTunnelCodeRemainingSeconds,
    getTunnelSessionRemainingSeconds,
    joinTunnel,
    joinTunnelByShareCode,
    createCourse,
    updateCourse,
    deleteCourse,
    isEnrolled,
    enrollStudent,
    addMemberByUserId,
    removeStudent,
    isPresent,
    getAttendanceForCourse,
    getAttendanceHistoryForCourse,
    getAttendanceHistoryForTeacher,
    getAttendanceHistoryForStudent,
    getAbsenceDaysForStudent,
  }
})
