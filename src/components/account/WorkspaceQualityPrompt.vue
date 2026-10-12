<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { GraduationCap, BookOpen, ChevronRight } from '@lucide/vue'

const props = defineProps<{
  target: 'teacher' | 'student'
}>()

const copy = computed(() =>
  props.target === 'teacher'
    ? { title: 'Espace enseignant', cta: 'Activer', to: '/teacher/profile', icon: GraduationCap }
    : { title: 'Espace étudiant', cta: 'Activer', to: '/student/profile', icon: BookOpen },
)
</script>

<template>
  <div
    class="flex items-center gap-3 p-4 border border-line bg-paper-warm/80 rounded-none sm:rounded-sm"
  >
    <component :is="copy.icon" class="w-5 h-5 text-accent shrink-0" />
    <p class="flex-1 min-w-0 text-sm text-ink">
      <span class="font-medium">{{ copy.title }}</span>
      <span class="text-ink-muted"> — optionnel, même compte.</span>
    </p>
    <RouterLink :to="copy.to" class="shrink-0">
      <AppButton variant="outline" size="sm" class="min-h-10">
        {{ copy.cta }}
        <ChevronRight class="w-4 h-4" />
      </AppButton>
    </RouterLink>
  </div>
</template>
