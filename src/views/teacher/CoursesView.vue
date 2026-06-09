<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { Users, ArrowLeft } from '@lucide/vue'

const router = useRouter()
const auth = useAuthStore()
const courseStore = useCourseStore()

const myClass = computed(() => {
  if (!auth.currentUser) return null
  const courses = courseStore.getCoursesForTeacher(auth.currentUser.id)
  return courses[0] ?? null
})

if (myClass.value) {
  router.replace(`/teacher/courses/${myClass.value.id}`)
}

function createClassroom() {
  if (!auth.currentUser) return
  const cls = courseStore.createCourse({
    teacherId: auth.currentUser.id,
    teacherName: `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
    name: 'Ma salle',
    subject: 'Général',
  })
  router.replace(`/teacher/courses/${cls.id}`)
}
</script>

<template>
  <div v-if="!myClass" class="max-w-lg mx-auto px-4 py-20">
    <RouterLink
      to="/teacher"
      class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-8 transition-colors"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour
    </RouterLink>

    <AppCard title="Salle de classe" subtitle="Optionnel">
      <div class="space-y-4">
        <p class="text-sm text-ink-muted leading-relaxed">
          La salle de classe n'est pas obligatoire. Vous pouvez créer et partager des évaluations
          directement avec un code d'accès, sans gérer de groupe ni de présence.
        </p>
        <p class="text-sm text-ink-muted leading-relaxed">
          Créez une salle uniquement si vous souhaitez regrouper vos étudiants et gérer la présence en WiFi.
        </p>
        <AppButton @click="createClassroom">
          <Users class="w-4 h-4" />
          Créer une salle
        </AppButton>
      </div>
    </AppCard>
  </div>
</template>
