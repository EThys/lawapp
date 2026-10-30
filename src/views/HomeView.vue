<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
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
  UserRound,
  KeyRound,
  ShieldCheck,
} from '@lucide/vue'

gsap.registerPlugin(ScrollTrigger)

const auth = useAuthStore()
const whyRef = ref<HTMLElement | null>(null)
let whyMotion: gsap.Context | null = null

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
    icon: FileText,
    title: 'Création d\'évaluations',
    body: 'Concevez des évaluations pour vos étudiants, élèves et parcours de formation. Questions QCM, vrai/faux et réponses courtes, avec barème personnalisé.',
  },
  {
    num: 'II',
    icon: Shield,
    title: 'Surveillance intégrée',
    body: 'Chronomètre strict, détection de changement d\'onglet, blocage du copier-coller et mode plein écran obligatoire.',
  },
  {
    num: 'III',
    icon: Sparkles,
    title: 'Droit Ludique',
    body: 'Capsules juridiques courtes, quiz interactifs et défilement vertical. Accessible à tous, du lycéen à l\'avocat.',
  },
  {
    num: 'IV',
    icon: BarChart3,
    title: 'Résultats traçables',
    body: 'Tableau de bord enseignant, historique étudiant, export CSV et enregistrement de chaque violation.',
  },
]

const processSteps = [
  {
    n: '01',
    icon: UserRound,
    title: 'Inscription et connexion',
    body: 'Compte enseignant ou étudiant, avec identifiants distincts et espaces dédiés.',
  },
  {
    n: '02',
    icon: KeyRound,
    title: 'Diffusion par code',
    body: 'L\'enseignant publie l\'évaluation et partage un code à 6 caractères ou un lien direct.',
  },
  {
    n: '03',
    icon: ShieldCheck,
    title: 'Passation surveillée',
    body: 'L\'étudiant passe l\'épreuve sous chrono. Toute infraction est consignée automatiquement.',
  },
]

const whyChooseUs = [
  {
    icon: Shield,
    fx: 'shield',
    title: 'Des épreuves sérieuses',
    body: 'Le temps est limité. Vous choisissez les contrôles anti-triche. Chaque incident est noté.',
  },
  {
    icon: Zap,
    fx: 'zap',
    title: 'Prêt en quelques minutes',
    body: 'Créez un QCM ou un devoir, puis envoyez un code. L’étudiant n’installe rien.',
  },
  {
    icon: BarChart3,
    fx: 'chart',
    title: 'Notes faciles à suivre',
    body: 'Vous voyez les résultats, l’historique de chaque étudiant, et vous pouvez les exporter.',
  },
  {
    icon: Users,
    fx: 'users',
    title: 'Deux espaces distincts',
    body: 'L’enseignant et l’étudiant ont chacun leur espace, et leur propre inscription.',
  },
  {
    icon: FileText,
    fx: 'file',
    title: 'Plusieurs formats',
    body: 'TP, interrogation, devoir ou exercice. QCM, vrai/faux ou réponse courte. Vous fixez les points.',
  },
  {
    icon: CircleCheck,
    fx: 'check',
    title: 'Du petit groupe au concours',
    body: 'Contrôle continu, concours, certification ou recrutement : le même outil suffit.',
  },
]

const whyStats: { value: string; label: string; count?: number; suffix?: string }[] = [
  { value: '< 5 min', label: 'pour publier une épreuve' },
  { value: '100 %', label: 'des passages sont suivis', count: 100, suffix: ' %' },
  { value: '4', label: 'types d’épreuves', count: 4, suffix: '' },
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

onMounted(() => {
  const root = whyRef.value
  if (root && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    whyMotion = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          root.classList.add('is-playing')
          root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
            const target = Number(el.dataset.count)
            const suffix = el.dataset.suffix ?? ''
            const proxy = { n: 0 }
            gsap.to(proxy, {
              n: target,
              duration: 1.1,
              ease: 'power1.out',
              snap: { n: 1 },
              onUpdate: () => {
                el.textContent = `${Math.round(proxy.n)}${suffix}`
              },
            })
          })
        },
      })
    }, root)
  }

})

