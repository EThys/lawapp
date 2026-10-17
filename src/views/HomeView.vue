<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/ui/AppButton.vue'
import AppDecorativeBg from '@/components/ui/AppDecorativeBg.vue'
import HeroGreenPanel from '@/components/home/HeroGreenPanel.vue'
import AppDisclosure from '@/components/ui/AppDisclosure.vue'
import {
  ArrowRight,
  Shield,
  Clock,
  BarChart3,
  FileText,
  Lock,
  Sparkles,
  Briefcase,
  Award,
  GraduationCap,
  CircleCheck,
  Zap,
  Users,
} from '@lucide/vue'

const auth = useAuthStore()

/** Bandeau bas de page : inscription / accès selon invité ou compte existant. */
const homeFooterTeacherCta = computed(() => {
  if (!auth.isAuthenticated) {
    return { label: 'Inscription enseignant', to: '/register' }
  }
  if (auth.hasTeacherQuality) {
    return { label: 'Espace enseignant', to: '/teacher' }
  }
  return { label: 'Activer le profil enseignant', to: '/teacher/profile' }
})

const homeFooterAccessCta = computed(() => {
  if (!auth.isAuthenticated) {
    return { label: 'Connexion', to: '/login' }
  }
  if (!auth.hasTeacherQuality && !auth.hasStudentQuality) {
    return { label: 'Compléter mon compte', to: '/account' }
  }
  if (auth.hasStudentQuality && !auth.hasTeacherQuality) {
    return { label: 'Mon espace étudiant', to: '/student' }
  }
  if (auth.hasTeacherQuality && !auth.hasStudentQuality) {
    return { label: 'Activer le profil étudiant', to: '/student/profile' }
  }
  if (auth.activeWorkspace === 'teacher') {
    return { label: 'Mon espace étudiant', to: '/student' }
  }
  return { label: 'Mon espace enseignant', to: '/teacher' }
})

const homeFooterLead = computed(() => {
  if (!auth.isAuthenticated) {
    return 'Inscription gratuite pour concevoir et diffuser vos évaluations. Le module Droit Ludique est ouvert à tous, sans compte.'
  }
  if (auth.hasTeacherQuality && auth.hasStudentQuality) {
    return 'Vos espaces enseignant et étudiant sont actifs. Basculez entre eux depuis votre compte ou ouvrez directement un tableau de bord.'
  }
  if (auth.hasStudentQuality && !auth.hasTeacherQuality) {
    return 'Votre espace étudiant est prêt. Activez aussi un profil enseignant pour créer et diffuser vos évaluations.'
  }
  if (auth.hasTeacherQuality && !auth.hasStudentQuality) {
    return 'Votre espace enseignant est prêt. Vous pouvez activer un profil étudiant pour passer des épreuves avec le même compte.'
  }
  return 'Finalisez votre profil enseignant ou étudiant pour accéder aux tableaux de bord. Droit Ludique reste ouvert sans compte.'
})

const modules = computed(() => [
  {
    tag: 'Module évaluation',
    title: 'Évaluations sécurisées',
    body: 'Créez TP, interrogations, devoirs et exercices pour vos étudiants, élèves et formations. Chronomètre, code d\'accès, anti-triche configurable et analyse des résultats.',
    cta: 'Espace enseignant',
    to: auth.isTeacher ? '/teacher' : '/register',
    icon: FileText,
    image: '/home-eval-preview.svg',
    imageAlt: 'Aperçu de l’interface de création d’évaluation LawApp',
  },
  {
    tag: 'Module découverte',
    title: 'Droit Ludique',
    body: 'Capsules juridiques courtes en fil vertical, avec quiz. Pour étudiants, citoyens et professionnels.',
    cta: 'Explorer le fil',
    to: '/discover',
    icon: Sparkles,
    image: '/home-discover-banner.svg',
    imageAlt: 'Aperçu du fil Droit Ludique sur mobile',
  },
])

const capabilities = [
  {
    num: 'I',
    title: 'Création d\'évaluations',
    body: 'Concevez des évaluations pour vos étudiants, élèves et parcours de formation. Questions QCM, vrai/faux et réponses courtes, avec barème personnalisé.',
  },
  {
    num: 'II',
    title: 'Surveillance intégrée',
    body: 'Chronomètre strict, détection de changement d\'onglet, blocage du copier-coller et mode plein écran obligatoire.',
  },
  {
    num: 'III',
    title: 'Droit Ludique',
    body: 'Capsules juridiques courtes, quiz interactifs et défilement vertical. Accessible à tous, du lycéen à l\'avocat.',
  },
  {
    num: 'IV',
    title: 'Résultats traçables',
    body: 'Tableau de bord enseignant, historique étudiant, export CSV et enregistrement de chaque violation.',
  },
]

