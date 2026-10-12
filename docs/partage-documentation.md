# Partager la documentation (réseau local & mobile)

La doc est servie par **Docsify** (dossier `docs/`). Vous pouvez la consulter sur votre PC et la **partager sur le même WiFi** (téléphone, tablette, collègue).

## Démarrage rapide

| Commande | Accès |
|----------|--------|
| `npm run docs` | **Votre PC uniquement** → [http://localhost:4174](http://localhost:4174) |
| `npm run docs:lan` | **Tout appareil sur le même réseau** → `http://<IP-du-PC>:4174` |

> **Important :** `npm run docs` écoute **127.0.0.1** — les autres sur le WiFi **ne peuvent pas** y accéder. Utilisez **`npm run docs:lan`**.

Première fois : `npm install` (installe `serve` localement, démarrage plus rapide qu’avec `npx`).

## Étape par étape (Windows)

1. Ouvrir un terminal à la racine du projet `lawapp`.
2. Lancer :

```bash
npm run docs:lan
```

3. Trouver l’adresse IP locale du PC :

```powershell
ipconfig
```

Repérez **Adresse IPv4** (ex. `192.168.1.42`) sur WiFi ou Ethernet.

4. Sur le **téléphone** (même WiFi, pas de VPN invité isolé) :

```
http://192.168.1.42:4174
```

5. Autoriser le pare-feu Windows si une popup apparaît (**Autoriser l’accès** pour Node ou « serve »).

## Mac / Linux

```bash
npm run docs:lan
# IP : ip addr | grep inet   ou   ifconfig
```

## Bonnes pratiques

- **Ne pas exposer** `docs:lan` sur Internet sans tunnel sécurisé : c’est pour le **LAN** (bureau, labo, maison).
- Pour un lien **temporaire hors réseau** (client distant) : tunnel type [ngrok](https://ngrok.com/) ou Cloudflare Tunnel :

```bash
npm run docs:lan
# autre terminal :
npx ngrok http 4174
```

→ URL `https://….ngrok.io` à partager (HTTPS, durée limitée selon compte).

## Hébergement « public » durable (équipe)

| Option | Usage |
|--------|--------|
| **GitHub Pages** | Pousser `docs/` + `index.html` sur branche `gh-pages` |
| **Netlify / Vercel** | Site statique, dossier racine = `docs` |
| **Cursor / CI** | Artefact build doc dans pipeline |

Pour GitHub Pages avec Docsify, il faut souvent `relativePath: true` dans `index.html` (déjà compatible si les liens restent relatifs).

## Dépannage mobile

| Problème | Piste |
|----------|--------|
| Page ne charge pas | Même WiFi ? IP correcte ? `docs:lan` actif ? |
| « Connexion refusée » | Pare-feu Windows · antivirus |
| Mermaid vide | Connexion Internet requise (CDN jsDelivr) |
| Sidebar coupée | Mode paysage ou pincer pour zoom |

## Retour à l’accueil

[Index documentation](README.md)