onUnmounted(() => {
  whyMotion?.revert()
})
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
            <AppButton
              v-if="!auth.isAuthenticated"
              to="/register"
              size="lg"
              class="hover-lift group"
            >
              Espace enseignant
              <ArrowRight class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </AppButton>
            <AppButton
              v-else-if="auth.isTeacher"
              to="/teacher"
              size="lg"
              class="hover-lift group"
            >
              Espace enseignant
              <ArrowRight class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </AppButton>
            <AppButton
              :to="auth.isAuthenticated && auth.isStudent ? '/student' : '/register'"
              variant="outline"
              size="lg"
              class="hover-lift hero__btn-outline"
            >
              {{ auth.isStudent ? 'Espace étudiant' : 'Compte étudiant' }}
            </AppButton>
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

    <div class="home-after">
    <section class="home-trust">
      <div class="home-shell">
        <ul class="home-trust__row">
          <li
            v-for="(pillar, i) in pillars"
            :key="pillar.label"
            v-reveal="i * 60"
            class="home-pillar"
          >
            <span class="home-pillar__icon">
              <component :is="pillar.icon" class="w-5 h-5" />
            </span>
            <span class="home-pillar__label">{{ pillar.label }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section id="pourquoi" ref="whyRef" class="home-why border-b border-line scroll-mt-20">
      <div class="home-shell home-why__inner">
        <div class="home-why__intro">
          <div class="home-why__copy">
            <p class="home-kicker home-why__kicker">Pourquoi nous choisir</p>
            <span class="home-why__rule" aria-hidden="true" />
            <h2 class="home-section-title">
              Tout pour évaluer, dans un seul outil
            </h2>
            <p class="home-why__lead">
              Vous créez l’épreuve. L’étudiant la passe en ligne. Vous lisez les notes.
              Pas besoin d’installer quoi que ce soit.
            </p>
            <AppButton
              v-if="!auth.isAuthenticated"
              to="/register"
              size="lg"
              class="home-why__cta hover-lift group inline-flex mt-8"
            >
              Commencer gratuitement
              <ArrowRight class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </AppButton>
            <AppButton
              v-else-if="auth.isTeacher"
              to="/teacher"
              size="lg"
              class="home-why__cta hover-lift group inline-flex mt-8"
            >
              Ouvrir mon espace
              <ArrowRight class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </AppButton>
          </div>

          <ul class="home-why__stats">
            <li v-for="stat in whyStats" :key="stat.label" class="home-why__stat">
              <span class="home-why__stat-value">
                <span
                  v-if="stat.count != null"
                  class="home-why__count"
                  :data-count="stat.count"
                  :data-suffix="stat.suffix"
                >{{ stat.value }}</span>
                <template v-else>{{ stat.value }}</template>
              </span>
              <span class="home-why__stat-label">{{ stat.label }}</span>
            </li>
          </ul>
        </div>

        <ul class="home-why__grid">
          <li
            v-for="item in whyChooseUs"
            :key="item.title"
            class="home-why__card"
            :class="`home-why__card--${item.fx}`"
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

    <section class="home-band">
      <div class="home-shell">
        <div v-reveal class="home-block-head">
          <p class="home-kicker">Deux modules</p>
          <h2 class="home-section-title">Une plateforme, deux usages complémentaires.</h2>
          <p class="text-sm text-ink-muted mt-3 leading-relaxed">
            Pour les formateurs qui créent des évaluations, et pour ceux qui veulent comprendre le droit sans lourdeur.
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-6 lg:gap-8">
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
              <AppButton
                :to="mod.to"
                variant="outline"
                size="sm"
                class="mt-6 hover-lift group/link"
              >
                {{ mod.cta }}
                <ArrowRight class="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:translate-x-1" />
              </AppButton>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="home-band home-features">
      <div class="home-shell home-features__layout">
        <div v-reveal class="home-features__intro">
          <p class="home-kicker">Fonctionnalités</p>
          <h2 class="home-section-title">Un outil complet, pas un gadget.</h2>
        </div>

        <ol class="home-features__list">
          <li
            v-for="(cap, i) in capabilities"
            :key="cap.num"
            v-reveal="{ delay: i * 120, from: 'right' }"
            class="home-feature"
          >
            <span class="home-feature__num">{{ cap.num }}</span>
            <div>
              <h3 class="home-feature__title">{{ cap.title }}</h3>
              <p class="home-feature__body">{{ cap.body }}</p>
            </div>
            <component :is="cap.icon" class="home-feature__icon" />
          </li>
        </ol>
      </div>
    </section>

    <section class="home-band home-process">
      <div class="home-shell">
        <div v-reveal class="home-block-head home-process__head">
          <p class="home-kicker">Processus</p>
          <h2 class="home-section-title">
            De la conception à la correction, en trois étapes.
          </h2>
          <p class="text-sm text-ink-muted leading-relaxed">
            Publiez une épreuve en quelques minutes, partagez un code simple, puis suivez la passation en direct.
          </p>
        </div>

        <ol class="home-flow">
          <li
            v-for="(step, i) in processSteps"
            :key="step.n"
            v-reveal="{ delay: 70 + i * 90 }"
            class="home-flow__step"
          >
            <span class="home-flow__mark">{{ step.n }}</span>
            <article class="home-flow__card">
              <span class="home-flow__icon">
                <component :is="step.icon" class="w-5 h-5" />
              </span>
              <h3 class="font-display text-lg text-ink">{{ step.title }}</h3>
              <p class="text-sm text-ink-muted leading-relaxed mt-2">{{ step.body }}</p>
            </article>
          </li>
        </ol>
      </div>
    </section>

    <section class="home-band home-use-cases">
      <div class="home-shell">
        <div v-reveal class="home-block-head">
          <p class="home-kicker">Cas d’usage</p>
          <h2 class="home-section-title">
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
      <div class="home-shell home-faq__inner">
        <header v-reveal class="home-faq__header">
          <h2 class="home-section-title home-faq__title">
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
      <div v-reveal class="relative home-shell flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        <div>
          <h2 class="home-section-title home-cta__title">
            Prêt à créer vos évaluations ?
          </h2>
          <p class="text-sm text-white/50 mt-3 max-w-md leading-relaxed">
            {{ homeFooterLead }}
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <AppButton
            v-reveal="{ delay: 80 }"
            to="/discover"
            class="group !bg-accent !text-white hover:!bg-accent-hover w-full sm:w-auto hover-lift"
          >
            Droit Ludique
            <Sparkles class="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
          </AppButton>
          <AppButton
            v-reveal="{ delay: 160 }"
            :to="homeFooterTeacherCta.to"
            variant="outline"
            class="home-cta__btn-light w-full sm:w-auto hover-lift"
          >
            {{ homeFooterTeacherCta.label }}
          </AppButton>
          <AppButton
            v-reveal="{ delay: 240 }"
            :to="homeFooterAccessCta.to"
            variant="outline"
            class="home-cta__btn-light w-full sm:w-auto hover-lift"
          >
            {{ homeFooterAccessCta.label }}
          </AppButton>
        </div>
      </div>
    </section>
    </div>
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
  width: min(72rem, calc(100% - 2.75rem));
  max-width: 72rem;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  min-height: calc(100dvh - 7.5rem);
}