const whyChooseUs = [
  {
    icon: Shield,
    title: 'Épreuves fiables',
    body: 'Chronomètre, anti-triche configurable et journal des incidents : vous gardez la main sur l’intégrité de chaque session.',
  },
  {
    icon: Zap,
    title: 'Mise en ligne rapide',
    body: 'Créez un QCM ou un devoir, publiez-le et partagez un code en quelques minutes — sans installation côté étudiant.',
  },
  {
    icon: BarChart3,
    title: 'Correction et suivi',
    body: 'Tableau de bord enseignant, historique étudiant et export des résultats pour piloter votre cohorte.',
  },
  {
    icon: Users,
    title: 'Rôles bien séparés',
    body: 'Espaces enseignant et étudiant distincts, avec parcours d’inscription adaptés à chaque profil.',
  },
  {
    icon: FileText,
    title: 'Formats variés',
    body: 'TP, interrogations, devoirs et exercices : QCM, vrai/faux et réponses courtes avec barème personnalisé.',
  },
  {
    icon: CircleCheck,
    title: 'Prêt pour l’échelle',
    body: 'Concours, certification ou contrôle continu : une même plateforme du amphi au recrutement.',
  },
]

const whyStats = [
  { value: '< 5 min', label: 'pour publier une épreuve' },
  { value: '100 %', label: 'des passations tracées' },
  { value: '4', label: 'types d’évaluation' },
]

const pillars = [
  { icon: FileText, label: '4 types d\'évaluation' },
  { icon: Clock, label: 'Chrono par session' },
  { icon: Shield, label: 'Anti-triche configurable' },
  { icon: Lock, label: 'Comptes séparés' },
  { icon: BarChart3, label: 'Analyse des résultats' },
]

const evaluationUseCases = [
  {
    title: 'Recruteurs',
    body: 'Assurez-vous de pré-sélectionner les meilleurs candidats rapidement dans vos processus de recrutement.',
    icon: Briefcase,
    tone: 'slate',
  },
  {
    title: 'Certificateurs',
    body: 'Évaluez vos apprenants tout au long de la formation, jusqu’à l’évaluation finale certificative. Garantissez la crédibilité de votre certification et évaluez plus de candidats à distance.',
    icon: Award,
    tone: 'gold',
  },
  {
    title: 'Enseignement supérieur',
    body: 'Évaluez tout au long de l’année vos étudiants : concours d’admission, contrôle continu, examens partiels et finaux.',
    icon: GraduationCap,
    tone: 'brand',
  },
]

const faqItems = [
  {
    question: 'Qu’est-ce que l’évaluation en ligne et comment se distingue-t-elle de l’évaluation traditionnelle sur papier ?',
    answer:
      'L’évaluation en ligne dématérialise la mesure des compétences via des plateformes numériques, offrant plus de flexibilité qu’une évaluation sur papier. Les candidats peuvent passer des examens à distance, en temps réel ou de manière asynchrone, grâce à des technologies telles que le proctoring (télésurveillance). Ces outils assurent la sécurité des examens et la véracité des résultats, rendant l’expérience accessible et adaptée aux besoins des candidats.',
  },
  {
    question: 'Les évaluations en ligne sont-elles adaptées à tous les types de tests ?',
    answer:
      'Oui, les évaluations en ligne conviennent à différents types de tests, tels que les QCM, les réponses courtes, les dissertations, les évaluations pratiques, et même certains tests créatifs. LawApp permet une personnalisation selon vos besoins spécifiques.',
  },
  {
    question: 'Les évaluations en ligne sont-elles fiables ?',
    answer:
      'Oui, les évaluations en ligne à distance peuvent être plus fiables que les examens en présentiel lorsqu’elles s’appuient sur des outils de sécurité avancés : authentification des utilisateurs, verrouillage des navigateurs et analyse comportementale. Avec une plateforme sécurisée, il est possible de garantir l’intégrité et la validité des résultats.',
  },
  {
    question: 'Quels sont les avantages des examens en ligne par rapport aux examens traditionnels ?',
    answer:
      'Les examens en ligne offrent plusieurs avantages : flexibilité géographique (passer l’examen depuis n’importe où), réduction des coûts logistiques, accès rapide aux résultats, et analyse automatisée des performances pour les formateurs.',
  },
]
</script>

