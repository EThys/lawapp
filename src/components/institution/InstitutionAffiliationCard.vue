<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { isApiEnabled } from '@/config/features'
import { listEtablissements } from '@/api/catalog'
import { etablissementSelectOptions } from '@/data/universities'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { useAuthStore } from '@/stores/auth'
import type { InstitutionAffiliation } from '@/types/auth'
import { institutionLinkSelectOptions, affiliationStatusLabel } from '@/utils/institutionAffiliation'
import { Building2 } from '@lucide/vue'
import { appToast } from '@/utils/toast'

const auth = useAuthStore()
const institutionKey = ref('')
const saving = ref(false)

const apiInstitutionOptions = ref<{ value: string; label: string; disabled?: boolean }[]>([])
const options = computed(() =>
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

const affiliation = computed((): InstitutionAffiliation | undefined =>
  auth.currentUser?.teacherInstitutionAffiliation,
)

async function submitRequest() {
  if (!institutionKey.value) {
    appToast.warning('Choisissez une université.')
    return
  }
  const label = options.value.find((o) => o.value === institutionKey.value)?.label ?? institutionKey.value
  saving.value = true
  const result = await auth.requestTeacherInstitutionAffiliation(institutionKey.value, label)
  saving.value = false
  if (!result.ok) {
    appToast.error(result.error)
    return
  }
  appToast.success('Demande envoyée. Vous pouvez publier librement en attendant.')
  institutionKey.value = ''
}
</script>

<template>
  <AppCard class="p-4 sm:p-6 space-y-4">
    <div class="flex items-center gap-3">
      <Building2 class="w-5 h-5 text-accent shrink-0" />
      <div>
        <h2 class="font-semibold text-ink text-base">Lien université (optionnel)</h2>
        <p class="text-sm text-ink-muted">Validation UCC, etc. — sans bloquer vos évaluations libres.</p>
      </div>
    </div>

    <div v-if="affiliation" class="flex flex-wrap items-center gap-2 p-3 border border-line bg-paper-warm text-sm">
      <span class="font-medium text-ink">{{ affiliation.institutionLabel }}</span>
      <AppBadge :variant="affiliation.status === 'verified' ? 'success' : 'warning'">
        {{ affiliationStatusLabel(affiliation.status) }}
      </AppBadge>
    </div>

    <div v-else class="flex flex-col sm:flex-row gap-2 sm:items-end">
      <AppSelect
        v-model="institutionKey"
        class="flex-1 min-w-0"
        label="Établissement"
        :options="options"
        placeholder="UCC…"
      />
      <AppButton size="sm" class="min-h-11 w-full sm:w-auto shrink-0" :loading="saving" @click="submitRequest">
        Demander
      </AppButton>
    </div>
  </AppCard>
</template>
