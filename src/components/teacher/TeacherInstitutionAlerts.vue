<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useEvaluationStore } from '@/stores/evaluations'
import { evaluationInstitutionPending, affiliationStatusLabel } from '@/utils/institutionAffiliation'
import { AlertCircle } from '@lucide/vue'

const auth = useAuthStore()
const evalStore = useEvaluationStore()

const affiliation = computed(() => auth.currentUser?.teacherInstitutionAffiliation)

const pendingEvaluations = computed(() => {
  const uid = auth.currentUser?.id
  if (!uid) return []
  return evalStore.getTeacherEvaluationsSorted(uid).filter((e) => evaluationInstitutionPending(e))
})

const showPanel = computed(
  () => affiliation.value?.status === 'pending' || pendingEvaluations.value.length > 0,
)
</script>

<template>
  <AppCard
    v-if="showPanel"
    class="p-4 mb-6 border-warning/35 bg-warning-bg/25"
    :hover="false"
  >
    <div class="flex gap-3">
      <AlertCircle class="w-5 h-5 text-warning shrink-0" />
      <div class="min-w-0 space-y-2 text-sm">
        <p class="font-medium text-ink">En attente de validation</p>
        <p class="text-ink-muted">
          Vos évaluations <strong class="font-medium text-ink">libres</strong> ne sont pas concernées.
        </p>
        <ul class="space-y-1.5 text-ink-muted">
          <li v-if="affiliation?.status === 'pending'" class="flex flex-wrap items-center gap-2">
            Profil {{ affiliation.institutionLabel }}
            <AppBadge variant="warning">{{ affiliationStatusLabel(affiliation.status) }}</AppBadge>
            <RouterLink to="/teacher/profile" class="text-accent text-xs font-medium">Profil →</RouterLink>
          </li>
          <li v-for="ev in pendingEvaluations.slice(0, 3)" :key="ev.id">
            Brouillon · {{ ev.title }}
            <RouterLink :to="`/teacher/evaluation/${ev.id}`" class="text-accent text-xs font-medium ml-1">
              Ouvrir
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </AppCard>
</template>