<template>
  <div>
    <section class="hero">
      <div class="hero__media" aria-hidden="true">
        <img
          class="hero__media-photo"
          src="/hero-ucc.png"
          alt=""
        />
        <div class="hero__media-veil" />
      </div>

      <div class="hero__inner">
        <div class="hero__main">
          <h1 class="hero__title font-display hero-anim hero-anim--1">
            Créez vos évaluations.<br />
            <span class="hero__title-muted">Pour vos étudiants et formations.</span>
          </h1>

          <p class="hero__lead hero-anim hero-anim--2">
            Concevez, diffusez et corrigez TP, interrogations et exercices
            pour vos élèves, étudiants et parcours de formation.
          </p>

          <div class="hero__actions hero-anim hero-anim--3">
            <RouterLink
              v-if="!auth.isAuthenticated"
              to="/register"
              class="group"
            >
              <AppButton size="lg" class="hover-lift">
                Espace enseignant
                <ArrowRight class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </AppButton>
            </RouterLink>
            <RouterLink v-else-if="auth.isTeacher" to="/teacher" class="group">
              <AppButton size="lg" class="hover-lift">
                Espace enseignant
                <ArrowRight class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </AppButton>
            </RouterLink>
            <RouterLink
              :to="auth.isAuthenticated && auth.isStudent ? '/student' : '/register'"
            >
              <AppButton variant="outline" size="lg" class="hover-lift hero__btn-outline">
                {{ auth.isStudent ? 'Espace étudiant' : 'Compte étudiant' }}
              </AppButton>
            </RouterLink>
          </div>
        </div>

        <aside class="hero__aside">
          <Sparkles class="hero__mark hero-anim hero-anim--4" aria-hidden="true" />
          <HeroGreenPanel />
        </aside>
      </div>

      <div class="hero__scroll-hint" aria-hidden="true">
        <span class="hero__scroll-line" />
      </div>
    </section>

    <section class="home-trust border-b border-line bg-white animate-fade-in">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-9">
        <div class="flex flex-wrap justify-center gap-3 lg:gap-4">
          <div
            v-for="(pillar, i) in pillars"
            :key="pillar.label"
            v-reveal="i * 60"
            class="home-pillar"
          >
            <span class="home-pillar__icon">
              <component :is="pillar.icon" class="w-4 h-4" />
            </span>
            {{ pillar.label }}
          </div>
        </div>
      </div>
    </section>

    <section id="pourquoi" class="home-why border-b border-line scroll-mt-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 home-why__inner">
        <div class="home-why__intro">
          <div v-reveal class="home-why__copy">
            <p class="label-caps mb-3">Pourquoi nous choisir</p>
            <h2 class="font-display text-2xl sm:text-3xl text-ink leading-snug">
              Une plateforme d’évaluation conçue pour la sérénité des formateurs
            </h2>
            <p class="text-sm text-ink-muted mt-4 leading-relaxed max-w-lg">
              LawApp réunit création d’épreuves, passation sécurisée et analyse des résultats —
              sans empiler les outils ni sacrifier la crédibilité des notes.
            </p>
            <RouterLink
              v-if="!auth.isAuthenticated"
              to="/register"
              class="home-why__cta group inline-flex mt-8"
            >
              <AppButton size="lg" class="hover-lift">
                Commencer gratuitement
                <ArrowRight class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </AppButton>
            </RouterLink>
            <RouterLink
              v-else-if="auth.isTeacher"
              to="/teacher"
              class="home-why__cta group inline-flex mt-8"
            >
              <AppButton size="lg" class="hover-lift">
                Ouvrir mon espace
                <ArrowRight class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </AppButton>
            </RouterLink>
          </div>

          <ul v-reveal="{ delay: 80 }" class="home-why__stats">
            <li v-for="stat in whyStats" :key="stat.label" class="home-why__stat">
              <span class="home-why__stat-value">{{ stat.value }}</span>
              <span class="home-why__stat-label">{{ stat.label }}</span>
            </li>
          </ul>
        </div>

        <ul class="home-why__grid">
          <li
            v-for="(item, i) in whyChooseUs"
            :key="item.title"
            v-reveal="{ delay: i * 70 }"
            class="home-why__card"
          >
            <span class="home-why__card-icon" aria-hidden="true">
              <component :is="item.icon" class="w-5 h-5" />
            </span>
            <h3 class="home-why__card-title">{{ item.title }}</h3>
            <p class="home-why__card-body">{{ item.body }}</p>
          </li>
        </ul>
      </div>
    </section>

    <section class="py-16 lg:py-24 border-b border-line bg-gradient-to-b from-paper-warm to-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div v-reveal class="text-center mb-12 max-w-2xl mx-auto">
          <p class="label-caps mb-3">Deux modules</p>
          <h2 class="font-display text-2xl sm:text-3xl text-ink">Une plateforme, deux usages complémentaires.</h2>
          <p class="text-sm text-ink-muted mt-3 leading-relaxed">
            Pour les formateurs qui créent des évaluations, et pour ceux qui veulent comprendre le droit sans lourdeur.
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          <article
            v-for="(mod, i) in modules"
            :key="mod.title"
            v-reveal="{ delay: i * 100, from: i === 0 ? 'left' : 'right' }"
            class="home-module group flex flex-col"
          >
            <div class="home-module__media">
              <img
                :src="mod.image"
                :alt="mod.imageAlt"
                class="home-module__img"
                width="640"
                height="360"
                loading="lazy"
                decoding="async"
              />
              <div class="home-module__media-badge">
                <component :is="mod.icon" class="w-4 h-4" />
              </div>
            </div>
            <div class="home-module__body">
              <p class="label-caps mb-2">{{ mod.tag }}</p>
              <h3 class="font-display text-xl text-ink mb-3">{{ mod.title }}</h3>
              <p class="text-sm text-ink-muted leading-relaxed flex-1">{{ mod.body }}</p>
              <RouterLink :to="mod.to" class="mt-6 inline-block group/link">
                <AppButton variant="outline" size="sm" class="hover-lift">
                  {{ mod.cta }}
                  <ArrowRight class="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:translate-x-1" />
                </AppButton>
              </RouterLink>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="py-16 lg:py-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div v-reveal class="mb-12">
          <p class="label-caps mb-3">Fonctionnalités</p>
          <h2 class="font-display text-2xl sm:text-3xl text-ink">Un outil complet, pas un gadget.</h2>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line">
          <article
            v-for="(cap, i) in capabilities"
            :key="cap.num"
            v-reveal="i * 100"
            class="home-cap bg-white p-8 lg:p-10 hover-lift group"
          >
            <p class="font-display text-3xl text-accent/30 mb-4 transition-colors group-hover:text-accent/50">{{ cap.num }}</p>
            <h3 class="font-display text-xl text-ink mb-3">{{ cap.title }}</h3>
            <p class="text-sm text-ink-muted leading-relaxed">{{ cap.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="border-y border-line bg-white py-16 lg:py-24">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div v-reveal>
            <p class="label-caps mb-3">Processus</p>
            <h2 class="font-display text-2xl sm:text-3xl text-ink leading-snug">
              De la conception à la correction, en trois étapes.
            </h2>
            <p class="text-sm text-ink-muted mt-4 leading-relaxed max-w-md">
              Publiez une épreuve en quelques minutes, partagez un code simple, puis suivez la passation en direct.
            </p>
            <div class="home-process-visual mt-8">
              <img
                src="/home-eval-preview.svg"
                alt="Parcours de publication d’une évaluation"
                class="w-full rounded-xl border border-line shadow-md ring-1 ring-black/5"
                loading="lazy"
              />
            </div>
          </div>
          <ol class="space-y-0 divide-y divide-line border border-line rounded-xl overflow-hidden shadow-sm">
            <li
              v-for="(item, i) in [
                { n: '01', t: 'Inscription et connexion', d: 'Compte enseignant ou étudiant, avec identifiants distincts et espaces dédiés.' },
                { n: '02', t: 'Diffusion par code', d: 'L\'enseignant publie l\'évaluation et partage un code à 6 caractères ou un lien direct.' },
                { n: '03', t: 'Passation surveillée', d: 'L\'étudiant passe l\'épreuve sous chrono. Toute infraction est consignée automatiquement.' },
              ]"
              :key="item.n"
              v-reveal="{ delay: i * 80, from: 'right' }"
              class="home-step flex gap-6 p-6"
              :class="i % 2 === 0 ? 'bg-paper/50' : ''"
            >
              <span class="text-sm font-semibold text-accent tabular-nums w-6 flex-shrink-0">{{ item.n }}</span>
              <div>
                <p class="text-sm font-semibold text-ink">{{ item.t }}</p>
                <p class="text-xs text-ink-muted mt-1 leading-relaxed">{{ item.d }}</p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <section class="py-16 lg:py-24 border-b border-line home-use-cases">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div v-reveal class="text-center mb-12 max-w-2xl mx-auto">
          <p class="label-caps mb-3">Cas d’usage</p>
          <h2 class="font-display text-2xl sm:text-3xl text-ink">
            Construit pour l’évaluation en ligne
          </h2>
          <p class="text-sm text-ink-muted mt-3 leading-relaxed">
            Recrutement, certification ou cursus universitaire : une même plateforme pour concevoir,
            diffuser et sécuriser vos épreuves.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-6 lg:gap-8">
          <article
            v-for="(item, i) in evaluationUseCases"
            :key="item.title"
            v-reveal="{ delay: i * 80 }"
            class="home-use-case group flex flex-col"
            :class="`home-use-case--${item.tone}`"
          >
            <div class="home-use-case__banner">
              <img src="/home-use-case-pattern.svg" alt="" class="home-use-case__pattern" />
              <span class="home-use-case__icon-wrap">
                <component :is="item.icon" class="w-6 h-6" />
              </span>
            </div>
            <div class="home-use-case__body">
              <h3 class="font-display text-xl text-ink mb-3">{{ item.title }}</h3>
              <p class="text-sm text-ink-muted leading-relaxed flex-1">{{ item.body }}</p>
              <a
                href="#faq"
                class="home-use-case__link mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark group-hover:text-accent transition-colors"
              >
                En savoir plus
                <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="faq" class="home-faq scroll-mt-20">
      <div class="home-faq__glow" aria-hidden="true" />
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 home-faq__inner">
        <header v-reveal class="home-faq__header">
          <h2 class="home-faq__title font-display">
            Questions fréquemment posées
          </h2>
          <p class="home-faq__lead">
            Tout ce qu’il faut savoir avant de lancer vos premières épreuves en ligne avec LawApp.
          </p>
        </header>

        <div v-reveal="{ delay: 80 }" class="home-faq__panel">
          <AppDisclosure
            v-for="(item, i) in faqItems"
            :key="item.question"
            :title="item.question"
            :default-open="i === 0"
            class="home-faq__item"
          >
            <p class="home-faq__answer">
              {{ item.answer }}
            </p>
          </AppDisclosure>
        </div>
      </div>
    </section>

    <section class="home-cta relative bg-brand-dark text-white py-16 lg:py-20 overflow-hidden">
      <AppDecorativeBg />
      <div v-reveal class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        <div>
          <h2 class="font-display text-2xl sm:text-3xl leading-snug">
            Prêt à créer vos évaluations ?
          </h2>
          <p class="text-sm text-white/50 mt-3 max-w-md leading-relaxed">
            {{ homeFooterLead }}
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <RouterLink v-reveal="{ delay: 80 }" to="/discover" class="group">
            <AppButton class="!bg-accent !text-white hover:!bg-accent-hover w-full sm:w-auto hover-lift">
              Droit Ludique
              <Sparkles class="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
            </AppButton>
          </RouterLink>
          <RouterLink v-reveal="{ delay: 160 }" :to="homeFooterTeacherCta.to">
            <AppButton variant="outline" class="home-cta__btn-light w-full sm:w-auto hover-lift">
              {{ homeFooterTeacherCta.label }}
            </AppButton>
          </RouterLink>
          <RouterLink v-reveal="{ delay: 240 }" :to="homeFooterAccessCta.to">
            <AppButton variant="outline" class="home-cta__btn-light w-full sm:w-auto hover-lift">
              {{ homeFooterAccessCta.label }}
            </AppButton>
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--color-line);
}

