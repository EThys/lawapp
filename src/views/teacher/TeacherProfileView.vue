<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useTeacherStore } from '@/stores/teachers'
import { GENDER_OPTIONS, useTeacherProfilePageStore } from '@/stores/teacherProfilePage'
import { useAccountSettingsStore } from '@/stores/accountSettings'
import { isApiEnabled } from '@/config/features'
import { getInitials } from '@/utils/auth'
import { dismissKeyboard } from '@/utils/form'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import SettingsPageLayout from '@/components/settings/SettingsPageLayout.vue'
import SettingsGroup from '@/components/settings/SettingsGroup.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import InstitutionAffiliationCard from '@/components/institution/InstitutionAffiliationCard.vue'
import { AlertCircle, GraduationCap, Shield, Trash2 } from '@lucide/vue'

const router = useRouter()
const auth = useAuthStore()
const teacherStore = useTeacherStore()
const pageStore = useTeacherProfilePageStore()
const accountStore = useAccountSettingsStore()

const {
  ready,
  saving,
  error,
  success,
  departement,
  gender,
  justificatif,
  typeTeacherId,
  etablisementId,
  requestInstitutionValidation,
  etablissementOptions,
  teacherTypeOptions,
  typeTeacherLabel,
  selectedEtablissementLabel,
} = storeToRefs(pageStore)

const {
  changeLoading,
  deleteLoading,
  changeError,
  deleteError,
  newPassword,
  confirmPassword,
  deleteConfirm,
} = storeToRefs(accountStore)

const showPasswordModal = ref(false)
const showDeleteModal = ref(false)

const user = computed(() => auth.currentUser)
const loginTeacher = computed(() => auth.teacherProfile)
const initials = computed(() => {
  const u = user.value
  if (!u) return '?'
  return getInitials(u.firstName, u.lastName)
})

const hasProfile = computed(
  () =>
    !!teacherStore.myProfile?.teacherId ||
    !!loginTeacher.value?.teacherId ||
    !!auth.currentUser?.hasTeacherProfile ||
    !!auth.currentUser?.teacherProfileId,
)

onMounted(() => {
  void pageStore.bootstrap()
})

async function handleSubmit() {
  dismissKeyboard()
  if (hasProfile.value) {
    success.value = 'Profil enseignant déjà actif.'
    return
  }
  const result = await pageStore.createProfile()
  if (result.ok) {
    setTimeout(() => router.push('/teacher'), 1000)
  }
}

function openPasswordModal() {
  accountStore.resetPasswordForm()
  showPasswordModal.value = true
}

function openDeleteModal() {
  accountStore.resetDeleteForm()
  showDeleteModal.value = true
}

async function handleChangePassword() {
  const result = await accountStore.changePassword()
  if (result.ok) {
    showPasswordModal.value = false
    await router.replace({ path: '/login', query: { message: result.redirectMessage } })
  }
}

async function handleDeleteAccount() {
  const result = await accountStore.deleteAccount()
  if (result.ok) {
    showDeleteModal.value = false
    await router.push({ path: '/login', query: { message: result.redirectMessage } })
  }
}
</script>

