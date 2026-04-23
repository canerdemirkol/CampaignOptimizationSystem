# Kampanya Optimizasyon Sistemi

Enterprise-grade kampanya optimizasyon platformu. **React + NestJS + Python FastAPI + PostgreSQL + PySCIPOpt** ile inşa edilmiştir.

---

## Servisler

| Servis | Teknoloji | Port | Dokümantasyon |
|--------|-----------|------|---------------|
| **Backend** | NestJS + TypeScript + Prisma | 3001 | [backend/README.md](./backend/README.md) |
| **Frontend** | React + TypeScript + Material UI | 5173 | [frontend/README.md](./frontend/README.md) |
| **Python Service** | FastAPI + PySCIPOpt | 8000 | [python-service/README.md](./python-service/README.md) |
| **PostgreSQL** | PostgreSQL 15+ (harici) | 5432 | - |

---

## Hızlı Başlangıç

### Docker ile (Tüm Servisleri Birlikte)

```bash
# 1. Repository klonla
git clone <repo-url>
cd CampaignOptimizationSystem

# 2. Environment dosyalarını oluştur
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp python-service/.env.example python-service/.env

# 3. .env dosyalarındaki hassas değerleri şifrele
cd backend && npx ts-node scripts/encrypt-env.ts && cd ..
cd python-service && python scripts/encrypt_env.py && cd ..

# 4. Docker ile başlat (tüm servisler)
docker-compose up -d --build

# 5. Tarayıcıda aç
open http://localhost:5173
# Login: admin / admin123
```

### Docker ile (Servisleri Ayrı Ayrı)

Her servis kendi `docker-compose.yml` dosyasına sahiptir ve bağımsız çalıştırılabilir:

```bash
# 1. Shared network oluştur (bir kere)
docker network create campaign-network

# 2. Her servisi kendi dizininden başlat
cd backend && docker-compose up -d --build && cd ..
cd python-service && docker-compose up -d --build && cd ..
cd frontend && docker-compose up -d --build && cd ..
```

### Manuel Kurulum

Her servisin kendi README'sinde detaylı kurulum talimatları bulunur:
- [Backend Kurulum](./backend/README.md#kurulum)
- [Frontend Kurulum](./frontend/README.md#kurulum)
- [Python Service Kurulum](./python-service/README.md#kurulum)

Adım adım tüm sistem kurulumu için: **[SETUP.md](./SETUP.md)**

---

## Sistem Mimarisi

```
┌─────────────────────────────────────────────────────┐
│              React Frontend (5173)                   │
│         TypeScript + Redux + Material UI             │
└──────────────────┬──────────────────────────────────┘
                   │ (API Calls / Nginx Proxy)
┌──────────────────▼──────────────────────────────────┐
│           NestJS Backend (3001)                     │
│    TypeScript + Prisma ORM + Domain-Driven Design   │
│                                                      │
│  ├─ Authentication (JWT + httpOnly Cookies)         │
│  ├─ Campaign Management                             │
│  ├─ Customer & Segment Management                   │
│  └─ Optimization Scenarios (Async)                  │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐  ┌────────▼─────────┐
│  PostgreSQL    │  │ FastAPI Python   │
│   (5432)       │  │   Service (8000) │
│                │  │                  │
│ ├─ Customers   │  │ ├─ PySCIPOpt MIP │
│ ├─ Campaigns   │  │ ├─ Optimization  │
│ ├─ Segments    │  │ └─ Solver        │
│ └─ Results     │  │                  │
└────────────────┘  └──────────────────┘
```

**Mimari Kurallar:**
- Frontend asla DB'ye doğrudan bağlanmaz
- Backend Python servisi HTTP üzerinden çağırır
- Python servisi Stateless (hesaplama yapar, DB'ye yazmaz)
- Sonuçlar Backend tarafından DB'ye kaydedilir

---

## Proje Yapısı

```
CampaignOptimizationSystem/
├── backend/                    # NestJS API
│   ├── Dockerfile             # Backend Docker image
│   ├── docker-compose.yml     # Standalone docker-compose
│   ├── docker-entrypoint.sh   # Container entrypoint
│   ├── src/                   # Kaynak kod
│   └── prisma/                # Schema, Migrations
│
├── frontend/                   # React SPA
│   ├── Dockerfile             # Frontend Docker image
│   ├── docker-compose.yml     # Standalone docker-compose
│   ├── nginx.conf             # Nginx reverse proxy
│   └── src/                   # Kaynak kod
│
├── python-service/            # FastAPI Optimization
│   ├── Dockerfile             # Python Docker image
│   ├── docker-compose.yml     # Standalone docker-compose
│   └── app/                   # Kaynak kod
│
├── docker/                    # Shared Docker Configuration (legacy)
├── docs/                      # Dokümantasyon
├── docker-compose.yml         # Root orchestrator
└── docker-compose.dev.yml     # Development mode
```

---

## Kampanya Türleri ve Optimizasyon

### CRM (Customer Relationship Management)
- **Hedefli** kampanyalar
- Her segment'e özel karar: `x[k,s]` (sun mu, sunma mı?)

### MASS (Broadcast)
- **Broadcast** kampanyalar (tüm segmentlere gider)
- Tek karar: `y[k]` (aktif mi, değil mi?)

### Optimizasyon Akışı

```
1. Scenario Oluştur → 2. Kampanya Ekle → 3. Optimize Çalıştır → 4. Sonuçları Görüntüle
                                            Backend → Python (Async)
                                            PySCIPOpt solver çalışır
                                            Sonuçlar DB'ye kaydedilir
```

---

## Giriş Bilgileri

| Kullanıcı | Şifre | Rol | Yetkiler |
|-----------|-------|-----|----------|
| **admin** | admin123 | ADMIN | Tüm işlemler |
| **user** | user123 | USER | CRUD, Kampanya Yönetimi |
| **viewer** | viewer123 | VIEWER | Sadece Okuma |

---

## Docker Komutları

```bash
# Tüm servisleri başlat
docker-compose up -d --build

# Logları izle
docker-compose logs -f [backend|frontend|python-service]

# Servisleri durdur
docker-compose down

# Tek bir servisi yeniden başlat
cd backend && docker-compose restart
```

---

## Dokümantasyon

| Belge | Açıklama |
|-------|----------|
| [SETUP.md](./SETUP.md) | Kurulum ve yapılandırma rehberi |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Sistem mimarisi |
| [docs/API_ENDPOINTS.md](./docs/API_ENDPOINTS.md) | Tüm API endpoints |
| [docs/DOCKER.md](./docs/DOCKER.md) | Docker kurulum rehberi |
| [docs/DOCKER_ENCRYPTION.md](./docs/DOCKER_ENCRYPTION.md) | Şifreleme süreci |
| [backend/README.md](./backend/README.md) | Backend detayları |
| [frontend/README.md](./frontend/README.md) | Frontend detayları |
| [python-service/README.md](./python-service/README.md) | Python servisi detayları |

---

## Lisans

MIT
