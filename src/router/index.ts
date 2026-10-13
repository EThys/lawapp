import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { UserRole } from '@/types/auth'
import { INTENDED_ROLE_KEY, LAST_ACTIVE_ROLE_KEY } from '@/config/features'
import { readPendingRegistrationRole } from '@/utils/verificationSession'
import { hasInstitutionAccess } from '@/utils/platformAccess'

declare module 'vue-router' {
  interface RouteMeta {
    guest?: boolean
    requiresAuth?: boolean
    role?: UserRole
    /** Accès réservé aux comptes certifiés (super admin plateforme). */
    requiresCertified?: boolean
    /** Rôle au sein d’un établissement partenaire (dashboard /institution). */
    requiresInstitutionStaff?: boolean
    /** Accès au formulaire de profil sans qualité encore acquise. */
    profileCompletion?: boolean
    hideLayout?: boolean
    hideStudentFlowHeader?: boolean
    skeleton?: 'dashboard' | 'list' | 'detail' | 'form' | 'exam' | 'auth' | 'home'
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/discover',
      name: 'discover',
      component: () => import('@/views/discover/DiscoverView.vue'),
      meta: { hideLayout: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { guest: true, hideLayout: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: { guest: true, hideLayout: true },
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: () => import('@/views/auth/VerifyEmailView.vue'),
      meta: { guest: true, hideLayout: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/auth/ForgotPasswordView.vue'),
      meta: { guest: true, hideLayout: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/auth/ResetPasswordView.vue'),
      meta: { guest: true, hideLayout: true },
    },
    {
      path: '/onboarding/profile',
      name: 'profile-onboarding',
      component: () => import('@/views/onboarding/ProfileOnboardingView.vue'),
      meta: { requiresAuth: true, profileCompletion: true, hideLayout: true },
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('@/views/account/AccountSettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/admin/AdminDashboardView.vue'),
      meta: { requiresAuth: true, requiresCertified: true, skeleton: 'dashboard' },
    },
    {
      path: '/admin/evaluations',
      name: 'admin-evaluations',
      component: () => import('@/views/admin/AdminEvaluationsView.vue'),
      meta: { requiresAuth: true, requiresCertified: true, skeleton: 'list' },
    },
    {
      path: '/admin/submissions',
      name: 'admin-submissions',
      component: () => import('@/views/admin/AdminSubmissionsView.vue'),
      meta: { requiresAuth: true, requiresCertified: true, skeleton: 'list' },
    },
    {
      path: '/institution',
      name: 'institution-admin',
      component: () => import('@/views/institution/InstitutionDashboardView.vue'),
      meta: { requiresAuth: true, requiresInstitutionStaff: true, skeleton: 'dashboard' },
    },
    {
      path: '/categories',
      redirect: '/admin',
    },
    {
      path: '/quiz',
      name: 'quiz-list',
      component: () => import('@/views/quiz/QuizListView.vue'),
      meta: { hideLayout: true },
    },
    {
      path: '/quiz/create',
      name: 'quiz-create',
      component: () => import('@/views/quiz/QuizCreateView.vue'),
      meta: { requiresAuth: true, role: 'teacher', skeleton: 'form' },
    },
    {
      path: '/quiz/simple/create',
      redirect: '/quiz/create',
    },
    {
      path: '/quiz/:id',
      name: 'quiz-play',
      component: () => import('@/views/quiz/QuizPlayView.vue'),
      meta: { requiresAuth: true, hideLayout: true },
    },
    {
      path: '/documents',
      name: 'documents',
      component: () => import('@/views/documents/DocumentListView.vue'),
      meta: { hideLayout: true },
    },
    {
      path: '/documents/create',
      name: 'documents-create',
      component: () => import('@/views/documents/DocumentCreateView.vue'),
      meta: { requiresAuth: true, hideLayout: true },
    },
    {
      path: '/documents/:id',
      name: 'documents-detail',
      component: () => import('@/views/documents/DocumentDetailView.vue'),
      meta: { requiresAuth: true, hideLayout: true, skeleton: 'detail' },
    },
    {
      path: '/teacher',
      name: 'teacher-dashboard',
      component: () => import('@/views/teacher/DashboardView.vue'),
      meta: { requiresAuth: true, role: 'teacher' },
    },
    {
      path: '/teacher/evaluations',
      name: 'teacher-evaluations',
      component: () => import('@/views/teacher/TeacherEvaluationsView.vue'),
      meta: { requiresAuth: true, role: 'teacher', skeleton: 'list' },
    },
    {
      path: '/teacher/submissions',
      name: 'teacher-submissions',
      component: () => import('@/views/teacher/TeacherSubmissionsView.vue'),
      meta: { requiresAuth: true, role: 'teacher', skeleton: 'list' },
    },
    {
      path: '/teacher/profile',
      name: 'teacher-profile',
      component: () => import('@/views/teacher/TeacherProfileView.vue'),
      meta: { requiresAuth: true, profileCompletion: true },
    },
    {
      path: '/teacher/create',
      name: 'teacher-create',
      component: () => import('@/views/teacher/CreateEvaluationView.vue'),
      meta: { requiresAuth: true, role: 'teacher', skeleton: 'form' },
    },
    {
      path: '/teacher/evaluation/:id',
      name: 'teacher-evaluation',
      component: () => import('@/views/teacher/EvaluationDetailView.vue'),
      meta: { requiresAuth: true, role: 'teacher' },
    },
    {
      path: '/teacher/evaluation/:id/edit',
      name: 'teacher-edit',
      component: () => import('@/views/teacher/CreateEvaluationView.vue'),
      meta: { requiresAuth: true, role: 'teacher' },
    },
    {
      path: '/teacher/courses',
      name: 'teacher-courses',
      component: () => import('@/views/teacher/CoursesView.vue'),
      meta: { requiresAuth: true, role: 'teacher', skeleton: 'list' },
    },
    {
      path: '/teacher/history',
      name: 'teacher-history',
      component: () => import('@/views/teacher/TeacherHistoryView.vue'),
      meta: { requiresAuth: true, role: 'teacher', skeleton: 'list' },
    },
    {
      path: '/teacher/session/:sessionId',
      name: 'teacher-session',
      component: () => import('@/views/teacher/SessionDetailView.vue'),
      meta: { requiresAuth: true, role: 'teacher', skeleton: 'detail' },
    },
    {
      path: '/teacher/evaluation/:evaluationId/submission/:submissionId',
      name: 'teacher-submission',
      component: () => import('@/views/teacher/SessionDetailView.vue'),
      meta: { requiresAuth: true, role: 'teacher', skeleton: 'detail' },
    },
    {
      path: '/teacher/attendance',
      name: 'teacher-attendance',
      component: () => import('@/views/teacher/TeacherAttendanceView.vue'),
      meta: { requiresAuth: true, role: 'teacher', skeleton: 'list' },
    },
    {
      path: '/teacher/courses/:id',
      name: 'teacher-course',
      component: () => import('@/views/teacher/CourseDetailView.vue'),
      meta: { requiresAuth: true, role: 'teacher', skeleton: 'detail' },
    },
    {
      path: '/teacher/courses/:id/presence/:sessionId',
      name: 'teacher-presence-live',
      component: () => import('@/views/teacher/TeacherPresenceLiveView.vue'),
      meta: { requiresAuth: true, role: 'teacher', hideLayout: true },
    },
    {
      path: '/presence/check-in',
      name: 'presence-check-in',
      component: () => import('@/views/presence/PresenceCheckInView.vue'),
      meta: { requiresAuth: true, role: 'student' },
    },
    {
      path: '/presence/check-in/late',
      name: 'presence-late-attempt',
      component: () => import('@/views/presence/PresenceLateAttemptView.vue'),
      meta: { requiresAuth: true, role: 'student' },
    },
    {
      path: '/presence/relay/:sessionId',
      name: 'presence-relay',
      component: () => import('@/views/presence/PresenceRelayDisplayView.vue'),
      meta: { requiresAuth: true, role: 'student', hideLayout: true },
    },
    {
      path: '/student',
      name: 'student-dashboard',
      component: () => import('@/views/student/StudentDashboardView.vue'),
      meta: { requiresAuth: true, role: 'student', skeleton: 'dashboard' },
    },
    {
      path: '/student/profile',
      name: 'student-profile',
      component: () => import('@/views/student/StudentProfileView.vue'),
      meta: { requiresAuth: true, profileCompletion: true },
    },
    {
      path: '/student/history',
      name: 'student-history',
      component: () => import('@/views/student/StudentHistoryView.vue'),
      meta: { requiresAuth: true, role: 'student', skeleton: 'list' },
    },
    {
      path: '/student/calendar',
      name: 'student-calendar',
      component: () => import('@/views/student/StudentExamCalendarView.vue'),
      meta: { requiresAuth: true, role: 'student', skeleton: 'list' },
    },
    {
      path: '/student/attendance',
      name: 'student-attendance',
      component: () => import('@/views/student/StudentAttendanceView.vue'),
      meta: { requiresAuth: true, role: 'student', skeleton: 'list' },
    },
    {
      path: '/join/group',
      name: 'join-group',
      component: () => import('@/views/student/JoinCourseView.vue'),
      meta: { requiresAuth: true, role: 'student', hideLayout: true },
    },
    {
      path: '/join/group/:code',
      redirect: (to) => ({ path: '/join/group', query: { code: String(to.params.code) } }),
    },
    {
      path: '/join/network',
      redirect: (to) =>
        to.params.code
          ? { path: '/join/group', query: { code: String(to.params.code) } }
          : '/join/group',
    },
    {
      path: '/join/network/:code',
      redirect: (to) => ({ path: '/join/group', query: { code: String(to.params.code) } }),
    },
    {
      path: '/join/course',
      redirect: '/join/group',
    },
    {
      path: '/join/course/:code',
      redirect: (to) => ({ path: '/join/group', query: { code: String(to.params.code) } }),
    },
    {
      path: '/join/tunnel',
      name: 'join-tunnel',
      component: () => import('@/views/student/JoinTunnelView.vue'),
      meta: { requiresAuth: true, role: 'student', hideLayout: true },
    },
    {
      path: '/join/presence',
      redirect: '/join/tunnel',
    },
    {
      path: '/join/presence/:shareCode',
      name: 'join-presence',
      component: () => import('@/views/student/JoinTunnelView.vue'),
      meta: { requiresAuth: true, role: 'student', hideLayout: true },
    },
    {
      path: '/join/eval/:code',
      redirect: (to) => ({ path: '/student', query: { code: String(to.params.code) } }),
    },
    {
      path: '/join',
      redirect: '/student',
    },
    {
      path: '/join/:code',
      redirect: (to) => ({ path: '/student', query: { code: String(to.params.code) } }),
    },
    {
      path: '/exam/:sessionId/intro',
      name: 'exam-intro',
      component: () => import('@/views/student/ExamIntroView.vue'),
      meta: { requiresAuth: true, role: 'student', hideLayout: true, hideStudentFlowHeader: true },
    },
    {
      path: '/exam/:sessionId',
      name: 'exam',
      component: () => import('@/views/student/ExamView.vue'),
      meta: { requiresAuth: true, role: 'student', hideLayout: true, hideStudentFlowHeader: true },
    },
    {
      path: '/exam/:sessionId/result',
      name: 'exam-result',
      component: () => import('@/views/student/ExamResultView.vue'),
      meta: { requiresAuth: true, role: 'student', hideLayout: true, hideStudentFlowHeader: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
})

function hasQuality(auth: ReturnType<typeof useAuthStore>, role: UserRole): boolean {
  if (role === 'teacher') {
    return !!auth.currentUser?.hasTeacherProfile || auth.currentUser?.role === 'teacher'
  }
  return !!auth.currentUser?.hasStudentProfile || auth.currentUser?.role === 'student'
}

router.beforeEach((to, from) => {
  if (to.path !== from.path) {
    useUiStore().startRouteLoading()
  }

  const auth = useAuthStore()

  if (to.meta.guest && auth.isAuthenticated) {
    return auth.homePath()
  }

  if (to.name === 'profile-onboarding' && auth.isAuthenticated) {
    const u = auth.currentUser
    if (u?.hasTeacherProfile && u?.hasStudentProfile) {
      return auth.homePath()
    }
  }

  if (auth.isAuthenticated && auth.needsProfile) {
    const pendingRole = readPendingRegistrationRole(auth.currentUser?.email)
    if (pendingRole === 'teacher' && to.path.startsWith('/student/profile')) {
      return '/teacher/profile'
    }
    if (pendingRole === 'student' && to.path.startsWith('/teacher/profile')) {
      return '/student/profile'
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath,
        role: to.meta.role ?? (localStorage.getItem(INTENDED_ROLE_KEY) as string) ?? 'teacher',
      },
    }
  }

  if (to.meta.requiresCertified && auth.isAuthenticated && !auth.isCertified) {
    return '/account'
  }

  if (to.meta.requiresInstitutionStaff && auth.isAuthenticated && !hasInstitutionAccess(auth.currentUser)) {
    return '/account'
  }

  if (to.meta.profileCompletion && auth.isAuthenticated) {
    return true
  }

  if (to.meta.role && auth.isAuthenticated && !hasQuality(auth, to.meta.role)) {
    if (auth.needsProfile) {
      return to.meta.role === 'teacher' ? '/teacher/profile' : '/student/profile'
    }
    return auth.isTeacher ? '/teacher' : auth.isStudent ? '/student' : '/onboarding/profile'
  }

  return true
})

router.afterEach((to) => {
  useUiStore().finishRouteLoading()
  const auth = useAuthStore()
  if (to.path.startsWith('/teacher')) {
    localStorage.setItem(INTENDED_ROLE_KEY, 'teacher')
    localStorage.setItem(LAST_ACTIVE_ROLE_KEY, 'teacher')
    auth.applyWorkspaceFromRoute('teacher')
  } else if (to.path.startsWith('/presence')) {
    localStorage.setItem(INTENDED_ROLE_KEY, 'student')
    localStorage.setItem(LAST_ACTIVE_ROLE_KEY, 'student')
    auth.applyWorkspaceFromRoute('student')
  } else if (to.path.startsWith('/student')) {
    localStorage.setItem(INTENDED_ROLE_KEY, 'student')
    localStorage.setItem(LAST_ACTIVE_ROLE_KEY, 'student')
    auth.applyWorkspaceFromRoute('student')
  }
})

export default router
