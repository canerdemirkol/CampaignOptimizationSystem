# Docker Kurulum ve Yapilandirmasi

Bu belge, Docker ile Kampanya Optimizasyon Sistemi'nin kurulum, yapilandirma ve sorun giderme konularini kapsar.

> **NOT:** PostgreSQL Docker'da calismiyor. Harici (external) PostgreSQL sunucusuna baglanilir. Sifreleme sureci icin: [DOCKER_ENCRYPTION.md](./DOCKER_ENCRYPTION.md)

---

## Icindekiler

1. [Sistem Gereksinimleri](#sistem-gereksinimleri)
2. [Mevcut Yapi](#mevcut-yapi)
3. [Production Kurulumu](#production-kurulumu-docker-composeyml)
4. [Development Kurulumu](#development-kurulumu-docker-composedevyml)
5. [Docker Komutlari Rehberi](#docker-komutlari-rehberi)
6. [Environment Yapilandirmasi](#environment-yapilandirmasi)
7. [Network ve Iletisim](#network-ve-iletisim)
8. [Health Checks](#health-checks)
9. [Performans Optimizasyonu](#performans-optimizasyonu)
10. [Security](#security)
11. [PostgreSQL'i Docker'a Geri Alma](#postgresqli-dockera-geri-alma)

---

## Sistem Gereksinimleri

### Windows / macOS

- **Docker Desktop** 4.0+
- En az **4GB RAM** (8GB onerilen)
- En az **20GB disk alani**

### Linux

```bash
# Docker yukle
sudo apt-get update
sudo apt-get install docker.io docker-compose -y

# Opsiyonel: Kullaniciyi docker grubuna ekle (sudo olmadan kullanim)
sudo usermod -aG docker $USER
```

### Ek Gereksinimler

- **Harici PostgreSQL 15+** sunucusu (Docker DISINDA, erisebilir durumda)
- PostgreSQL'de veritabani olusturulmus olmali

**Kontrol et:**
```bash
docker --version
docker-compose --version
```

---

## Mevcut Yapi

PostgreSQL Docker'da calismaz. Harici PostgreSQL sunucusuna baglanilir.

```
Docker Container'lar (her biri ayri container):
├── campaign-backend  (NestJS, port 3001)  → Harici PostgreSQL'e baglanir
├── campaign-frontend (React + Nginx, port 5173) → Backend'e Nginx proxy ile erisir
└── campaign-python   (FastAPI, port 8000) → Backend API'ye HTTP ile erisir

Her servis kendi dizininde bagimsiz docker-compose.yml dosyasina sahiptir:
├── backend/docker-compose.yml
├── frontend/docker-compose.yml
└── python-service/docker-compose.yml

Root docker-compose.yml tum servisleri birlikte baslatir (orchestrator).

Harici:
└── PostgreSQL (Docker DISINDA)         → Backend .env'deki DATABASE_URL

Network: campaign-network (bridge / external)
```

### Bagimsiz Calistirma

Her servisi ayri ayri baslatabilirsiniz:

```bash
# 1. Shared network olustur (bir kere)
docker network create campaign-network

# 2. Servisleri bagimsiz baslat
cd backend && docker-compose up -d --build
cd python-service && docker-compose up -d --build
cd frontend && docker-compose up -d --build
```

### Birlikte Calistirma (Root Orchestrator)

```bash
# Tum servisleri tek komutla baslat
docker-compose up -d --build
```

---

## Production Kurulumu (docker-compose.yml)

### Adim 1: Environment Dosyalarini Olustur

```bash
# Root .env dosyasi
cp .env.example .env

# Backend .env dosyasi
cp backend/.env.example backend/.env

# Frontend .env dosyasi
cp frontend/.env.example frontend/.env

# Python service .env dosyasi
cp python-service/.env.example python-service/.env
```

### Adim 2: Backend .env Dosyasini Duzenle

`backend/.env` dosyasinda harici PostgreSQL adresini yaz:

```env
# Harici PostgreSQL baglanti adresi
DATABASE_URL="postgresql://kullanici:sifre@sunucu-ip:5432/veritabani_adi?schema=public"

# JWT Secret (guclu bir deger kullan)
JWT_SECRET="OBaseJWTAuthentication2026CampaignOptimization3365"

# Sifreleme anahtari (tam 32 karakter)
ENCRYPTION_KEY="b14ca5898a4e4142aace2ea2143a2410"

# Servis URL'leri (Docker override edecek, degistirme)
FASTAPI_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:5173"
PORT=3001
NODE_ENV=development
```

### Adim 3: Hassas Degerleri Sifrele

```bash
# Root .env: DATABASE_URL, JWT_SECRET, SERVICE_USERNAME, SERVICE_PASSWORD sifrele
cd backend
npx ts-node scripts/encrypt-env.ts --env-path ../.env
cd ..

# Backend .env: DATABASE_URL ve JWT_SECRET sifrele
cd backend
npx ts-node scripts/encrypt-env.ts
cd ..

# Python Service .env: SERVICE_USERNAME ve SERVICE_PASSWORD sifrele
cd python-service
python scripts/encrypt_env.py
cd ..
```

> **Linux/macOS kullanicilari** root .env icin alternatif olarak `./scripts/encrypt-env.sh` kullanabilir.

> Sifreleme sureci hakkinda detayli bilgi: [DOCKER_ENCRYPTION.md](./DOCKER_ENCRYPTION.md)

### Adim 4: Docker ile Build ve Baslat

```bash
# Build et ve baslat
docker-compose up -d --build

# Servis durumunu kontrol et
docker-compose ps

# Loglari izle
docker-compose logs -f
```

### Adim 5: Seed Data Yukle (Sadece Ilk Kurulumda)

```bash
# Migration'lar otomatik calisir (docker-entrypoint.sh sayesinde)
# Sadece seed data manuel yuklenir:
docker-compose exec backend npx prisma db seed
```

> **Not:** `prisma migrate deploy` komutu container her basladiginda otomatik calisir. Manuel calistirmaya gerek yoktur.

### Adim 6: Tarayicida Test Et

```
Frontend:       http://localhost:5173
Backend API:    http://localhost:3001/api
Python Service: http://localhost:8000/docs
```

**Test Kullanicilari:**
```
admin  / admin123   (ADMIN - Tum islemler)
user   / user123    (USER - CRUD, Kampanya Yonetimi)
viewer / viewer123  (VIEWER - Sadece Okuma)
```

### Log Izleme

```bash
# Tum servisleri izle
docker-compose logs -f

# Belirli servis
docker-compose logs -f backend
docker-compose logs -f python-service
docker-compose logs -f frontend
```

---

## Development Kurulumu (docker-compose.dev.yml)

Development'da sadece **Python Service** Docker'da calisir. Backend ve Frontend manual baslatilir (hot-reload icin).

### Kurulum

```bash
# Python servisi Docker'da baslat
docker-compose -f docker-compose.dev.yml up -d

# Backend (yeni terminal)
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev

# Frontend (yeni terminal)
cd frontend
npm install
npm run dev
```

### Avantajlari

- Hot-reload calisir
- Hizli gelistirme
- Kolay debugging
- Console loglari gorunur

---

## Docker Komutlari Rehberi

### Konteyner Yonetimi

```bash
# Servisleri baslat
docker-compose up -d

# Servisleri durdur
docker-compose stop

# Servisleri durdur ve kaldir
docker-compose down

# Servisleri yeniden baslat
docker-compose restart

# Belirli servisi yeniden baslat
docker-compose restart backend
```

### Insa ve Guncelleme

```bash
# Servisleri build et
docker-compose build

# Cache olmadan build et
docker-compose build --no-cache

# Build et ve baslat
docker-compose up -d --build

# Belirli servisi build et
docker-compose build backend
```

### Log ve Monitoring

```bash
# Tum loglari izle (real-time)
docker-compose logs -f

# Son 100 satir
docker-compose logs -f --tail=100

# Belirli servis loglari
docker-compose logs -f backend
docker-compose logs -f python-service

# Timestamp ile loglar
docker-compose logs -f --timestamps
```

### Container'a Erisim

```bash
# Backend shell'ine baglan
docker-compose exec backend sh

# Python service'e baglan
docker-compose exec python-service bash

# Belirli komut calistir
docker-compose exec backend npx prisma studio
```

### Durum Kontrol

```bash
# Container durumlarini gor
docker-compose ps

# Detayli bilgi
docker-compose ps -a

# Servis stats
docker stats
```

---

## Environment Yapilandirmasi

### Root .env (docker-compose icin)

```env
# Port yapilandirmasi
BACKEND_PORT=3001
FRONTEND_PORT=5173
PYTHON_PORT=8000

# Secrets
JWT_SECRET=your-secret-key-min-20-chars
ENCRYPTION_KEY=your-32-character-encryption-key!
```

### Backend .env

```env
# Harici PostgreSQL baglantisi (sifreli veya plaintext)
DATABASE_URL="postgresql://user:pass@sunucu:5432/db?schema=public"
JWT_SECRET="your-secret"
ENCRYPTION_KEY="your-32-char-key"
FASTAPI_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:5173"
PORT=3001
NODE_ENV=development
```

### Docker'da Override Edilen Degerler

docker-compose.yml icinde su degerler backend/.env'yi override eder:

```yaml
environment:
  NODE_ENV: production
  PORT: 3001
  FASTAPI_URL: http://campaign-python:8000    # Docker container name
  FRONTEND_URL: http://localhost:5173
```

> **Not:** `DATABASE_URL` artik override EDILMEZ. backend/.env'den gelen deger (sifreli veya plaintext) kullanilir.

---

## Network ve Iletisim

### Docker Network

Container'lar **campaign-network** bridge network'te baglantidir:

```
┌──────────────────────────────────────────┐
│        campaign-network (bridge)          │
│                                          │
│  ┌──────────────────┐  ┌─────────────────┐ │
│  │ campaign-backend │  │ campaign-python │ │
│  │ :3001            │  │ :8000           │ │
│  └────────┬─────────┘  └─────────────────┘ │
│           │                                │
│  ┌────────▼──────────┐                     │
│  │ campaign-frontend │                     │
│  │ (Nginx) :80       │                     │
│  └───────────────────┘                            │
└──────────────────┬───────────────────────┘
                   │
            Host Machine
          (localhost:5173)
                   │
         ┌─────────▼──────────┐
         │ Harici PostgreSQL   │
         │ (Docker DISINDA)   │
         │ sunucu:5432        │
         └────────────────────┘
```

### DNS Resolution

Network icinde container isimleri DNS olarak calisir:

```
campaign-frontend (Nginx) → http://campaign-backend:3001/api  (proxy_pass)
campaign-python           → http://campaign-backend:3001       (API calls)
campaign-backend          → Harici PostgreSQL                  (DATABASE_URL)
```

### Port Mapping

| Servis | Container Port | Host Port | Erisim |
|--------|---------------|-----------|--------|
| Frontend (Nginx) | 80 | 5173 | http://localhost:5173 |
| Backend (NestJS) | 3001 | 3001 | http://localhost:3001/api |
| Python (FastAPI) | 8000 | 8000 | http://localhost:8000 |

---

## Health Checks

Her servis health endpoint'i expose eder:

### Backend Health

```bash
curl http://localhost:3001/api/health
```

Health check yapilandirmasi:
```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "http://localhost:3001/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Python Service Health

```bash
curl http://localhost:8000/health

# Swagger UI
open http://localhost:8000/docs
```

### Frontend Health

```bash
curl http://localhost:5173
```

### Status Kontrol

```bash
docker-compose ps

# Beklenen cikti:
# NAME                STATUS              PORTS
# campaign-backend    Up 2 minutes (healthy)   3001/tcp
# campaign-python     Up 2 minutes (healthy)   8000/tcp
# campaign-frontend   Up 1 minute (healthy)    5173/tcp
```

---

## Performans Optimizasyonu

### Backend Node.js Tuning

```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=2048"
```

### Python Service Tuning

```dockerfile
ENV PYTHONOPTIMIZE=2
ENV PYTHONUNBUFFERED=1
```

### Nginx Caching

```nginx
# Static files icin 1 yil cache
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

---

## Security

### Best Practices

1. **Environment Variables:**
   ```bash
   # Production: Strong, unique values kullan
   JWT_SECRET=<generate-random-32-char>
   ENCRYPTION_KEY=<generate-random-32-char>
   ```

2. **Sifreleme:**
   - Hassas degerler `ENC:` prefix ile sifrelenmeli
   - Detaylar: [DOCKER_ENCRYPTION.md](./DOCKER_ENCRYPTION.md)

3. **Network Isolation:**
   - Container'lar internal network'te iletisim kurar
   - Frontend sadece Backend API'ye erisir (Nginx proxy)

4. **Image Scanning:**
   ```bash
   docker scan campaign-backend:latest
   trivy image campaign-backend:latest
   ```

---

## Production Checklist

- [ ] `backend/.env` dosyasinda harici PostgreSQL adresi dogru mu?
- [ ] `DATABASE_URL` ve `JWT_SECRET` sifrelenmis mi? (ENC: prefix)
- [ ] `ENCRYPTION_KEY` en az 32 karakter mi?
- [ ] Docker images'lar guncel mi?
- [ ] Health checks calisiyor mu? (`docker-compose ps`)
- [ ] Harici PostgreSQL erisebilir mi? (firewall, network)
- [ ] Logging yapilandirilmis mi?

---

## PostgreSQL'i Docker'a Geri Alma

Ileride PostgreSQL'i tekrar Docker icinde calistirmak isterseniz, su adimlar yeterlidir:

### 1. docker-compose.yml'de Uncomment Yap

```yaml
# Su bloklari uncomment yap:

# A) postgres servisi
postgres:
  image: postgres:15-alpine
  # ... (tum blok)

# B) backend depends_on
depends_on:
  postgres:
    condition: service_healthy

# C) backend DATABASE_URL override
environment:
  DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?schema=public

# D) volumes
volumes:
  postgres_data:
    driver: local
```

### 2. Root .env'de Database Bilgilerini Ekle

```env
DB_USER=campaign_user
DB_PASSWORD=campaign_pass
DB_NAME=campaign_optimization
DB_PORT=5432
```

### 3. Baslat

```bash
docker-compose up -d --build
docker-compose exec backend npx prisma db seed
```

---

## Kaynaklar

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Sifreleme Sureci](./DOCKER_ENCRYPTION.md)
- [Sistem Mimarisi](./ARCHITECTURE.md)
- [API Endpoints](./API_ENDPOINTS.md)
