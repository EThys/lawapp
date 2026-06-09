<script setup lang="ts">
import { Heart, MessageCircle, Share2, Bookmark, Scale } from '@lucide/vue'
import { LEGAL_FEED } from '@/data/legalFeed'

const slides = LEGAL_FEED.slice(0, 5).map((item, i) => ({
  cat: item.category,
  title: item.title,
  hook: item.hook,
  likes: item.likes,
  tone: i % 3,
}))
</script>

<template>
  <div class="phone-reel" aria-hidden="true">
    <div class="phone-reel__device">
      <!-- Boutons latéraux -->
      <span class="phone-reel__btn phone-reel__btn--silent" />
      <span class="phone-reel__btn phone-reel__btn--vol-up" />
      <span class="phone-reel__btn phone-reel__btn--vol-down" />
      <span class="phone-reel__btn phone-reel__btn--power" />

      <div class="phone-reel__bezel">
        <div class="phone-reel__screen">
          <!-- Barre de statut -->
          <div class="phone-reel__status">
            <span class="phone-reel__time">9:41</span>
            <div class="phone-reel__island" />
            <div class="phone-reel__status-icons">
              <span class="phone-reel__signal" />
              <span class="phone-reel__wifi" />
              <span class="phone-reel__battery" />
            </div>
          </div>

          <!-- Fil vertical type Reel -->
          <div class="phone-reel__viewport">
            <div class="phone-reel__track">
              <article
                v-for="(slide, i) in [...slides, ...slides]"
                :key="`${slide.title}-${i}`"
                class="phone-reel__slide"
                :class="`phone-reel__slide--tone-${slide.tone}`"
              >
                <div class="phone-reel__slide-bg" />

                <div class="phone-reel__progress">
                  <span
                    v-for="(_, pi) in slides"
                    :key="pi"
                    class="phone-reel__progress-seg"
                    :class="{ 'is-active': pi === i % slides.length }"
                  />
                </div>

                <div class="phone-reel__brand">
                  <Scale class="w-3 h-3" />
                  <span>Droit Ludique</span>
                </div>

                <aside class="phone-reel__actions">
                  <div class="phone-reel__action">
                    <Heart class="w-[18px] h-[18px]" />
                    <span>{{ slide.likes }}</span>
                  </div>
                  <div class="phone-reel__action">
                    <MessageCircle class="w-[18px] h-[18px]" />
                    <span>12</span>
                  </div>
                  <div class="phone-reel__action">
                    <Share2 class="w-[17px] h-[17px]" />
                  </div>
                  <div class="phone-reel__action">
                    <Bookmark class="w-[17px] h-[17px]" />
                  </div>
                </aside>

                <div class="phone-reel__caption">
                  <p class="phone-reel__cat">{{ slide.cat }}</p>
                  <p class="phone-reel__hook">{{ slide.hook }}</p>
                  <h3 class="phone-reel__title">{{ slide.title }}</h3>
                  <p class="phone-reel__cta">Glisse pour la suite →</p>
                </div>
              </article>
            </div>
          </div>

          <div class="phone-reel__home-indicator" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.phone-reel {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
}

.phone-reel__device {
  position: relative;
  width: min(100%, 252px);
  padding: 0.55rem;
  background: linear-gradient(145deg, #2a2a2e 0%, #121214 55%, #1c1c20 100%);
  border-radius: 2.35rem;
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.08),
    0 24px 48px rgb(0 0 0 / 0.45),
    inset 0 1px 0 rgb(255 255 255 / 0.12);
  transition:
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.45s ease;
}

.phone-reel:hover .phone-reel__device {
  transform: translateY(-8px) rotate(-1deg);
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.1),
    0 32px 64px rgb(13 71 161 / 0.35),
    inset 0 1px 0 rgb(255 255 255 / 0.14);
}

.phone-reel__btn {
  position: absolute;
  background: #3a3a3e;
  border-radius: 2px;
  z-index: 2;
}

.phone-reel__btn--silent {
  left: -2px;
  top: 5.5rem;
  width: 3px;
  height: 1.4rem;
}

.phone-reel__btn--vol-up {
  left: -2px;
  top: 7.25rem;
  width: 3px;
  height: 2rem;
}

.phone-reel__btn--vol-down {
  left: -2px;
  top: 9.75rem;
  width: 3px;
  height: 2rem;
}

.phone-reel__btn--power {
  right: -2px;
  top: 7rem;
  width: 3px;
  height: 3.25rem;
}

.phone-reel__bezel {
  border-radius: 1.85rem;
  overflow: hidden;
  background: #000;
}

.phone-reel__screen {
  position: relative;
  aspect-ratio: 9 / 19.5;
  min-height: 420px;
  background: #0a1628;
  display: flex;
  flex-direction: column;
}

.phone-reel__status {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 1rem 0.35rem;
  font-size: 10px;
  font-weight: 600;
  color: white;
}

.phone-reel__island {
  position: absolute;
  left: 50%;
  top: 0.45rem;
  transform: translateX(-50%);
  width: 4.5rem;
  height: 1.15rem;
  background: #000;
  border-radius: 9999px;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.06);
}