@media (min-width: 640px) {
  .hero__inner {
    width: min(72rem, calc(100% - 4.5rem));
  }
}

@media (min-width: 1024px) {
  .hero__inner {
    width: min(72rem, calc(100% - 7.5rem));
    grid-template-columns: 1fr 20rem;
  }
}

@media (min-width: 1280px) {
  .hero__inner {
    grid-template-columns: 1fr 22rem;
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
    padding: 4rem 1.5rem 3.5rem;
  }
}

@media (min-width: 1024px) {
  .hero__main {
    padding: 4rem 2rem 4rem 1.25rem;
  }
}

@media (min-width: 1280px) {
  .hero__main {
    padding-left: 1.5rem;
    padding-right: 2.25rem;
  }
}

.hero__title {
  font-size: clamp(2.85rem, 5.6vw, 4.75rem);
  line-height: 1.02;
  letter-spacing: -0.035em;
  color: var(--color-ink);
  max-width: 16ch;
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
    padding: 4rem 1.5rem 3.5rem;
  }
}

@media (min-width: 1024px) {
  .hero__aside {
    min-height: auto;
    padding: 4rem 1.5rem 4rem 1.75rem;
    border-left: 1px solid color-mix(in srgb, var(--color-line) 80%, transparent);
  }
}

@media (min-width: 1280px) {
  .hero__aside {
    padding-right: 1.75rem;
    padding-left: 2rem;
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
  .home-flow__card:hover {
    transform: none;
  }
}

.home-shell {
  width: min(72rem, calc(100% - 2.75rem));
  max-width: 72rem;
  margin-inline: auto;
}

@media (min-width: 640px) {
  .home-shell {
    width: min(72rem, calc(100% - 4.5rem));
  }
}

@media (min-width: 1024px) {
  .home-shell {
    width: min(72rem, calc(100% - 7.5rem));
  }
}

.home-after {
  position: relative;
  background:
    radial-gradient(ellipse 70% 42% at 8% 0%, rgb(25 118 210 / 0.16), transparent 58%),
    radial-gradient(ellipse 55% 38% at 100% 12%, rgb(13 71 161 / 0.12), transparent 52%),
    radial-gradient(ellipse 48% 36% at 72% 100%, rgb(25 118 210 / 0.1), transparent 60%),
    linear-gradient(180deg, #e7eef6 0%, #f4f7fb 42%, #e9f0f8 100%);
}

.home-after::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgb(13 71 161 / 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgb(13 71 161 / 0.045) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: linear-gradient(180deg, rgb(0 0 0 / 0.7), transparent 78%);
}

.home-after > * {
  position: relative;
  z-index: 1;
}

.home-band {
  padding: 4.5rem 0;
}

.home-process {
  background:
    radial-gradient(ellipse 46% 50% at 50% 0%, rgb(25 118 210 / 0.1), transparent 70%),
    #fff;
}

.home-process__head {
  max-width: 38rem;
  margin-inline: auto;
  margin-bottom: 2.75rem;
  text-align: center;
}

.home-process__head .home-section-title {
  text-transform: none;
  letter-spacing: -0.03em;
}

.home-flow {
  position: relative;
  display: grid;
  gap: 1.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.home-flow::before {
  content: '';
  position: absolute;
  left: 1.25rem;
  top: 1.3rem;
  bottom: 2rem;
  width: 2px;
  background: rgb(13 71 161 / 0.16);
}

.home-flow__step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding-left: 3.6rem;
}

.home-flow__mark {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 999px;
  background: var(--color-brand);
  color: white;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: 0 8px 18px rgb(13 71 161 / 0.24);
}

.home-flow__card {
  height: 100%;
  padding: 1.25rem 1.2rem 1.35rem;
  border: 1px solid rgb(13 71 161 / 0.08);
  border-radius: 0.85rem;
  background: white;
  box-shadow: 0 16px 36px rgb(13 71 161 / 0.07);
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}

.home-flow__card:hover {
  transform: translateY(-8px);
  box-shadow: 0 22px 42px rgb(13 71 161 / 0.14);
}

.home-flow__icon {
  display: grid;
  place-items: center;
  width: 2.45rem;
  height: 2.45rem;
  margin-bottom: 0.9rem;
  border-radius: 0.7rem;
  background: rgb(13 71 161 / 0.08);
  color: var(--color-brand);
}

@media (min-width: 900px) {
  .home-flow {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.75rem;
  }

  .home-flow::before {
    top: 1.3rem;
    bottom: auto;
    left: calc(100% / 6);
    right: calc(100% / 6);
    width: auto;
    height: 2px;
  }

  .home-flow__step {
    align-items: center;
    padding-left: 0;
  }

  .home-flow__mark {
    position: relative;
    left: auto;
    top: auto;
    margin-bottom: 1.15rem;
  }

  .home-flow__card {
    width: 100%;
  }
}

.home-kicker {
  margin: 0 0 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.home-section-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: clamp(1.7rem, 2.8vw, 2.45rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.15;
  color: var(--color-brand-dark);
}

.home-block-head {
  max-width: 40rem;
  margin-bottom: 1.75rem;
}

.home-block-head p:last-of-type,
.home-block-head .text-sm {
  margin-top: 0.75rem;
}

.home-trust {
  background: linear-gradient(180deg, #1565c0 0%, var(--color-brand) 58%, #0a3d8f 100%);
  color: white;
}

.home-trust__row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.35rem 0;
  min-height: 6.3rem;
  margin: 0;
  padding: 0.65rem 0.5rem;
  list-style: none;
}

.home-pillar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex: 0 1 auto;
  min-height: 4.6rem;
  padding: 0.55rem 1.35rem;
  color: white;
  text-align: left;
}

.home-pillar + .home-pillar {
  box-shadow: inset 1px 0 0 rgb(255 255 255 / 0.28);
}

.home-pillar__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.55rem;
  height: 2.55rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.14);
  color: white;
}

