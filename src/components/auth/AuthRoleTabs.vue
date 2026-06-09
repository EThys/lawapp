<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { UserRole } from '@/types/auth'

const props = defineProps<{
  /** Si fourni, mode contrôlé (inscription) */
  modelValue?: UserRole
}>()

const emit = defineEmits<{ 'update:modelValue': [role: UserRole] }>()

const route = useRoute()
const router = useRouter()

const activeRole = computed<UserRole>(() => {
  if (props.modelValue) return props.modelValue
  const q = route.query.role as UserRole | undefined
  return q === 'student' ? 'student' : 'teacher'
})

function selectRole(role: UserRole) {
  emit('update:modelValue', role)
  router.replace({ path: route.path, query: { ...route.query, role } })
}
</script>

<template>
  <div class="flex border border-line mb-8">
    <button
      type="button"
      class="flex-1 py-3 text-center text-sm font-medium transition-all duration-200"
      :class="activeRole === 'teacher' ? 'bg-accent text-white' : 'bg-white text-ink-muted hover:text-ink hover:bg-paper-warm'"
      @click="selectRole('teacher')"
    >
      Enseignant
    </button>
    <button
      type="button"
      class="flex-1 py-3 text-center text-sm font-medium transition-all duration-200 border-l border-line"
      :class="activeRole === 'student' ? 'bg-accent text-white' : 'bg-white text-ink-muted hover:text-ink hover:bg-paper-warm'"
      @click="selectRole('student')"
    >
      Étudiant
    </button>
  </div>
</template>