.hero__media {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.hero__media-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  filter: saturate(0.9) contrast(1.03);
  animation: hero-ken-burns 24s ease-in-out infinite alternate;
  will-change: transform;
}

.hero__media-veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      105deg,
      color-mix(in srgb, var(--color-brand-dark) 10%, transparent) 0%,
      color-mix(in srgb, var(--color-paper-warm) 42%, transparent) 38%,
      color-mix(in srgb, var(--color-paper-warm) 38%, transparent) 62%,
      color-mix(in srgb, var(--color-brand-dark) 9%, transparent) 100%
    );
}

@media (max-width: 1023px) {
  .hero__media-veil {
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-brand-dark) 8%, transparent) 0%,
        color-mix(in srgb, var(--color-paper-warm) 40%, transparent) 42%,
        color-mix(in srgb, var(--color-brand-dark) 8%, transparent) 100%
      );
  }
}

@media (max-width: 1023px) {
  .hero__inner {
    min-height: auto;
  }

  .hero__aside {
    min-height: auto;
  }

  .hero__title {
    max-width: none;
  }
}

.hero__inner {
  position: relative;
  z-index: 1;
  max-width: 72rem;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  min-height: min(88vh, 44rem);
}

@media (min-width: 1024px) {
  .hero__inner {
    grid-template-columns: 1fr 22rem;
  }
}