.home-pillar__label {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  line-height: 1.25;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .home-pillar + .home-pillar {
    box-shadow: none;
  }

  .home-pillar {
    flex-basis: 100%;
    justify-content: flex-start;
    padding-inline: 1.25rem;
  }

  .home-pillar__label {
    white-space: normal;
  }

  .home-trust__row {
    align-items: stretch;
    padding-block: 0.85rem;
  }
}

.home-module {
  position: relative;
  overflow: hidden;
  border-radius: 0.85rem;
  background: white;
  box-shadow: 0 18px 44px rgb(13 71 161 / 0.08);
  transition: transform 0.25s ease;
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

.home-module__body h3 {
  font-family: var(--font-sans);
  font-weight: 700;
  color: var(--color-brand-dark);
}

.home-module__body {
  padding: 1.15rem 1.15rem 1.35rem;
}

@media (min-width: 1024px) {
  .home-module__body {
    padding: 2rem 2rem 2.25rem;
  }
}

.home-use-cases {
  background: transparent;
}

.home-use-case {
  overflow: hidden;
  border-radius: 0.85rem;
  background: white;
  box-shadow: 0 18px 44px rgb(13 71 161 / 0.08);
  transition: transform 0.25s ease;
}

.home-use-case:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 44px rgb(25 118 210 / 0.1);
}

