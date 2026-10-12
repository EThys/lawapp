import { apiPost } from '@/api/client'

export interface PasswordResetMessageResponse {
  message?: string
  token?: string
  accessToken?: string
  access_token?: string
  refreshToken?: string
  refresh_token?: string
  [key: string]: string | undefined
}

/** POST /api/v1/public/password/forgot — envoi du code par e-mail. */
export async function requestPasswordForgot(identifier: string): Promise<PasswordResetMessageResponse> {
  return apiPost<PasswordResetMessageResponse>(
    'public/password/forgot',
    { identifier: identifier.trim() },
    true,
  )
}

/** POST /api/v1/public/password/verify — valide le code (réinitialisation). */
export async function verifyPasswordResetCode(
  identifier: string,
  code: string,
): Promise<PasswordResetMessageResponse> {
  return apiPost<PasswordResetMessageResponse>(
    'public/password/verify',
    { identifier: identifier.trim(), code: code.trim() },
    true,
  )
}

/** POST /api/v1/public/password/reset — nouveau mot de passe avec le code reçu (sans JWT). */
export async function resetForgottenPassword(payload: {
  identifier: string
  code: string
  newPassword: string
  confirmPassword: string
}): Promise<PasswordResetMessageResponse> {
  return apiPost<PasswordResetMessageResponse>(
    'public/password/reset',
    {
      identifier: payload.identifier.trim(),
      code: payload.code.trim(),
      newPassword: payload.newPassword,
      confirmPassword: payload.confirmPassword,
    },
    true,
  )
}
