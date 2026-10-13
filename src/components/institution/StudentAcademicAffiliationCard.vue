<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { isApiEnabled } from '@/config/features'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { affiliationStatusLabel } from '@/utils/institutionAffiliation'
import { useReferentielCatalog } from '@/composables/useReferentielCatalog'
import {
  isEtablissementKeySelectable,
  parseNumericReferentielId,
} from '@/utils/referentielOptions'
import { GraduationCap } from '@lucide/vue'
import { appToast } from '@/utils/toast'

const auth = useAuthStore()
const {
  catalog,
  etablissementOptions,
  promotionOptions,
  facultyOptionsFor,
  ensureBaseCatalog,
  ensureFaculties,
  defaultSelectableEtablissementId,
  getFlags,
} = useReferentielCatalog()

const institutionKey = ref('')
const facultyId = ref('')
const promotionId = ref('')
const classroomLabel = ref('')
const saving = ref(false)
const catalogReady = ref(!isApiEnabled())

const facultyOptions = computed(() => {
  const etabId = parseNumericReferentielId(institutionKey.value)
  return facultyOptionsFor(etabId)
})

const academic = computed(() => auth.currentUser?.studentAcademicAffiliation)

watch(institutionKey, async (key) => {
  facultyId.value = ''
  const etabId = parseNumericReferentielId(key)
  if (etabId != null) await ensureFaculties(etabId)
})

onMounted(async () => {
  if (!isApiEnabled()) {
    catalogReady.value = true
    return
  }
  await ensureBaseCatalog()
  if (!institutionKey.value) {
    institutionKey.value = defaultSelectableEtablissementId()
  }
  const etabId = parseNumericReferentielId(institutionKey.value)
  if (etabId != null) await ensureFaculties(etabId)
  catalogReady.value = true
})

function labelFor(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value
}

async function submitRequest() {
  if (!institutionKey.value || !facultyId.value || !promotionId.value) {
    appToast.warning('Choisissez université, faculté et niveau.')
    return
  }
  if (
    isApiEnabled() &&
    !isEtablissementKeySelectable(institutionKey.value, catalog.etablissements, getFlags)
  ) {
    appToast.warning('Cet établissement n’est pas disponible pour l’inscription.')
    return
  }

  const institutionLabel = labelFor(etablissementOptions.value, institutionKey.value)
  const faculty = labelFor(facultyOptions.value, facultyId.value)
  const promotion = labelFor(promotionOptions.value, promotionId.value)
  const facultyIdNum = parseNumericReferentielId(facultyId.value)
  const promotionIdNum = parseNumericReferentielId(promotionId.value)

  saving.value = true
  const result = await auth.requestStudentAcademicAffiliation({
    institutionKey: institutionKey.value,
    institutionLabel,
    faculty,
    promotion,
    facultyId: facultyIdNum ?? undefined,
    promotionId: promotionIdNum ?? undefined,
    classroomLabel: classroomLabel.value || undefined,
  })
  saving.value = false
  if (!result.ok) {
    appToast.error(result.error)
    return
  }
  appToast.success('Enregistré. Vous pouvez continuer avec le code de vos profs.')
  institutionKey.value = defaultSelectableEtablissementId()
  facultyId.value = ''
  promotionId.value = ''
  classroomLabel.value = ''
}
</script>

<template>
  <AppCard class="p-4 sm:p-6 space-y-4">
    <div class="flex items-center gap-3">
      <GraduationCap class="w-5 h-5 text-accent shrink-0" />
      <div>
        <h2 class="font-semibold text-ink text-base">Mon parcours (optionnel)</h2>
        <p class="text-sm text-ink-muted">Université, faculté et niveau : pour voir vos examens sans code.</p>
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
      <p v-if="isApiEnabled() && catalogReady && !etablissementOptions.length" class="text-sm text-ink-muted">
        Aucun établissement disponible. Contactez l’administrateur de la plateforme.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppSelect
          v-model="institutionKey"
          label="Université"
          :options="etablissementOptions"
          placeholder="Choisir…"
          :disabled="!catalogReady"
        />
        <AppSelect
          v-model="facultyId"
          label="Faculté"
          :options="facultyOptions"
          placeholder="Choisir…"
          :disabled="!institutionKey || !catalogReady"
        />
        <AppSelect
          v-model="promotionId"
          label="Niveau"
          :options="promotionOptions"
          placeholder="Choisir…"
          :disabled="!catalogReady"
        />
        <AppInput v-model="classroomLabel" label="Classe (facultatif)" placeholder="Groupe A" />
      </div>
      <AppButton
        type="submit"
        class="w-full sm:w-auto min-h-11"
        :loading="saving"
        :disabled="!catalogReady"
      >
        Enregistrer mon parcours
      </AppButton>
    </form>
  </AppCard>
</template>
