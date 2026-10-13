<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTeacherStore } from '@/stores/teachers'
import { useCategoryStore } from '@/stores/categories'
import { useDocumentStore } from '@/stores/documents'
import { isApiEnabled } from '@/config/features'
import { useServerShimmer } from '@/composables/useServerShimmer'
import AppShimmerList from '@/components/loading/AppShimmerList.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import DashboardSection from '@/components/layout/DashboardSection.vue'
import AdminCatalogPanel from '@/components/admin/AdminCatalogPanel.vue'
import {
  AlertCircle,
  GraduationCap,
  Link2,
  Plus,
  Shield,
  Tags,
  UserCheck,
  UserCog,
} from '@lucide/vue'
import { dismissKeyboard, missingFieldsMessage } from '@/utils/form'
import { appToast } from '@/utils/toast'

const router = useRouter()
const auth = useAuthStore()
const teacherStore = useTeacherStore()
const categoryStore = useCategoryStore()
const docStore = useDocumentStore()

const apiMode = computed(() => isApiEnabled())
const { showShimmer: teachersShimmer } = useServerShimmer(computed(() => teacherStore.loading))
const { showShimmer: categoriesShimmer } = useServerShimmer(computed(() => categoryStore.loading))

const recoverUserId = ref('')
const recoverMessage = ref('')
const recoverError = ref('')
const recoverLoading = ref(false)

const certifyUserId = ref('')
const certifyState = ref(true)
const certifyMessage = ref('')
const certifyError = ref('')
const certifyLoading = ref(false)

const teacherValidateId = ref('')
const teacherValidateState = ref(true)
const teacherValidateMessage = ref('')
const teacherValidateError = ref('')

const newCategoryName = ref('')
const createCategoryError = ref('')
const createCategorySuccess = ref('')
const creatingCategory = ref(false)

const linkDocumentId = ref('')
const linkCategoryId = ref('')
const linkError = ref('')
const linkSuccess = ref('')
const linking = ref(false)

const categoryOptions = computed(() =>
  categoryStore.activeCategories.map((c) => ({
    value: String(c.id),
    label: c.name?.trim() || `Catégorie ${c.id}`,
  })),
)

const documentOptions = computed(() =>
  docStore.documents.map((d) => ({
    value: String(d.id),
    label: d.title?.trim() || `Document #${d.id}`,
  })),
)

onMounted(async () => {
  if (!auth.isCertified) {
    await router.replace('/account')
    return
  }
  if (!apiMode.value) return
  await Promise.all([
    teacherStore.loadAllTeachers(),
    categoryStore.syncCategories(),
    categoryStore.syncCategorieContenus(),
    categoryStore.syncDocumentCategories(),
    docStore.fetchList(),
  ])
})

async function handleRecoverUser() {
  recoverError.value = ''
  recoverMessage.value = ''
  const id = Number(recoverUserId.value)
  recoverLoading.value = true
  const result = await auth.recoverUser(id)
  recoverLoading.value = false
  if (!result.ok) {
    recoverError.value = result.error
    appToast.error(result.error)
    return
  }
  recoverMessage.value = result.message ?? 'Compte récupéré.'
  appToast.success(recoverMessage.value)
  recoverUserId.value = ''
}

async function handleCertifyUser() {
  certifyError.value = ''
  certifyMessage.value = ''
  const id = Number(certifyUserId.value)
  certifyLoading.value = true
  const result = await auth.certifyUser(id, certifyState.value)
  certifyLoading.value = false
  if (!result.ok) {
    certifyError.value = result.error
    appToast.error(result.error)
    return
  }
  certifyMessage.value = result.message ?? 'Certification mise à jour.'
  appToast.success(certifyMessage.value)
  certifyUserId.value = ''
}

async function handleValidateTeacher() {
  teacherValidateError.value = ''
  teacherValidateMessage.value = ''
  const id = Number(teacherValidateId.value)
  const result = await teacherStore.validateTeacher(id, teacherValidateState.value)
  if (!result.ok) {
    teacherValidateError.value = result.error
    appToast.error(result.error)
    return
  }
  teacherValidateMessage.value = result.message ?? 'Validation mise à jour.'
  appToast.success(teacherValidateMessage.value)
  teacherValidateId.value = ''
}

async function handleCreateCategory() {
  dismissKeyboard()
  createCategoryError.value = ''
  createCategorySuccess.value = ''
  if (!newCategoryName.value.trim()) {
    createCategoryError.value = missingFieldsMessage(['Nom'])
    appToast.warning(createCategoryError.value)
    return
  }
  creatingCategory.value = true
  const result = await categoryStore.createCategory(newCategoryName.value)
  creatingCategory.value = false
  if (!result.ok) {
    createCategoryError.value = result.error
    appToast.error(result.error)
    return
  }
  createCategorySuccess.value = `Catégorie « ${result.category.name} » créée.`
  appToast.success(createCategorySuccess.value)
  newCategoryName.value = ''
}

