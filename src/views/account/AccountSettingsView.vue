<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isApiEnabled } from '@/config/features'
import { appToast } from '@/utils/toast'
import AppCard from '@/components/ui/AppCard.vue'
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
  ArrowRight,
} from '@lucide/vue'
import { hasInstitutionAccess } from '@/utils/platformAccess'

const router = useRouter()
const auth = useAuthStore()

const newPassword = ref('')
const confirmPassword = ref('')
const changeError = ref('')
const changeSuccess = ref('')
const changeLoading = ref(false)

const deleteConfirm = ref('')
const deleteError = ref('')
const deleteLoading = ref(false)

const apiMode = computed(() => isApiEnabled())
const user = computed(() => auth.currentUser)
const showInstitutionAdmin = computed(() => hasInstitutionAccess(user.value))
const activeWorkspace = computed(() => auth.activeWorkspace)

async function handleChangePassword() {
  changeError.value = ''
  changeSuccess.value = ''
  if (!apiMode.value) {
    changeError.value = 'Mode API désactivé.'
    appToast.error(changeError.value)
    return
  }
  changeLoading.value = true
  try {
    const result = await auth.changePassword(newPassword.value, confirmPassword.value)
    if (!result.ok) {
      changeError.value = result.error
      appToast.error(result.error)
      return
    }
    const message = result.message ?? 'Mot de passe modifié. Reconnectez-vous.'
    newPassword.value = ''
    confirmPassword.value = ''
    await router.replace({ path: '/login', query: { message } })
  } finally {
    changeLoading.value = false
  }
}

async function handleDeleteAccount() {
  deleteError.value = ''
  if (!apiMode.value) {
    deleteError.value = 'Mode API désactivé.'
    appToast.error(deleteError.value)
    return
  }
  if (deleteConfirm.value.trim().toUpperCase() !== 'SUPPRIMER') {
    deleteError.value = 'Tapez SUPPRIMER pour confirmer.'
    appToast.warning(deleteError.value)
    return
  }
  deleteLoading.value = true
  try {
    const result = await auth.deleteAccount()
    if (!result.ok) {
      deleteError.value = result.error
      appToast.error(result.error)
      return
    }
    appToast.success(result.message ?? 'Compte supprimé.')
    await router.push({ path: '/login', query: { message: result.message ?? 'Compte supprimé.' } })
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
    <div>
      <p class="label-caps mb-2">Compte</p>
      <h1 class="font-display text-3xl text-ink tracking-tight">Sécurité & accès</h1>
      <p v-if="user" class="mt-2 text-sm text-ink-muted">
        {{ user.firstName }} {{ user.lastName }} · {{ user.email }}
      </p>
      <div v-if="user?.certified || showInstitutionAdmin" class="mt-3 flex flex-wrap items-center gap-3">
        <AppBadge v-if="user?.certified" variant="success">Super admin plateforme</AppBadge>
        <RouterLink v-if="user?.certified" to="/admin">
          <AppButton size="sm" variant="outline">
            <LayoutDashboard class="w-4 h-4" />
            Super admin (/admin)
          </AppButton>
        </RouterLink>
        <RouterLink v-if="showInstitutionAdmin" to="/institution">
          <AppButton size="sm" variant="outline">
            <Building2 class="w-4 h-4" />
            Admin université (/institution)
          </AppButton>
        </RouterLink>
      </div>
    </div>

    <AppCard v-if="!apiMode" class="p-6">
      <p class="text-sm text-ink-muted">
        Les actions API (mot de passe, suppression) sont disponibles avec
        <code class="text-xs bg-paper-warm px-1">VITE_USE_API=true</code>.
      </p>
    </AppCard>

    <AppCard v-if="apiMode" class="p-6 space-y-5">
      <div class="flex items-center gap-2">
        <Shield class="w-5 h-5 text-accent" />
        <h2 class="font-semibold text-ink">Changer le mot de passe</h2>
      </div>
      <p class="text-sm text-ink-muted">
        Choisissez un nouveau mot de passe sécurisé pour votre compte.
      </p>
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
        <div v-if="changeSuccess" class="p-3 bg-accent-light border border-accent/20 text-sm text-accent">
          {{ changeSuccess }}
        </div>
        <div v-if="changeError" class="flex gap-2 p-3 bg-danger-bg border border-danger/20 text-sm text-danger">
          <AlertCircle class="w-4 h-4 shrink-0" /> {{ changeError }}
        </div>
        <AppButton type="submit" :loading="changeLoading">Enregistrer</AppButton>
      </form>
    </AppCard>

    <AppCard class="account-spaces p-6 sm:p-7">
      <div class="account-spaces__head">
        <div>
          <h2 class="font-semibold text-ink text-lg">Mes espaces</h2>
          <p class="mt-1 text-sm text-ink-muted max-w-md">
            Un compte, deux tableaux de bord. Basculez quand vous voulez.
          </p>
        </div>
        <RoleWorkspaceSwitcher v-if="auth.showWorkspaceSwitcher" variant="panel" class="account-spaces__switch" />
      </div>
      <p
        v-if="auth.showWorkspaceSwitcher && !auth.canSwitchWorkspace"
        class="text-xs text-ink-muted mb-4 -mt-1"
      >
        Activez les deux profils pour basculer librement entre les espaces.
      </p>

      <div class="account-spaces__grid">
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
                {{
                  auth.hasTeacherQuality
                    ? 'Évaluations, promotions, présences'
                    : 'Profil à compléter'
                }}
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
            <RouterLink v-if="auth.hasTeacherQuality" to="/teacher">
              <AppButton size="sm">
                Tableau de bord
                <ArrowRight class="w-4 h-4" />
              </AppButton>
            </RouterLink>
            <RouterLink to="/teacher/profile">
              <AppButton size="sm" :variant="auth.hasTeacherQuality ? 'outline' : 'primary'">
                {{ auth.hasTeacherQuality ? 'Profil' : 'Activer' }}
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
                {{
                  auth.hasStudentQuality
                    ? 'Groupes, examens, résultats'
                    : 'Profil à compléter'
                }}
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
            <RouterLink v-if="auth.hasStudentQuality" to="/student">
              <AppButton size="sm">
                Tableau de bord
                <ArrowRight class="w-4 h-4" />
              </AppButton>
            </RouterLink>
            <RouterLink to="/student/profile">
              <AppButton size="sm" :variant="auth.hasStudentQuality ? 'outline' : 'primary'">
                {{ auth.hasStudentQuality ? 'Profil' : 'Activer' }}
              </AppButton>
            </RouterLink>
          </div>
        </article>
      </div>
    </AppCard>

    <AppCard v-if="apiMode" class="p-6 space-y-5 border-danger/30">
      <div class="flex items-center gap-2 text-danger">
        <Trash2 class="w-5 h-5" />
        <h2 class="font-semibold">Supprimer le compte</h2>
      </div>
      <p class="text-sm text-ink-muted">
        Cette action est irréversible. Toutes vos données seront supprimées.
      </p>
      <form class="space-y-4" @submit.prevent="handleDeleteAccount">
        <AppInput
          v-model="deleteConfirm"
          label="Tapez SUPPRIMER pour confirmer"
          placeholder="SUPPRIMER"
          required
        />
        <div v-if="deleteError" class="p-3 bg-danger-bg text-sm text-danger">{{ deleteError }}</div>
        <AppButton type="submit" variant="danger" :loading="deleteLoading">
          Supprimer mon compte
        </AppButton>
      </form>
    </AppCard>
  </div>
</template>

<style scoped>
.account-spaces__head {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.25rem;
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
</style>
