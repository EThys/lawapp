import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { UserRole } from '@/types/auth'

declare module 'vue-router' {
  interface RouteMeta {
    guest?: boolean
    requiresAuth?: boolean
    role?: UserRole
    hideLayout?: boolean
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
      path: '/teacher',
      name: 'teacher-dashboard',
      component: () => import('@/views/teacher/DashboardView.vue'),
      meta: { requiresAuth: true, role: 'teacher' },
    },
    {
      path: '/teacher/create',
      name: 'teacher-create',
      component: () => import('@/views/teacher/CreateEvaluationView.vue'),
      meta: { requiresAuth: true, role: 'teacher' },
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
      meta: { requiresAuth: true, role: 'teacher' },
    },
    {
      path: '/teacher/history',
      name: 'teacher-history',
      component: () => import('@/views/teacher/TeacherHistoryView.vue'),
      meta: { requiresAuth: true, role: 'teacher' },
    },
    {
      path: '/teacher/courses/:id',
      name: 'teacher-course',
      component: () => import('@/views/teacher/CourseDetailView.vue'),
      meta: { requiresAuth: true, role: 'teacher' },
    },
    {
      path: '/student',
      name: 'student-dashboard',
      component: () => import('@/views/student/StudentDashboardView.vue'),
      meta: { requiresAuth: true, role: 'student' },
    },
    {
      path: '/student/history',
      name: 'student-history',
      component: () => import('@/views/student/StudentHistoryView.vue'),
      meta: { requiresAuth: true, role: 'student' },
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
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
})

router.beforeEach((to, from) => {
  if (to.path !== from.path) {
    useUiStore().startRouteLoading()
  }

  const auth = useAuthStore()

  if (to.meta.guest && auth.isAuthenticated) {
    return auth.isTeacher ? '/teacher' : '/student'
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath,
        role: to.meta.role ?? 'teacher',
      },
    }
  }

  if (to.meta.role && auth.currentUser?.role !== to.meta.role) {
    return auth.isTeacher ? '/teacher' : auth.isStudent ? '/student' : '/login'
  }

  return true
})

router.afterEach(() => {
  useUiStore().finishRouteLoading()
})

export default router
