/** Active l'intégration backend (désactiver avec VITE_USE_API=false pour le mode démo local). */
export function isApiEnabled(): boolean {
  return import.meta.env.VITE_USE_API !== 'false'
}

export const TOKEN_KEY = 'lawapp_token'
export const REFRESH_TOKEN_KEY = 'lawapp_refresh_token'
export const USER_KEY = 'lawapp_user'
/** Profil métier renvoyé au login (member.profile) — Pinia + localStorage. */
export const MEMBER_PROFILE_KEY = 'lawapp_member_profile'
export const INTENDED_ROLE_KEY = 'lawapp_intended_role'
/** Dernier espace actif (enseignant/étudiant) — conservé entre les sessions. */
export const LAST_ACTIVE_ROLE_KEY = 'lawapp_last_active_role'
/** Snapshot profil par e-mail pour réhydratation si l'API login est incomplète. */
export const PROFILE_SNAPSHOT_KEY = 'lawapp_profile_snapshot'
