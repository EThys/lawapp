<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useEvaluationStore } from '@/stores/evaluations'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { EVALUATION_TYPE_LABELS } from '@/types'
import { formatDate, getEvalShareUrl, isEvaluationAvailable, formatEvaluationPeriod, readFileAsDataUrl } from '@/utils/helpers'
import { downloadExcel, downloadPdf } from '@/utils/exportReports'
import { SESSION_STATUS_LABELS, VIOLATION_TYPE_LABELS } from '@/types'
import { FileText, Upload } from '@lucide/vue'
import {
  ArrowLeft,
  Copy,
  Check,
  Play,
  Pause,
  Download,
  Edit,
  Shield,
  Clock,
  Users,
  Share2,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const store = useEvaluationStore()
const auth = useAuthStore()
const courseStore = useCourseStore()

const evaluationId = route.params.id as string
const evaluation = computed(() => store.getById(evaluationId))
const linkedCourse = computed(() =>
  evaluation.value?.courseId ? courseStore.getById(evaluation.value.courseId) : undefined
)
const sessions = computed(() => store.getSessionsForEvaluation(evaluationId))

const copied = ref(false)
const copiedLink = ref(false)
const shareError = ref('')
const shareSuccess = ref('')
const sharing = ref(false)
const correctionError = ref('')
const correctionUploading = ref(false)

async function uploadCorrectionPdf(event: Event) {
  correctionError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.type !== 'application/pdf') {
    correctionError.value = 'Seuls les fichiers PDF sont acceptés.'
    return
  }
  correctionUploading.value = true
  try {
    const { dataUrl, fileName } = await readFileAsDataUrl(file, 5 * 1024 * 1024)
    store.updateEvaluation(evaluationId, {
      correctionPdfName: fileName,
      correctionPdfData: dataUrl,
      correctionPublished: false,
      correctionPublishedAt: null,
    })
  } catch (e) {
    correctionError.value = e instanceof Error ? e.message : 'Erreur lors du téléversement.'
  } finally {
    correctionUploading.value = false
    input.value = ''
  }
}

function publishCorrection() {
  if (!evaluation.value?.correctionPdfData) return
  store.updateEvaluation(evaluationId, {
    correctionPublished: true,
    correctionPublishedAt: new Date().toISOString(),
  })
}

function unpublishCorrection() {
  store.updateEvaluation(evaluationId, {
    correctionPublished: false,
    correctionPublishedAt: null,
  })
}

function removeCorrection() {
  if (!confirm('Supprimer le PDF de correction ?')) return
  store.updateEvaluation(evaluationId, {
    correctionPdfName: null,
    correctionPdfData: null,
    correctionPublished: false,
    correctionPublishedAt: null,
  })
}

function copyCode() {
  if (!evaluation.value) return
  navigator.clipboard.writeText(evaluation.value.code)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function copyLink() {
  if (!evaluation.value) return
  navigator.clipboard.writeText(getEvalShareUrl(evaluation.value.code))
  copiedLink.value = true
  setTimeout(() => (copiedLink.value = false), 2000)
}

function toggleStatus() {
  if (!evaluation.value) return
  const newStatus = evaluation.value.status === 'active' ? 'closed' : 'active'
  store.updateEvaluation(evaluationId, { status: newStatus })
}

function publishOrShare() {
  shareError.value = ''
  shareSuccess.value = ''
  sharing.value = true
  const result = evaluation.value?.courseId
    ? store.shareEvaluationToClass(evaluationId)
    : store.publishEvaluationCode(evaluationId)
  sharing.value = false
  if (!result.ok) {
    shareError.value = result.error
    return
  }
  shareSuccess.value = evaluation.value?.courseId
    ? 'Partagé à votre salle. Les étudiants voient le code sur leur app.'
    : 'Code d\'accès généré. Partagez-le à vos étudiants.'
}

function resultRows(): string[][] {
  if (!evaluation.value) return []
  return [
    ['Nom', 'Prénom', 'Identifiant', 'Score', 'Score max', 'Statut', 'Violations', 'Motifs', 'Durée (s)', 'Date'],
    ...sessions.value.map((s) => [
      s.studentLastName,
      s.studentFirstName,
      s.studentId,
      String(s.score ?? '-'),
      String(s.maxScore ?? '-'),
      SESSION_STATUS_LABELS[s.status as keyof typeof SESSION_STATUS_LABELS] ?? s.status,
      String(s.violations.length),
      s.violations.map((v) => `${VIOLATION_TYPE_LABELS[v.type]}: ${v.message}`).join(' · ') || '—',
      String(s.timeSpentSeconds),
      s.submittedAt ? formatDate(s.submittedAt) : '-',
    ]),
  ]
}

function exportResultsExcel() {
  if (!evaluation.value) return
  downloadExcel(resultRows(), `lawapp-${evaluation.value.code}-resultats.xlsx`, 'Résultats')
}

function exportResultsPdf() {
  if (!evaluation.value) return
  downloadPdf(`LawApp · ${evaluation.value.title}`, resultRows(), `lawapp-${evaluation.value.code}-resultats.pdf`)
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'À commencer',
    in_progress: 'En cours',
    submitted: 'Soumis',
    failed: 'Échoué',
    expired: 'Expiré',
  }
  return map[status] || status
}

