<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import DashboardSection from '@/components/layout/DashboardSection.vue'
import AppShimmerList from '@/components/loading/AppShimmerList.vue'
import { useTeacherEvaluationLists } from '@/composables/useTeacherEvaluationLists'

const {
  showShimmer,
  sessionColumns,
  sessionTableRows,
  sessionBadgeVariant,
  openSessionDetail,
} = useTeacherEvaluationLists()
</script>

<template>
  <DashboardPage>
    <DashboardSection spacing="loose">
      <div>
        <p class="label-caps mb-2">Espace enseignant</p>
        <h1 class="font-display text-3xl text-ink tracking-tight">Soumissions</h1>
        <p class="mt-1 text-sm text-ink-muted">
          {{ sessionTableRows.length }} copie(s) · cliquez une ligne pour voir et noter.
        </p>
      </div>
    </DashboardSection>

    <DashboardSection>
      <AppShimmerList v-if="showShimmer" variant="eval" :count="5" />
      <AppCard
        v-else
        title="Liste des soumissions"
        :subtitle="`${sessionTableRows.length} session(s)`"
        :hover="false"
      >
        <AppDataTable
          :columns="sessionColumns"
          :rows="sessionTableRows"
          empty-message="Aucune soumission encore. Les passages étudiants apparaîtront ici."
          :page-size="10"
          :page-sizes="[5, 10, 20, 50]"
          clickable
          @row-click="openSessionDetail"
        >
          <template #cell-status="{ row }">
            <AppBadge :variant="sessionBadgeVariant(row.statusKey)">
              {{ row.status }}
            </AppBadge>
          </template>
          <template #cell-alerts="{ row }">
            <AppBadge v-if="Number(row.violationCount) > 0" variant="danger">
              {{ row.alerts }} alerte(s)
            </AppBadge>
            <span v-else class="text-ink-faint">—</span>
          </template>
        </AppDataTable>
        <p class="mt-3 text-xs text-ink-muted">
          Cliquez une ligne pour ouvrir la page de détail / correction de la soumission.
        </p>
      </AppCard>
    </DashboardSection>
  </DashboardPage>
</template>
