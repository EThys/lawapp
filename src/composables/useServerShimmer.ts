import { computed, type Ref } from 'vue'
import { isApiEnabled } from '@/config/features'

/** Affiche le shimmer uniquement en mode API pendant le chargement serveur. */
export function useServerShimmer(loading: Ref<boolean>) {
  const showShimmer = computed(() => isApiEnabled() && loading.value)
  return { showShimmer, isApiEnabled }
}
