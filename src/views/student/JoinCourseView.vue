<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCourseStore } from '@/stores/courses'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { getGroupShareUrl } from '@/utils/access'
import { Users, ArrowRight, AlertCircle, CheckCircle2 } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const courseStore = useCourseStore()

const code = ref('')
const error = ref('')
const success = ref('')
const foundCourse = ref<ReturnType<typeof courseStore.getByEnrollmentCode> | null>(null)

const profile = computed(() => {
  const user = auth.currentUser
  if (!user) return null
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    studentId: user.studentId ?? user.email,
    email: user.email,
    institution: user.institution,
  }
})

const alreadyEnrolled = computed(() =>
  foundCourse.value && auth.currentUser
    ? courseStore.isEnrolled(foundCourse.value.id, auth.currentUser.id)
    : false
)

function lookupCode() {
  error.value = ''
  success.value = ''
  foundCourse.value = null

  if (!code.value.trim()) {
    error.value = 'Veuillez entrer un code.'
    return
  }

  const course = courseStore.getByEnrollmentCode(code.value.trim())
  if (!course) {
    error.value = 'Code invalide. Vérifiez auprès de votre enseignant.'
    return
  }

  foundCourse.value = course
}

function confirmEnrollment() {
  error.value = ''
  success.value = ''

  if (!foundCourse.value || !auth.currentUser) return

  if (alreadyEnrolled.value) {
    router.push('/student')
    return
  }

  const result = courseStore.enrollStudent(foundCourse.value.id, auth.currentUser.id)
  if (!result.ok) {
    error.value = result.error
    return
  }

  success.value = `Vous avez rejoint la salle « ${foundCourse.value.name} ».`
  setTimeout(() => router.push('/student'), 1500)
}

onMounted(() => {
  const paramCode =
    (route.query.code as string) ||
    (route.params.code as string | undefined)
  if (paramCode) {
    code.value = paramCode.toUpperCase()
    lookupCode()
  }
})
</script>

<template>
  <div class="max-w-lg mx-auto px-4 sm:px-6 py-16">
    <div class="text-center mb-10">
      <div class="w-14 h-14 bg-accent flex items-center justify-center mx-auto mb-4">
        <Users class="w-7 h-7 text-white" />
      </div>
      <h1 class="font-display text-3xl text-ink">Rejoindre ma classe</h1>
      <p class="mt-2 text-sm text-ink-muted">Entrez le code ou le lien partagé par votre enseignant.</p>
    </div>

    <AppCard title="Code classe">
      <div class="space-y-4">
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-ink-muted uppercase tracking-wide">Code classe</label>
          <input
            v-model="code"
            type="text"
            placeholder="ABC123"
            class="w-full px-3.5 py-2.5 border border-line bg-white text-sm font-mono uppercase focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
            @keyup.enter="lookupCode"
          />
        </div>
        <AppButton class="w-full" @click="lookupCode">Vérifier le code</AppButton>

        <div v-if="error" class="flex items-start gap-2 p-3 bg-danger-bg border border-danger/15 text-sm text-danger">
          <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
          {{ error }}
        </div>
        <div v-if="success" class="flex items-start gap-2 p-3 bg-accent-light border border-accent/20 text-sm text-accent">
          <CheckCircle2 class="w-4 h-4 flex-shrink-0 mt-0.5" />
          {{ success }}
        </div>
      </div>
    </AppCard>

    <AppCard v-if="foundCourse" class="mt-6" title="Confirmer votre entrée dans la classe">
      <div class="space-y-4">
        <div>
          <h2 class="font-medium text-ink">{{ foundCourse.name }}</h2>
          <p class="text-sm text-ink-muted mt-1">
            {{ foundCourse.subject }} · Prof. {{ foundCourse.teacherName }}
          </p>
          <AppBadge v-if="alreadyEnrolled" variant="success" class="mt-2">Déjà membre</AppBadge>
        </div>

        <hr class="border-line" />

        <p class="text-sm text-ink-muted">Vos informations de profil :</p>
        <dl v-if="profile" class="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-ink-faint text-xs uppercase tracking-wide">Nom</dt>
            <dd class="font-medium text-ink">{{ profile.lastName }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint text-xs uppercase tracking-wide">Prénom</dt>
            <dd class="font-medium text-ink">{{ profile.firstName }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint text-xs uppercase tracking-wide">N° étudiant</dt>
            <dd class="font-medium text-ink font-mono">{{ profile.studentId }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint text-xs uppercase tracking-wide">Établissement</dt>
            <dd class="font-medium text-ink">{{ profile.institution || '—' }}</dd>
          </div>
        </dl>

        <p class="text-xs text-ink-faint break-all">
          Lien partagé : {{ getGroupShareUrl(foundCourse.enrollmentCode) }}
        </p>

        <AppButton class="w-full" @click="confirmEnrollment">
          {{ alreadyEnrolled ? 'Retour à mon espace' : 'Valider et rejoindre la classe' }}
          <ArrowRight class="w-4 h-4" />
        </AppButton>
      </div>
    </AppCard>

    <p class="text-center text-sm text-ink-faint mt-8">
      <RouterLink to="/student" class="text-accent hover:text-accent-hover font-medium">Retour à l'espace étudiant</RouterLink>
    </p>
  </div>
</template>
