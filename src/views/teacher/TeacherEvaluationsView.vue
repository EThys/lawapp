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
import { Eye, PlusCircle, Trash2, Users } from '@lucide/vue'

const {
  showShimmer,
  myEvaluations,
  evaluationColumns,
  evaluationTableRows,
  evalBadgeVariant,
  deleteEval,
} = useTeacherEvaluationLists()
</script>

<template>
  <DashboardPage>
    <DashboardSection spacing="loose">
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p class="label-caps mb-2">Espace enseignant</p>
          <h1 class="font-display text-3xl text-ink tracking-tight">Évaluations</h1>
          <p class="mt-1 text-sm text-ink-muted">
            {{ myEvaluations.length }} évaluation(s) · ouvrez une fiche pour corriger ou partager.
          </p>
        </div>
        <RouterLink to="/teacher/create">
          <AppButton>
            <PlusCircle class="w-4 h-4" />
            Publier
          </AppButton>
        </RouterLink>
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
          :columns="evaluationColumns"
          :rows="evaluationTableRows"
          empty-message="Aucune évaluation pour le moment. Publiez-en une pour la voir ici."
          :page-size="10"
          :page-sizes="[5, 10, 20, 50]"
        >
          <template #cell-title="{ row }">
            <div class="min-w-0">
              <p class="font-medium text-ink truncate">{{ row.title }}</p>
              <p v-if="row.shared" class="text-[11px] font-mono font-semibold text-accent mt-0.5">
                {{ row.code }}
              </p>
              <p v-else class="text-[11px] text-ink-faint mt-0.5">Code non publié</p>
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
            <div class="text-xs leading-relaxed text-ink-muted whitespace-nowrap sm:whitespace-normal">
              <p>
                <span class="text-ink-faint">Ouverture · </span>
                <span class="text-ink">{{ row.opensAt || 'Immédiate' }}</span>
              </p>
              <p class="mt-0.5">
                <span class="text-ink-faint">Fermeture · </span>
                <span class="text-ink">{{ row.closesAt || 'Sans limite' }}</span>
              </p>
            </div>
          </template>
          <template #cell-details="{ row }">
            <span class="text-ink-muted">{{ row.details }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="inline-flex items-center justify-end gap-1.5" @click.stop>
              <RouterLink :to="`/teacher/evaluation/${row.id}#submissions`">
                <AppButton variant="outline" size="sm">
                  <Users class="w-4 h-4" />
                  Soumissions
                  <span v-if="row.submissionCount" class="tabular-nums">({{ row.submissionCount }})</span>
                </AppButton>
              </RouterLink>
              <RouterLink :to="`/teacher/evaluation/${row.id}`">
                <AppButton variant="outline" size="sm">
                  <Eye class="w-4 h-4" />
                  Détails
                </AppButton>
              </RouterLink>
              <AppButton variant="ghost" size="sm" @click="deleteEval(String(row.id))">
                <Trash2 class="w-4 h-4 text-danger" />
              </AppButton>
            </div>
          </template>
        </AppDataTable>
      </AppCard>
    </DashboardSection>
  </DashboardPage>
</template>
