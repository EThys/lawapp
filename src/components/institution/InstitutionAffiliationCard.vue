<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { isApiEnabled } from '@/config/features'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { useAuthStore } from '@/stores/auth'
import type { InstitutionAffiliation } from '@/types/auth'
import { affiliationStatusLabel } from '@/utils/institutionAffiliation'
import { useReferentielCatalog } from '@/composables/useReferentielCatalog'
import { isEtablissementKeySelectable } from '@/utils/referentielOptions'
import { Building2 } from '@lucide/vue'
import { appToast } from '@/utils/toast'

const props = defineProps<{
  /** Établissement déjà choisi sur le profil enseignant (évite une 2e liste). */
  profileEtablissementId?: string
  profileEtablissementLabel?: string
}>()

const auth = useAuthStore()
const { catalog, etablissementOptions, ensureBaseCatalog, getFlags } = useReferentielCatalog()

const institutionKey = ref('')
const saving = ref(false)
const catalogReady = ref(!isApiEnabled())

onMounted(async () => {
  if (props.profileEtablissementId) {
    institutionKey.value = props.profileEtablissementId
  }
  if (!isApiEnabled()) {
    catalogReady.value = true
    return
  }
  await ensureBaseCatalog()
  catalogReady.value = true
})

const affiliation = computed((): InstitutionAffiliation | undefined =>
  auth.currentUser?.teacherInstitutionAffiliation,
)

const profileLabel = computed(
  () =>
    props.profileEtablissementLabel?.trim() ||
    etablissementOptions.value.find((o) => o.value === props.profileEtablissementId)?.label ||
    '',
)

const canUseProfileEtab = computed(
  () => !!props.profileEtablissementId && !!profileLabel.value && !affiliation.value,
)

async function submitRequest(key: string, label: string) {
  if (!key) {
    appToast.warning('Choisissez une université.')
    return
  }
  if (isApiEnabled() && !isEtablissementKeySelectable(key, catalog.etablissements, getFlags)) {
    appToast.warning('Cet établissement n’est pas disponible.')
    return
  }
  saving.value = true
  const result = await auth.requestTeacherInstitutionAffiliation(key, label)
  saving.value = false
  if (!result.ok) {
    appToast.error(result.error)
    return
  }
  appToast.success('Demande d’affiliation envoyée.')
  institutionKey.value = ''
}

async function submitFromProfile() {
  if (!canUseProfileEtab.value) return
  await submitRequest(props.profileEtablissementId!, profileLabel.value)
}

async function submitFromSelect() {
  const label =
    etablissementOptions.value.find((o) => o.value === institutionKey.value)?.label ??
    institutionKey.value
  await submitRequest(institutionKey.value, label)
}
</script>

<template>
  <AppCard class="p-4 sm:p-6 space-y-4">
    <div class="flex items-center gap-3">
      <Building2 class="w-5 h-5 text-accent shrink-0" />
      <div>
        <h2 class="font-semibold text-ink text-base">Demande d’affiliation</h2>
        <p class="text-sm text-ink-muted leading-relaxed">
          Demandez votre affiliation à un établissement. L’administration de l’établissement
          pourra confirmer ou refuser la demande.
        </p>
      </div>
    </div>

    <div v-if="affiliation" class="flex flex-wrap items-center gap-2 p-3 border border-line bg-paper-warm text-sm rounded-lg">
      <span class="font-medium text-ink">{{ affiliation.institutionLabel }}</span>
      <AppBadge :variant="affiliation.status === 'verified' ? 'success' : 'warning'">
        {{ affiliationStatusLabel(affiliation.status) }}
      </AppBadge>
    </div>

    <div v-else-if="canUseProfileEtab" class="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-line bg-paper-warm/80 rounded-lg">
      <p class="text-sm text-ink-muted flex-1 min-w-0">
        Établissement indiqué sur votre profil :
        <span class="font-medium text-ink">{{ profileLabel }}</span>
      </p>
      <AppButton size="sm" class="min-h-11 w-full sm:w-auto shrink-0" :loading="saving" @click="submitFromProfile">
        Demander l’affiliation
      </AppButton>
    </div>

    <div v-else class="flex flex-col sm:flex-row gap-2 sm:items-end">
      <AppSelect
        v-model="institutionKey"
        class="flex-1 min-w-0"
        label="Autre établissement (si différent du profil)"
        :options="etablissementOptions"
        placeholder="Choisir…"
        :disabled="!catalogReady"
      />
      <AppButton
        size="sm"
        class="min-h-11 w-full sm:w-auto shrink-0"
        :loading="saving"
        :disabled="!catalogReady"
        @click="submitFromSelect"
      >
        Demander l’affiliation
      </AppButton>
    </div>
  </AppCard>
</template>