@media (min-width: 1280px) {
  .hero__inner {
    grid-template-columns: 1fr 26rem;
  }
}

.hero__main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 3.5rem 1.5rem 3rem;
  position: relative;
}

.hero__main::before,
.hero__aside::before {
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-radius: 6px;
}

.hero__main::before {
  content: '';
  position: absolute;
  inset: 8% 5% 8% -1rem;
  z-index: 0;
  background: linear-gradient(
    95deg,
    color-mix(in srgb, var(--color-paper) 82%, transparent) 0%,
    color-mix(in srgb, var(--color-paper-warm) 45%, transparent) 70%,
    transparent 100%
  );
  pointer-events: none;
  animation: hero-panel-in 1s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
}

.hero__main > * {
  position: relative;
  z-index: 1;
}

@media (min-width: 640px) {
  .hero__main {
    padding: 4rem 2rem 3.5rem;
  }
}

@media (min-width: 1024px) {
  .hero__main {
    padding: 4rem 3rem 4rem 2rem;
  }
}

@media (min-width: 1280px) {
  .hero__main {
    padding-left: 3rem;
    padding-right: 4rem;
  }
}

.hero__title {
  font-size: clamp(2.5rem, 6vw, 3.75rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--color-ink);
  max-width: 12ch;
}

.hero__title-muted {
  color: var(--color-brand);
  font-weight: 400;
}

