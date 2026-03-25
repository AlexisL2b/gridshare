# GridShare

Plateforme de stockage énergétique partagé entre particuliers.

Des utilisateurs possédant une batterie domestique (hôtes) mettent à disposition leur capacité de stockage excédentaire. D'autres utilisateurs (clients) louent cette capacité pour stocker leur surplus de production. Le système est entièrement virtuel : l'électricité transite par le réseau, la plateforme gère l'attribution, le suivi et l'optimisation des flux.

## Stack technique

| Couche    | Technologie                |
|-----------|----------------------------|
| Frontend  | Next.js 15 (App Router)    |
| Backend   | Node.js + Express          |
| BDD       | PostgreSQL                 |
| ORM       | Prisma                     |
| Auth      | JWT (jsonwebtoken)         |
| CSS       | Tailwind CSS 4             |
| Langage   | TypeScript                 |

## Structure du projet

```
├── backend/            API REST Express
│   ├── prisma/         Schema et migrations
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── services/
│       ├── middleware/
│       ├── lib/        Prisma client singleton
│       ├── types/
│       └── index.ts    Point d'entrée
├── frontend/           Application Next.js
│   └── src/
│       ├── app/        Pages (App Router)
│       ├── components/ Composants réutilisables
│       ├── lib/        Client API (axios)
│       └── types/      Types partagés
└── README.md
```

## Prérequis

- **Node.js** >= 20
- **PostgreSQL** >= 14 (en cours d'exécution)
- **npm**

## Installation

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd "PROJET INTER-PROMO"
```

### 2. Backend

```bash
cd backend
npm install
```

Créer le fichier `.env` (un fichier d'exemple est déjà présent) :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gridshare?schema=public"
JWT_SECRET="gridshare-dev-secret-change-in-production"
PORT=3001
```

Créer la base de données et appliquer les migrations :

```bash
npx prisma migrate dev --name init
```

Générer le client Prisma :

```bash
npx prisma generate
```

### 3. Frontend

```bash
cd ../frontend
npm install
```

Le fichier `.env.local` est déjà configuré :

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Lancement

Ouvrir **deux terminaux** depuis la racine du projet :

**Terminal 1 - Backend :**
```bash
cd backend
npm run dev
```
Le serveur démarre sur http://localhost:3001

**Terminal 2 - Frontend :**
```bash
cd frontend
npm run dev
```
L'application démarre sur http://localhost:3000

## Vérification

Tester que le backend répond :

```bash
curl http://localhost:3001/api/health
```

Réponse attendue :
```json
{ "status": "ok", "timestamp": "2026-03-25T..." }
```

## Outils Prisma

```bash
cd backend

# Ouvrir Prisma Studio (interface visuelle pour la BDD)
npm run prisma:studio

# Créer une nouvelle migration après modification du schema
npm run prisma:migrate

# Regénérer le client après modification du schema
npm run prisma:generate
```

## Modèle de données

- **User** : Utilisateur (HOST ou CLIENT), avec production estimée
- **Battery** : Batterie domestique liée à un hôte
- **StorageOffer** : Offre de stockage publiée sur la marketplace
- **StorageContract** : Contrat entre un client et une offre
- **EnergyTransaction** : Transaction de stockage ou restitution (ledger)
