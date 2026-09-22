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
import { AlertCircle, Shield, Trash2, GraduationCap, LayoutDashboard } from '@lucide/vue'

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
    changeSuccess.value = result.message ?? 'Mot de passe modifié.'
    appToast.success(changeSuccess.value)
    newPassword.value = ''
    confirmPassword.value = ''
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
      <div v-if="user?.certified" class="mt-3 flex flex-wrap items-center gap-3">
        <AppBadge variant="success">Compte certifié</AppBadge>
        <RouterLink to="/admin">
          <AppButton size="sm" variant="outline">
            <LayoutDashboard class="w-4 h-4" />
            Tableau de bord admin
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

    <AppCard v-if="apiMode && auth.isTeacher" class="p-6 space-y-4">
      <div class="flex items-center gap-2">
        <GraduationCap class="w-5 h-5 text-accent" />
        <h2 class="font-semibold text-ink">Profil enseignant</h2>
      </div>
      <p class="text-sm text-ink-muted">
        <template v-if="user?.hasTeacherProfile || user?.teacherProfileId">
          Votre profil enseignant est actif. Vous pouvez le consulter si besoin.
        </template>
        <template v-else>
          Complétez vos informations pour publier des évaluations.
        </template>
      </p>
      <RouterLink to="/teacher/profile">
        <AppButton variant="outline">
          {{
            user?.hasTeacherProfile || user?.teacherProfileId
              ? 'Voir mon profil enseignant'
              : 'Configurer mon profil enseignant'
          }}
        </AppButton>
      </RouterLink>
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
