<script setup lang="ts">
import { LEGAL_FEED } from '@/data/legalFeed'

const slides = LEGAL_FEED.slice(0, 4).map((item) => ({
  cat: item.category,
  title: item.title,
  hook: item.hook,
}))
</script>

<template>
  <div class="discover-preview" aria-hidden="true">
    <div class="discover-preview-frame">
      <div class="discover-preview-notch" />
      <div class="discover-preview-screen">
        <div class="discover-preview-track">
          <article
            v-for="(slide, i) in [...slides, ...slides]"
            :key="`${slide.title}-${i}`"
            class="discover-preview-slide"
          >
            <p class="discover-preview-cat">{{ slide.cat }}</p>
            <p class="discover-preview-hook">{{ slide.hook }}</p>
            <h3 class="discover-preview-title">{{ slide.title }}</h3>
            <div class="discover-preview-dots">
              <span />
              <span class="is-active" />
              <span />
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.discover-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.discover-preview-frame {
  position: relative;
  width: min(100%, 240px);
  padding: 0.65rem;
  background: rgb(255 255 255 / 0.06);
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 1.75rem;
  transition:
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.4s ease;
}

.discover-preview:hover .discover-preview-frame {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 20px 48px rgb(0 0 0 / 0.25);
}

.discover-preview-notch {
  width: 3rem;
  height: 0.35rem;
  margin: 0 auto 0.65rem;
  background: rgb(255 255 255 / 0.15);
  border-radius: 9999px;
}

.discover-preview-screen {
  height: 320px;
  overflow: hidden;
  border-radius: 1.25rem;
  background: rgb(5 46 22 / 0.85);
  border: 1px solid rgb(255 255 255 / 0.08);
}

.discover-preview-track {
  animation: preview-scroll 14s linear infinite;
}

.discover-preview-slide {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 320px;
  padding: 1.25rem;
  background: linear-gradient(to top, rgb(5 46 22) 40%, rgb(20 83 45 / 0.35));
}

.discover-preview-cat {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.4);
  margin-bottom: 0.5rem;
}

.discover-preview-hook {
  font-size: 11px;
  color: rgb(74 222 128 / 0.9);
  margin-bottom: 0.35rem;
}

.discover-preview-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  line-height: 1.25;
  color: white;
}

.discover-preview-dots {
  display: flex;
  gap: 4px;
  margin-top: 1rem;
}

.discover-preview-dots span {
  height: 2px;
  flex: 1;
  background: rgb(255 255 255 / 0.15);
}

.discover-preview-dots span.is-active {
  flex: none;
  width: 1.25rem;
  background: rgb(74 222 128 / 0.9);
}

@keyframes preview-scroll {
  from { transform: translateY(0); }
  to { transform: translateY(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .discover-preview-track {
    animation: none;
  }
}
</style>
