<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import StudentFlowHeader from '@/components/layout/StudentFlowHeader.vue'
import AppRouteProgress from '@/components/loading/AppRouteProgress.vue'
import AppPageSkeleton from '@/components/loading/AppPageSkeleton.vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getRouteSkeletonVariant } from '@/utils/routeSkeleton'

const route = useRoute()

const hideLayout = computed(() => route.meta.hideLayout === true)
const showStudentFlowHeader = computed(
  () =>
    hideLayout.value &&
    route.meta.role === 'student' &&
    route.meta.hideStudentFlowHeader !== true
)
</script>

<template>
  <AppRouteProgress />

  <div class="min-h-screen flex flex-col bg-paper">
    <AppHeader v-if="!hideLayout" />
    <StudentFlowHeader v-if="showStudentFlowHeader" />
    <main class="flex-1">
      <RouterView v-slot="{ Component, route: r }">
        <Suspense v-if="Component">
          <template #default>
            <Transition name="page" mode="out-in">
              <component :is="Component" :key="r.path" />
            </Transition>
          </template>
          <template #fallback>
            <AppPageSkeleton
              :key="`skel-${r.path}`"
              :variant="getRouteSkeletonVariant(r)"
            />
          </template>
        </Suspense>
      </RouterView>
    </main>
    <AppFooter v-if="!hideLayout" />
  </div>
</template>
