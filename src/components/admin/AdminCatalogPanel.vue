<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppShimmerList from '@/components/loading/AppShimmerList.vue'
import DashboardSection from '@/components/layout/DashboardSection.vue'
import { appToast } from '@/utils/toast'
import { missingFieldsMessage } from '@/utils/form'
import { BookOpen, Building2, Coins, GraduationCap, Plus } from '@lucide/vue'

const catalog = useCatalogStore()
const { showShimmer } = useServerShimmer(computed(() => catalog.loading))

const matiereName = ref('')
const matiereCode = ref('')
const creatingMatiere = ref(false)

const promoName = ref('')
const creatingPromo = ref(false)

const etabName = ref('')
const creatingEtab = ref(false)

const deviseName = ref('')
const deviseCode = ref('')
const deviseTaux = ref('')
const creatingDevise = ref(false)

onMounted(() => {
  void catalog.syncAll()
})

async function handleCreateMatiere() {
  if (!matiereName.value.trim()) {
    appToast.warning(missingFieldsMessage(['Nom']))
    return
  }
  creatingMatiere.value = true
  const result = await catalog.addMatiere(matiereName.value, matiereCode.value)
  creatingMatiere.value = false
  if (!result.ok) {
    appToast.error(result.error)
    return
  }
  appToast.success(`Matière « ${result.item.name} » créée.`)
  matiereName.value = ''
  matiereCode.value = ''
}

async function handleCreatePromo() {
  if (!promoName.value.trim()) {
    appToast.warning(missingFieldsMessage(['Nom']))
    return
  }
  creatingPromo.value = true
  const result = await catalog.addPromotion(promoName.value)
  creatingPromo.value = false
  if (!result.ok) {
    appToast.error(result.error)
    return
  }
  appToast.success(`Promotion « ${result.item.name} » créée.`)
  promoName.value = ''
}

async function handleCreateEtab() {
  if (!etabName.value.trim()) {
    appToast.warning(missingFieldsMessage(['Nom']))
    return
  }
  creatingEtab.value = true
  const result = await catalog.addEtablissement(etabName.value)
  creatingEtab.value = false
  if (!result.ok) {
    appToast.error(result.error)
    return
  }
  appToast.success(`Établissement « ${result.item.name} » créé.`)
  etabName.value = ''
}

async function handleCreateDevise() {
  if (!deviseName.value.trim()) {
    appToast.warning(missingFieldsMessage(['Nom']))
    return
  }
  creatingDevise.value = true
  const taux = deviseTaux.value.trim() ? Number(deviseTaux.value) : undefined
  const result = await catalog.addDevise(deviseName.value, deviseCode.value, Number.isFinite(taux) ? taux : undefined)
  creatingDevise.value = false
  if (!result.ok) {
    appToast.error(result.error)
    return
  }
  appToast.success(`Devise « ${result.item.name} » créée.`)
  deviseName.value = ''
  deviseCode.value = ''
  deviseTaux.value = ''
}
</script>

