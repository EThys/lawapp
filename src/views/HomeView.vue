<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/ui/AppButton.vue'
import AppDecorativeBg from '@/components/ui/AppDecorativeBg.vue'
import HeroGreenPanel from '@/components/home/HeroGreenPanel.vue'
import DiscoverPreview from '@/components/home/DiscoverPreview.vue'
import {
  ArrowRight,
  Shield,
  Clock,
  BarChart3,
  FileText,
  Lock,
  Sparkles,
} from '@lucide/vue'

const auth = useAuthStore()

const modules = computed(() => [
  {
    tag: 'Module évaluation',
    title: 'Évaluations sécurisées',
    body: 'Créez TP, interrogations, devoirs et exercices pour vos étudiants, élèves et formations. Chronomètre, code d\'accès, anti-triche configurable et analyse des résultats.',
    cta: 'Espace enseignant',
    to: auth.isTeacher ? '/teacher' : '/register?role=teacher',
    icon: FileText,
  },
  {
    tag: 'Module découverte',
    title: 'Droit Ludique',
    body: 'Capsules juridiques courtes en fil vertical, avec quiz. Pour étudiants, citoyens et professionnels.',
    cta: 'Explorer le fil',
    to: '/discover',
    icon: Sparkles,
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

const pillars = [
  { icon: FileText, label: '4 types d\'évaluation' },
  { icon: Clock, label: 'Chrono par session' },
  { icon: Shield, label: 'Anti-triche configurable' },
  { icon: Lock, label: 'Comptes séparés' },
  { icon: BarChart3, label: 'Analyse des résultats' },
]

const audiences = ['Jeunes étudiants', 'Professionnels du droit', 'Grand public']
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
              to="/register?role=teacher"
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
              :to="auth.isAuthenticated && auth.isStudent ? '/student' : '/register?role=student'"
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

    <section class="border-b border-line bg-paper-warm animate-fade-in">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-7">
        <div class="flex flex-wrap justify-center gap-x-8 gap-y-4 lg:gap-x-10">
          <div
            v-for="(pillar, i) in pillars"
            :key="pillar.label"
            v-reveal="i * 60"
            class="home-pillar flex items-center gap-2 text-xs text-ink-muted"
          >
            <component :is="pillar.icon" class="w-3.5 h-3.5 text-accent flex-shrink-0" />
            {{ pillar.label }}
          </div>
        </div>
      </div>
    </section>

    <section class="py-16 lg:py-20 border-b border-line bg-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div v-reveal class="text-center mb-12 max-w-2xl mx-auto">
          <p class="label-caps mb-3">Deux modules</p>
          <h2 class="font-display text-2xl sm:text-3xl text-ink">Une plateforme, deux usages complémentaires.</h2>
          <p class="text-sm text-ink-muted mt-3 leading-relaxed">
            Pour les formateurs qui créent des évaluations, et pour ceux qui veulent comprendre le droit sans lourdeur.
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-px bg-line border border-line max-w-4xl mx-auto">
          <article
            v-for="(mod, i) in modules"
            :key="mod.title"
            v-reveal="{ delay: i * 100, from: i === 0 ? 'left' : 'right' }"
            class="home-module bg-white p-8 lg:p-10 hover-lift hover-glow group flex flex-col"
          >
            <div class="home-module__icon w-10 h-10 border border-line flex items-center justify-center mb-5">
              <component :is="mod.icon" class="w-5 h-5 text-accent" />
            </div>
            <p class="label-caps mb-2">{{ mod.tag }}</p>
            <h3 class="font-display text-xl text-ink mb-3">{{ mod.title }}</h3>
            <p class="text-sm text-ink-muted leading-relaxed flex-1">{{ mod.body }}</p>
            <RouterLink :to="mod.to" class="mt-6 inline-block group/link">
              <AppButton variant="outline" size="sm" class="hover-lift">
                {{ mod.cta }}
                <ArrowRight class="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:translate-x-1" />
              </AppButton>
            </RouterLink>
          </article>
        </div>
      </div>
    </section>

    <section class="droit-section relative bg-green-darker text-white overflow-hidden border-b border-line">
      <AppDecorativeBg />
      <div class="absolute inset-0 auth-grid-bg opacity-[0.06]" aria-hidden="true" />

      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div v-reveal="{ from: 'left' }">
            <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-4">Droit Ludique</p>
            <h2 class="font-display text-2xl sm:text-3xl lg:text-[2rem] leading-snug">
              Scroll, apprends, teste-toi : le droit en capsules courtes.
            </h2>
            <p class="text-sm sm:text-base text-white/55 mt-4 leading-relaxed max-w-md">
              Capsules verticales, quiz éclair et contenus pour tous les niveaux.
              Aucun compte requis pour explorer.
            </p>

            <div class="droit-audiences mt-8 mb-8">
              <p
                v-for="aud in audiences"
                :key="aud"
                class="droit-audience-item home-audience"
              >
                {{ aud }}
              </p>
            </div>

            <RouterLink to="/discover">
              <AppButton size="lg" class="!bg-white !text-green-dark hover:!bg-green-light hover-lift">
                Ouvrir le fil Droit Ludique
              </AppButton>
            </RouterLink>
          </div>

          <div v-reveal="{ delay: 120, from: 'right' }" class="flex justify-center lg:justify-end">
            <DiscoverPreview class="animate-float" />
          </div>
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

    <section class="border-y border-line bg-white py-16 lg:py-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-start">
          <div v-reveal>
            <p class="label-caps mb-3">Processus</p>
            <h2 class="font-display text-2xl sm:text-3xl text-ink leading-snug">
              De la conception à la correction, en trois étapes.
            </h2>
          </div>
          <ol class="space-y-0 divide-y divide-line border border-line">
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

    <section class="relative bg-green-darker text-white py-16 lg:py-20 overflow-hidden">
      <AppDecorativeBg />
      <div v-reveal class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        <div>
          <h2 class="font-display text-2xl sm:text-3xl leading-snug">
            Prêt à créer vos évaluations ?
          </h2>
          <p class="text-sm text-white/50 mt-3 max-w-md leading-relaxed">
            Inscription gratuite pour concevoir et diffuser vos évaluations. Le module Droit Ludique est ouvert à tous, sans compte.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <RouterLink v-reveal="{ delay: 80 }" to="/discover" class="group">
            <AppButton class="!bg-accent !text-white hover:!bg-accent-hover w-full sm:w-auto hover-lift">
              Droit Ludique
              <Sparkles class="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
            </AppButton>
          </RouterLink>
          <RouterLink v-reveal="{ delay: 160 }" to="/register?role=teacher">
            <AppButton class="!bg-white !text-green-dark hover:!bg-green-light w-full sm:w-auto hover-lift">
              Inscription enseignant
            </AppButton>
          </RouterLink>
          <RouterLink v-reveal="{ delay: 240 }" to="/login">
            <AppButton variant="outline" class="!border-white/30 !text-white hover:!bg-white/10 w-full sm:w-auto hover-lift">
              Connexion
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
      color-mix(in srgb, var(--color-green-darker) 10%, transparent) 0%,
      color-mix(in srgb, var(--color-paper-warm) 42%, transparent) 38%,
      color-mix(in srgb, var(--color-paper-warm) 38%, transparent) 62%,
      color-mix(in srgb, var(--color-green-darker) 9%, transparent) 100%
    );
}

@media (max-width: 1023px) {
  .hero__media-veil {
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-green-darker) 8%, transparent) 0%,
        color-mix(in srgb, var(--color-paper-warm) 40%, transparent) 42%,
        color-mix(in srgb, var(--color-green-darker) 8%, transparent) 100%
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
  color: var(--color-green-dark);
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

.home-pillar {
  padding: 0.4rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  transition:
    color 0.25s ease,
    border-color 0.25s ease,
    background 0.25s ease,
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-pillar:hover {
  color: var(--color-accent-hover);
  border-color: color-mix(in srgb, var(--color-accent) 25%, transparent);
  background: color-mix(in srgb, var(--color-accent-light) 60%, white);
  transform: translateY(-2px);
}

.home-module {
  position: relative;
  overflow: hidden;
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.3s ease;
}

.home-module::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-module:hover {
  box-shadow: 0 12px 40px rgb(22 163 74 / 0.08);
}

.home-module:hover::before {
  transform: scaleX(1);
}

.home-module__icon {
  transition:
    border-color 0.3s ease,
    background 0.3s ease,
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-module:hover .home-module__icon {
  border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  background: var(--color-accent-light);
  transform: scale(1.06) rotate(-3deg);
}

.home-cap {
  transition:
    transform 0.3s ease,
    background 0.3s ease;
}

.home-cap:hover {
  background: color-mix(in srgb, var(--color-accent-light) 35%, white);
}

.home-cap:hover .font-display {
  color: var(--color-accent);
}

.home-step {
  transition:
    background 0.25s ease,
    padding-left 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.home-step:hover {
  background: color-mix(in srgb, var(--color-accent-light) 45%, white) !important;
  padding-left: 1.75rem;
}

.home-audience {
  transition:
    background 0.25s ease,
    color 0.25s ease,
    transform 0.25s ease;
}

.home-audience:hover {
  background: rgb(255 255 255 / 0.1);
  color: white;
  transform: translateY(-2px);
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
  .home-step:hover,
  .home-audience:hover {
    transform: none;
  }
}

.droit-audiences {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  max-width: 22rem;
  background: rgb(255 255 255 / 0.12);
  border: 1px solid rgb(255 255 255 / 0.12);
}

@media (min-width: 480px) {
  .droit-audiences {
    grid-template-columns: repeat(3, 1fr);
    max-width: none;
  }
}

.droit-audience-item {
  padding: 0.75rem 0.875rem;
  font-size: 11px;
  line-height: 1.35;
  text-align: center;
  background: rgb(255 255 255 / 0.04);
  color: rgb(255 255 255 / 0.7);
}
</style>