.phone-reel__status-icons {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.phone-reel__signal,
.phone-reel__wifi,
.phone-reel__battery {
  display: block;
  background: white;
  border-radius: 1px;
}

.phone-reel__signal {
  width: 0.9rem;
  height: 0.55rem;
  clip-path: polygon(0 100%, 25% 40%, 50% 70%, 75% 20%, 100% 50%, 100% 100%);
  opacity: 0.9;
}

.phone-reel__wifi {
  width: 0.65rem;
  height: 0.5rem;
  border-radius: 50% 50% 0 0;
  border: 2px solid white;
  border-bottom: none;
  background: transparent;
}

.phone-reel__battery {
  width: 1.1rem;
  height: 0.5rem;
  border: 1.5px solid rgb(255 255 255 / 0.85);
  border-radius: 2px;
  position: relative;
}

.phone-reel__battery::after {
  content: '';
  position: absolute;
  inset: 1px 3px 1px 1px;
  background: #4ade80;
  border-radius: 1px;
}

.phone-reel__viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 380px;
  height: 380px;
}

.phone-reel__track {
  animation: reel-scroll 16s linear infinite;
}

.phone-reel__slide {
  position: relative;
  height: 380px;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 0.85rem 2.75rem;
  overflow: hidden;
}

.phone-reel__slide-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.phone-reel__slide--tone-0 .phone-reel__slide-bg {
  background:
    radial-gradient(ellipse 80% 60% at 70% 20%, rgb(25 118 210 / 0.45) 0%, transparent 55%),
    linear-gradient(165deg, #0a2f6b 0%, #0d47a1 38%, #051a3d 100%);
}

.phone-reel__slide--tone-1 .phone-reel__slide-bg {
  background:
    radial-gradient(ellipse 70% 50% at 30% 15%, rgb(96 165 250 / 0.4) 0%, transparent 50%),
    linear-gradient(180deg, #1565c0 0%, #0d47a1 45%, #0a1628 100%);
}

.phone-reel__slide--tone-2 .phone-reel__slide-bg {
  background:
    radial-gradient(ellipse 90% 70% at 50% 80%, rgb(29 78 216 / 0.35) 0%, transparent 60%),
    linear-gradient(200deg, #051a3d 0%, #1976d2 42%, #0a2f6b 100%);
}

.phone-reel__progress {
  position: absolute;
  top: 2.1rem;
  left: 0.65rem;
  right: 0.65rem;
  z-index: 2;
  display: flex;
  gap: 3px;
}

.phone-reel__progress-seg {
  flex: 1;
  height: 2px;
  border-radius: 9999px;
  background: rgb(255 255 255 / 0.22);
}

.phone-reel__progress-seg.is-active {
  background: rgb(96 165 250 / 0.95);
  box-shadow: 0 0 8px rgb(25 118 210 / 0.6);
}

.phone-reel__brand {
  position: absolute;
  top: 2.65rem;
  left: 0.85rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.45rem;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.85);
  background: rgb(13 71 161 / 0.55);
  border: 1px solid rgb(96 165 250 / 0.25);
  border-radius: 9999px;
  backdrop-filter: blur(6px);
}

.phone-reel__actions {
  position: absolute;
  right: 0.55rem;
  bottom: 5.5rem;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.phone-reel__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  color: white;
  filter: drop-shadow(0 1px 3px rgb(0 0 0 / 0.5));
}

.phone-reel__action span {
  font-size: 9px;
  font-weight: 600;
}

.phone-reel__caption {
  position: relative;
  z-index: 2;
  max-width: 78%;
}

.phone-reel__cat {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(147 197 253 / 0.85);
  margin-bottom: 0.35rem;
}

.phone-reel__hook {
  font-size: 11px;
  font-weight: 500;
  color: rgb(96 165 250);
  margin-bottom: 0.3rem;
}

.phone-reel__title {
  font-family: var(--font-display);
  font-size: 1.2rem;
  line-height: 1.2;
  color: white;
  text-shadow: 0 2px 12px rgb(0 0 0 / 0.4);
}

.phone-reel__cta {
  margin-top: 0.65rem;
  font-size: 9px;
  color: rgb(255 255 255 / 0.45);
  letter-spacing: 0.02em;
}

.phone-reel__home-indicator {
  flex-shrink: 0;
  width: 5.5rem;
  height: 4px;
  margin: 0.35rem auto 0.5rem;
  background: rgb(255 255 255 / 0.35);
  border-radius: 9999px;
}

@keyframes reel-scroll {
  from { transform: translateY(0); }
  to { transform: translateY(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .phone-reel__track {
    animation: none;
  }

  .phone-reel:hover .phone-reel__device {
    transform: none;
  }
}

@media (min-width: 640px) {
  .phone-reel__device {
    width: 268px;
  }

  .phone-reel__screen {
    min-height: 480px;
  }

  .phone-reel__viewport {
    min-height: 400px;
    height: 400px;
  }

  .phone-reel__slide {
    height: 400px;
    min-height: 400px;
  }
}
</style>
