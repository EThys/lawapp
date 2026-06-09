<script setup lang="ts">
import { Check } from '@lucide/vue'

defineProps<{
  steps: string[]
  current: number
}>()
</script>

<template>
  <nav class="mb-8" aria-label="Étapes">
    <ol class="flex items-center gap-0">
      <li
        v-for="(label, index) in steps"
        :key="label"
        class="flex items-center flex-1 last:flex-none"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <span
            class="w-7 h-7 flex-shrink-0 flex items-center justify-center text-xs font-semibold border transition-all duration-400"
            :class="[
              index < current
                ? 'bg-accent text-white border-accent scale-100'
                : index === current
                  ? 'bg-accent-light text-accent border-accent ring-1 ring-accent/30 step-ring-active scale-110'
                  : 'bg-white text-ink-faint border-line scale-100',
            ]"
          >
            <Check v-if="index < current" class="w-3.5 h-3.5" />
            <span v-else>{{ index + 1 }}</span>
          </span>
          <span
            class="text-xs font-medium truncate hidden sm:block transition-colors duration-300"
            :class="index <= current ? 'text-ink' : 'text-ink-faint'"
          >
            {{ label }}
          </span>
        </div>
        <div
          v-if="index < steps.length - 1"
          class="flex-1 h-px mx-3 sm:mx-4 bg-line relative overflow-hidden"
        >
          <div
            class="absolute inset-y-0 left-0 bg-accent origin-left transition-transform duration-500 ease-out"
            :class="index < current ? 'w-full' : 'w-0'"
          />
        </div>
      </li>
    </ol>
  </nav>
</template>