<template>
  <DashboardPage>
    <SettingsPageLayout
      eyebrow="Enseignant"
      title="Profil enseignant"
      description="Type, département et affiliation établissement."
      :initials="initials"
      :loading="!ready"
    >
      <SettingsGroup v-if="user" title="Identité">
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <AppBadge v-if="user.certified" variant="success">Certifié</AppBadge>
          <AppBadge v-if="hasProfile" variant="brand">
            Enseignant #{{ loginTeacher?.teacherId || user.teacherProfileId || teacherStore.myProfile?.teacherId }}
          </AppBadge>
        </div>
        <dl class="settings-dl">
          <div class="settings-dl__item">
            <dt>Nom</dt>
            <dd>{{ user.lastName }} {{ user.firstName }}</dd>
          </div>
          <div class="settings-dl__item">
            <dt>Identifiant</dt>
            <dd class="font-mono text-xs">
              {{ user.studentId?.startsWith('@') ? user.studentId : user.studentId ? `@${user.studentId}` : 'Non renseigné' }}
            </dd>
          </div>
          <div class="settings-dl__item">
            <dt>E-mail</dt>
            <dd>{{ user.email }}</dd>
          </div>
          <div class="settings-dl__item">
            <dt>Téléphone</dt>
            <dd>{{ user.phone || 'Non renseigné' }}</dd>
          </div>
          <div class="settings-dl__item">
            <dt>Ville</dt>
            <dd>{{ user.city || 'Non renseigné' }}</dd>
          </div>
        </dl>
      </SettingsGroup>

      <SettingsGroup v-if="!isApiEnabled()" title="Parcours">
        <p class="text-sm text-ink-muted m-0">Activez le mode API pour enregistrer un profil enseignant.</p>
      </SettingsGroup>

      <SettingsGroup
        v-else-if="hasProfile"
        title="Parcours"
        description="Informations enregistrées pour votre espace enseignant."
      >
        <dl class="settings-dl">
          <div class="settings-dl__item">
            <dt>Type d'enseignant</dt>
            <dd>{{ typeTeacherLabel }}</dd>
          </div>
          <div class="settings-dl__item">
            <dt>Département</dt>
            <dd>{{ departement || 'Non renseigné' }}</dd>
          </div>
          <div class="settings-dl__item">
            <dt>Genre</dt>
            <dd>{{ GENDER_OPTIONS.find((g) => g.value === gender)?.label || gender || 'Non renseigné' }}</dd>
          </div>
          <div class="settings-dl__item settings-dl__item--wide">
            <dt>Justificatif</dt>
            <dd>{{ justificatif || 'Non renseigné' }}</dd>
          </div>
        </dl>
        <div class="settings-actions">
          <AppButton variant="outline" @click="router.push('/teacher')">Tableau de bord</AppButton>
          <RouterLink to="/account">
            <AppButton variant="ghost">Compte et espaces</AppButton>
          </RouterLink>
        </div>
      </SettingsGroup>

      <SettingsGroup v-else title="Activer le profil" description="Complétez votre fiche enseignant.">
        <form class="space-y-5" novalidate @submit.prevent="handleSubmit">
          <AppSelect
            v-model="typeTeacherId"
            label="Type d'enseignant"
            required
            placeholder="Choisir un type"
            :options="teacherTypeOptions"
            :hint="teacherTypeOptions.length ? undefined : 'Aucun type disponible pour le moment.'"
          />
          <AppSelect
            v-model="etablisementId"
            label="Université / établissement d'exercice"
            required
            placeholder="Choisir un établissement"
            :options="etablissementOptions"
          />
          <AppInput
            v-model="departement"
            label="Département / faculté"
            required
            hint="Ex. Droit, Sciences économiques…"
          />
          <label class="flex items-start gap-3 cursor-pointer text-sm text-ink-muted leading-relaxed">
            <input
              v-model="requestInstitutionValidation"
              type="checkbox"
              class="mt-1 rounded border-line text-accent focus:ring-accent"
            />
            <span>
              Envoyer une <strong class="font-medium text-ink">demande d’affiliation</strong>
              à cet établissement dès la création du profil (optionnel).
            </span>
          </label>
          <AppSelect
            v-model="gender"
            label="Genre"
            required
            placeholder="Choisir"
            :options="[...GENDER_OPTIONS]"
          />
          <AppTextarea
            v-model="justificatif"
            label="Justificatif"
            placeholder="Référence administrative (optionnel)"
            :rows="3"
          />
          <div v-if="success" class="p-3 bg-accent-light text-sm text-accent">{{ success }}</div>
          <div v-if="error" class="flex gap-2 p-3 bg-danger-bg text-sm text-danger">
            <AlertCircle class="w-4 h-4 shrink-0" /> {{ error }}
          </div>
          <AppButton type="submit" :loading="saving || teacherStore.loading">
            <GraduationCap class="w-4 h-4" />
            Créer mon profil enseignant
          </AppButton>
        </form>
      </SettingsGroup>

      <InstitutionAffiliationCard
        v-if="hasProfile"
        :profile-etablissement-id="etablisementId"
        :profile-etablissement-label="selectedEtablissementLabel"
      />

      <SettingsGroup title="Sécurité" description="Mot de passe et suppression du compte.">
        <div class="settings-actions mt-0">
          <AppButton type="button" variant="outline" @click="openPasswordModal">
            <Shield class="w-4 h-4" />
            Changer le mot de passe
          </AppButton>
          <AppButton type="button" variant="danger" @click="openDeleteModal">
            <Trash2 class="w-4 h-4" />
            Supprimer le compte
          </AppButton>
        </div>
      </SettingsGroup>
    </SettingsPageLayout>

    <AppModal v-if="showPasswordModal" title="Changer le mot de passe" @close="showPasswordModal = false">
      <form class="space-y-4" @submit.prevent="handleChangePassword">
        <p class="text-sm text-ink-muted">
          Choisissez un nouveau mot de passe sécurisé (8 caractères min., lettres et chiffres).
        </p>
        <AppInput
          v-model="newPassword"
          label="Nouveau mot de passe"
          type="password"
          autocomplete="new-password"
          required
        />
        <AppInput
          v-model="confirmPassword"
          label="Confirmer"
          type="password"
          autocomplete="new-password"
          required
        />
        <div v-if="changeError" class="flex gap-2 p-3 bg-danger-bg text-sm text-danger">
          <AlertCircle class="w-4 h-4 shrink-0" /> {{ changeError }}
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <AppButton type="button" variant="outline" @click="showPasswordModal = false">Annuler</AppButton>
          <AppButton type="submit" :loading="changeLoading">Enregistrer</AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal v-if="showDeleteModal" title="Supprimer le compte" @close="showDeleteModal = false">
      <form class="space-y-4" @submit.prevent="handleDeleteAccount">
        <p class="text-sm text-ink-muted">
          Cette action est irréversible. Toutes vos données seront supprimées.
        </p>
        <AppInput
          v-model="deleteConfirm"
          label="Tapez SUPPRIMER pour confirmer"
          placeholder="SUPPRIMER"
          required
        />
        <div v-if="deleteError" class="p-3 bg-danger-bg text-sm text-danger">{{ deleteError }}</div>
        <div class="flex justify-end gap-2 pt-2">
          <AppButton type="button" variant="outline" @click="showDeleteModal = false">Annuler</AppButton>
          <AppButton type="submit" variant="danger" :loading="deleteLoading">
            Supprimer mon compte
          </AppButton>
        </div>
      </form>
    </AppModal>
  </DashboardPage>
</template>
