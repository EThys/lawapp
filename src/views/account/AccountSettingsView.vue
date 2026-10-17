<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useAccountSettingsStore } from '@/stores/accountSettings'
import { isApiEnabled } from '@/config/features'
import { getInitials } from '@/utils/auth'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import SettingsPageLayout from '@/components/settings/SettingsPageLayout.vue'
import SettingsGroup from '@/components/settings/SettingsGroup.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import RoleWorkspaceSwitcher from '@/components/account/RoleWorkspaceSwitcher.vue'
import {
  AlertCircle,
  Shield,
  Trash2,
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Building2,
  UserRound,
  UserPlus,
} from '@lucide/vue'
import { hasInstitutionAccess } from '@/utils/platformAccess'

const router = useRouter()
const auth = useAuthStore()
const accountStore = useAccountSettingsStore()
const {
  pageReady,
  changeLoading,
  deleteLoading,
  changeError,
  deleteError,
  newPassword,
  confirmPassword,
  deleteConfirm,
} = storeToRefs(accountStore)

const apiMode = computed(() => isApiEnabled())
const user = computed(() => auth.currentUser)
const showInstitutionAdmin = computed(() => hasInstitutionAccess(user.value))
const activeWorkspace = computed(() => auth.activeWorkspace)
const initials = computed(() => {
  const u = user.value
  if (!u) return '?'
  return getInitials(u.firstName, u.lastName)
})

onMounted(() => {
  pageReady.value = true
})

async function handleChangePassword() {
  const result = await accountStore.changePassword()
  if (result.ok) {
    await router.replace({ path: '/login', query: { message: result.redirectMessage } })
  }
}

async function handleDeleteAccount() {
  const result = await accountStore.deleteAccount()
  if (result.ok) {
    await router.push({ path: '/login', query: { message: result.redirectMessage } })
  }
}
</script>

