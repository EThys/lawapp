import { authPost, apiPost, apiPut, apiDelete } from '@/api/http'
import type {
  BackendLoginResponse,
  BackendRegisterResponse,
  UserPasswordRequest,
  CertificationStateRequest,
  ApiMessageResponse,
  TokenPair,
} from '@/api/types'

export async function loginApi(identifiant: string, password: string): Promise<BackendLoginResponse> {
  return authPost<BackendLoginResponse>('/auth/login', {
    identifiant: identifiant.trim(),
    password,
  })
}

export async function registerApi(payload: {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  city: string
  phone: string
  pseudo: string
}): Promise<BackendRegisterResponse> {
  return authPost<BackendRegisterResponse>('/auth/register', payload)
}

export async function refreshTokenApi(refreshToken: string): Promise<TokenPair & { token?: string }> {
  return apiPost<TokenPair & { token?: string }>(
    'protected/token/refresh',
    { refreshToken },
    true,
  )
}

export async function changePasswordApi(newPassword: string): Promise<ApiMessageResponse> {
  const body: UserPasswordRequest = { newPassword }
  const res = await apiPut<ApiMessageResponse | null>('protected/change/password', body)
  return res ?? { message: 'Mot de passe modifié.' }
}

export async function resetPasswordApi(newPassword: string): Promise<ApiMessageResponse> {
  const body: UserPasswordRequest = { newPassword }
  const res = await apiPut<ApiMessageResponse | null>('protected/reset/password', body)
  return res ?? { message: 'Mot de passe réinitialisé.' }
}

export async function recoverUserApi(userId: number): Promise<ApiMessageResponse> {
  return apiPut<ApiMessageResponse>(`protected/recovery/user/${userId}`)
}

export async function certifyUserApi(userId: number, state: boolean): Promise<ApiMessageResponse> {
  const body: CertificationStateRequest = { state }
  return apiPut<ApiMessageResponse>(`protected/certification/${userId}`, body)
}

export async function deleteAccountApi(): Promise<ApiMessageResponse> {
  const res = await apiDelete<ApiMessageResponse | null>('protected/users/delete/user')
  return res ?? { message: 'Compte supprimé.' }
}

/** Redirection OAuth Google (GET /api/auth/google). */
export function getGoogleAuthRedirectUrl(): string {
  return '/api/auth/google'
}

/** Déclenche la redirection navigateur vers Google OAuth. */
export function redirectToGoogleAuth(): void {
  window.location.href = getGoogleAuthRedirectUrl()
}
