<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { isApiEnabled } from '@/config/features'
import { listEtablissements } from '@/api/catalog'
import { etablissementSelectOptions } from '@/data/universities'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { institutionLinkSelectOptions, affiliationStatusLabel } from '@/utils/institutionAffiliation'
import { FACULTY_OPTIONS, PROMOTION_OPTIONS } from '@/data/academic'
import { GraduationCap } from '@lucide/vue'
import { appToast } from '@/utils/toast'

const auth = useAuthStore()

const institutionKey = ref('')
const faculty = ref('')
const promotion = ref('')
const classroomLabel = ref('')
const saving = ref(false)

const apiInstitutionOptions = ref<{ value: string; label: string; disabled?: boolean }[]>([])
const institutionOptions = computed(() =>
  isApiEnabled() && apiInstitutionOptions.value.length
    ? apiInstitutionOptions.value
    : institutionLinkSelectOptions(),
)

onMounted(async () => {
  if (!isApiEnabled()) return
  try {
    const etabs = await listEtablissements()
    apiInstitutionOptions.value = etablissementSelectOptions(etabs)
  } catch {
    apiInstitutionOptions.value = []
  }
})
const facultyOptions = computed(() => FACULTY_OPTIONS.map((f) => ({ value: f, label: f })))
const promotionOptions = computed(() => PROMOTION_OPTIONS.map((p) => ({ value: p, label: p })))

const academic = computed(() => auth.currentUser?.studentAcademicAffiliation)

async function submitRequest() {
  if (!institutionKey.value || !faculty.value || !promotion.value) {
    appToast.warning('Choisissez université, faculté et niveau (ex. UCC · Droit · L2).')
    return
  }
  const label =
    institutionOptions.value.find((o) => o.value === institutionKey.value)?.label ??
    institutionKey.value
  saving.value = true
  const result = await auth.requestStudentAcademicAffiliation({
    institutionKey: institutionKey.value,
    institutionLabel: label,
    faculty: faculty.value,
    promotion: promotion.value,
    classroomLabel: classroomLabel.value || undefined,
  })
  saving.value = false
  if (!result.ok) {
    appToast.error(result.error)
    return
  }
  appToast.success('Enregistré. Vous pouvez continuer avec le code de vos profs.')
  institutionKey.value = ''
  faculty.value = ''
  promotion.value = ''
  classroomLabel.value = ''
}
</script>

<template>
  <AppCard class="p-4 sm:p-6 space-y-4">
    <div class="flex items-center gap-3">
      <GraduationCap class="w-5 h-5 text-accent shrink-0" />
      <div>
        <h2 class="font-semibold text-ink text-base">Mon parcours (optionnel)</h2>
        <p class="text-sm text-ink-muted">UCC · Droit · L2 — pour voir vos examens sans code.</p>
      </div>
    </div>

    <div v-if="academic" class="p-3 border border-line bg-paper-warm text-sm space-y-1">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-medium text-ink">{{ academic.faculty }} · {{ academic.promotion }}</span>
        <AppBadge :variant="academic.status === 'verified' ? 'success' : 'warning'">
          {{ affiliationStatusLabel(academic.status) }}
        </AppBadge>
      </div>
      <p class="text-ink-muted">{{ academic.institutionLabel }}</p>
    </div>

    <form v-else class="space-y-3" @submit.prevent="submitRequest">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppSelect
          v-model="institutionKey"
          label="Université"
          :options="institutionOptions"
          placeholder="UCC…"
        />
        <AppSelect v-model="faculty" label="Faculté" :options="facultyOptions" placeholder="Droit" />
        <AppSelect v-model="promotion" label="Niveau" :options="promotionOptions" placeholder="L2" />
        <AppInput v-model="classroomLabel" label="Classe (facultatif)" placeholder="Groupe A" />
      </div>
      <AppButton type="submit" class="w-full sm:w-auto min-h-11" :loading="saving">
        Enregistrer mon parcours
      </AppButton>
    </form>
  </AppCard>
</template>