.hero__lead {
  margin-top: 1.5rem;
  max-width: 32rem;
  font-size: 1rem;
  line-height: 1.75;
  color: var(--color-ink-muted);
}

@media (min-width: 640px) {
  .hero__lead {
    font-size: 1.0625rem;
  }
}

.hero__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 2.25rem;
}

.hero__actions :deep(a) {
  display: block;
  width: 100%;
}

.hero__actions :deep(button) {
  width: 100%;
}

@media (min-width: 480px) {
  .hero__actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .hero__actions :deep(a) {
    display: inline-block;
    width: auto;
  }

  .hero__actions :deep(button) {
    width: auto;
  }
}

.hero__btn-outline {
  background: color-mix(in srgb, var(--color-paper) 88%, white) !important;
  border-color: var(--color-line-strong) !important;
}

.hero__btn-outline:hover {
  background: var(--color-accent-light) !important;
  border-color: var(--color-accent) !important;
}

.hero__aside {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: transparent;
  overflow: hidden;
  min-height: 20rem;
  padding: 3.5rem 1.5rem 3rem;
}

.hero__aside::before {
  content: '';
  position: absolute;
  inset: 8% -1rem 8% 5%;
  z-index: 0;
  background: linear-gradient(
    275deg,
    color-mix(in srgb, var(--color-paper) 82%, transparent) 0%,
    color-mix(in srgb, var(--color-paper-warm) 45%, transparent) 70%,
    transparent 100%
  );
  pointer-events: none;
  animation: hero-panel-in 1s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both;
}

.hero__aside > * {
  position: relative;
  z-index: 1;
}

@media (min-width: 640px) {
  .hero__aside {
    padding: 4rem 2rem 3.5rem;
  }
}

@media (min-width: 1024px) {
  .hero__aside {
    min-height: auto;
    padding: 4rem 3rem 4rem 2.5rem;
    border-left: 1px solid color-mix(in srgb, var(--color-line) 80%, transparent);
  }
}

@media (min-width: 1280px) {
  .hero__aside {
    padding-right: 3rem;
    padding-left: 3rem;
  }
}

