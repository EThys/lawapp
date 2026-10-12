<script setup lang="ts">
import type { PresenceRelayGrant } from '@/types/presenceSession'
import AppButton from '@/components/ui/AppButton.vue'
import { UserX } from '@lucide/vue'

defineProps<{
  grants: PresenceRelayGrant[]
}>()

const emit = defineEmits<{
  revoke: [userId: string]
}>()

function formatSince(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return `${sec} s`
  return `${Math.floor(sec / 60)} min ${sec % 60} s`
}
</script>

<template>
  <ul v-if="grants.length" class="divide-y divide-line border border-line">
    <li
      v-for="grant in grants"
      :key="grant.userId"
      class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
    >
      <div>
        <p class="text-sm font-medium text-ink">{{ grant.displayName || grant.userId }}</p>
        <p class="text-xs text-ink-muted">Relais actif · {{ formatSince(grant.grantedAt) }}</p>
      </div>
      <AppButton size="sm" variant="outline" @click="emit('revoke', grant.userId)">
        <UserX class="w-4 h-4" />
        Couper
      </AppButton>
    </li>
  </ul>
  <p v-else class="text-sm text-ink-muted">Aucun relais étudiant actif.</p>
</template>
