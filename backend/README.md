# Campaign Optimization Backend (NestJS)

Enterprise-grade kampanya optimizasyon backend servisi. **NestJS + TypeScript + Prisma ORM + Domain-Driven Design** ile inşa edilmiştir.

## Mimari

```
backend/
├── src/
│   ├── main.ts                    # Application bootstrap
│   ├── app.module.ts              # Root module
│   ├── domain/                    # Entities, Value Objects
│   ├── infrastructure/            # Database, Cache, Crypto
│   │   ├── crypto/                # AES-256-GCM şifreleme servisi
│   │   └── prisma/                # Prisma ORM servisi
│   └── modules/                   # Feature modules
│       ├── auth/                  # JWT Authentication
│       ├── campaign/              # Kampanya yönetimi
│       ├── customer/              # Müşteri yönetimi
│       ├── customer-segment/      # Müşteri segmentleri
│       ├── optimization/          # Optimizasyon tetikleme
│       ├── optimization-scenario/ # Senaryo yönetimi
│       ├── health/                # Health check
│       └── user/                  # Kullanıcı yönetimi
├── prisma/                        # Schema, Migrations, Seed
├── scripts/                       # Utility scripts (encrypt-env vb.)
├── Dockerfile                     # Docker image
├── docker-compose.yml             # Standalone docker-compose
└── docker-entrypoint.sh           # Container entrypoint
```

## Teknoloji Stack

| Kategori | Teknoloji |
|----------|-----------|
| **Framework** | NestJS |
| **Dil** | TypeScript |
| **ORM** | Prisma |
| **Database** | PostgreSQL 15+ |
| **Auth** | JWT (httpOnly Cookies) |
| **Şifreleme** | AES-256-GCM |

## Kurulum

### Gereksinimler

- Node.js 20+
- PostgreSQL 15+ (harici)

### Manuel Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Environment dosyasını oluştur
cp .env.example .env
# .env dosyasını düzenle (DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY)

# Prisma client oluştur
npx prisma generate

# Migration'ları çalıştır
npx prisma migrate deploy

# .env değerlerini şifrele (DATABASE_URL ve JWT_SECRET)
npm run encrypt-env

# Seed data yükle
npx prisma db seed

# Development server başlat (hot-reload)
npm run start:dev

# Veya reload'suz başlat (uzun süren optimizasyon jobs için önerilir)
npm run start
```

> ⚠️ **Uzun süren optimizasyonlar (10K+ segment) için `npm run start` kullanın.**
> `start:dev` watch modunda herhangi bir `.ts` dosyası değişirse Nest process'i yeniden başlar ve python-service'e açık olan HTTP isteği kopar. `npm run start` watch'ı devre dışı bırakır; Docker zaten watch'sız çalışır (`dist/main.js` production build).

### Docker ile Çalıştırma

```bash
# Standalone (önce shared network oluştur)
docker network create campaign-network
docker-compose up -d --build

# Veya root dizinden tüm servislerle birlikte
cd .. && docker-compose up -d --build
```

## Environment Variables

```env
# Database (harici PostgreSQL)
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"

# JWT Secret (min 15 karakter)
JWT_SECRET="your-strong-secret-key"

# AES-256 Encryption Key (tam 32 karakter, PLAINTEXT kalır)
ENCRYPTION_KEY="b14ca5898a4e4142aace2ea2143a2410"

# Python Service URL
# Docker: http://campaign-python:8000
# Local: http://localhost:8000
FASTAPI_URL="http://localhost:8000"

# Frontend URL (CORS için)
# Docker: http://campaign-frontend
# Local: http://localhost:5173
FRONTEND_URL="http://localhost:5173"

# Server
PORT=3001
NODE_ENV=development
```

## Environment Variable Şifreleme (AES-256-GCM)

Hassas `.env` değerlerini şifreli saklamak için:

```bash
# DATABASE_URL ve JWT_SECRET otomatik şifrelenir
npx ts-node scripts/encrypt-env.ts
# Sonuç: DATABASE_URL="ENC:base64..." / JWT_SECRET="ENC:base64..."

# Tek değeri şifrele
npx ts-node scripts/encrypt-env.ts --value "my-sensitive-value"

# Decrypt et
npx ts-node scripts/encrypt-env.ts --decrypt "ENC:base64..."
```

> Uygulama başlatılınca `ENC:` prefix'li değerler `CryptoService` tarafından otomatik decrypt edilir.

## Kimlik Doğrulama

JWT tabanlı authentication (httpOnly cookie):

| Kullanıcı | Şifre | Rol | Yetkiler |
|-----------|-------|-----|----------|
| **admin** | admin123 | ADMIN | Tüm işlemler |
| **user** | user123 | USER | CRUD, Kampanya Yönetimi |
| **viewer** | viewer123 | VIEWER | Sadece Okuma |

- Access Token: 15 dakika
- Refresh Token: 7 gün

## Veri Modeli

### Kampanya (Campaign)

```typescript
type CampaignType = 'CRM' | 'MASS'

interface Campaign {
  id: UUID
  name: string
  type: CampaignType          // CRM: hedefli, MASS: broadcast
  rMin: number                // Min recommendation limit
  rMax: number                // Max recommendation limit
  zK: float                   // Profit per customer
  cK: float                   // Cost per customer
}
```

### Müşteri Segmentleri (CustomerSegment)

```typescript
interface CustomerSegment {
  id: UUID
  name: string               // e.g., "Premium", "Gold", "Silver"
  description: string?
  customerCount: number      // Ağırlık faktörü
  lifetimeValue: float       // Müşteri LTV
  incomeLevelId: string?     // Gelir seviyesi referansı
}
```

### Optimizasyon Senaryosu (OptimizationScenario)

```typescript
interface OptimizationScenario {
  id: UUID
  name: string
  status: 'READY' | 'RUNNING' | 'COMPLETED_SUCCESSFULLY' | 'FAILED'
  campaigns: Campaign[]
  results: OptimizationScenarioResult[]
}
```

> `churnScore` alanı segment seviyesinde değil, bireysel müşteri (`Customer`) seviyesinde tutulur. Kampanya-segment bazlı puanlar `CampaignCustomerSegmentScore` tablosunda saklanır.

## API Endpoints

Detaylı API referansı için: [docs/API_ENDPOINTS.md](../docs/API_ENDPOINTS.md)

### Temel Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/login` | Giriş |
| POST | `/api/auth/register` | Kayıt |
| GET | `/api/campaigns` | Kampanyaları listele |
| POST | `/api/optimization/:scenarioId/run` | Optimizasyon çalıştır |
| GET | `/api/health` | Health check |

## Npm Scripts

```bash
npm run start          # Local run, watch YOK (uzun süren jobs için önerilir)
npm run start:dev      # Development (hot-reload, .ts değişiminde restart)
npm run build          # Production build
npm run start:prod     # Production start (dist/main.js)
npm run test           # Unit tests
npm run test:cov       # Test coverage
npm run lint           # ESLint
npm run encrypt-env    # .env şifreleme
```

## Troubleshooting

**Database bağlantı hatası:**
```bash
# PostgreSQL erişimini kontrol et
npx prisma db pull

# Migration durumunu kontrol et
npx prisma migrate status
```

**Docker'da hata:**
```bash
# Logları kontrol et
docker-compose logs -f

# Container shell'ine bağlan
docker-compose exec backend sh
```
