<script setup lang="ts">
import { Search } from '@lucide/vue'

withDefaults(
  defineProps<{
    search: string
    searchPlaceholder?: string
    showSearch?: boolean
    evaluationFilter?: string
    evaluationOptions?: { id: string; title: string }[]
    showEvaluationFilter?: boolean
    courseFilter?: string
    courseOptions?: { id: string; name: string }[]
    showCourseFilter?: boolean
    typeFilter?: string
    showTypeFilter?: boolean
    showSessionWithAbsences?: boolean
  }>(),
  {
    searchPlaceholder: 'Rechercher…',
    showSearch: true,
    evaluationFilter: 'all',
    showEvaluationFilter: false,
    courseFilter: 'all',
    showCourseFilter: false,
    typeFilter: 'all',
    showTypeFilter: false,
    showSessionWithAbsences: false,
  }
)

defineEmits<{
  'update:search': [value: string]
  'update:evaluationFilter': [value: string]
  'update:courseFilter': [value: string]
  'update:typeFilter': [value: string]
}>()
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-3 mb-6">
    <div v-if="showSearch" class="relative flex-1 min-w-0">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
      <input
        :value="search"
        type="search"
        :placeholder="searchPlaceholder"
        class="w-full pl-10 pr-4 py-2.5 min-h-11 border border-line bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <select
      v-if="showEvaluationFilter"
      :value="evaluationFilter"
      class="px-4 py-2.5 min-h-11 border border-line bg-white text-ink focus:outline-none focus:border-accent lg:min-w-[14rem] cursor-pointer"
      @change="$emit('update:evaluationFilter', ($event.target as HTMLSelectElement).value)"
    >
      <option value="all">Toutes les évaluations</option>
      <option v-for="ev in evaluationOptions" :key="ev.id" :value="ev.id">
        {{ ev.title }}
      </option>
    </select>

    <select
      v-if="showCourseFilter"
      :value="courseFilter"
      class="px-4 py-2.5 min-h-11 border border-line bg-white text-ink focus:outline-none focus:border-accent lg:min-w-[12rem] cursor-pointer"
      @change="$emit('update:courseFilter', ($event.target as HTMLSelectElement).value)"
    >
      <option value="all">Toutes les salles</option>
      <option v-for="course in courseOptions" :key="course.id" :value="course.id">
        {{ course.name }}
      </option>
    </select>

    <select
      v-if="showTypeFilter"
      :value="typeFilter"
      class="px-4 py-2.5 min-h-11 border border-line bg-white text-ink focus:outline-none focus:border-accent lg:min-w-[11rem] cursor-pointer"
      @change="$emit('update:typeFilter', ($event.target as HTMLSelectElement).value)"
    >
      <option value="all">Tous les statuts</option>
      <option value="present">Présents uniquement</option>
      <option value="absent">Absents uniquement</option>
      <option v-if="showSessionWithAbsences" value="session_with_absences">
        Séances avec absents
      </option>
    </select>
  </div>
</template>