<template>
  <DashboardPage>
    <SettingsPageLayout
      eyebrow="Compte"
      title="Sécurité et espaces"
      :description="user ? `${user.firstName} ${user.lastName} · ${user.email}` : undefined"
      :initials="initials"
      :loading="!pageReady"
    >
      <SettingsGroup v-if="user?.certified || showInstitutionAdmin" title="Administration">
        <div class="flex flex-wrap items-center gap-3">
          <AppBadge v-if="user?.certified" variant="success">Super admin plateforme</AppBadge>
          <RouterLink v-if="user?.certified" to="/admin">
            <AppButton size="sm" variant="outline">
              <LayoutDashboard class="w-4 h-4" />
              Super admin
            </AppButton>
          </RouterLink>
          <RouterLink v-if="showInstitutionAdmin" to="/institution">
            <AppButton size="sm" variant="outline">
              <Building2 class="w-4 h-4" />
              Admin université
            </AppButton>
          </RouterLink>
        </div>
      </SettingsGroup>

      <SettingsGroup v-if="!apiMode" title="Mode démo">
        <p class="text-sm text-ink-muted m-0">
          Mot de passe et suppression nécessitent
          <code class="text-xs bg-paper-warm px-1">VITE_USE_API=true</code>.
        </p>
      </SettingsGroup>

      <section class="settings-group account-spaces">
        <div class="settings-group__head account-spaces__head">
          <div>
            <h2 class="settings-group__title">Mes espaces</h2>
            <p class="settings-group__desc">Un compte, deux tableaux de bord.</p>
          </div>
          <RoleWorkspaceSwitcher
            v-if="auth.showWorkspaceSwitcher"
            variant="icons"
            class="account-spaces__switch"
          />
        </div>
        <p
          v-if="auth.showWorkspaceSwitcher && !auth.canSwitchWorkspace"
          class="text-xs text-ink-muted px-4 pb-2 -mt-1"
        >
          Activez les deux profils pour basculer librement.
        </p>
        <div class="account-spaces__grid px-3 pb-3">
          <article
            class="account-spaces__tile"
            :class="{
              'account-spaces__tile--live': activeWorkspace === 'teacher',
              'account-spaces__tile--muted': !auth.hasTeacherQuality,
            }"
          >
            <div class="account-spaces__tile-top">
              <span class="account-spaces__icon account-spaces__icon--teacher" aria-hidden="true">
                <GraduationCap class="w-5 h-5" />
              </span>
              <div class="min-w-0">
                <h3 class="font-semibold text-ink">Enseignant</h3>
                <p class="text-xs text-ink-muted mt-0.5">
                  {{ auth.hasTeacherQuality ? 'Évaluations, promotions' : 'Profil à compléter' }}
                </p>
              </div>
              <AppBadge
                v-if="activeWorkspace === 'teacher' && auth.hasTeacherQuality"
                variant="success"
                class="shrink-0"
              >
                Ouvert
              </AppBadge>
            </div>
            <div class="account-spaces__actions">
              <RouterLink
                v-if="auth.hasTeacherQuality"
                to="/teacher"
                class="account-spaces__action"
                aria-label="Tableau de bord enseignant"
                title="Tableau de bord"
              >
                <AppButton size="sm" class="account-spaces__icon-btn">
                  <LayoutDashboard class="w-4 h-4" aria-hidden="true" />
                </AppButton>
              </RouterLink>
              <RouterLink
                to="/teacher/profile"
                class="account-spaces__action"
                :aria-label="auth.hasTeacherQuality ? 'Profil enseignant' : 'Activer le profil enseignant'"
                :title="auth.hasTeacherQuality ? 'Profil' : 'Activer'"
              >
                <AppButton
                  size="sm"
                  class="account-spaces__icon-btn"
                  :variant="auth.hasTeacherQuality ? 'outline' : 'primary'"
                >
                  <UserRound v-if="auth.hasTeacherQuality" class="w-4 h-4" aria-hidden="true" />
                  <UserPlus v-else class="w-4 h-4" aria-hidden="true" />
                </AppButton>
              </RouterLink>
            </div>
          </article>

          <article
            class="account-spaces__tile"
            :class="{
              'account-spaces__tile--live': activeWorkspace === 'student',
              'account-spaces__tile--muted': !auth.hasStudentQuality,
            }"
          >
            <div class="account-spaces__tile-top">
              <span class="account-spaces__icon account-spaces__icon--student" aria-hidden="true">
                <BookOpen class="w-5 h-5" />
              </span>
              <div class="min-w-0">
                <h3 class="font-semibold text-ink">Étudiant</h3>
                <p class="text-xs text-ink-muted mt-0.5">
                  {{ auth.hasStudentQuality ? 'Examens, résultats' : 'Profil à compléter' }}
                </p>
              </div>
              <AppBadge
                v-if="activeWorkspace === 'student' && auth.hasStudentQuality"
                variant="success"
                class="shrink-0"
              >
                Ouvert
              </AppBadge>
            </div>
            <div class="account-spaces__actions">
              <RouterLink
                v-if="auth.hasStudentQuality"
                to="/student"
                class="account-spaces__action"
                aria-label="Tableau de bord étudiant"
                title="Tableau de bord"
              >
                <AppButton size="sm" class="account-spaces__icon-btn">
                  <LayoutDashboard class="w-4 h-4" aria-hidden="true" />
                </AppButton>
              </RouterLink>
              <RouterLink
                to="/student/profile"
                class="account-spaces__action"
                :aria-label="auth.hasStudentQuality ? 'Profil étudiant' : 'Activer le profil étudiant'"
                :title="auth.hasStudentQuality ? 'Profil' : 'Activer'"
              >
                <AppButton
                  size="sm"
                  class="account-spaces__icon-btn"
                  :variant="auth.hasStudentQuality ? 'outline' : 'primary'"
                >
                  <UserRound v-if="auth.hasStudentQuality" class="w-4 h-4" aria-hidden="true" />
                  <UserPlus v-else class="w-4 h-4" aria-hidden="true" />
                </AppButton>
              </RouterLink>
            </div>
          </article>
        </div>
      </section>

      <SettingsGroup
        v-if="apiMode"
        title="Mot de passe"
        description="Choisissez un mot de passe sécurisé pour votre compte."
      >
        <form class="space-y-4" @submit.prevent="handleChangePassword">
          <AppInput
            v-model="newPassword"
            label="Nouveau mot de passe"
            type="password"
            autocomplete="new-password"
            hint="Au moins 8 caractères, lettres et chiffres."
            required
          />
          <AppInput
            v-model="confirmPassword"
            label="Confirmer"
            type="password"
            autocomplete="new-password"
            required
          />
          <div
            v-if="changeError"
            class="flex gap-2 p-3 bg-danger-bg border border-danger/20 text-sm text-danger"
          >
            <AlertCircle class="w-4 h-4 shrink-0" /> {{ changeError }}
          </div>
          <AppButton type="submit" :loading="changeLoading">
            <Shield class="w-4 h-4" />
            Enregistrer
          </AppButton>
        </form>
      </SettingsGroup>

      <SettingsGroup
        v-if="apiMode"
        title="Supprimer le compte"
        description="Action irréversible. Toutes vos données seront effacées."
      >
        <form class="space-y-4" @submit.prevent="handleDeleteAccount">
          <AppInput
            v-model="deleteConfirm"
            label="Tapez SUPPRIMER pour confirmer"
            placeholder="SUPPRIMER"
            required
          />
          <div v-if="deleteError" class="p-3 bg-danger-bg text-sm text-danger">{{ deleteError }}</div>
          <AppButton type="submit" variant="danger" :loading="deleteLoading">
            <Trash2 class="w-4 h-4" />
            Supprimer mon compte
          </AppButton>
        </form>
      </SettingsGroup>
    </SettingsPageLayout>
  </DashboardPage>
</template>

<style scoped>
.account-spaces__head {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.85rem 1.15rem 0.35rem;
}

@media (min-width: 640px) {
  .account-spaces__head {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }

  .account-spaces__switch {
    flex-shrink: 0;
  }
}

.account-spaces__grid {
  display: grid;
  gap: 0.85rem;
}

@media (min-width: 640px) {
  .account-spaces__grid {
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
}

.account-spaces__tile {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.05rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-line);
  background: linear-gradient(180deg, #fff 0%, var(--color-paper-warm) 100%);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.account-spaces__tile--live {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-line));
  box-shadow: 0 8px 24px rgb(25 118 210 / 0.08);
}

.account-spaces__tile--muted {
  opacity: 0.92;
}

.account-spaces__tile-top {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.account-spaces__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.65rem;
  flex-shrink: 0;
}

.account-spaces__icon--teacher {
  background: color-mix(in srgb, var(--color-accent-light) 70%, white);
  color: var(--color-accent);
}

.account-spaces__icon--student {
  background: color-mix(in srgb, var(--color-line) 40%, white);
  color: var(--color-ink);
}

.account-spaces__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.account-spaces__action {
  display: inline-flex;
  text-decoration: none;
}

.account-spaces__icon-btn {
  width: 2.5rem;
  min-width: 2.5rem;
  height: 2.5rem;
  min-height: 2.5rem;
  padding: 0;
}
</style>