.home-use-case__banner {
  position: relative;
  height: 9.5rem;
  overflow: hidden;
  background: var(--color-brand);
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
  padding: 1.85rem 1.15rem 1.25rem;
}

.home-use-case__body h3 {
  font-family: var(--font-sans);
  font-weight: 700;
  color: var(--color-brand-dark);
}

.home-why .home-section-title {
  text-transform: none;
  letter-spacing: -0.03em;
  font-size: clamp(1.9rem, 3vw, 2.7rem);
  max-width: 16ch;
}

.home-why__kicker {
  margin-bottom: 0.7rem;
}

.home-why__rule {
  display: block;
  width: 4.25rem;
  height: 3px;
  margin: 0 0 1rem;
  border-radius: 999px;
  background: var(--color-brand);
  transform-origin: left center;
}

.home-why__lead {
  max-width: 36rem;
  margin: 1rem 0 0;
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--color-ink-muted);
}

.home-why {
  background: transparent;
  padding: 4rem 0 4.25rem;
}

@media (min-width: 1024px) {
  .home-why {
    padding: 5.75rem 0 6.25rem;
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
  justify-content: center;
  gap: 0.2rem;
  min-height: 5.4rem;
  padding: 1rem 1.05rem;
  border-radius: 0.85rem;
  background: white;
  box-shadow: 0 14px 32px rgb(13 71 161 / 0.08);
}

.home-why__stat:last-child {
  background: var(--color-brand);
}

.home-why__stat:last-child .home-why__stat-value,
.home-why__stat:last-child .home-why__stat-label {
  color: white;
}

.home-why__stat-value {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-brand-dark);
  letter-spacing: -0.03em;
}

