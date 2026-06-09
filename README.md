# LawApp

Plateforme d'évaluation éducative sécurisée — Vue 3, TypeScript, Tailwind CSS.

## Fonctionnalités

### Authentification
- Inscription séparée **Enseignant** / **Étudiant**
- Connexion avec e-mail et mot de passe
- Espaces dédiés protégés par rôle
- Session persistante (7 jours)

### Espace enseignant
- Création d'évaluations : TP, interrogation, devoir, exercice
- Types de questions : QCM, vrai/faux, réponse courte
- Chronomètre configurable, code d'accès, export CSV
- Paramètres anti-triche personnalisables

### Espace étudiant
- Rejoindre une évaluation par code
- Historique des sessions et scores
- Passation sous chrono avec contrôles stricts

### Anti-triche
- Échec si changement d'onglet ou perte de focus
- Blocage copier/coller, plein écran obligatoire
- Détection DevTools, enregistrement des violations

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

## Parcours rapide

1. **S'inscrire** en tant qu'enseignant → créer une évaluation → publier → copier le code
2. **S'inscrire** en tant qu'étudiant → entrer le code → passer l'épreuve

## Build production

```bash
npm run build
npm run preview
```

## Stack

- Vue 3 + TypeScript + Vite
- Tailwind CSS v4
- Vue Router + Pinia
- IBM Plex Sans + Source Serif 4

## Note

Données en localStorage (version démo). Un backend est recommandé pour la production multi-appareils.
