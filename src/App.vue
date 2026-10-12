<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import StudentFlowHeader from '@/components/layout/StudentFlowHeader.vue'
import TeacherShell from '@/components/layout/TeacherShell.vue'
import StudentShell from '@/components/layout/StudentShell.vue'
import AdminShell from '@/components/layout/AdminShell.vue'
import AppRouteProgress from '@/components/loading/AppRouteProgress.vue'
import AppPageSkeleton from '@/components/loading/AppPageSkeleton.vue'
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getRouteSkeletonVariant } from '@/utils/routeSkeleton'
import { isApiEnabled } from '@/config/features'
import { useAuthStore } from '@/stores/auth'
import { useEvaluationStore } from '@/stores/evaluations'

const route = useRoute()
const auth = useAuthStore()
const evalStore = useEvaluationStore()

const hideLayout = computed(() => route.meta.hideLayout === true)
const isAdminArea = computed(
  () =>
    auth.isCertified &&
    (route.path === '/admin' || route.path.startsWith('/admin/')),
)
const isTeacherArea = computed(
  () =>
    !isAdminArea.value &&
    auth.isTeacher &&
    (route.path === '/teacher' ||
      route.path.startsWith('/teacher/') ||
      route.path === '/quiz/create' ||
      route.path === '/account' ||
      route.path.startsWith('/account/')),
)
const isStudentArea = computed(
  () =>
    auth.isStudent &&
    !isTeacherArea.value &&
    !isAdminArea.value &&
    (route.path === '/student' ||
      route.path.startsWith('/student/') ||
      route.path === '/account' ||
      route.path.startsWith('/account/')),
)
const showStudentFlowHeader = computed(
  () =>
    hideLayout.value &&
    route.meta.role === 'student' &&
    route.meta.hideStudentFlowHeader !== true,
)
const showPublicChrome = computed(
  () =>
    !hideLayout.value &&
    !isTeacherArea.value &&
    !isStudentArea.value &&
    !isAdminArea.value,
)

async function syncApiData() {
  if (!isApiEnabled() || !auth.isAuthenticated) return
  const workspace = auth.activeWorkspace
  if (auth.isCertified || workspace === 'teacher') {
    await evalStore.syncFromApi()
    await evalStore.syncAllTeacherSubmissions()
  } else if (workspace === 'student') {
    // Catalogue « à répondre » uniquement — le passage se charge au démarrage de l’examen.
    await evalStore.syncStudentCatalog()
    await evalStore.refreshMySubmissionsForStudent()
  }
}

onMounted(() => {
  void syncApiData()
})

watch(
  () => auth.isAuthenticated,
  (loggedIn) => {
    if (loggedIn) void syncApiData()
  },
)

watch(
  () => auth.activeWorkspace,
  (ws, prev) => {
    if (ws && ws !== prev && auth.isAuthenticated) void syncApiData()
  },
)
</script>

<template>
  <AppRouteProgress />

  <Toaster
    position="top-right"
    rich-colors
    close-button
    :toast-options="{
      class: 'lawapp-toast',
    }"
  />

  <div class="min-h-app flex flex-col flex-1 w-full min-w-0 bg-paper">
    <AppHeader v-if="showPublicChrome" />
    <StudentFlowHeader v-if="showStudentFlowHeader" />

    <AdminShell v-if="isAdminArea" class="flex-1 w-full min-w-0">
      <main class="app-shell-page">
        <RouterView v-slot="{ Component, route: r }">
          <Suspense v-if="Component" :key="r.fullPath">
            <component :is="Component" />
            <template #fallback>
              <AppPageSkeleton :variant="getRouteSkeletonVariant(r)" />
            </template>
          </Suspense>
        </RouterView>
      </main>
    </AdminShell>

    <TeacherShell v-else-if="isTeacherArea" class="flex-1 w-full min-w-0">
      <main class="app-shell-page">
        <RouterView v-slot="{ Component, route: r }">
          <Suspense v-if="Component" :key="r.fullPath">
            <component :is="Component" />
            <template #fallback>
              <AppPageSkeleton :variant="getRouteSkeletonVariant(r)" />
            </template>
          </Suspense>
        </RouterView>
      </main>
    </TeacherShell>

    <StudentShell v-else-if="isStudentArea" class="flex-1 w-full min-w-0">
      <main class="app-shell-page">
        <RouterView v-slot="{ Component, route: r }">
          <Suspense v-if="Component" :key="r.fullPath">
            <component :is="Component" />
            <template #fallback>
              <AppPageSkeleton :variant="getRouteSkeletonVariant(r)" />
            </template>
          </Suspense>
        </RouterView>
      </main>
    </StudentShell>

    <main v-else class="flex-1">
      <RouterView v-slot="{ Component, route: r }">
        <Suspense v-if="Component" :key="r.fullPath">
          <component :is="Component" />
          <template #fallback>
            <AppPageSkeleton :variant="getRouteSkeletonVariant(r)" />
          </template>
        </Suspense>
      </RouterView>
    </main>

    <AppFooter v-if="showPublicChrome" />
  </div>
</template>
