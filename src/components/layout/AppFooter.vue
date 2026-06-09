<template>
  <footer class="border-t border-line bg-white mt-auto">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div class="grid sm:grid-cols-3 gap-8 mb-8">
        <div>
          <p class="font-display text-lg text-ink mb-2">LawApp</p>
          <p class="text-xs text-ink-faint leading-relaxed max-w-xs">
            Créez et diffusez des évaluations pour vos étudiants, élèves et formations. Module Droit Ludique inclus.
          </p>
        </div>
        <div>
          <p class="label-caps mb-3">Produit</p>
          <ul class="space-y-2 text-xs text-ink-muted">
            <li>Évaluations chronométrées</li>
            <li>Droit Ludique (fil vertical)</li>
            <li>Contrôles anti-triche</li>
            <li>Export des résultats</li>
          </ul>
        </div>
        <div>
          <p class="label-caps mb-3">Conformité</p>
          <ul class="space-y-2 text-xs text-ink-muted">
            <li>Données hébergées localement (démo)</li>
            <li>Traçabilité des sessions</li>
            <li>Comptes séparés enseignant / étudiant</li>
          </ul>
        </div>
      </div>
      <div class="rule-line pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p class="text-xs text-ink-faint">© {{ new Date().getFullYear() }} LawApp</p>
        <p class="text-xs text-ink-faint">Conçu pour l'éducation · Version 1.0</p>
      </div>
    </div>
  </footer>
</template>
