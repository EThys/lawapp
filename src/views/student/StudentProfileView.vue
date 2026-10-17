<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useStudentStore } from '@/stores/students'
import { useClassroomStore } from '@/stores/classrooms'
import { GENDER_OPTIONS, useStudentProfilePageStore } from '@/stores/studentProfilePage'
import { isApiEnabled } from '@/config/features'
import { getInitials } from '@/utils/auth'
import { dismissKeyboard } from '@/utils/form'
import DashboardPage from '@/components/layout/DashboardPage.vue'
import SettingsPageLayout from '@/components/settings/SettingsPageLayout.vue'
import SettingsGroup from '@/components/settings/SettingsGroup.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import StudentAcademicAffiliationCard from '@/components/institution/StudentAcademicAffiliationCard.vue'
import { AlertCircle, BookOpen } from '@lucide/vue'

const router = useRouter()
const auth = useAuthStore()
const studentStore = useStudentStore()
const classroomStore = useClassroomStore()
const pageStore = useStudentProfilePageStore()

const {
  ready,
  saving,
  error,
  success,
  promotionId,
  classroomId,
  etablissementId,
  matricule,
  gender,
  etablissementOptions,
  promotionOptions,
  classroomOptions,
  promotionLabel,
  classroomLabel,
  etablissementLabel,
} = storeToRefs(pageStore)

const user = computed(() => auth.currentUser)
const loginStudent = computed(() => auth.studentProfile)
const initials = computed(() => {
  const u = user.value
  if (!u) return '?'
  return getInitials(u.firstName, u.lastName)
})

const hasProfile = computed(
  () =>
    !!studentStore.myProfile?.studentId ||
    !!loginStudent.value?.studentId ||
    !!auth.currentUser?.hasStudentProfile ||
    !!auth.currentUser?.studentProfileId,
)

onMounted(() => {
  void pageStore.bootstrap()
})

async function handleSubmit() {
  dismissKeyboard()
  if (hasProfile.value) {
    success.value = 'Profil étudiant déjà actif.'
    return
  }
  const result = await pageStore.createProfile()
  if (result.ok) {
    setTimeout(() => router.push('/student'), 1200)
  }
}
</script>

<template>
  <DashboardPage>
    <SettingsPageLayout
      eyebrow="Étudiant"
      title="Profil étudiant"
      description="Promotion, salle et parcours académique."
      :initials="initials"
      :loading="!ready"
    >
      <StudentAcademicAffiliationCard />

      <SettingsGroup v-if="user" title="Identité">
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <AppBadge v-if="user.certified" variant="success">Certifié</AppBadge>
          <AppBadge v-if="hasProfile" variant="brand">
            Étudiant #{{ loginStudent?.studentId || user.studentProfileId || studentStore.myProfile?.studentId }}
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
        <p class="text-sm text-ink-muted m-0">Activez le mode API pour enregistrer un profil étudiant.</p>
      </SettingsGroup>

      <SettingsGroup
        v-else-if="hasProfile"
        title="Parcours"
        description="Informations enregistrées pour votre espace étudiant."
      >
        <dl class="settings-dl">
          <div class="settings-dl__item">
            <dt>Promotion</dt>
            <dd>{{ promotionLabel }}</dd>
          </div>
          <div class="settings-dl__item">
            <dt>Salle</dt>
            <dd>{{ classroomLabel }}</dd>
          </div>
          <div class="settings-dl__item">
            <dt>Établissement</dt>
            <dd>{{ etablissementLabel }}</dd>
          </div>
          <div class="settings-dl__item">
            <dt>Matricule</dt>
            <dd>{{ matricule || 'Non renseigné' }}</dd>
          </div>
          <div class="settings-dl__item">
            <dt>Genre</dt>
            <dd>{{ GENDER_OPTIONS.find((g) => g.value === gender)?.label || gender || 'Non renseigné' }}</dd>
          </div>
        </dl>
        <div class="settings-actions">
          <AppButton variant="outline" @click="router.push('/student')">Tableau de bord</AppButton>
          <AppButton variant="ghost" @click="router.push('/account')">Compte et espaces</AppButton>
        </div>
      </SettingsGroup>

      <SettingsGroup v-else title="Activer le profil" description="Choisissez la salle de votre enseignant.">
        <form class="space-y-5" novalidate @submit.prevent="handleSubmit">
          <AppSelect
            :model-value="classroomId"
            label="Salle"
            required
            placeholder="Choisir une salle"
            :options="classroomOptions"
            :error="classroomOptions.length === 0 ? 'Aucune salle disponible pour le moment.' : undefined"
            @update:model-value="pageStore.setClassroomId"
          />
          <AppSelect
            v-model="promotionId"
            label="Promotion"
            required
            placeholder="Choisir une promotion"
            :options="promotionOptions"
          />
          <AppSelect
            v-if="etablissementOptions.length"
            v-model="etablissementId"
            label="Établissement"
            placeholder="Choisir un établissement"
            :options="etablissementOptions"
          />
          <AppInput v-model="matricule" label="Matricule" placeholder="N° étudiant (optionnel)" />
          <AppSelect
            v-model="gender"
            label="Genre"
            placeholder="Choisir (optionnel)"
            :options="[...GENDER_OPTIONS]"
          />
          <div v-if="success" class="p-3 bg-accent-light text-sm text-accent">{{ success }}</div>
          <div v-if="error" class="flex gap-2 p-3 bg-danger-bg text-sm text-danger">
            <AlertCircle class="w-4 h-4 shrink-0" /> {{ error }}
          </div>
          <AppButton type="submit" :loading="saving || studentStore.loading || classroomStore.loading">
            <BookOpen class="w-4 h-4" />
            Créer mon profil étudiant
          </AppButton>
        </form>
      </SettingsGroup>
    </SettingsPageLayout>
  </DashboardPage>
</template>
