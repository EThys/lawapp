<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useEvaluationStore } from '@/stores/evaluations'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { EVALUATION_TYPE_LABELS } from '@/types'
import { KeyRound, ArrowRight, AlertCircle } from '@lucide/vue'
import { formatMinutes } from '@/utils/helpers'
import { dismissKeyboard, missingFieldsMessage } from '@/utils/form'

const route = useRoute()
const router = useRouter()
const store = useEvaluationStore()

const code = ref('')
const error = ref('')
const foundEvaluation = ref<ReturnType<typeof store.getByCode> | null>(null)

onMounted(() => {
  const paramCode = route.params.code as string | undefined
  if (paramCode) {
    code.value = paramCode.toUpperCase()
    lookupCode()
  }
})

function lookupCode() {
  dismissKeyboard()
  error.value = ''
  foundEvaluation.value = null

  if (!code.value.trim()) {
    error.value = 'Le champ « Code d\'accès » est requis.'
    return
  }

  const evaluation = store.getByCode(code.value.trim())
  if (!evaluation) {
    error.value = 'Code invalide. Vérifiez auprès de votre enseignant.'
    return
  }

  if (evaluation.status === 'draft') {
    error.value = 'Cette évaluation n\'est pas encore publiée.'
    return
  }

  if (evaluation.status === 'closed') {
    error.value = 'Cette évaluation est fermée.'
    return
  }

  foundEvaluation.value = evaluation
}

const firstName = ref('')
const lastName = ref('')
const studentId = ref('')
const joinError = ref('')

async function joinEvaluation() {
  dismissKeyboard()
  joinError.value = ''

  if (!foundEvaluation.value) return

  const missing: string[] = []
  if (!lastName.value.trim()) missing.push('Nom')
  if (!firstName.value.trim()) missing.push('Prénom')
  if (!studentId.value.trim()) missing.push('Identifiant / N° étudiant')
  if (missing.length) {
    joinError.value = missingFieldsMessage(missing)
    return
  }

  const attempts = store.getStudentAttempts(foundEvaluation.value.id, studentId.value)
  if (attempts >= foundEvaluation.value.settings.maxAttempts) {
    joinError.value = `Nombre maximum de tentatives atteint (${foundEvaluation.value.settings.maxAttempts}).`
    return
  }

  const existing = store.getActiveSessionByStudentId(
    foundEvaluation.value.id,
    studentId.value.trim()
  )
  if (existing) {
    await router.push(store.getExamEntryPath(existing))
    return
  }

  const session = store.createSession({
    evaluation: foundEvaluation.value,
    studentFirstName: firstName.value.trim(),
    studentLastName: lastName.value.trim(),
    studentId: studentId.value.trim(),
  })

  await router.push(store.getExamEntryPath(session))
}
</script>

<template>
  <div class="max-w-lg mx-auto px-4 sm:px-6 py-16">
    <div class="text-center mb-10">
      <div class="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-600/20">
        <KeyRound class="w-7 h-7 text-white" />
      </div>
      <h1 class="text-3xl font-semibold text-surface-900">Rejoindre une évaluation</h1>
      <p class="mt-2 text-surface-500">Entrez le code fourni par votre enseignant.</p>
    </div>

    <AppCard>
      <div class="space-y-4">
        <AppInput
          v-model="code"
          label="Code d'accès"
          placeholder="Ex: ABC123"
          hint="Code à 6 caractères"
          @keyup.enter="lookupCode"
        />

        <AppButton class="w-full" @click="lookupCode">
          Vérifier le code
          <ArrowRight class="w-4 h-4" />
        </AppButton>

        <div v-if="error" class="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
          <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
          {{ error }}
        </div>
      </div>
    </AppCard>

    <!-- Evaluation found -->
    <AppCard v-if="foundEvaluation" class="mt-6">
      <div class="space-y-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-xl font-semibold text-surface-900">{{ foundEvaluation.title }}</h2>
            <AppBadge variant="brand">{{ EVALUATION_TYPE_LABELS[foundEvaluation.type] }}</AppBadge>
          </div>
          <p class="text-sm text-surface-500">
            {{ foundEvaluation.subject }} · {{ formatMinutes(foundEvaluation.durationMinutes) }} ·
            {{ foundEvaluation.questions.length }} question(s)
          </p>
          <p class="text-sm text-surface-600 mt-2">Par {{ foundEvaluation.teacherName }}</p>
        </div>

        <hr class="border-surface-200" />

        <p class="text-sm font-medium text-surface-700">Identifiez-vous pour commencer :</p>

        <div class="grid sm:grid-cols-2 gap-4">
          <AppInput v-model="lastName" label="Nom" placeholder="Dupont" required />
          <AppInput v-model="firstName" label="Prénom" placeholder="Marie" required />
        </div>
        <AppInput v-model="studentId" label="Identifiant / N° étudiant" placeholder="E2024001" required />

        <div v-if="joinError" class="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
          <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
          {{ joinError }}
        </div>

        <AppButton class="w-full" @click="joinEvaluation">
          Commencer l'évaluation
          <ArrowRight class="w-4 h-4" />
        </AppButton>
      </div>
    </AppCard>

    <p class="text-center text-sm text-surface-400 mt-8">
      Enseignant ?
      <RouterLink to="/teacher" class="text-brand-600 hover:text-brand-700 font-medium">
        Accéder au tableau de bord
      </RouterLink>
    </p>
  </div>
</template>
