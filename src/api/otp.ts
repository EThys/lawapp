import { apiPost } from '@/api/client'

export interface OtpMessageResponse {
  message?: string
  [key: string]: string | undefined
}

export async function generateOtp(identifier: string): Promise<OtpMessageResponse> {
  return apiPost<OtpMessageResponse>('public/otp/generate', { identifier: identifier.trim() }, true)
}

export async function validateOtp(identifier: string, code: string): Promise<OtpMessageResponse> {
  return apiPost<OtpMessageResponse>(
    'public/otp/validate',
    { identifier: identifier.trim(), code: code.trim() },
    true,
  )
}