.home-why__stat-label {
  font-size: 0.82rem;
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 1.35rem 1.25rem 1.4rem;
  border-radius: 0.85rem;
  background: white;
  box-shadow: 0 16px 40px rgb(13 71 161 / 0.08);
  overflow: hidden;
  transition:
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.45s ease,
    background 0.45s ease;
}

.home-why__card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 28%, rgb(255 255 255 / 0.85) 48%, transparent 68%);
  transform: translateX(-130%);
  pointer-events: none;
}

.home-why__card::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-brand), var(--color-accent));
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-why__card:hover {
  transform: translateY(-14px) scale(1.025);
  background: linear-gradient(180deg, white 0%, #f3f8ff 100%);
  box-shadow:
    0 28px 50px rgb(13 71 161 / 0.16),
    0 0 0 1px rgb(25 118 210 / 0.18);
}

.home-why__card:hover::before {
  animation: why-shine 0.75s ease;
}

.home-why__card:hover::after {
  transform: scaleX(1);
}

.home-why__card-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.65rem;
  background: var(--color-accent-light);
  color: var(--color-brand);
  border: 1px solid color-mix(in srgb, var(--color-accent) 18%, var(--color-line));
  transition:
    background 0.35s ease,
    color 0.35s ease,
    box-shadow 0.35s ease;
}

.home-why__card:hover .home-why__card-icon {
  background: var(--color-brand);
  color: white;
  border-color: transparent;
  box-shadow: 0 10px 24px rgb(13 71 161 / 0.28);
}

.home-why__card:hover .home-why__card-title {
  color: var(--color-brand);
}

.home-why__card--shield:hover .home-why__card-icon {
  animation: why-shield 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-why__card--shield:hover .home-why__card-icon::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  border: 2px solid var(--color-accent);
  animation: why-ring 0.8s ease;
}

