import { computed } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { usePlatformGovernanceStore } from '@/stores/platformGovernance'
import { isApiEnabled } from '@/config/features'
import {
  etablissementSelectOptions,
  facultySelectOptions,
  findDefaultSelectableEtablissement,
  promotionSelectOptions,
} from '@/utils/referentielOptions'

/** Référentiels API (établissements, promotions, facultés) pour les formulaires. */
export function useReferentielCatalog() {
  const catalog = useCatalogStore()
  const governance = usePlatformGovernanceStore()

  const getFlags = (id: number) => governance.getFlags(id)

  const etablissementOptions = computed(() =>
    etablissementSelectOptions(catalog.etablissements, getFlags),
  )

  const promotionOptions = computed(() => promotionSelectOptions(catalog.promotions))

  function facultyOptionsFor(etablissementId: number | null | undefined) {
    if (etablissementId == null || !Number.isFinite(etablissementId)) {
      return facultySelectOptions(catalog.allFaculties)
    }
    return facultySelectOptions(catalog.facultiesFor(etablissementId))
  }

  async function ensureBaseCatalog(): Promise<void> {
    if (!isApiEnabled()) return
    if (catalog.etablissements.length && catalog.promotions.length) return
    await catalog.syncAll()
  }

  async function ensureFaculties(etablissementId?: number): Promise<void> {
    if (!isApiEnabled()) return
    await catalog.syncFaculties(etablissementId)
  }

  function defaultSelectableEtablissementId(): string {
    const etab = findDefaultSelectableEtablissement(catalog.etablissements, getFlags)
    return etab ? String(etab.id) : ''
  }

  return {
    catalog,
    governance,
    etablissementOptions,
    promotionOptions,
    facultyOptionsFor,
    ensureBaseCatalog,
    ensureFaculties,
    defaultSelectableEtablissementId,
    getFlags,
  }
}