<template>
  <DashboardSection>
    <div class="mb-4">
      <p class="label-caps mb-1">Référentiels</p>
      <h2 class="font-display text-xl text-ink">Matières, promotions, établissements, devises</h2>
      <p class="mt-1 text-sm text-ink-muted">
        Création réservée à l’admin. Les listes (matières, promotions, établissements, devises) sont ensuite proposées dans les formulaires.
      </p>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <AppCard class="p-6 space-y-5">
        <div class="flex items-center gap-2">
          <BookOpen class="w-5 h-5 text-accent" />
          <h3 class="font-semibold text-ink">Matières</h3>
        </div>
        <p class="text-sm text-ink-muted">Créer une matière et consulter la liste.</p>
        <div class="grid sm:grid-cols-[1fr_7rem_auto] gap-3">
          <AppInput
            v-model="matiereName"
            label="Nom"
            placeholder="Droit civil"
            required
            @keyup.enter="handleCreateMatiere"
          />
          <AppInput v-model="matiereCode" label="Code" placeholder="DC" @keyup.enter="handleCreateMatiere" />
          <AppButton class="sm:self-end" :loading="creatingMatiere" @click="handleCreateMatiere">
            <Plus class="w-4 h-4" />
            Créer
          </AppButton>
        </div>
        <AppShimmerList v-if="showShimmer && !catalog.matieres.length" variant="row" :count="3" />
        <ul v-else-if="catalog.matieres.length" class="divide-y divide-line border border-line">
          <li
            v-for="item in catalog.matieres"
            :key="item.id"
            class="px-4 py-3 flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-sm font-medium text-ink">{{ item.name || `Matière #${item.id}` }}</p>
              <p class="text-xs text-ink-faint">
                id {{ item.id }}<span v-if="item.code"> · {{ item.code }}</span>
              </p>
            </div>
            <AppBadge :variant="item.active === false ? 'muted' : 'success'">
              {{ item.active === false ? 'Inactive' : 'Active' }}
            </AppBadge>
          </li>
        </ul>
        <p v-else class="text-sm text-ink-muted">Aucune matière.</p>
      </AppCard>

      <AppCard class="p-6 space-y-5">
        <div class="flex items-center gap-2">
          <GraduationCap class="w-5 h-5 text-accent" />
          <h3 class="font-semibold text-ink">Promotions</h3>
        </div>
        <p class="text-sm text-ink-muted">Créer une promotion et consulter la liste.</p>
        <div class="flex flex-col sm:flex-row gap-3">
          <AppInput
            v-model="promoName"
            label="Nom"
            placeholder="L2 Droit"
            class="flex-1"
            required
            @keyup.enter="handleCreatePromo"
          />
          <AppButton class="sm:self-end" :loading="creatingPromo" @click="handleCreatePromo">
            <Plus class="w-4 h-4" />
            Créer
          </AppButton>
        </div>
        <ul v-if="catalog.promotions.length" class="divide-y divide-line border border-line">
          <li
            v-for="item in catalog.promotions"
            :key="item.id"
            class="px-4 py-3 flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-sm font-medium text-ink">{{ item.name || `Promotion #${item.id}` }}</p>
              <p class="text-xs text-ink-faint">id {{ item.id }}</p>
            </div>
            <AppBadge :variant="item.active === false ? 'muted' : 'success'">
              {{ item.active === false ? 'Inactive' : 'Active' }}
            </AppBadge>
          </li>
        </ul>
        <p v-else class="text-sm text-ink-muted">Aucune promotion.</p>
      </AppCard>

      <AppCard class="p-6 space-y-5">
        <div class="flex items-center gap-2">
          <Building2 class="w-5 h-5 text-accent" />
          <h3 class="font-semibold text-ink">Établissements</h3>
        </div>
        <p class="text-sm text-ink-muted">Créer un établissement et consulter la liste.</p>
        <div class="flex flex-col sm:flex-row gap-3">
          <AppInput
            v-model="etabName"
            label="Nom"
            placeholder="Université catholique du Congo"
            class="flex-1"
            required
            @keyup.enter="handleCreateEtab"
          />
          <AppButton class="sm:self-end" :loading="creatingEtab" @click="handleCreateEtab">
            <Plus class="w-4 h-4" />
            Créer
          </AppButton>
        </div>
        <ul v-if="catalog.etablissements.length" class="divide-y divide-line border border-line">
          <li
            v-for="item in catalog.etablissements"
            :key="item.id"
            class="px-4 py-3 flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-sm font-medium text-ink">{{ item.name || `Établissement #${item.id}` }}</p>
              <p class="text-xs text-ink-faint">id {{ item.id }}</p>
            </div>
            <AppBadge :variant="item.active === false ? 'muted' : 'success'">
              {{ item.active === false ? 'Inactive' : 'Active' }}
            </AppBadge>
          </li>
        </ul>
        <p v-else class="text-sm text-ink-muted">Aucun établissement.</p>
      </AppCard>

      <AppCard class="p-6 space-y-5">
        <div class="flex items-center gap-2">
          <Coins class="w-5 h-5 text-accent" />
          <h3 class="font-semibold text-ink">Devises</h3>
        </div>
        <p class="text-sm text-ink-muted">Créer une devise et consulter la liste.</p>
        <div class="grid sm:grid-cols-2 gap-3">
          <AppInput
            v-model="deviseName"
            label="Nom"
            placeholder="Franc congolais"
            required
            @keyup.enter="handleCreateDevise"
          />
          <AppInput v-model="deviseCode" label="Code" placeholder="CDF" @keyup.enter="handleCreateDevise" />
          <AppInput
            v-model="deviseTaux"
            label="Taux local"
            type="number"
            placeholder="1"
            @keyup.enter="handleCreateDevise"
          />
          <AppButton class="sm:self-end" :loading="creatingDevise" @click="handleCreateDevise">
            <Plus class="w-4 h-4" />
            Créer
          </AppButton>
        </div>
        <ul v-if="catalog.devises.length" class="divide-y divide-line border border-line">
          <li
            v-for="item in catalog.devises"
            :key="item.id"
            class="px-4 py-3 flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-sm font-medium text-ink">{{ item.name || `Devise #${item.id}` }}</p>
              <p class="text-xs text-ink-faint">
                id {{ item.id }}
                <span v-if="item.code"> · {{ item.code }}</span>
                <span v-if="item.tauxLocal != null"> · taux {{ item.tauxLocal }}</span>
              </p>
            </div>
          </li>
        </ul>
        <p v-else class="text-sm text-ink-muted">Aucune devise.</p>
      </AppCard>
    </div>
  </DashboardSection>
</template>