async function handleLinkDocument() {
  linkError.value = ''
  linkSuccess.value = ''
  const documentId = Number(linkDocumentId.value)
  const categoryId = Number(linkCategoryId.value)
  if (!documentId || !categoryId) {
    linkError.value = 'Choisissez un document et une catégorie.'
    appToast.warning(linkError.value)
    return
  }
  linking.value = true
  const result = await categoryStore.linkDocumentToCategory(documentId, categoryId)
  linking.value = false
  if (!result.ok) {
    linkError.value = result.error
    appToast.error(result.error)
    return
  }
  linkSuccess.value = 'Document lié à la catégorie.'
  appToast.success(linkSuccess.value)
}
</script>

<template>
  <DashboardPage>
    <div class="max-w-4xl mx-auto space-y-8">
      <DashboardSection spacing="loose" variant="intro">
        <p class="label-caps mb-2">Super admin plateforme</p>
        <h1 class="font-display text-3xl text-brand-dark tracking-tight">Tableau de bord</h1>
        <p class="mt-2 text-sm text-ink-muted leading-relaxed">
          Référentiels globaux, visibilité des universités (GET public), catégories. Les admins de chaque
          université utilisent <strong class="font-medium text-ink">/institution</strong> (rôles établissement).
        </p>
        <div class="mt-3">
          <AppBadge variant="success">Compte certifié</AppBadge>
        </div>
      </DashboardSection>

      <div v-if="!apiMode" class="dashboard-row text-sm text-ink-muted">
        Activez <code class="text-accent">VITE_USE_API=true</code> pour les actions admin.
      </div>

      <template v-else>
        <AdminCatalogPanel />

        <DashboardSection>
          <AppCard class="p-6 space-y-5">
            <div class="flex items-center gap-2">
              <Tags class="w-5 h-5 text-accent" />
              <h2 class="font-semibold text-ink">Catégories</h2>
            </div>
            <p class="text-sm text-ink-muted">Créer et lister les catégories.</p>

            <div class="flex flex-col sm:flex-row gap-3">
              <AppInput
                v-model="newCategoryName"
                label="Nom"
                placeholder="Droit civil"
                class="flex-1"
                required
                @keyup.enter="handleCreateCategory"
              />
              <AppButton class="sm:self-end" :loading="creatingCategory" @click="handleCreateCategory">
                <Plus class="w-4 h-4" />
                Créer
              </AppButton>
            </div>
            <div v-if="createCategoryError" class="flex items-start gap-2 text-sm text-danger">
              <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
              {{ createCategoryError }}
            </div>
            <p v-if="createCategorySuccess" class="text-sm text-accent">{{ createCategorySuccess }}</p>

            <AppShimmerList v-if="categoriesShimmer" variant="row" :count="4" />
            <div v-else-if="categoryStore.error" class="text-sm text-danger">{{ categoryStore.error }}</div>
            <ul v-else-if="categoryStore.categories.length" class="divide-y divide-line border border-line">
              <li
                v-for="cat in categoryStore.categories"
                :key="cat.id"
                class="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p class="text-sm font-medium text-ink">{{ cat.name || `Catégorie #${cat.id}` }}</p>
                  <p class="text-xs text-ink-faint">id {{ cat.id }}</p>
                </div>
                <AppBadge :variant="cat.active === false ? 'muted' : 'success'">
                  {{ cat.active === false ? 'Inactive' : 'Active' }}
                </AppBadge>
              </li>
            </ul>
            <p v-else class="text-sm text-ink-muted">Aucune catégorie.</p>
          </AppCard>
        </DashboardSection>

        <DashboardSection>
          <AppCard class="p-6 space-y-5">
            <div class="flex items-center gap-2">
              <Link2 class="w-5 h-5 text-accent" />
              <h2 class="font-semibold text-ink">Lier document ↔ catégorie</h2>
            </div>
            <p class="text-sm text-ink-muted">Associer un document à une catégorie.</p>
            <AppSelect
              v-model="linkDocumentId"
              label="Document"
              :options="documentOptions"
              placeholder="Choisir…"
            />
            <AppSelect
              v-model="linkCategoryId"
              label="Catégorie"
              :options="categoryOptions"
              placeholder="Choisir…"
            />
            <AppButton :loading="linking" @click="handleLinkDocument">Lier</AppButton>
            <div v-if="linkError" class="text-sm text-danger">{{ linkError }}</div>
            <p v-if="linkSuccess" class="text-sm text-accent">{{ linkSuccess }}</p>
            <ul
              v-if="categoryStore.documentCategories.length"
              class="text-xs text-ink-muted space-y-1 pt-2 border-t border-line"
            >
              <li v-for="link in categoryStore.documentCategories" :key="link.id">
                #{{ link.id }} · doc {{ link.documentId }} → cat {{ link.categoryId }}
              </li>
            </ul>
          </AppCard>
        </DashboardSection>

        <DashboardSection v-if="categoryStore.categorieContenus.length">
          <AppCard class="p-6 space-y-3">
            <h2 class="font-semibold text-ink">Liaisons contenu ↔ catégorie</h2>
            <p class="text-xs text-ink-muted">Contenus liés aux catégories</p>
            <ul class="text-xs text-ink-muted space-y-1">
              <li v-for="link in categoryStore.categorieContenus" :key="link.id">
                #{{ link.id }} · cat {{ link.categorieId }} → contenu {{ link.contenuId }}
              </li>
            </ul>
          </AppCard>
        </DashboardSection>

        <DashboardSection>
          <AppCard class="p-6 space-y-5">
            <div class="flex items-center gap-2">
              <GraduationCap class="w-5 h-5 text-accent" />
              <h2 class="font-semibold text-ink">Validation des enseignants</h2>
            </div>
            <p class="text-sm text-ink-muted">
              Valider ou retirer la qualité enseignant.
            </p>

            <AppShimmerList v-if="teachersShimmer" variant="teacher" :count="4" />
            <div v-else-if="teacherStore.teachers.length === 0" class="text-sm text-ink-muted">
              Aucun enseignant listé.
            </div>
            <div v-else class="divide-y divide-line border border-line">
              <div
                v-for="t in teacherStore.teachers"
                :key="t.teacherId"
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p class="font-medium text-ink">{{ t.departement || 'Enseignant' }} #{{ t.teacherId }}</p>
                  <p class="text-xs text-ink-muted">{{ t.gender || '-' }}</p>
                </div>
                <AppButton
                  size="sm"
                  variant="outline"
                  @click="
                    teacherValidateId = String(t.teacherId);
                    teacherValidateState = true;
                    handleValidateTeacher()
                  "
                >
                  Valider
                </AppButton>
              </div>
            </div>

            <div class="space-y-3 pt-4 border-t border-line">
              <AppInput v-model="teacherValidateId" label="ID enseignant" type="number" placeholder="123" />
              <label class="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input v-model="teacherValidateState" type="checkbox" class="rounded border-line" />
                Valider (décocher pour retirer)
              </label>
              <div v-if="teacherValidateMessage" class="p-3 bg-accent-light text-sm text-accent">
                {{ teacherValidateMessage }}
              </div>
              <div v-if="teacherValidateError" class="p-3 bg-danger-bg text-sm text-danger">
                {{ teacherValidateError }}
              </div>
              <AppButton variant="outline" :loading="teacherStore.loading" @click="handleValidateTeacher">
                Appliquer la validation
              </AppButton>
            </div>
          </AppCard>
        </DashboardSection>

        <DashboardSection>
          <AppCard class="p-6 space-y-5">
            <div class="flex items-center gap-2">
              <UserCog class="w-5 h-5 text-accent" />
              <h2 class="font-semibold text-ink">Comptes utilisateurs</h2>
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-medium text-ink">Récupérer un compte</h3>
              <AppInput v-model="recoverUserId" label="ID utilisateur" type="number" placeholder="123" />
              <div v-if="recoverMessage" class="p-3 bg-accent-light text-sm text-accent">{{ recoverMessage }}</div>
              <div v-if="recoverError" class="p-3 bg-danger-bg text-sm text-danger">{{ recoverError }}</div>
              <AppButton variant="outline" :loading="recoverLoading" @click="handleRecoverUser">
                Récupérer
              </AppButton>
            </div>

            <div class="space-y-3 pt-4 border-t border-line">
              <h3 class="text-sm font-medium text-ink flex items-center gap-2">
                <Shield class="w-4 h-4" />
                Certifier un utilisateur
              </h3>
              <AppInput v-model="certifyUserId" label="ID utilisateur" type="number" placeholder="123" />
              <label class="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input v-model="certifyState" type="checkbox" class="rounded border-line" />
                Certifier (décocher pour retirer)
              </label>
              <div v-if="certifyMessage" class="p-3 bg-accent-light text-sm text-accent">{{ certifyMessage }}</div>
              <div v-if="certifyError" class="p-3 bg-danger-bg text-sm text-danger">{{ certifyError }}</div>
              <AppButton variant="outline" :loading="certifyLoading" @click="handleCertifyUser">
                <UserCheck class="w-4 h-4" />
                Appliquer
              </AppButton>
            </div>
          </AppCard>
        </DashboardSection>
      </template>
    </div>
  </DashboardPage>
</template>
