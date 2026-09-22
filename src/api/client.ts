/** Réexport - couche HTTP fetch (style casaFinale, sans axios). */
export {
  httpFetch,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  authPost,
  authGet,
  v1Get,
  v1Post,
  rootGet,
  rootPost,
  extractApiError,
} from '@/api/http'
export type { HttpError, FetchOptions } from '@/api/http'
