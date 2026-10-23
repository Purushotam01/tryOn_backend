# TryFit Cloud Backend Service

A secure, centralized cloud backend for the **TryFit** Flutter application. Built with **Node.js, Express, and Firebase Admin SDK** (Firestore & Firebase Storage), serving as the authoritative source of truth for Coins, Subscriptions, Wardrobe, Planner, and a secure proxy for Virtual Try-On (`TryOnCloud`).

---

## 🚀 Features & Modules

- **Firebase Authentication & Security:** Enforces `Authorization: Bearer <Firebase_ID_Token>` verification on all protected endpoints. Eliminates client-side `userId` spoofing.
- **My Collection (Wardrobe):** Cloud persistence for real user clothing (`Tops`, `Bottoms`, `Dresses`, `Outerwear`, `Shoes`, `Accessories`).
- **Virtual Try-On Proxy:** Secures `TRYONCLOUD_API_KEY` on the backend, deducts coins (10 coins), downloads generated images, and saves them to Firebase Storage.
- **AI Match Engine:** Dynamic clothing-to-person compatibility scoring based on styling preferences (silhouette, undertones, aesthetic vibes). Deducts 5 coins.
- **Authoritative Coins & Ledger:** Centralized balance with append-only transaction ledger. Pre-configured bundles: 100, 500, and 1000 coins.
- **Subscriptions & Anti-Abuse Free Trial:** Authoritative state management (`UNKNOWN`, `FREE_TRIAL`, `PREMIUM_ACTIVE`, `EXPIRED`). Enforces 1-time free trial eligibility per Firebase account.
- **Planner & Build My Week:** Cross-device calendar planning (`YYYY-MM-DD`) and weekly automated plan generation with dynamic AI match aggregation.
- **Recent Picks & Favorites:** Interaction history (max 10 items, newest-first, duplicate-safe LRU).
- **Firebase Storage Rules & Firestore Rules:** Hardened security rules included (`firestore.rules`, `storage.rules`).

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```
> **Note:** If Firebase credentials are not yet configured or use placeholders, the backend automatically operates using a built-in **Local In-Memory Adapter** so you can develop and test immediately without cloud setup.

### 3. Seed Test Data (Optional)
Populate realistic user data (Profile, Wardrobe across all categories, Styled Looks, Planner, Coins, Subscriptions):
```bash
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

### 5. Run Automated Test Suite
```bash
npm test
```
Executes the comprehensive verification test suite verifying all 18 core requirements.

### 6. Postman API Testing
Import `TryFit_API_Postman_Collection.json` directly into Postman:
- **Pre-configured Environment Variables:** `baseUrl` (`http://localhost:3000/api/v1`), `authToken` (`test_user_uid_12345`).
- **Complete Test Suite:** Includes 14 folders and 32+ pre-formatted requests with authentic payloads and test assertions.

---

## 📡 REST API Reference (`/api/v1`)

All responses adhere strictly to the TryFit standard envelope:
```json
{
  "success": true,
  "data": {},
  "message": null,
  "error": null
}
```

### Authentication & Profile
- `GET /api/v1/profile` - Get user profile & onboarding status
- `PUT /api/v1/profile` - Update profile data
- `GET /api/v1/profile/preferences` - Get styling preferences
- `PUT /api/v1/profile/preferences` - Update styling preferences
- `GET /api/v1/profile/stats` - Dynamic counts (Wardrobe, Outfits, AI Matches)

### Wardrobe & Storage
- `GET /api/v1/wardrobe?category=Tops` - List user clothes
- `POST /api/v1/wardrobe` - Add clothing item
- `GET /api/v1/wardrobe/:id` - Get item details
- `PUT /api/v1/wardrobe/:id` - Update clothing item
- `DELETE /api/v1/wardrobe/:id` - Remove item from collection
- `POST /api/v1/storage/upload` - Secure multipart file upload to Firebase Storage

### Virtual Try-On & AI Match
- `POST /api/v1/try-on` - Execute TryOnCloud proxy generation (Rate-limited, Idempotent)
- `GET /api/v1/try-on/history` - List past try-on operations
- `POST /api/v1/ai/match` - Calculate compatibility score & styling feedback (Rate-limited)
- `GET /api/v1/ai/styled-looks` - List saved AI looks
- `POST /api/v1/ai/styled-looks` - Save generated look
- `DELETE /api/v1/ai/styled-looks/:id` - Delete saved look
- `GET /api/v1/recommendations/for-you` - Dynamic outfit recommendations

### Planner & Build My Week
- `GET /api/v1/planner` - List planned outfits (`date`, `startDate`, `endDate`)
- `POST /api/v1/planner` - Save outfit for date
- `DELETE /api/v1/planner/:id` - Remove planner entry
- `GET /api/v1/planner/build-week` - Generate 7-day schedule with summary metrics

### Coins & Subscriptions
- `GET /api/v1/coins/balance` - Authoritative balance
- `GET /api/v1/coins/packages` - Packages (100, 500, 1000 Coins)
- `POST /api/v1/coins/purchase` - Purchase coins package (Idempotent)
- `GET /api/v1/coins/transactions` - Audit ledger
- `GET /api/v1/subscription` - Check status & plans
- `POST /api/v1/subscription/trial/start` - Claim 3-day trial (1-time check)
- `POST /api/v1/subscription/purchase` - Activate premium plan (Idempotent)
- `POST /api/v1/payments/webhook` - Async payment confirmation webhook

### Recent Picks, Favorites & Notifications
- `GET /api/v1/recent-picks` - Recent interactions (max 10, newest-first)
- `POST /api/v1/recent-picks` - Record an interaction
- `GET /api/v1/favorites` - List favorites
- `POST /api/v1/favorites` - Add to favorites
- `DELETE /api/v1/favorites/:id` - Remove favorite
- `GET /api/v1/notifications` - List user notifications
- `PUT /api/v1/notifications/read-all` - Mark all notifications as read
- `DELETE /api/v1/notifications` - Clear all notifications

---

## 🔒 Security & Firestore Rules

Deploy the included security rules directly to your Firebase project:
```bash
firebase deploy --only firestore:rules,storage
```
Sensitive collections (`coins`, `coinTransactions`, `subscription`, `tryons`) are marked **read-only** for clients in Firestore, ensuring coins and premium access cannot be spoofed from mobile client modifications.

---

## 🗄️ Application Data Storage (MySQL)

- Application records (profiles, preferences, wardrobe, favorites, planner, notifications, AI records, coins, subscriptions, and payment metadata) are stored in MySQL in the `user_documents` table. The JSON payload preserves the existing document shapes and API contracts.
- Firebase is retained for Google ID-token verification and Firebase Storage file uploads only. Runtime code does not initialize or read/write Firestore.
- Run `npm run migrate` (`node src/db/migrate.js`) to create or align the `users` and `user_documents` tables safely and idempotently.
- If existing user records are still in Firestore, optionally run `node src/db/migrate-firestore-data.js` once after taking backups. This one-time import uses `INSERT IGNORE` (does not overwrite existing MySQL records and does not delete Firestore data).
- The MySQL document adapter unit test can be run with `npm run test:mysql-documents`.
