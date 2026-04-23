# Campaign Optimization Frontend (React)

Kampanya optimizasyon sistemi frontend uygulaması. **React 18 + TypeScript + Redux Toolkit + Material UI** ile inşa edilmiştir.

## Mimari

```
frontend/
├── src/
│   ├── main.tsx               # Application entry point
│   ├── App.tsx                # Root component & routing
│   ├── theme.ts               # Material UI theme
│   ├── components/            # Reusable React components
│   ├── pages/                 # Page components (route-based)
│   ├── services/              # API service layer
│   ├── store/                 # Redux Toolkit slices
│   └── types/                 # TypeScript type definitions
├── Dockerfile                 # Docker image (Nginx)
├── docker-compose.yml         # Standalone docker-compose
├── nginx.conf                 # Nginx reverse proxy config
├── vite.config.ts             # Vite build config
└── tsconfig.json              # TypeScript config
```

## Teknoloji Stack

| Kategori | Teknoloji |
|----------|-----------|
| **Framework** | React 18 |
| **Dil** | TypeScript |
| **State Management** | Redux Toolkit |
| **UI Library** | Material UI (MUI) 5 |
| **Table** | TanStack Table |
| **Form** | React Hook Form + Zod |
| **HTTP Client** | Axios |
| **Build Tool** | Vite |
| **Test** | Vitest |

## Kurulum

### Gereksinimler

- Node.js 20+

### Manuel Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Environment dosyasını oluştur
cp .env.example .env

# Development server başlat
npm run dev
```

Uygulama http://localhost:5173 adresinde çalışır.

### Docker ile Çalıştırma

```bash
# Standalone (önce shared network ve backend gerekli)
docker network create campaign-network
docker-compose up -d --build

# Veya root dizinden tüm servislerle birlikte
cd .. && docker-compose up -d --build
```

> Docker'da Nginx reverse proxy kullanılır. `/api` istekleri otomatik olarak backend'e yönlendirilir (`nginx.conf`).

## Environment Variables

```env
# Backend API URL
# Development: http://localhost:3001/api
# Docker: /api (Nginx proxy üzerinden)
VITE_API_URL=http://localhost:3001/api
```

## Nginx Proxy (Docker)

Docker'da frontend Nginx üzerinden çalışır. `nginx.conf` şu şekilde yapılandırılmıştır:

- `/` - SPA routing (React Router)
- `/api` - Backend API proxy (`http://campaign-backend:3001/api`)
- Static file caching (js, css, images - 1 yıl cache)
- Gzip compression

## Npm Scripts

```bash
npm run dev            # Development server (Vite, hot-reload)
npm run build          # Production build
npm run preview        # Production build preview
npm run test           # Unit tests (Vitest)
npm run test:coverage  # Test coverage
npm run lint           # ESLint
npm run lint:fix       # ESLint auto-fix
```

## Giriş Bilgileri

| Kullanıcı | Şifre | Rol |
|-----------|-------|-----|
| **admin** | admin123 | ADMIN |
| **user** | user123 | USER |
| **viewer** | viewer123 | VIEWER |

## Troubleshooting

**Boş sayfa:**
```bash
# Backend API çalışıyor mu kontrol et
curl http://localhost:3001/api/health

# Browser cache temizle
# DevTools > Application > Clear Storage
```

**Docker'da hata:**
```bash
# Logları kontrol et
docker-compose logs -f

# Yeniden build et
docker-compose build --no-cache
docker-compose up -d
```