function statusVariant(status: string) {
  const map: Record<string, 'brand' | 'success' | 'danger' | 'warning' | 'muted'> = {
    pending: 'warning',
    in_progress: 'brand',
    submitted: 'success',
    failed: 'danger',
    expired: 'warning',
  }
  return map[status] || 'muted'
}

if (!evaluation.value || evaluation.value.teacherId !== auth.currentUser?.id) {
  router.replace('/teacher')
}
</script>

<template>
  <div v-if="evaluation" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <RouterLink
      to="/teacher"
      class="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-800 mb-6 transition-colors"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour
    </RouterLink>

    <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
      <div>
        <div class="flex items-center gap-2 flex-wrap mb-2">
          <h1 class="text-3xl font-semibold text-surface-900">{{ evaluation.title }}</h1>
          <AppBadge variant="brand">{{ EVALUATION_TYPE_LABELS[evaluation.type] }}</AppBadge>
          <AppBadge :variant="evaluation.status === 'active' ? 'success' : evaluation.status === 'closed' ? 'danger' : 'muted'">
            {{ evaluation.status === 'active' ? 'Active' : evaluation.status === 'closed' ? 'Fermée' : 'Brouillon' }}
          </AppBadge>
          <AppBadge
            v-if="evaluation.availableFrom && !isEvaluationAvailable(evaluation)"
            variant="warning"
          >
            Ouverture · {{ formatDate(evaluation.availableFrom) }}
          </AppBadge>
          <AppBadge v-if="evaluation.requireEnrollment && linkedCourse" variant="brand">
            Groupe · {{ linkedCourse.name }}
          </AppBadge>
          <AppBadge v-if="evaluation.presentOnly" variant="warning">
            Présents uniquement
          </AppBadge>
          <AppBadge v-if="evaluation.availableFrom || evaluation.availableUntil" variant="brand">
            {{ formatEvaluationPeriod(evaluation) }}
          </AppBadge>
          <AppBadge v-if="evaluation.settings.correctionMode === 'manual'" variant="muted">
            Correction PDF
          </AppBadge>
        </div>
        <p class="text-surface-500">{{ evaluation.subject }} · {{ evaluation.teacherName }}</p>
        <p v-if="evaluation.description" class="text-surface-600 mt-2">{{ evaluation.description }}</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <RouterLink :to="`/teacher/evaluation/${evaluation.id}/edit`">
          <AppButton variant="outline" size="sm">
            <Edit class="w-4 h-4" />
            Modifier
          </AppButton>
        </RouterLink>
        <AppButton variant="outline" size="sm" @click="toggleStatus">
          <Play v-if="evaluation.status !== 'active'" class="w-4 h-4" />
          <Pause v-else class="w-4 h-4" />
          {{ evaluation.status === 'active' ? 'Fermer' : 'Activer' }}
        </AppButton>
        <AppButton variant="outline" size="sm" @click="exportResultsExcel">
          <Download class="w-4 h-4" />
          Export XLS
        </AppButton>
        <AppButton variant="outline" size="sm" @click="exportResultsPdf">
          <Download class="w-4 h-4" />
          Export PDF
        </AppButton>
      </div>
    </div>

    <!-- Share section -->
    <AppCard
      class="mb-8"
      :title="evaluation.courseId ? 'Partager à ma salle' : 'Code d\'accès'"
      :subtitle="evaluation.courseId
        ? 'Vos étudiants inscrits verront le code sur leur app'
        : 'Évaluation ouverte — partagez le code à vos étudiants'"
    >
      <div v-if="evaluation.status !== 'active'" class="text-sm text-ink-muted">
        Activez l'évaluation pour générer le code d'accès.
      </div>

      <div v-else-if="!evaluation.sharedToClassAt" class="space-y-4">
        <p class="text-sm text-ink-muted">
          <template v-if="evaluation.courseId">
            Cliquez pour partager à vos {{ linkedCourse?.studentUserIds.length ?? 0 }} étudiant(s) inscrit(s).
            Le code apparaîtra sur leur application.
          </template>
          <template v-else>
            Générez le code d'accès et communiquez-le à vos étudiants (oral, affichage, messagerie…).
            Aucune salle de classe requise.
          </template>
        </p>
        <AppButton :disabled="sharing" @click="publishOrShare">
          <Share2 class="w-4 h-4" />
          {{ sharing ? 'Génération…' : evaluation.courseId ? 'Partager à ma salle' : 'Générer le code d\'accès' }}
        </AppButton>
        <p v-if="shareError" class="text-sm text-danger">{{ shareError }}</p>
      </div>

      <div v-else class="space-y-6">
        <div class="flex items-center gap-2 flex-wrap">
          <AppBadge variant="success">
            {{ evaluation.courseId ? `Partagé à ${linkedCourse?.name}` : 'Code publié' }}
          </AppBadge>
          <AppBadge v-if="!evaluation.courseId" variant="muted">Évaluation ouverte</AppBadge>
        </div>
        <p v-if="shareSuccess" class="text-sm text-accent">{{ shareSuccess }}</p>

        <div class="grid lg:grid-cols-2 gap-6">
          <div class="p-4 border border-line bg-paper-warm">
            <p class="text-xs text-ink-muted uppercase tracking-wide mb-2">Code d'accès</p>
            <div class="flex items-center gap-4">
              <span class="text-3xl font-mono font-bold text-accent tracking-widest">{{ evaluation.code }}</span>
              <AppButton variant="outline" size="sm" @click="copyCode">
                <Check v-if="copied" class="w-4 h-4 text-success" />
                <Copy v-else class="w-4 h-4" />
                Copier
              </AppButton>
            </div>
          </div>

          <div class="p-4 border border-line bg-paper-warm">
            <p class="text-xs text-ink-muted uppercase tracking-wide mb-2">Lien direct</p>
            <div class="flex items-center gap-3">
              <code class="flex-1 text-sm bg-white px-3 py-2 border border-line truncate text-ink-muted">
                {{ getEvalShareUrl(evaluation.code) }}
              </code>
              <AppButton variant="outline" size="sm" @click="copyLink">
                <Check v-if="copiedLink" class="w-4 h-4 text-success" />
                <Copy v-else class="w-4 h-4" />
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- Info cards -->
    <div class="grid sm:grid-cols-3 gap-4 mb-8">
      <AppCard padding="sm" class="flex items-center gap-3">
        <Clock class="w-5 h-5 text-brand-600" />
        <div>
          <p class="text-sm text-surface-500">Durée</p>
          <p class="font-semibold">{{ evaluation.durationMinutes }} min</p>
        </div>
      </AppCard>
      <AppCard padding="sm" class="flex items-center gap-3">
        <Users class="w-5 h-5 text-brand-600" />
        <div>
          <p class="text-sm text-surface-500">Sessions</p>
          <p class="font-semibold">{{ sessions.length }}</p>
        </div>
      </AppCard>
      <AppCard padding="sm" class="flex items-center gap-3">
        <Shield class="w-5 h-5 text-accent" />
        <div>
          <p class="text-sm text-ink-muted">Disponibilité</p>
          <p class="font-semibold text-sm">{{ formatEvaluationPeriod(evaluation) }}</p>
        </div>
      </AppCard>
    </div>

    <!-- Correction PDF (mode manuel) -->
    <AppCard
      v-if="evaluation.settings.correctionMode === 'manual'"
      title="Correction PDF"
      subtitle="Téléversez et publiez la correction pour vos étudiants"
      class="mb-8"
    >
      <div class="space-y-4">
        <p class="text-sm text-ink-muted">
          Les étudiants pourront télécharger ce PDF depuis leur espace une fois publié.
        </p>

        <div v-if="evaluation.correctionPdfName" class="p-4 border border-line bg-paper-warm flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <FileText class="w-5 h-5 text-accent" />
            <div>
              <p class="text-sm font-medium text-ink">{{ evaluation.correctionPdfName }}</p>
              <p v-if="evaluation.correctionPublished" class="text-xs text-accent">
                Publié · {{ evaluation.correctionPublishedAt ? formatDate(evaluation.correctionPublishedAt) : '' }}
              </p>
              <p v-else class="text-xs text-ink-muted">Brouillon (non visible par les étudiants)</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <AppButton v-if="!evaluation.correctionPublished" size="sm" @click="publishCorrection">
              Publier aux étudiants
            </AppButton>
            <AppButton v-else variant="outline" size="sm" @click="unpublishCorrection">
              Dépublier
            </AppButton>
            <AppButton variant="ghost" size="sm" @click="removeCorrection">Supprimer</AppButton>
          </div>
        </div>

        <label class="inline-flex items-center gap-2 cursor-pointer">
          <Upload class="w-4 h-4 text-accent" />
          <span class="text-sm text-accent font-medium">{{ evaluation.correctionPdfName ? 'Remplacer le PDF' : 'Importer un PDF' }}</span>
          <input
            type="file"
            accept="application/pdf"
            class="hidden"
            :disabled="correctionUploading"
            @change="uploadCorrectionPdf"
          />
        </label>
        <p v-if="correctionError" class="text-sm text-danger">{{ correctionError }}</p>
      </div>
    </AppCard>

    <!-- Results table -->
    <AppCard title="Résultats des étudiants" :subtitle="`${sessions.length} session(s)`">
      <div v-if="sessions.length === 0" class="text-center py-8 text-surface-500">
        Aucune session pour le moment. Partagez le code à vos étudiants.
      </div>

      <div v-else class="overflow-x-auto -mx-6">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200 text-left text-surface-500">
              <th class="px-6 py-3 font-medium">Étudiant</th>
              <th class="px-6 py-3 font-medium">Identifiant</th>
              <th class="px-6 py-3 font-medium">Score</th>
              <th class="px-6 py-3 font-medium">Statut</th>
              <th class="px-6 py-3 font-medium">Violations</th>
              <th class="px-6 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="session in sessions"
              :key="session.id"
              class="border-b border-surface-100 hover:bg-surface-50/50"
            >
              <td class="px-6 py-3 font-medium text-surface-900">
                {{ session.studentLastName }} {{ session.studentFirstName }}
              </td>
              <td class="px-6 py-3 text-surface-600">{{ session.studentId }}</td>
              <td class="px-6 py-3">
                <span v-if="session.score !== undefined">
                  {{ session.score }}/{{ session.maxScore }}
                  <span class="text-surface-400">
                    ({{ Math.round((session.score / (session.maxScore || 1)) * 100) }}%)
                  </span>
                </span>
                <span v-else class="text-surface-400">n/a</span>
              </td>
              <td class="px-6 py-3">
                <AppBadge :variant="statusVariant(session.status)">
                  {{ statusLabel(session.status) }}
                </AppBadge>
              </td>
              <td class="px-6 py-3">
                <span :class="session.violations.length > 0 ? 'text-danger font-medium' : 'text-surface-400'">
                  {{ session.violations.length }}
                </span>
              </td>
              <td class="px-6 py-3 text-surface-500">
                {{ session.submittedAt ? formatDate(session.submittedAt) : formatDate(session.startedAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>
  </div>
</template>
