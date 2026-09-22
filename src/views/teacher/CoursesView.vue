<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import { useClassroomStore } from '@/stores/classrooms'
import { isApiEnabled } from '@/config/features'
import { appToast } from '@/utils/toast'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import AppShimmerList from '@/components/loading/AppShimmerList.vue'
import { Users, ArrowLeft, AlertCircle, Plus, Eye } from '@lucide/vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const courseStore = useCourseStore()
const classroomStore = useClassroomStore()

const name = ref('Ma salle')
const description = ref('')
const error = ref('')
const creating = ref(false)
const ready = ref(!isApiEnabled())
const showCreate = ref(route.query.create === '1')

watch(
  () => route.query.create,
  (v) => {
    if (v === '1') showCreate.value = true
  },
)

const apiMode = computed(() => isApiEnabled())

const localCourses = computed(() =>
  auth.currentUser ? courseStore.getCoursesForTeacher(auth.currentUser.id) : [],
)

const classroomColumns = [
  { key: 'name', label: 'Salle' },
  { key: 'description', label: 'Description', hideOnMobile: true },
  { key: 'code', label: 'Code' },
  { key: 'actions', label: 'Actions', class: 'text-right whitespace-nowrap' },
]

const classroomRows = computed(() => {
  if (apiMode.value) {
    return classroomStore.myClassrooms.map((c) => ({
      id: String(c.id),
      name: c.name?.trim() || `Salle #${c.id}`,
      description: c.description?.trim() || '—',
      code: `CL${c.id}`,
    }))
  }
  return localCourses.value.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.subject || '—',
    code: c.enrollmentCode,
  }))
})

onMounted(async () => {
  if (apiMode.value) {
    await classroomStore.syncMine()
    ready.value = true
    if (classroomStore.myClassrooms.length === 0) showCreate.value = true
    return
  }
  ready.value = true
  if (localCourses.value.length === 0) showCreate.value = true
})

async function createClassroom() {
  if (!auth.currentUser) return
  error.value = ''
  creating.value = true

  if (apiMode.value) {
    const result = await classroomStore.create(name.value, description.value)
    creating.value = false
    if (!result.ok) {
      error.value = result.error
      appToast.error(result.error)
      return
    }
    appToast.success(`Salle « ${result.classroom.name} » créée.`)
    showCreate.value = false
    await router.push(`/teacher/courses/${result.classroom.id}`)
    return
  }

  const cls = courseStore.createCourse({
    teacherId: auth.currentUser.id,
    teacherName: `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
    name: name.value.trim() || 'Ma salle',
    subject: description.value.trim() || 'Général',
  })
  creating.value = false
  appToast.success(`Salle « ${cls.name} » créée.`)
  showCreate.value = false
  await router.push(`/teacher/courses/${cls.id}`)
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <RouterLink
      to="/teacher"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-8 transition-colors"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour
    </RouterLink>

    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <p class="label-caps mb-2">Enseignant</p>
        <h1 class="font-display text-3xl text-ink tracking-tight">Mes salles</h1>
        <p class="mt-1 text-sm text-ink-muted">
          Plusieurs salles possibles. Les étudiants sont rattachés à la salle choisie à l’ajout.
        </p>
      </div>
      <AppButton size="sm" @click="showCreate = !showCreate">
        <Plus class="w-4 h-4" />
        {{ showCreate ? 'Masquer' : 'Créer une salle' }}
      </AppButton>
    </div>

    <AppCard v-if="showCreate" class="mb-8" title="Nouvelle salle" subtitle="Création" :hover="false">
      <div class="space-y-4 max-w-md">
        <template v-if="apiMode">
          <AppInput v-model="name" label="Nom de la classe" required placeholder="L2 Droit" />
          <AppTextarea
            v-model="description"
            label="Description"
            placeholder="Facultatif"
            :rows="2"
          />
        </template>
        <template v-else>
          <AppInput v-model="name" label="Nom de la salle" required placeholder="Ma salle" />
          <AppInput v-model="description" label="Matière" placeholder="Droit" />
        </template>

        <div
          v-if="error"
          class="flex items-start gap-2 p-3 bg-danger-bg border border-danger/20 text-sm text-danger"
        >
          <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
          {{ error }}
        </div>

        <AppButton :loading="creating || classroomStore.loading" @click="createClassroom">
          <Users class="w-4 h-4" />
          Créer la salle
        </AppButton>
      </div>
    </AppCard>

    <AppShimmerList v-if="!ready" variant="row" :count="4" />

    <AppCard
      v-else
      title="Salles"
      :subtitle="`${classroomRows.length} salle(s)`"
      :hover="false"
    >
      <AppDataTable
        :columns="classroomColumns"
        :rows="classroomRows"
        empty-message="Aucune salle pour le moment. Créez-en une ci-dessus."
        :page-size="10"
      >
        <template #cell-name="{ row }">
          <p class="font-medium text-ink">{{ row.name }}</p>
        </template>
        <template #cell-code="{ row }">
          <span class="font-mono text-accent font-semibold">{{ row.code }}</span>
        </template>
        <template #cell-actions="{ row }">
          <RouterLink :to="`/teacher/courses/${row.id}`">
            <AppButton size="sm" variant="outline">
              <Eye class="w-4 h-4" />
              Ouvrir
            </AppButton>
          </RouterLink>
        </template>
      </AppDataTable>
    </AppCard>
  </div>
</template>
