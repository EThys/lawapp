import { toast, type ExternalToast } from 'vue-sonner'
import { extractApiError } from '@/api/http'
import { genericActionFailedMessage } from '@/utils/userFacingErrors'

const defaults: ExternalToast = {
  duration: 4200,
}

export const appToast = {
  success(message: string, opts?: ExternalToast) {
    return toast.success(message, { ...defaults, ...opts })
  },
  error(message: string, opts?: ExternalToast) {
    return toast.error(message, { ...defaults, duration: 5600, ...opts })
  },
  info(message: string, opts?: ExternalToast) {
    return toast.message(message, { ...defaults, ...opts })
  },
  warning(message: string, opts?: ExternalToast) {
    return toast.warning(message, { ...defaults, ...opts })
  },
  /** Affiche l’erreur API extraite (ou un fallback). */
  apiError(error: unknown, fallback = genericActionFailedMessage()) {
    const message = extractApiError(error) || fallback
    return toast.error(message, { ...defaults, duration: 5600 })
  },
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((err: unknown) => string)
    },
  ) {
    return toast.promise(promise, messages)
  },
}

export { toast }
