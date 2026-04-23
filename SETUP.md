# Kampanya Optimizasyon Sistemi - Kurulum Rehberi

Bu rehber, projeyi Docker ve manuel olarak kurmak için adım adım talimatlar içerir.

## 📋 İçindekiler

1. [Gereksinimler](#gereksinimler)
2. [Hızlı Başlangıç (Docker)](#hızlı-başlangıç-docker)
3. [Manuel Kurulum](#manuel-kurulum)
4. [Docker Komutları](#docker-komutları)
5. [Troubleshooting](#troubleshooting)
6. [Port ve Environment](#port-ve-environment)

---

## 🔧 Gereksinimler

### Minimum Gereksinimler

| Yazılım | Versiyon | Açıklama |
|---------|----------|----------|
| **Docker** | 20.10+ | Container runtime *(Docker ile kurulum için)* |
| **Docker Compose** | 2.0+ | Multi-container orchestration |
| **Node.js** | 20+ | Backend & Frontend *(Manuel kurulum için)* |
| **Python** | 3.10+ | Optimization service *(Manuel kurulum için)* |
| **PostgreSQL** | 15+ | Database *(Sistem kurulu ise)* |

> **Not:** Docker ile kurulumda PostgreSQL otomatik başlatılır.

---

## 🚀 Hızlı Başlangıç (Docker)

### Adım 1: Repository Klonla

```bash
git clone <repo-url>
cd CampaignOptimizationSystem
```

### Adım 2: Environment Dosyalarını Oluştur

```bash
# Root .env dosyası
cp .env.example .env

# Backend .env dosyası
cp backend/.env.example backend/.env

# Frontend .env dosyası
cp frontend/.env.example frontend/.env

# Python service .env dosyası
cp python-service/.env.example python-service/.env
```

### Adım 3: Environment Değerlerini Şifrele

> **Neden?** `.env` dosyalarındaki `JWT_SECRET`, `SERVICE_USERNAME`, `SERVICE_PASSWORD` gibi hassas değerler AES-256-GCM ile şifrelenir. Şifrelenen değerler `ENC:` prefix'i ile saklanır. Docker Compose `env_file` ile bu şifreli `.env` dosyalarını container'a gönderir ve uygulama başlatılınca **otomatik decrypt** edilir.

```bash
# Backend: JWT_SECRET ve DATABASE_URL şifrele
cd backend
npm install          # İlk defa ise bağımlılıkları yükle
npx ts-node scripts/encrypt-env.ts
# Sonuç: backend/.env → JWT_SECRET="ENC:..." ve DATABASE_URL="ENC:..."
cd ..

# Python Service: SERVICE_USERNAME ve SERVICE_PASSWORD şifrele
cd python-service
pip install cryptography   # İlk defa ise bağımlılığı yükle
python scripts/encrypt_env.py
# Sonuç: python-service/.env → SERVICE_USERNAME=ENC:... ve SERVICE_PASSWORD=ENC:...
cd ..
```

> **Not:** Her iki serviste `ENCRYPTION_KEY` **aynı** olmalı (min 32 karakter). `ENCRYPTION_KEY` kendisi plaintext kalır, şifrelenmez.

**Docker'da nasıl çalışır?**
```yaml
# docker-compose.yml şu şekilde yapılandırılmıştır:
backend:
  env_file:
    - backend/.env        # ← Şifreli JWT_SECRET=ENC:... buradan gelir
  environment:
    DATABASE_URL: ...     # ← Docker network adresi override eder
    FASTAPI_URL: ...      # ← Docker network adresi override eder
```
- `env_file`: Şifreli `.env` dosyasını okur, container'a `JWT_SECRET=ENC:...` gönderir
- `environment`: Docker-specific değerleri override eder (postgres, python-service host isimleri)
- CryptoService: `ENC:` prefix'li değerleri runtime'da otomatik decrypt eder

### Adım 4: Docker ile Başlat

#### Production Mode (Tüm Servisler Docker'da)

```bash
# Build ve başlat
docker-compose up -d --build

# Servis durumunu kontrol et
docker-compose ps

# Logları izle
docker-compose logs -f
```

#### Development Mode (DB + Python, Backend/Frontend manuel)

```bash
# Sadece database ve python service başlat
docker-compose -f docker-compose.dev.yml up -d

# pgAdmin'i de başlat (database GUI - opsiyonel)
docker-compose -f docker-compose.dev.yml --profile tools up -d

# Backend ve Frontend'i manual başlat (yeni terminal'lerde):
# Terminal 1: cd backend; npm install; npm run start:dev
# Terminal 2: cd frontend; npm install; npm run dev
```

### Adım 5: Veritabanı Kurulumu

```bash
# Migration'ları çalıştır
docker-compose exec backend npx prisma migrate deploy

# Seed data yükle (test kullanıcıları ve segmentleri)
docker-compose exec backend npx prisma db seed
```

### Adım 6: Uygulamaya Erişim

| Servis | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Python Service | http://localhost:8000 |
| Python API Docs | http://localhost:8000/docs |
| pgAdmin *(dev mode)* | http://localhost:5050 |

### Adım 7: Giriş Yap

**Test Kullanıcıları:**
```
Username: admin      Password: admin123
Username: user       Password: user123
Username: viewer     Password: viewer123
```

---

## 🔧 Manuel Kurulum

### 1. PostgreSQL Kurulumu

#### Option A: Docker ile PostgreSQL

```bash
docker run -d \
  --name campaign-postgres \
  -e POSTGRES_USER=campaign_user \
  -e POSTGRES_PASSWORD=campaign_pass \
  -e POSTGRES_DB=campaign_optimization \
  -p 5432:5432 \
  -v campaign_data:/var/lib/postgresql/data \
  postgres:15-alpine
```

#### Option B: Sistem PostgreSQL (Linux/Ubuntu)

```bash
# PostgreSQL yükle
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Veritabanı oluştur
sudo -u postgres psql << EOF
CREATE USER campaign_user WITH PASSWORD 'campaign_pass';
CREATE DATABASE campaign_optimization OWNER campaign_user;
GRANT ALL PRIVILEGES ON DATABASE campaign_optimization TO campaign_user;
\q
EOF
```

#### Option C: macOS (Homebrew)

```bash
# PostgreSQL yükle
brew install postgresql@15
brew services start postgresql@15

# Veritabanı oluştur
createuser campaign_user
psql -U campaign_user -c "CREATE DATABASE campaign_optimization;"
psql -U campaign_user -c "ALTER USER campaign_user WITH PASSWORD 'campaign_pass';"
```

### 2. Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükle
npm install

# Environment dosyasını oluştur
cp .env.example .env

# .env dosyasını düzenle (aşağıya bakın)
# Önemli: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY

# Prisma client oluştur
npx prisma generate

# Migration'ları çalıştır
npx prisma migrate deploy

# Seed data yükle
npx prisma db seed

# Development server başlat
npm run start:dev
```

**Backend .env Dosyası:**
```env
# Database
DATABASE_URL="postgresql://campaign_user:campaign_pass@localhost:5432/campaign_optimization?schema=public"

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Encryption Key (minimum 32 karakter, PLAINTEXT KALIR)
ENCRYPTION_KEY=your-32-character-encryption-key!

# Services
FASTAPI_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

**🔐 Opsiyonel: Environment Variable Şifreleme (Production)**

Backend, `DATABASE_URL` ve `JWT_SECRET` değerlerini AES-256-GCM ile şifreler:

```bash
cd backend

# 1. .env dosyasına plaintext değerleri yaz
# DATABASE_URL="postgresql://..."
# JWT_SECRET="my-secret-key"

# 2. Şifrele (otomatik olarak ENC: prefix ekler)
npx ts-node scripts/encrypt-env.ts

# 3. Sonuç: .env dosyasında şifreli değerler
# DATABASE_URL="ENC:base64_encrypted_string..."
# JWT_SECRET="ENC:base64_encrypted_string..."

# Uygulama başlatılınca CryptoService otomatik decrypt eder
```

**Tek değeri şifrele:**
```bash
npx ts-node scripts/encrypt-env.ts --value "my-sensitive-value"
# Output: ENC:base64_encrypted_string...
```

**Decrypt et:**
```bash
npx ts-node scripts/encrypt-env.ts --decrypt "ENC:base64_encrypted_string..."
# Output: my-sensitive-value
```

**Custom encryption key kullan:**
```bash
npx ts-node scripts/encrypt-env.ts --key "your-custom-32-char-key"
```

### 3. Frontend Kurulumu

```bash
cd frontend

# Bağımlılıkları yükle
npm install

# Environment dosyasını oluştur
cp .env.example .env

# Development server başlat
npm run dev
```

**Frontend .env Dosyası:**
```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Python Service Kurulumu

```bash
cd python-service

# Virtual environment oluştur
python -m venv venv

# Virtual environment aktive et
# Linux/macOS:
source venv/bin/activate

# Windows:
# .\venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# Development server başlat
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**🔐 Python Service Credentials Şifreleme (Opsiyonel)**

Python service, service-to-service authentication için `SERVICE_USERNAME` ve `SERVICE_PASSWORD` kullanır. Production'da şifrele:

```bash
cd python-service

# 1. Credentials'ı şifrele
python encrypt_credentials.py "service_username" "service_password"

# Output:
# ✅ Encrypted credentials (copy to .env):
#
# SERVICE_USERNAME=ENC:base64_encrypted_string...
# SERVICE_PASSWORD=ENC:base64_encrypted_string...
# ENCRYPTION_KEY="your-32-character-encryption-key!"

# 2. .env dosyasına yapıştır
# SERVICE_USERNAME=ENC:...
# SERVICE_PASSWORD=ENC:...
```

**Not:** `ENCRYPTION_KEY` backend'deki `ENCRYPTION_KEY` ile **aynı olmalı**!

---

## 🐳 Docker Komutları

### Temel Komutlar

```bash
# Tüm servisleri başlat
docker-compose up -d

# Tüm servisleri durdur
docker-compose down

# Tüm servisleri durdur ve volume'ları sil (⚠️ VERİ KAYBI)
docker-compose down -v

# Servisleri yeniden build et
docker-compose build --no-cache

# Servisleri yeniden başlat
docker-compose restart
```

### Belirli Servis İşlemleri

```bash
# Backend loglarını izle
docker-compose logs -f backend

# Python service loglarını izle
docker-compose logs -f python-service

# Database loglarını izle
docker-compose logs -f postgres

# Backend container'ına shell ile bağlan
docker-compose exec backend sh

# PostgreSQL veritabanında psql çalıştır
docker-compose exec postgres psql -U campaign_user -d campaign_optimization
```

### Database İşlemleri

```bash
# Migration'ları çalıştır
docker-compose exec backend npx prisma migrate deploy

# Seed data yükle
docker-compose exec backend npx prisma db seed

# Migration durumunu kontrol et
docker-compose exec backend npx prisma migrate status

# Yedek al
docker-compose exec postgres pg_dump -U campaign_user campaign_optimization > backup.sql

# Yedekten geri yükle
docker-compose exec -T postgres psql -U campaign_user campaign_optimization < backup.sql
```

---

## 🌍 Port ve Environment

### Port Yapılandırması

| Servis | Port | Environment Var | Docker Compose |
|--------|------|-----------------|-----------------|
| Frontend | 5173 | `FRONTEND_PORT` | `5173:80` |
| Backend | 3001 | `BACKEND_PORT` | `3001:3001` |
| Python | 8000 | `PYTHON_PORT` | `8000:8000` |
| Database | 5432 | `DB_PORT` | `5432:5432` |
| pgAdmin | 5050 | - | `5050:80` |

### Environment Değişkenleri

**Root .env** (docker-compose için):
```env
# Database
DB_USER=campaign_user
DB_PASSWORD=campaign_pass
DB_NAME=campaign_optimization
DB_PORT=5432

# Backend
BACKEND_PORT=3001
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key!

# Python
PYTHON_PORT=8000

# Frontend
FRONTEND_PORT=5173
```

---

## 🐛 Troubleshooting

### 1. Docker: "Connection refused"

```bash
# Problem: Container başlamıyor

# Çözüm 1: Logları kontrol et
docker-compose logs backend

# Çözüm 2: Container'ı temizle ve yeniden başlat
docker-compose down -v
docker-compose up -d --build

# Çözüm 3: Docker daemon'u kontrol et
docker ps
```

### 2. Database: "Can't reach database server"

```bash
# Problem: Backend PostgreSQL'e bağlanamıyor

# Çözüm 1: PostgreSQL çalışıyor mu kontrol et
docker-compose ps postgres

# Çözüm 2: Database hazır mı bekle
sleep 15

# Çözüm 3: PostgreSQL yeniden başlat
docker-compose restart postgres
```

### 3. Backend: "P1001: Can't reach database"

```bash
# Problem: Migration başarısız

# Çözüm: Container hazır olana kadar bekle
docker-compose down -v
docker-compose up -d --build

# Migration'ları manual çalıştır
sleep 20  # PostgreSQL'in başlamasını bekle
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed
```

### 4. Port Çakışması

```bash
# Problem: "Address already in use"

# Çözüm 1: Portu kullanan process'i bul ve durdur
lsof -i :3001
kill -9 <PID>

# Çözüm 2: Farklı port kullan
docker-compose down
BACKEND_PORT=3002 docker-compose up -d
```

### 5. Python Service: "ModuleNotFoundError"

```bash
# Problem: pyscipopt yüklü değil

# Çözüm: Python container'ı rebuild et
docker-compose down
docker-compose build --no-cache python-service
docker-compose up -d
```

### 6. Frontend Boş Sayfası

```bash
# Problem: Frontend başlamıyor

# Çözüm 1: Backend API'ye bağlanıp bağlanmadığını kontrol et
curl http://localhost:3001/api/health

# Çözüm 2: Browser cache'i temizle
# DevTools > Application > Clear Storage

# Çözüm 3: Frontend yeniden build et
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### 7. Node.js: "npm: not found"

```bash
# Problem: Node.js yüklü değil

# Çözüm: Node.js yükle
# macOS:
brew install node@20

# Linux/Ubuntu:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows: https://nodejs.org/ indir
```

### 8. Python: "ModuleNotFoundError"

```bash
# Problem: Python package'leri yüklü değil

# Çözüm: Virtual environment'ı yeniden oluştur
rm -rf python-service/venv
cd python-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 📊 Health Checks

Her servis health endpoint'i expose eder:

```bash
# Backend health
curl http://localhost:3001/api/health

# Python service health
curl http://localhost:8000/health

# Frontend (nginx)
curl http://localhost:5173
```

---

## 🔐 Güvenlik Notları

### Production Dağıtımında

1. **Environment Variables:**
   - `JWT_SECRET` ve `ENCRYPTION_KEY`'i güvenli değerlerle değiştir
   - Hiçbir yerde default değerler kullanma

2. **Docker Images:**
   - Base images'ı güncel tut
   - Vulnerability scanning yap

3. **Database:**
   - Strong password kullan
   - Network erişimini sınırla

4. **Backup:**
   - Regular backup al
   - Backup'ı güvenli yerde sakla

```bash
# Günlük backup script
docker-compose exec postgres pg_dump -U campaign_user campaign_optimization | gzip > backup_$(date +%Y-%m-%d).sql.gz
```

---

## 📈 Performance Tuning

### PostgreSQL (docker-compose.yml)

```yaml
postgres:
  environment:
    POSTGRES_INITDB_ARGS: "-c shared_buffers=256MB -c max_connections=200"
```

### Backend (backend/Dockerfile)

```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=2048"
```

### Python Service (python-service/Dockerfile)

```dockerfile
ENV PYTHONUNBUFFERED=1
ENV PYTHONOPTIMIZE=2
```

---

## 🎯 Development vs Production

### Development (docker-compose.dev.yml)

```bash
# Sadece DB + Python
docker-compose -f docker-compose.dev.yml up -d

# Backend/Frontend manual (hot-reload ile)
# Terminal 1: cd backend; npm run start:dev
# Terminal 2: cd frontend; npm run dev
```

**Avantajları:**
- ✅ Backend/Frontend hot-reload
- ✅ Log output'lar görünür
- ✅ Debugging kolay
- ✅ Daha hızlı geliştirme

### Production (docker-compose.yml)

```bash
# Tüm servisler Docker'da
docker-compose up -d --build
```

**Avantajları:**
- ✅ Tüm servisleri izole ortamda çalıştır
- ✅ Bir komutla dağıt
- ✅ Consistent environment

---

## ✅ Kontrol Listesi

Kurulum tamamlandıktan sonra:

- [ ] Frontend'e giriş yap (http://localhost:5173)
- [ ] Test kullanıcısıyla login et
- [ ] Kampanya oluştur
- [ ] Müşteri segmentleri görünüyor mu?
- [ ] Python service health check: `curl http://localhost:8000/health`
- [ ] Backend health check: `curl http://localhost:3001/api/health`
- [ ] Database backup test et
- [ ] Docker loglarında hata yok mu kontrol et

---

## 📞 Destek

Sorun yaşarsanız:

1. **Logları Kontrol Et:**
   ```bash
   docker-compose logs -f [service-name]
   ```

2. **GitHub Issues** açın
3. Bu dokümantasyondaki troubleshooting bölümünü kontrol edin