.hero__mark {
  position: absolute;
  top: 2rem;
  right: 2rem;
  width: 5rem;
  height: 5rem;
  color: color-mix(in srgb, var(--color-accent) 12%, transparent);
  pointer-events: none;
  animation: hero-sparkle-spin 18s linear infinite;
}

.hero__scroll-hint {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0;
  animation: hero-fade-in 0.6s ease 1.1s forwards;
}

.hero__scroll-line {
  display: block;
  width: 1px;
  height: 2.5rem;
  background: linear-gradient(to bottom, var(--color-accent), transparent);
  animation: hero-scroll-line 2s ease-in-out infinite;
}

@keyframes hero-panel-in {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes hero-ken-burns {
  from { transform: scale(1); }
  to { transform: scale(1.06); }
}

@keyframes hero-sparkle-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes hero-scroll-line {
  0%, 100% { opacity: 0.3; transform: scaleY(0.6); transform-origin: top; }
  50% { opacity: 1; transform: scaleY(1); transform-origin: top; }
}

@keyframes hero-fade-in {
  to { opacity: 0.7; }
}

@media (prefers-reduced-motion: reduce) {
  .hero__media-photo,
  .hero-anim,
  .hero__main::before,
  .hero__aside::before,
  .hero__mark,
  .hero__scroll-hint,
  .hero__scroll-line {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  .home-pillar:hover,
  .home-module:hover .home-module__icon,
  .home-step:hover {
    transform: none;
  }
}

.home-pillar {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.9rem 0.45rem 0.45rem;
  border-radius: 9999px;
  border: 1px solid var(--color-line);
  background: var(--color-paper-warm);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-ink-muted);
  transition:
    color 0.25s ease,
    border-color 0.25s ease,
    background 0.25s ease,
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s ease;
}

.home-pillar__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 999px;
  background: white;
  border: 1px solid var(--color-line);
  color: var(--color-accent);
}

.home-pillar:hover {
  color: var(--color-brand-dark);
  border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-line));
  background: white;
  box-shadow: 0 10px 28px rgb(25 118 210 / 0.08);
  transform: translateY(-2px);
}

.home-module {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  border: 1px solid var(--color-line);
  background: white;
  box-shadow: 0 12px 36px rgb(15 23 42 / 0.05);
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.3s ease;
}

.home-module:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 48px rgb(25 118 210 / 0.12);
}

.home-module__media {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--color-paper-warm);
  border-bottom: 1px solid var(--color-line);
}

.home-module__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-module:hover .home-module__img {
  transform: scale(1.03);
}

.home-module__media-badge {
  position: absolute;
  right: 0.85rem;
  bottom: 0.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.55rem;
  background: white;
  border: 1px solid var(--color-line);
  color: var(--color-accent);
  box-shadow: 0 8px 20px rgb(15 23 42 / 0.1);
}

.home-module__body {
  padding: 1.75rem 1.75rem 2rem;
}

@media (min-width: 1024px) {
  .home-module__body {
    padding: 2rem 2rem 2.25rem;
  }
}

.home-use-cases {
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, var(--color-accent-light) 65%, white), transparent 55%),
    var(--color-paper-warm);
}

.home-use-case {
  overflow: hidden;
  border-radius: 1rem;
  border: 1px solid var(--color-line);
  background: white;
  box-shadow: 0 10px 32px rgb(15 23 42 / 0.05);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.home-use-case:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 44px rgb(25 118 210 / 0.1);
}

.home-use-case__banner {
  position: relative;
  height: 5.5rem;
  overflow: hidden;
}

.home-use-case__pattern {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.home-use-case--gold .home-use-case__banner {
  filter: hue-rotate(-18deg) saturate(1.15);
}

.home-use-case--slate .home-use-case__banner {
  filter: saturate(0.35) brightness(0.95);
}

.home-use-case__icon-wrap {
  position: absolute;
  left: 1.25rem;
  bottom: -1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  background: white;
  border: 1px solid var(--color-line);
  color: var(--color-brand-dark);
  box-shadow: 0 10px 24px rgb(15 23 42 / 0.1);
}

.home-use-case__body {
  padding: 2rem 1.5rem 1.75rem;
}

.home-why {
  background: linear-gradient(180deg, white 0%, var(--color-paper-warm) 100%);
  padding: 4rem 0 4.5rem;
}

@media (min-width: 1024px) {
  .home-why {
    padding: 5rem 0 5.5rem;
  }
}

.home-why__inner {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

@media (min-width: 1024px) {
  .home-why__inner {
    gap: 3rem;
  }
}

.home-why__intro {
  display: grid;
  gap: 2rem;
  align-items: end;
}

@media (min-width: 1024px) {
  .home-why__intro {
    grid-template-columns: 1fr auto;
    gap: 3rem;
  }
}

.home-why__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 640px) {
  .home-why__stats {
    gap: 1rem;
  }
}

.home-why__stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 0.85rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-line);
  background: white;
  box-shadow: 0 8px 24px rgb(15 23 42 / 0.04);
}

