const SKIP_KEY = 'lawapp_profile_onboarding_skipped'

export function markProfileOnboardingSkipped(userId: string) {
  if (!userId) return
  try {
    const raw = localStorage.getItem(SKIP_KEY)
    const set = new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
    set.add(userId)
    localStorage.setItem(SKIP_KEY, JSON.stringify([...set]))
  } catch {
    localStorage.setItem(SKIP_KEY, JSON.stringify([userId]))
  }
}

export function hasSkippedProfileOnboarding(userId: string | undefined): boolean {
  if (!userId) return false
  try {
    const raw = localStorage.getItem(SKIP_KEY)
    if (!raw) return false
    return (JSON.parse(raw) as string[]).includes(userId)
  } catch {
    return false
  }
}
