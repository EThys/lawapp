import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isApiEnabled } from '@/config/features'
import { useAuthStore } from '@/stores/auth'
import { appToast } from '@/utils/toast'

export const useAccountSettingsStore = defineStore('accountSettings', () => {
  const pageReady = ref(true)
  const changeLoading = ref(false)
  const deleteLoading = ref(false)
  const changeError = ref('')
  const deleteError = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const deleteConfirm = ref('')

  function resetPasswordForm() {
    newPassword.value = ''
    confirmPassword.value = ''
    changeError.value = ''
  }

  function resetDeleteForm() {
    deleteConfirm.value = ''
    deleteError.value = ''
  }

  async function changePassword(): Promise<
    { ok: true; redirectMessage: string } | { ok: false; error: string }
  > {
    changeError.value = ''
    if (!isApiEnabled()) {
      const msg = 'Mode API désactivé.'
      changeError.value = msg
      return { ok: false, error: msg }
    }
    changeLoading.value = true
    try {
      const auth = useAuthStore()
      const result = await auth.changePassword(newPassword.value, confirmPassword.value)
      if (!result.ok) {
        changeError.value = result.error
        appToast.error(result.error)
        return { ok: false, error: result.error }
      }
      const message = result.message ?? 'Mot de passe modifié. Reconnectez-vous.'
      resetPasswordForm()
      return { ok: true, redirectMessage: message }
    } finally {
      changeLoading.value = false
    }
  }

  async function deleteAccount(): Promise<
    { ok: true; redirectMessage: string } | { ok: false; error: string }
  > {
    deleteError.value = ''
    if (!isApiEnabled()) {
      const msg = 'Mode API désactivé.'
      deleteError.value = msg
      return { ok: false, error: msg }
    }
    if (deleteConfirm.value.trim().toUpperCase() !== 'SUPPRIMER') {
      const msg = 'Tapez SUPPRIMER pour confirmer.'
      deleteError.value = msg
      appToast.warning(msg)
      return { ok: false, error: msg }
    }
    deleteLoading.value = true
    try {
      const auth = useAuthStore()
      const result = await auth.deleteAccount()
      if (!result.ok) {
        deleteError.value = result.error
        appToast.error(result.error)
        return { ok: false, error: result.error }
      }
      const message = result.message ?? 'Compte supprimé.'
      appToast.success(message)
      resetDeleteForm()
      return { ok: true, redirectMessage: message }
    } finally {
      deleteLoading.value = false
    }
  }

  return {
    pageReady,
    changeLoading,
    deleteLoading,
    changeError,
    deleteError,
    newPassword,
    confirmPassword,
    deleteConfirm,
    resetPasswordForm,
    resetDeleteForm,
    changePassword,
    deleteAccount,
  }
})