.home-why__stat-value {
  font-family: var(--font-display);
  font-size: 1.35rem;
  line-height: 1.1;
  color: var(--color-brand-dark);
  letter-spacing: -0.02em;
}

.home-why__stat-label {
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--color-ink-muted);
}

.home-why__grid {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 640px) {
  .home-why__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
  }
}

@media (min-width: 1024px) {
  .home-why__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.home-why__card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1.35rem 1.25rem;
  border-radius: 0.85rem;
  border: 1px solid var(--color-line);
  background: white;
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.home-why__card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-line));
  box-shadow: 0 14px 36px rgb(25 118 210 / 0.08);
}

.home-why__card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.65rem;
  background: var(--color-accent-light);
  color: var(--color-brand);
  border: 1px solid color-mix(in srgb, var(--color-accent) 18%, var(--color-line));
}

.home-why__card-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.0625rem;
  line-height: 1.3;
  color: var(--color-ink);
}

.home-why__card-body {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.65;
  color: var(--color-ink-muted);
}

@media (prefers-reduced-motion: reduce) {
  .home-why__card:hover {
    transform: none;
  }
}

.home-faq {
  position: relative;
  padding: 4rem 0 5rem;
  background: linear-gradient(180deg, var(--color-paper) 0%, var(--color-paper-warm) 100%);
  border-bottom: 1px solid var(--color-line);
  overflow: hidden;
}

@media (min-width: 1024px) {
  .home-faq {
    padding: 5.5rem 0 6rem;
  }
}

.home-faq__glow {
  position: absolute;
  top: -20%;
  left: 50%;
  width: min(42rem, 90vw);
  height: 20rem;
  transform: translateX(-50%);
  background: radial-gradient(ellipse, rgb(25 118 210 / 0.12) 0%, transparent 70%);
  pointer-events: none;
}

.home-faq__inner {
  position: relative;
  z-index: 1;
}

.home-faq__header {
  max-width: 40rem;
  margin: 0 auto 2.5rem;
  text-align: center;
}

@media (min-width: 1024px) {
  .home-faq__header {
    margin-bottom: 3rem;
  }
}

.home-faq__title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--color-brand-dark);
}

.home-faq__lead {
  margin-top: 1rem;
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--color-ink-muted);
}

.home-faq__panel {
  max-width: 44rem;
  margin: 0 auto;
  border-radius: 1rem;
  background: white;
  box-shadow: 0 20px 50px rgb(15 23 42 / 0.06);
  overflow: hidden;
}

.home-faq__item {
  border: none;
  border-radius: 0;
  background: transparent;
}

.home-faq__item:not(:last-child) {
  border-bottom: 1px solid var(--color-line);
}

.home-faq__item :deep(.app-disclosure__trigger) {
  min-height: 3.25rem;
  padding: 1.1rem 1.25rem;
  font-size: 0.9375rem;
}

.home-faq__item :deep(.app-disclosure__trigger span.block) {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-brand-dark);
  line-height: 1.45;
}

.home-faq__item :deep(.app-disclosure__trigger:hover) {
  background: var(--color-accent-light);
}

.home-faq__item :deep(svg) {
  color: var(--color-brand);
}

.home-faq__item :deep(.app-disclosure__body) {
  padding: 0 1.25rem 1.25rem;
  border-top: none;
  background: color-mix(in srgb, var(--color-accent-light) 35%, white);
}

.home-faq__answer {
  margin: 0;
  padding-top: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.75;
  color: var(--color-ink-muted);
}

/* CTA « Prêt à créer vos évaluations ? » — fond blanc, libellé bleu */
.home-cta__btn-light {
  background-color: #fff !important;
  color: var(--color-accent) !important;
  border-color: rgb(255 255 255 / 0.45) !important;
}

.home-cta__btn-light:hover {
  background-color: var(--color-accent-light) !important;
  color: var(--color-accent-hover) !important;
  border-color: #fff !important;
}

</style>
