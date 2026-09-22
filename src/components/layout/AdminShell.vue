<script setup lang="ts">
import { TeacherShell } from '@/packages/teacher-shell'
</script>

<template>
  <TeacherShell variant="admin">
    <slot />
  </TeacherShell>
</template>
