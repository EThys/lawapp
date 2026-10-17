<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import DashboardSection from '@/components/layout/DashboardSection.vue'
import AppShimmerList from '@/components/loading/AppShimmerList.vue'
import { useTeacherEvaluationLists } from '@/composables/useTeacherEvaluationLists'
import { Eye } from '@lucide/vue'

const {
  showShimmer,
  myEvaluations,
  evaluationColumns,
  evaluationTableRows,
  evalBadgeVariant,
} = useTeacherEvaluationLists()

const listColumns = evaluationColumns.filter((c) => c.key !== 'actions')
</script>

<template>
  <DashboardPage>
    <DashboardSection spacing="loose">
      <div>
        <p class="label-caps mb-2">Administration</p>
        <h1 class="font-display text-3xl text-ink tracking-tight">Évaluations</h1>
        <p class="mt-1 text-sm text-ink-muted">
          {{ myEvaluations.length }} évaluation(s) publiées en ligne.
        </p>
      </div>
    </DashboardSection>

    <DashboardSection>
      <AppShimmerList v-if="showShimmer" variant="eval" :count="5" />
      <AppCard
        v-else
        title="Liste des évaluations"
        :subtitle="`${myEvaluations.length} évaluation(s)`"
        :hover="false"
      >
        <AppDataTable
          :columns="listColumns"
          :rows="evaluationTableRows"
          empty-message="Aucune évaluation publiée en ligne."
          :page-size="10"
          :page-sizes="[5, 10, 20, 50]"
        >
          <template #cell-title="{ row }">
            <div class="min-w-0">
              <p class="font-medium text-ink truncate">{{ row.title }}</p>
              <p class="text-[11px] font-mono text-ink-faint mt-0.5">{{ row.code }}</p>
            </div>
          </template>
          <template #cell-type="{ row }">
            <AppBadge variant="brand">{{ row.type }}</AppBadge>
          </template>
          <template #cell-status="{ row }">
            <AppBadge :variant="evalBadgeVariant(row.statusKey)">
              {{ row.status }}
            </AppBadge>
          </template>
          <template #cell-deadline="{ row }">
            <div class="text-xs leading-relaxed text-ink-muted">
              <p>Ouverture · {{ row.opensAt || 'Immédiate' }}</p>
              <p class="mt-0.5">Fermeture · {{ row.closesAt || 'Sans limite' }}</p>
            </div>
          </template>
          <template #cell-details="{ row }">
            <div class="flex items-center justify-between gap-2">
              <span class="text-ink-muted">{{ row.details }}</span>
              <RouterLink :to="`/teacher/evaluation/${row.id}`">
                <AppButton variant="outline" size="sm">
                  <Eye class="w-4 h-4" />
                  Voir
                </AppButton>
              </RouterLink>
            </div>
          </template>
        </AppDataTable>
      </AppCard>
    </DashboardSection>
  </DashboardPage>
</template>
