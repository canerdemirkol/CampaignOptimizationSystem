#!/bin/sh
# Docker Entrypoint Script - Backend Service
# Bu script container başlarken DATABASE_URL şifreli ise çözer
# ve Prisma migrate deploy komutunu çalıştırır.

set -e

echo "🔧 Backend container starting..."

# DATABASE_URL şifreli mi kontrol et (ENC: prefix)
if echo "$DATABASE_URL" | grep -q "^ENC:"; then
  echo "🔐 Encrypted DATABASE_URL detected, decrypting for Prisma CLI..."

  # Node.js ile CryptoService kullanarak decrypt et
  DECRYPTED_URL=$(node -e "
    const { CryptoService } = require('./dist/infrastructure/crypto/crypto.service');
    const decrypted = CryptoService.decryptEnvValue(process.env.DATABASE_URL, process.env.ENCRYPTION_KEY);
    process.stdout.write(decrypted);
  ")

  if [ -z "$DECRYPTED_URL" ]; then
    echo "❌ DATABASE_URL decryption failed!"
    exit 1
  fi

  # Prisma CLI için decrypted URL'i set et
  export DATABASE_URL="$DECRYPTED_URL"
  echo "✅ DATABASE_URL decrypted successfully for Prisma CLI"
else
  echo "ℹ️  DATABASE_URL is plaintext, no decryption needed"
fi

# Prisma ile veritabanı şemasını senkronize et
# Not: migrate deploy yerine db push kullanılır çünkü migration dosyaları repoda tutulmamaktadır.
echo "📦 Syncing database schema with Prisma db push..."
npx prisma db push --skip-generate

# Seed database (upsert kullanır, tekrar çalışsa da güvenli)
# Seed arka planda çalıştırılır ki NestJS hemen başlasın ve healthcheck geçsin.
# Frontend, backend'in healthy olmasını beklediği için bu kritiktir.
echo "🌱 Seeding database in background..."
node dist-seed/prisma/seed.js &
SEED_PID=$!

echo "🚀 Starting NestJS application..."
# NestJS uygulamasını başlat
# NOT: NestJS içinde PrismaService kendi CryptoService ile tekrar decrypt eder.
# Ama bu noktada DATABASE_URL zaten decrypted olduğu için sorun olmaz.
node dist/main.js &
APP_PID=$!

# Seed'in tamamlanmasını bekle (hata verse de uygulama devam eder)
wait $SEED_PID && echo "✅ Database seeded successfully" || echo "⚠️  Seed failed but app continues"

# Uygulama kapanırsa container da kapansın
wait $APP_PID
