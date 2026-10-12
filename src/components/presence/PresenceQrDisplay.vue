<script setup lang="ts">
import { computed } from 'vue'
import type { PresenceDisplayPayload } from '@/types/presenceSession'
import { getPresenceCheckInUrl } from '@/utils/presenceToken'
import { Radio } from '@lucide/vue'

const props = defineProps<{
  display: PresenceDisplayPayload | null
  compact?: boolean
}>()

const checkInUrl = computed(() =>
  props.display?.qrToken ? getPresenceCheckInUrl(props.display.qrToken) : '',
)

const qrImageUrl = computed(() => {
  if (!checkInUrl.value) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(checkInUrl.value)}`
})
</script>

<template>
  <div v-if="display?.status === 'closed'" class="p-8 text-center border border-line bg-paper-warm">
    <p class="font-medium text-ink">Session terminée</p>
    <p class="text-sm text-ink-muted mt-1">Plus de QR disponible.</p>
  </div>
  <div v-else-if="display" class="space-y-4">
    <div
      class="text-center border border-accent/30 bg-brand-dark text-white"
      :class="compact ? 'p-4' : 'p-8'"
    >
      <p class="text-xs uppercase tracking-widest text-white/70 mb-3 flex items-center justify-center gap-2">
        <Radio class="w-4 h-4" />
        QR présence · {{ display.slotRemainingSeconds }} s
      </p>
      <img
        v-if="qrImageUrl"
        :src="qrImageUrl"
        alt="QR code présence"
        class="mx-auto bg-white p-2"
        :class="compact ? 'w-40 h-40' : 'w-56 h-56 sm:w-64 sm:h-64'"
        loading="lazy"
      />
      <p class="mt-4 text-sm text-white/80">Code numérique</p>
      <p
        class="font-mono font-bold tracking-[0.25em] text-white"
        :class="compact ? 'text-2xl' : 'text-4xl sm:text-5xl'"
      >
        {{ display.numericCode }}
      </p>
      <p v-if="!compact" class="text-xs text-white/50 mt-3 break-all px-4">
        Session · {{ display.sessionRemainingSeconds }} s restantes
      </p>
    </div>
  </div>
</template>
