<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useDocumentStore } from '@/stores/documents'
import { useCategoryStore } from '@/stores/categories'
import { useAuthStore } from '@/stores/auth'
import { isApiEnabled } from '@/config/features'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { AlertCircle, ArrowLeft, BookPlus } from '@lucide/vue'
import { dismissKeyboard, missingFieldsMessage } from '@/utils/form'

const router = useRouter()
const docStore = useDocumentStore()
const categoryStore = useCategoryStore()
const auth = useAuthStore()

const title = ref('')
const description = ref('')
const typeDocument = ref('')
const categoryId = ref('')
const fileBook = ref('')
const backGroundImage = ref('')
const price = ref('0')
const error = ref('')
const saving = ref(false)

const typeOptions = computed(() =>
  docStore.typeDocuments
    .filter((t) => t.active !== false)
    .map((t) => ({
      value: String(t.id),
      label: t.titre?.trim() || `Type ${t.id}`,
    })),
)

const categoryOptions = computed(() =>
  categoryStore.activeCategories.map((c) => ({
    value: String(c.id),
    label: c.name?.trim() || `Catégorie ${c.id}`,
  })),
)

onMounted(() => {
  if (isApiEnabled()) {
    void docStore.fetchTypes()
    void categoryStore.syncCategories()
  }
})

async function handleSubmit() {
  dismissKeyboard()
  error.value = ''
  const missing: string[] = []
  if (!title.value.trim()) missing.push('Titre')
  if (missing.length) {
    error.value = missingFieldsMessage(missing)
    return
  }

  saving.value = true
  const result = await docStore.create({
    title: title.value,
    description: description.value,
    typeDocument: typeDocument.value ? Number(typeDocument.value) : undefined,
    fileBook: fileBook.value || undefined,
    backGroundImage: backGroundImage.value || undefined,
    price: Number(price.value) || 0,
    userId: auth.currentUser?.apiUserId,
  })

  if (!result.ok) {
    saving.value = false
    error.value = result.error
    return
  }

  if (categoryId.value) {
    await categoryStore.linkDocumentToCategory(result.document.id, Number(categoryId.value))
  }

  saving.value = false
  await router.push(`/documents/${result.document.id}`)
}
</script>

<template>
  <div class="min-h-screen bg-paper">
    <header class="border-b border-line bg-white">
      <div class="max-w-xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <RouterLink to="/documents" class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft class="w-4 h-4" />
          Bibliothèque
        </RouterLink>
        <span class="font-display text-lg text-ink">Nouveau document</span>
        <span class="w-16" aria-hidden="true" />
      </div>
    </header>

    <main class="max-w-xl mx-auto px-4 py-8">
      <div v-if="!isApiEnabled()" class="p-4 border border-line bg-white text-sm text-ink-muted">
        Mode API requis pour publier un document.
      </div>

      <form v-else class="space-y-4 border border-line bg-white p-5" novalidate @submit.prevent="handleSubmit">
        <AppInput v-model="title" label="Titre" required placeholder="Ex. Code civil annoté" />
        <AppTextarea
          v-model="description"
          label="Description"
          placeholder="Résumé du document…"
          :rows="3"
        />
        <AppSelect
          v-if="typeOptions.length"
          v-model="typeDocument"
          label="Type de document"
          :options="typeOptions"
          placeholder="Choisir un type"
        />
        <AppSelect
          v-if="categoryOptions.length"
          v-model="categoryId"
          label="Catégorie"
          :options="categoryOptions"
          placeholder="Optionnel"
        />
        <AppInput
          v-model="fileBook"
          label="Fichier / lien"
          placeholder="URL ou référence du fichier"
          hint="Champ fileBook envoyé à l’API."
        />
        <AppInput
          v-model="backGroundImage"
          label="Image de couverture"
          placeholder="URL de l’image"
        />
        <AppInput v-model="price" label="Prix" type="number" placeholder="0" />

        <div v-if="error" class="flex items-start gap-2.5 p-3 bg-danger-bg border border-danger/20 text-sm text-danger">
          <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
          {{ error }}
        </div>

        <AppButton type="submit" class="w-full" :loading="saving || docStore.loading">
          <BookPlus class="w-4 h-4" />
          Publier le document
        </AppButton>
      </form>
    </main>
  </div>
</template>
