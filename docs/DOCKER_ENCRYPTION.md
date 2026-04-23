# Docker'da Sifreleme (Encryption) Sureci

Bu belge, Docker ortaminda `DATABASE_URL` ve `JWT_SECRET` gibi hassas degerlerin nasil sifrelendigi, Docker image/container olusturma sirasinda ne oldugu ve uygulamanin calisma aninda (runtime) bu degerleri nasil cozdugunu anlatir.

---

## Icindekiler

1. [Genel Bakis](#genel-bakis)
2. [Sifreleme Mekanizmasi (AES-256-GCM)](#sifreleme-mekanizmasi-aes-256-gcm)
3. [Adim Adim Docker Akisi](#adim-adim-docker-akisi)
4. [Auto Migrate Nasil Calisiyor?](#auto-migrate-nasil-calisiyor)
5. [docker-entrypoint.sh Detayi](#docker-entrypointsh-detayi)
6. [Onemli Notlar ve Uyarilar](#onemli-notlar-ve-uyarilar)
7. [Sorun Giderme](#sorun-giderme)

---

## Genel Bakis

Sistemde hassas environment variable'lar (DATABASE_URL, JWT_SECRET) AES-256-GCM ile sifrelenir ve `ENC:` prefix'i ile saklanir. Bu sifreleme **Docker'dan ONCE** local'de yapilir. Docker sadece zaten sifreli `.env` dosyasini okur ve container icinde uygulama baslarken `CryptoService` ile cozer.

### Hangi Degerler Sifrelenir?

| Deger | Prefix | Aciklama |
|-------|--------|----------|
| `DATABASE_URL` | `ENC:` | PostgreSQL baglanti adresi |
| `JWT_SECRET` | `ENC:` | JWT token imzalama anahtari |
| `ENCRYPTION_KEY` | Plaintext | Master key, HIC sifrelenmez |

### Neden Sifreleme Kullaniyoruz?

- `.env` dosyalari Git'e yanlislikla push edilebilir
- Docker image'larda env degerleri gorunebilir (`docker inspect`)
- CI/CD pipeline'larda log'lara yansiyabilir
- Sifreleme ile hassas degerler korunur

---

## Sifreleme Mekanizmasi (AES-256-GCM)

### Teknik Detaylar

```
Algoritma:     AES-256-GCM (Authenticated Encryption)
IV Uzunlugu:   16 byte (her sifreleme icin rastgele)
Auth Tag:      16 byte (butunluk dogrulamasi)
Format:        IV (16 byte) + AuthTag (16 byte) + Ciphertext → Base64
Anahtar:       ENCRYPTION_KEY'in ilk 32 karakteri (UTF-8 Buffer)
```

### Ilgili Dosyalar

| Dosya | Gorev |
|-------|-------|
| `backend/scripts/encrypt-env.ts` | Sifreleme CLI scripti |
| `backend/src/infrastructure/crypto/crypto.service.ts` | AES-256-GCM sifreleme/cozme servisi |
| `backend/src/infrastructure/prisma/prisma.service.ts` | DATABASE_URL'i runtime'da cozer |
| `backend/src/modules/auth/auth.module.ts` | JWT_SECRET'i runtime'da cozer |
| `backend/docker-entrypoint.sh` | Container baslarken Prisma CLI icin cozer |

---

## Adim Adim Docker Akisi

### ADIM 1: Local'de Sifreleme (Docker'dan ONCE, sen yaparsin)

```bash
# 1. backend/.env dosyasina plaintext degerleri yaz
cd backend
nano .env   # veya herhangi bir editor

# .env icerigi (plaintext):
# DATABASE_URL="postgresql://postgres:sifre@sunucu:5432/veritabani?schema=public"
# JWT_SECRET="OBaseJWTAuthentication2026..."
# ENCRYPTION_KEY="b14ca5898a4e4142aace2ea2143a2410"

# 2. Sifreleme scriptini calistir
npx ts-node scripts/encrypt-env.ts

# Sonuc:
# DATABASE_URL="ENC:a8f3b2c1d4e5f6..."   ← SIFRELI
# JWT_SECRET="ENC:7g6h5j4k3l2m1n..."     ← SIFRELI
# ENCRYPTION_KEY="b14ca5898a4e41..."       ← PLAINTEXT KALIR

cd ..
```

**Onemli:** `ENCRYPTION_KEY` master key'dir ve HIC sifrelenmez. Bu anahtar olmadan sifrelenmis degerler cozulemez.

### ADIM 2: Docker Image Build (docker-compose build)

```bash
docker-compose build
```

Bu asamada neler olur:

```
backend/Dockerfile calisir:
  1. npm ci                → Bagimliliklar yuklenir
  2. prisma generate       → Prisma client olusur
  3. npm run build         → TypeScript → JavaScript derlenir
  4. docker-entrypoint.sh  → Image'a kopyalanir

  .env dosyasi image'a GIRMEZ (.dockerignore sayesinde)
  Sifreleme/cozme YAPILMAZ, sadece kod derlenir
```

### ADIM 3: Container Baslatma (docker-compose up)

```bash
docker-compose up -d
```

docker-compose.yml soyle calisir:

```yaml
backend:
  env_file:
    - backend/.env            # Sifreli .env dosyasindan degerleri okur
  environment:
    FASTAPI_URL: http://campaign-python:8000   # Docker container name
    FRONTEND_URL: http://localhost:5173        # Docker network override
```

Container'a su environment variable'lar gonderilir:

```
DATABASE_URL   = "ENC:a8f3b2c1..."    ← backend/.env'den (sifreli)
JWT_SECRET     = "ENC:7g6h5j4k..."    ← backend/.env'den (sifreli)
ENCRYPTION_KEY = "b14ca5898a4e41..."   ← backend/.env'den (plaintext)
FASTAPI_URL    = "http://campaign-python:8000"  ← docker-compose override
```

### ADIM 4: docker-entrypoint.sh Calisir (Container ici)

Container basladiginda entrypoint scripti soyle calisir:

```
1. DATABASE_URL "ENC:" ile basliyor mu? → EVET
       |
       v
2. Node.js ile CryptoService.decryptEnvValue() cagrilir
       |
       v
3. "ENC:a8f3b2c1..." + ENCRYPTION_KEY → decrypt
       |
       v
4. Sonuc: "postgresql://postgres:sifre@sunucu:5432/veritabani?schema=public"
       |
       v
5. export DATABASE_URL="postgresql://..." (cozulmus)
       |
       v
6. npx prisma migrate deploy  ← Cozulmus URL ile calisir (AUTO MIGRATE)
       |
       v
7. node dist/main.js          ← NestJS uygulamasi baslar
```

### ADIM 5: NestJS Uygulamasi Baslar (Runtime)

```
NestJS Bootstrap:
  1. ConfigService .env degerlerini yukler
     → DATABASE_URL artik cozulmus (entrypoint export etti)

  2. PrismaService constructor calisir:
     → configService.get('DATABASE_URL')  = cozulmus URL
     → CryptoService.decryptEnvValue()    = "ENC:" yok, oldugu gibi doner
     → Prisma client cozulmus URL ile baglanir

  3. AuthModule calisir:
     → configService.get('JWT_SECRET')    = "ENC:7g6h5j4k..."
     → CryptoService.decryptEnvValue()    = cozulmus JWT secret
     → JwtModule bu secret ile baslatilir

  4. PostgreSQL baglantisi basarili
  5. Uygulama hazir, istekleri kabul eder
```

---

## Auto Migrate Nasil Calisiyor?

**Evet, auto migrate otomatik calisir.** Container her basladiginda (yeniden baslatma dahil) `docker-entrypoint.sh` scripti calisir ve `prisma migrate deploy` komutu otomatik yurutulur.

### Akis

```
docker-compose up -d
       |
       v
Container baslar
       |
       v
docker-entrypoint.sh calisir
       |
       v
DATABASE_URL sifreli mi? → Evet ise cozer, degil ise oldugu gibi birakir
       |
       v
npx prisma migrate deploy    ← OTOMATIK MIGRATION
       |                         (yeni migration varsa uygular,
       |                          yoksa "already up to date" der)
       v
node dist/main.js            ← Uygulama baslar
```

### Onemli Detaylar

- `prisma migrate deploy` production-safe bir komuttur
- Sadece henuz uygulanmamis migration'lari uygular
- Zaten uygulanmis migration'lari tekrar uygulamaz
- Migration yoksa hicbir sey yapmaz ("Already in sync")
- Container her restart'inda calisir ama zararsizdir (idempotent)

### Ne Zaman Manuel Mudahale Gerekir?

| Durum | Otomatik mi? | Aciklama |
|-------|-------------|----------|
| Mevcut migration'lari uygulama | Otomatik | `prisma migrate deploy` yapar |
| Yeni migration olusturma | Manuel | `npx prisma migrate dev --name "isim"` (local'de) |
| Seed data yukleme | Manuel | `docker-compose exec backend npx prisma db seed` |
| Database sifirlamak | Manuel | `npx prisma migrate reset` (dikkat: veri kaybi!) |

---

## docker-entrypoint.sh Detayi

```bash
#!/bin/sh
set -e

# 1. DATABASE_URL sifreli mi kontrol et
if echo "$DATABASE_URL" | grep -q "^ENC:"; then
  # 2. Node.js ile CryptoService kullanarak decrypt et
  DECRYPTED_URL=$(node -e "
    const { CryptoService } = require('./dist/infrastructure/crypto/crypto.service');
    const decrypted = CryptoService.decryptEnvValue(
      process.env.DATABASE_URL,
      process.env.ENCRYPTION_KEY
    );
    process.stdout.write(decrypted);
  ")

  # 3. Prisma CLI icin decrypted URL'i set et
  export DATABASE_URL="$DECRYPTED_URL"
fi

# 4. Migration'lari calistir (auto migrate)
npx prisma migrate deploy

# 5. NestJS uygulamasini baslat
exec node dist/main.js
```

### Neden Bu Script Gerekli?

```
Prisma CLI (prisma migrate deploy):
  → process.env.DATABASE_URL'i DOGRUDAN okur
  → "ENC:a8f3b2c1..." stringini PostgreSQL adresi olarak cozmeye calisir
  → HATA VERIR: "Can't reach database server"

NestJS PrismaService:
  → CryptoService ile "ENC:" prefix'ini kontrol eder
  → Sifreli ise cozer, plaintext ise oldugu gibi kullanir
  → SORUN YOK

Entrypoint script bu farki kapatir:
  → Container baslamadan once DATABASE_URL'i cozer
  → export eder → Prisma CLI de cozulmus URL'i gorur
  → Herkes mutlu
```

---

## Tam Akis Diyagrami

```
 LOCAL MAKINE                        DOCKER
 ────────────                        ──────

 backend/.env (plaintext)
 ┌─────────────────────────┐
 │ DATABASE_URL="postgre.."│
 │ JWT_SECRET="OBase..."   │
 │ ENCRYPTION_KEY="b14c.." │
 └────────────┬────────────┘
              │
  encrypt-env.ts
              │
              ▼
 backend/.env (sifreli)
 ┌─────────────────────────┐
 │ DATABASE_URL="ENC:..."  │────────────┐
 │ JWT_SECRET="ENC:..."    │            │  env_file ile mount
 │ ENCRYPTION_KEY="b14c.." │            │
 └─────────────────────────┘            │
                                        ▼
                              ┌──────────────────────┐
                              │   Docker Container   │
                              │                      │
                              │  process.env:        │
                              │  DATABASE_URL=ENC:.. │
                              │  ENCRYPTION_KEY=b14c │
                              │                      │
                              │  entrypoint.sh:      │
                              │  ┌──────────────┐    │
                              │  │ ENC: var mi? │    │
                              │  │   ↓ EVET     │    │
                              │  │ decrypt()    │    │
                              │  │   ↓          │    │
                              │  │ export URL   │    │
                              │  └──────┬───────┘    │
                              │         ↓            │
                              │  prisma migrate      │
                              │  (cozulmus URL) ✓    │
                              │         ↓            │
                              │  node dist/main.js   │
                              │  (NestJS baslar) ✓   │
                              │         ↓            │
                              │  PrismaService:      │
                              │  URL zaten cozulmus  │
                              │  → DB baglantisi ✓   │
                              └──────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────────┐
                              │ Harici PostgreSQL     │
                              │ (192.168.89.24:5432) │
                              │ Docker DISINDA        │
                              └──────────────────────┘
```

---

## Onemli Notlar ve Uyarilar

### Sifreleme ile ilgili

1. **ENCRYPTION_KEY hic sifrelenmez** - Master key olarak plaintext kalir
2. **Ayni ENCRYPTION_KEY** backend ve python-service icin ayni olmali
3. **Her sifreleme farkli sonuc verir** - Rastgele IV kullanilir (bu normaldir)
4. **Sifreleme Docker'dan ONCE yapilir** - Image build veya container start sirasinda sifreleme YAPILMAZ

### Docker ile ilgili

5. **`.env` dosyasi image'a GIRMEZ** - `.dockerignore` bunu engeller
6. **`env_file` ile runtime'da yuklenip mount edilir** - Container'a environment variable olarak gider
7. **Auto migrate her container restart'inda calisir** - Ama idempotent oldugu icin zararsizdir
8. **Seed data otomatik yuklenmez** - Ilk kurulumda manuel calistirman gerekir

### Guvenlik ile ilgili

9. **`docker inspect` ile env vars gorulebilir** - Ama sifrelendikleri icin deger okunamaz
10. **ENCRYPTION_KEY `docker inspect` ile gorunur** - Production'da Docker secrets veya vault kullanmayi dusunun
11. **Loglar'da cozulmus deger gozukmez** - Entrypoint script decode edilen URL'i loglamaz

---

## Sorun Giderme

### "Can't reach database server" hatasi

```bash
# DATABASE_URL dogru cozuluyor mu kontrol et
docker-compose exec backend node -e "
  const { CryptoService } = require('./dist/infrastructure/crypto/crypto.service');
  const decrypted = CryptoService.decryptEnvValue(
    process.env.DATABASE_URL,
    process.env.ENCRYPTION_KEY
  );
  console.log('Decrypted URL:', decrypted.replace(/:[^@]*@/, ':***@'));
"
```

### "ENCRYPTION_KEY must be at least 32 characters" hatasi

```bash
# ENCRYPTION_KEY'in uzunlugunu kontrol et
docker-compose exec backend node -e "
  console.log('ENCRYPTION_KEY length:', (process.env.ENCRYPTION_KEY || '').length);
"
```

### Migration basarisiz

```bash
# Entrypoint loglarini kontrol et
docker-compose logs backend | head -20

# Manuel calistir
docker-compose exec backend sh -c '
  export DATABASE_URL=$(node -e "
    const { CryptoService } = require(\"./dist/infrastructure/crypto/crypto.service\");
    process.stdout.write(CryptoService.decryptEnvValue(process.env.DATABASE_URL, process.env.ENCRYPTION_KEY));
  ")
  npx prisma migrate deploy
'
```

### Sifreleme dogru mu test et

```bash
# Local'de test (Docker disinda)
cd backend
npx ts-node scripts/encrypt-env.ts --decrypt "ENC:sifreli-deger-buraya"
```

---

## Hizli Referans

```bash
# Sifreleme (local'de, Docker'dan ONCE)
cd backend
npx ts-node scripts/encrypt-env.ts
cd ..

# Docker baslat (build + auto migrate)
docker-compose up -d --build

# Seed data yukle (sadece ilk kurulumda)
docker-compose exec backend npx prisma db seed

# Loglari izle
docker-compose logs -f backend

# Container durumu
docker-compose ps
```
