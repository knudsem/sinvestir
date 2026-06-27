# Simulateur crypto

Simulateur d'investissement en cryptomonnaies : on choisit une crypto, un montant, une fréquence (en une fois ou récurrent) et une période, et l'outil reconstruit ce qu'aurait donné la stratégie à partir des prix réels du marché. Le tout repris dans l'identité visuelle de la suite d'outils S'investir.

Réalisé dans le cadre du test technique S'investir.

- Démo en ligne : https://sinvestir-three.vercel.app

---

## Démarrage rapide

Prérequis : Node.js 20 ou plus (version épinglée dans `.nvmrc`).

```
npm install
npm run dev
```

`npm run dev` sert l'interface et les vraies données de marché via un proxy local (par défaut http://localhost:5173). Les prix sont récupérés en direct, aucune clé d'API n'est requise.

Autres commandes : `npm run build` (production), `npm test` (92 tests), `npm run typecheck` (typage), `npm run demo` (démonstration du moteur en console, sans réseau).

---

## Choix techniques

- **Preact + TypeScript + Vite.** Le confort de React pour une fraction du poids, adapté à un composant destiné à être intégré ailleurs. Next.js a été écarté volontairement : ni rendu serveur ni SEO ici, une application monopage suffit et reste plus simple à déployer.
- **CSS maison, jetons de design centralisés** (`src/ui/styles/tokens.css`). Pas de Tailwind : le composant a vocation à devenir un Web Component isolé (Shadow DOM), et un CSS natif compact passe cette frontière sans configuration.
- **Identité calée sur `simulateurs.sinvestir.fr`** : Plus Jakarta Sans et Lexend, bleu (`#1098f8`) en accent et or (`#f8d046`) pour les gains, fond navy sombre avec halo bleu, titres blancs en majuscules. Couleurs relevées directement sur leur interface.
- **Graphiques en SVG dessinés à la main**, sans librairie : courbes, infobulle au survol et comparaison multi-cryptos. Bundle minuscule, rendu entièrement maîtrisé.
- **Cœur de calcul pur** (`src/core/`), indépendant de l'interface et du réseau, testé en isolation et vérifié par une configuration TypeScript stricte sans accès au DOM.
- **Source de prix interchangeable** (`PriceProvider`) : aujourd'hui Binance (données publiques, gratuites, sans clé), complétée par Bitstamp pour le Bitcoin avant 2017. Changer de source ne touche qu'un fichier.
- **Proxy serverless** (`api/klines.ts` sur Vercel) : le navigateur n'appelle jamais Binance directement. Résout le CORS, met en cache côté serveur, région épinglée en Europe.

---

## Architecture

```
src/
  core/        Logique pure : simulation, métriques, comparaisons (100% testée)
    data/      Contrat PriceProvider et fournisseur de test en mémoire
  server/      Sources de prix (Binance, Bitstamp), orchestration et cache
  ui/          Interface Preact : composants, hooks, formatage, styles
api/
  klines.ts    Fonction serverless Vercel : le proxy de prix
examples/
  demo.ts      Démonstration du moteur en console (npm run demo)
```

La séparation est nette : le cœur ne sait rien de l'interface, l'interface ne sait rien des sources de données, et la couche serveur est le seul endroit qui connaît Binance et Bitstamp.

---

## Fonctionnalités

Demandées par le sujet : investissement en une fois ou récurrent (quotidien, hebdomadaire, mensuel) sur la crypto et la période choisies ; résultats clairs (valeur finale, gain, rendement annualisé, prix d'achat moyen) avec une courbe d'évolution ; reprise de l'identité visuelle des simulateurs S'investir.

En bonus :

- **Graphique interactif** : au survol, curseur et infobulle donnent la date, la valeur du portefeuille et le montant investi. Compatible tactile.
- **Comparaison multi-cryptos** : jusqu'à quatre cryptos superposées, mêmes apports et mêmes dates.
- **Comparaison avec un Livret A** : la même stratégie rejouée sur une épargne sans risque, pour chiffrer ce que la prise de risque a rapporté ou coûté.
- **Ajustement de l'inflation** : valeur et rendement en pouvoir d'achat réel.
- **Historique profond** : le Bitcoin remonte jusqu'à 2011 grâce à Bitstamp, avec repli automatique si la source ancienne est indisponible.
- **Export PDF** : un rapport d'une page (scénario, métriques, graphique, comparaisons), généré à la demande.
- **Lien partageable** : chaque simulation est encodée dans l'URL.
- **Métriques de risque** : volatilité annualisée, pire baisse, temps passé en profit, sommet du portefeuille.

---

## Qualité

92 tests automatisés sur la logique de calcul et le parsing des sources. Typage strict, cœur vérifié sans aucune dépendance navigateur. Bundle initial autour de 49 ko (18 ko compressé), jsPDF chargé uniquement au moment de l'export.

---

## Pistes d'amélioration pour S'investir

Au-delà du test, comment je ferais grandir l'outil :

- **Sauvegarde de scénarios et comptes** (via Supabase) : retrouver et comparer ses simulations dans le temps.
- **Insights éditoriaux par journalisation anonyme** (via n8n + Supabase) : savoir quelles cryptos, montants et périodes sont les plus testés permet de produire du contenu pédagogique ciblé et de nourrir la newsletter.
- **Composant embarquable** : un Web Component (Shadow DOM) pour l'intégrer dans n'importe quelle page du site, sans iframe.
- **Plus de points de comparaison** : au lieu du seul Livret A, comparer aussi à un ETF actions, à l'or ou à l'immobilier, pour replacer la crypto dans un patrimoine.
- **Mode objectif** : partir d'un but ("50 000 euros dans 10 ans") et calculer l'effort d'épargne nécessaire, plus parlant pour un épargnant.
- **Accessibilité (WCAG / European Accessibility Act)** : un simulateur pleinement accessible élargit l'audience et met le site en conformité. C'est un sujet que je maîtrise et sur lequel je peux faire avancer l'ensemble du site.

---

## À propos

Développeur et designer freelance à Toulouse, dix ans de pratique, double profil développement et direction artistique : je soigne autant l'interface que l'architecture, propre et testée. J'ai livré du React, du Django et du Shopify en production.

J'ai construit ce simulateur en TypeScript et Preact parce que c'est la stack que je maîtrise le mieux, et qu'elle donne ici un composant léger, testé et facile à intégrer. Je suis tout aussi à l'aise avec la vôtre : Next.js, Supabase, Vercel et n8n font partie de mes outils, comme le développement assisté par IA avec Claude Code, et le rendu se déploie tel quel sur votre infrastructure. La mission de S'investir, rendre la finance compréhensible, est exactement le genre de produit où mon souci de clarté et de pédagogie fait la différence.