.home-why__card--zap:hover .home-why__card-icon {
  animation: why-zap 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-why__card--zap:hover {
  background: linear-gradient(100deg, white 0%, #e8f2ff 42%, white 100%);
}

.home-why__card--chart:hover .home-why__card-icon svg {
  transform-origin: bottom center;
  animation: why-chart 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-why__card--users:hover .home-why__card-icon {
  animation: why-users 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-why__card--file:hover .home-why__card-icon {
  perspective: 400px;
  animation: why-file 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-why__card--check:hover .home-why__card-icon {
  animation: why-check 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-why__card--check:hover .home-why__card-icon::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 999px;
  border: 2px solid var(--color-brand);
  animation: why-ring 0.7s ease;
}

@keyframes why-shine {
  from { transform: translateX(-130%); }
  to { transform: translateX(130%); }
}

@keyframes why-ring {
  from { transform: scale(0.7); opacity: 0.9; }
  to { transform: scale(1.7); opacity: 0; }
}

@keyframes why-shield {
  0% { transform: scale(1) rotate(0); }
  35% { transform: scale(1.28) rotate(-14deg); }
  65% { transform: scale(0.94) rotate(8deg); }
  100% { transform: scale(1.08) rotate(0); }
}

@keyframes why-zap {
  0% { transform: translateX(0) rotate(0); }
  25% { transform: translateX(-8px) rotate(-16deg) scale(1.2); }
  55% { transform: translateX(10px) rotate(12deg) scale(1.16); }
  100% { transform: translateX(0) rotate(0) scale(1.06); }
}

@keyframes why-chart {
  0% { transform: scaleY(0.25); }
  65% { transform: scaleY(1.25); }
  100% { transform: scaleY(1); }
}

@keyframes why-users {
  0% { transform: translateX(0) scale(1); }
  35% { transform: translateX(-8px) scale(1.18); }
  70% { transform: translateX(8px) scale(1.18); }
  100% { transform: translateX(0) scale(1.06); }
}

@keyframes why-file {
  0% { transform: rotateY(0) scale(1); }
  50% { transform: rotateY(180deg) scale(1.18); }
  100% { transform: rotateY(360deg) scale(1.06); }
}

@keyframes why-check {
  0% { transform: scale(0.35) rotate(-18deg); }
  55% { transform: scale(1.35) rotate(8deg); }
  100% { transform: scale(1.08) rotate(0); }
}

@keyframes why-rise {
  from { opacity: 0; transform: translateY(22px); }
  to { opacity: 1; transform: none; }
}

@keyframes why-pop {
  from { opacity: 0; transform: scale(0.92) translateY(16px); }
  to { opacity: 1; transform: none; }
}

@keyframes why-draw {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.home-why.is-playing .home-why__kicker,
.home-why.is-playing .home-section-title,
.home-why.is-playing .home-why__lead,
.home-why.is-playing .home-why__cta {
  animation: why-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.home-why.is-playing .home-section-title { animation-delay: 0.08s; }
.home-why.is-playing .home-why__lead { animation-delay: 0.16s; }
.home-why.is-playing .home-why__cta { animation-delay: 0.24s; }

.home-why.is-playing .home-why__rule {
  animation: why-draw 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.12s backwards;
}

.home-why.is-playing .home-why__stat {
  animation: why-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.home-why.is-playing .home-why__stat:nth-child(2) { animation-delay: 0.1s; }
.home-why.is-playing .home-why__stat:nth-child(3) { animation-delay: 0.2s; }

.home-why.is-playing .home-why__card {
  animation: why-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.home-why.is-playing .home-why__card:nth-child(2) { animation-delay: 0.08s; }
.home-why.is-playing .home-why__card:nth-child(3) { animation-delay: 0.16s; }
.home-why.is-playing .home-why__card:nth-child(4) { animation-delay: 0.24s; }
.home-why.is-playing .home-why__card:nth-child(5) { animation-delay: 0.32s; }
.home-why.is-playing .home-why__card:nth-child(6) { animation-delay: 0.4s; }

.home-why__card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--color-brand-dark);
}

.home-why__card-body {
  margin: 0;
  font-size: 0.95rem;
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
  padding: 3.25rem 0 3.75rem;
  background: white;
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
  margin: 0 auto 1.75rem;
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
  text-align: center;
}

.home-faq__lead {
  margin: 1rem auto 0;
  max-width: 36rem;
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--color-ink-muted);
  text-align: center;
}

.home-faq__panel {
  max-width: 52rem;
  margin-inline: auto;
  border-radius: 0.85rem;
  background:
    linear-gradient(180deg, #f7fafc 0%, #eef3f8 100%);
  box-shadow: inset 0 1px 0 white, 0 18px 40px rgb(13 71 161 / 0.06);
  overflow: hidden;
}

.home-features__layout {
  display: grid;
  gap: 2rem;
  align-items: start;
}

.home-features__intro .home-section-title {
  max-width: 12ch;
}

.home-features__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.home-feature {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem 1.25rem;
  align-items: center;
  padding: 1.45rem 0.2rem;
  border-top: 1px solid rgb(13 71 161 / 0.14);
}

.home-feature:last-child {
  border-bottom: 1px solid rgb(13 71 161 / 0.14);
}

.home-feature__num {
  font-size: clamp(1.8rem, 2.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--color-brand);
}

.home-feature__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-brand-dark);
}

.home-feature__body {
  margin: 0.3rem 0 0;
  max-width: 42rem;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--color-ink-muted);
}

.home-feature__icon {
  width: 1.35rem;
  height: 1.35rem;
  color: var(--color-accent);
}

@media (min-width: 1024px) {
  .home-features__layout {
    grid-template-columns: minmax(16rem, 22rem) minmax(0, 1fr);
    gap: 4.5rem;
  }

  .home-features__intro {
    position: sticky;
    top: 8.5rem;
  }
}

.home-cta__title {
  color: white;
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
