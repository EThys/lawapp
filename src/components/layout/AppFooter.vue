<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/brand/AppLogo.vue'
import uccLogo from '@/assets/logo_ucc.jpeg'

const year = new Date().getFullYear()

/** 5 emplacements partenaires — le bandeau défile automatiquement. */
const partners = [
  {
    id: 'ucc',
    name: 'Université Catholique du Congo',
    href: 'https://ucc.ovh/',
    logo: uccLogo,
    placeholder: false,
  },
  {
    id: 'p2',
    name: 'Partenaire à venir',
    href: '#',
    logo: null,
    placeholder: true,
  },
  {
    id: 'p3',
    name: 'Partenaire à venir',
    href: '#',
    logo: null,
    placeholder: true,
  },
  {
    id: 'p4',
    name: 'Partenaire à venir',
    href: '#',
    logo: null,
    placeholder: true,
  },
  {
    id: 'p5',
    name: 'Partenaire à venir',
    href: '#',
    logo: null,
    placeholder: true,
  },
] as const

/** Double la piste pour un défilement infini fluide. */
const partnersLoop = computed(() => [...partners, ...partners])

const platformLinks = [
  { label: 'Établissements & formations', to: '/register' },
  { label: 'Droit Ludique', to: '/discover' },
  { label: 'À propos', to: '/' },
] as const

const clubLinks = [
  { label: 'Webinaires', href: '#' },
  { label: "Centre d'aide", href: '#' },
  { label: 'Carrières', href: '#' },
  { label: 'Contact presse', href: '#' },
  { label: 'Accessibilité', href: '#' },
] as const

const legalLinks = [
  { label: "Conditions d'utilisation", href: '#' },
  { label: 'Politique de confidentialité', href: '#' },
  { label: 'Centre de confidentialité', href: '#' },
  { label: 'FAQ', href: '#' },
  { label: 'Nous contacter', href: '#' },
] as const

const socialLinks = [
  { label: 'LinkedIn', icon: 'linkedin' },
  { label: 'X', icon: 'x' },
  { label: 'Facebook', icon: 'facebook' },
  { label: 'Instagram', icon: 'instagram' },
] as const

const appStoreUrl =
  (import.meta.env.VITE_APP_STORE_URL as string | undefined)?.trim() || '#'
const playStoreUrl =
  (import.meta.env.VITE_PLAY_STORE_URL as string | undefined)?.trim() || '#'
</script>

<template>
  <footer class="app-footer">
    <section class="app-footer__partners" aria-labelledby="footer-partners-title">
      <h2 id="footer-partners-title" class="app-footer__partners-title">Nos partenaires</h2>

      <div class="app-footer__partners-viewport" role="presentation">
        <div class="app-footer__partners-track" aria-label="Liste des partenaires">
          <component
            :is="partner.placeholder ? 'div' : 'a'"
            v-for="(partner, index) in partnersLoop"
            :key="`${partner.id}-${index}`"
            class="app-footer__partner"
            :class="{ 'app-footer__partner--placeholder': partner.placeholder }"
            v-bind="
              partner.placeholder
                ? { role: 'presentation', 'aria-hidden': index >= partners.length ? true : undefined }
                : {
                    href: partner.href,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    'aria-hidden': index >= partners.length ? true : undefined,
                    tabindex: index >= partners.length ? -1 : undefined,
                  }
            "
          >
            <img v-if="partner.logo" :src="partner.logo" alt="" />
            <span v-else class="app-footer__partner-mark" aria-hidden="true">+</span>
            <span>{{ partner.name }}</span>
          </component>
        </div>
      </div>
    </section>

    <div class="app-footer__sheet">
      <div class="app-footer__crest">
        <RouterLink to="/" aria-label="LawApp50, accueil">
          <AppLogo size="lg" />
        </RouterLink>
      </div>

      <div class="app-footer__columns">
        <div>
          <h2 class="app-footer__heading">Nous trouver</h2>
          <p class="app-footer__address">
            LawApp50<br />
            Kinshasa<br />
            République démocratique du Congo
          </p>
          <a class="app-footer__accent" href="#">Nous écrire</a>
        </div>

        <div>
          <h2 class="app-footer__heading">Plateforme</h2>
          <nav class="app-footer__nav" aria-label="Plateforme">
            <RouterLink v-for="item in platformLinks" :key="item.label" :to="item.to">
              {{ item.label }}
            </RouterLink>
          </nav>
        </div>

        <div>
          <h2 class="app-footer__heading">LawApp</h2>
          <nav class="app-footer__nav" aria-label="LawApp">
            <a v-for="item in clubLinks" :key="item.label" :href="item.href">{{ item.label }}</a>
          </nav>
        </div>

        <div>
          <h2 class="app-footer__heading">Télécharger</h2>
          <p class="app-footer__join-kicker">Disponible sur mobile</p>
          <div class="app-footer__stores">
            <a
              class="app-footer__store-badge"
              :href="appStoreUrl"
              :target="appStoreUrl === '#' ? undefined : '_blank'"
              :rel="appStoreUrl === '#' ? undefined : 'noopener noreferrer'"
              aria-label="Télécharger sur l’App Store"
            >
              <img
                src="/footer-badge-app-store.svg"
                alt="Télécharger dans l’App Store"
                width="140"
                height="42"
                loading="lazy"
              />
            </a>
            <a
              class="app-footer__store-badge"
              :href="playStoreUrl"
              :target="playStoreUrl === '#' ? undefined : '_blank'"
              :rel="playStoreUrl === '#' ? undefined : 'noopener noreferrer'"
              aria-label="Télécharger sur Google Play"
            >
              <img
                src="/footer-badge-google-play.svg"
                alt="Disponible sur Google Play"
                width="140"
                height="42"
                loading="lazy"
              />
            </a>
          </div>
          <div class="app-footer__social">
            <a
              v-for="social in socialLinks"
              :key="social.label"
              href="#"
              class="app-footer__social-link"
              :aria-label="social.label"
            >
              <svg
                v-if="social.icon === 'linkedin'"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 4.126 0 2.062 2.062 0 0 1-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                />
              </svg>
              <svg
                v-else-if="social.icon === 'x'"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                />
              </svg>
              <svg
                v-else-if="social.icon === 'facebook'"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                />
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>

    <nav class="app-footer__legal" aria-label="Informations légales">
      <a v-for="item in legalLinks" :key="item.label" :href="item.href">{{ item.label }}</a>
    </nav>
    <p class="app-footer__copy">LawApp50 {{ year }}. Tous droits réservés.</p>
  </footer>
</template>

<style src="@/components/layout/app-footer.css"></style>
