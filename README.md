# 🚀 Agence Astromédia — Agentic RAG Creative Studio

**Astromédia** est un système d'exploitation créatif de nouvelle génération qui industrialise la production de campagnes publicitaires via une architecture multi-agents et un moteur de RAG (Retrieval-Augmented Generation) propriétaire.

Le système permet de transformer n'importe quel brief et assets de marque (PDF, Image, Vidéo, Excel) en une campagne marketing cohérente, optimisée pour les plateformes sociales (Instagram, TikTok, LinkedIn, YouTube).

---

## 🔥 Fonctionnalités Clés

### 1. 🧠 Moteur Brand Intelligence (RAG 10/10)
Contrairement aux outils IA classiques, Astromédia **mémorise et respecte** l'identité de marque de chaque client.
- **Ingestion Multi-Format** : PDF (Brand Books), DOCX (Guidelines), XLSX (Données produits), Images & Vidéos (Analyse visuelle via Vision LLM).
- **Retrieval par Intention** : Chaque agent reçoit exactement le contexte dont il a besoin (marketing, visuel ou conformité).
- **Persistance Locale** : Stockage sécurisé dans le navigateur (IndexedDB) pour une confidentialité totale.

### 2. 🤖 Pipeline Multi-Agents Orchestrée
Quatre agents spécialisés collaborent en séquence pour garantir l'excellence créative :
- **The Orchestrator** : Analyse le brief et définit la stratégie visuelle et sonore.
- **The Marketer** : Rédige le copy publicitaire en se basant sur le ton de voix officiel extrait du RAG.
- **The Director** : Mappe la stratégie vers des templates visuels et assure la direction artistique.
- **The QA Validator** : Analyse le rendu final par rapport aux documents sources pour garantir le "Zéro Défaut".

### 3. 🎬 Media Production Engine
- Intégration native avec **Blotato** pour la génération de vidéos et d'images de haute qualité.
- **Media Hub** : Une bibliothèque persistante pour sauvegarder, auditer et réutiliser vos meilleures productions approuvées.

---

## 🛠️ Stack Technique

- **Frontend** : React 19 + TypeScript + Vite.
- **IA/LLM** : OpenRouter (Gemini 2.0 Flash, Vision Models).
- **RAG** : BM25 Custom + IndexedDB (`idb`).
- **Parsing** : `pdfjs-dist`, `mammoth`, `xlsx`, `papaparse`.
- **Testing** : Vitest (Unit), Playwright (E2E).

---

## 🚀 Installation & Lancement

### Pré-requis
- Node.js (v18+)
- Une clé API [OpenRouter](https://openrouter.ai/)

### Installation
```bash
git clone https://github.com/zakibelm/Agence-Astromedia.git
cd Agence-Astromedia
npm install
```

### Configuration
Créez un fichier `.env` à la racine :
```env
VITE_OPENROUTER_API_KEY=votre_cle_ici
```

### Lancement
```bash
# Mode développement
npm run dev

# Tests unitaires
npm run test:unit

# Tests E2E
npm run test:e2e
```

---

## 📊 Architecture du Projet

```txt
src/
├── components/          # UI Components (BrandPanel, MediaHub, etc.)
├── services/
│   ├── extractors/      # RAG Multi-format parsing
│   ├── ragService.ts    # Core search & indexing logic
│   ├── openRouterService.ts # Multi-agent orchestration
│   └── blotatoService.ts # Media generation
├── tests/               # Unit & E2E Test suites
└── types.ts             # Strict type definitions
```

---

## 🤝 Contribution

Projet développé par **Zakaria Belm** pour l'industrialisation de la création publicitaire agentique. 
"De la connaissance de marque à l'exécution parfaite."
