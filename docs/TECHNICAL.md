# Teknik Dokümantasyon

## Mimari Yaklaşım

Sistem, üç bağımsız mikroservisten oluşan **loosely coupled** bir mimariye sahiptir. Her servis kendi sorumluluk alanında bağımsız çalışır ve HTTP üzerinden iletişim kurar.


## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Redux Toolkit, Material UI, React Query, Zod |
| **Backend** | NestJS 10, TypeScript, Prisma ORM, Swagger |
| **Optimizasyon** | Python FastAPI, PySCIPOpt (SCIP Solver), Pydantic |
| **Veritabanı** | PostgreSQL 15+ |
| **Altyapı** | Docker, Nginx, AES-256-GCM şifreleme |

```
React (SPA) ──REST──▶ NestJS (API + İş Mantığı) ──HTTP──▶ FastAPI (MIP Solver)
                              │
                         PostgreSQL
```

Python optimizasyon servisi **stateless** bir hesaplama nodu olarak tasarlanmıştır — veritabanına erişmez, sadece aldığı veriyi işleyip sonuç döner. Bu sayede yatay ölçekleme ve bağımsız deployment mümkündür.



## Uygulanan Tasarım Desenleri

- **Domain-Driven Design (DDD):** Immutable entity sınıfları, value object'ler ve aggregate root'lar ile zengin domain modeli. İş kuralları domain katmanında yaşar.
- **Generic Repository Pattern:** `BaseRepository<T>` soyutlaması üzerinden tüm CRUD operasyonları standartlaştırılmış; yeni entity eklemek için extend etmek yeterli.
- **Strategy Pattern:** Passport.js stratejileri ile kimlik doğrulama genişletilebilir yapıda (JWT, Local ve gelecekte OAuth2, LDAP vb.).
- **Decorator-Based RBAC:** `@Roles('ADMIN', 'USER', 'VIEWER')` decorator'ları ile route seviyesinde yetkilendirme.
- **Dependency Injection:** NestJS'in IoC container'ı ile servisler arası gevşek bağlılık ve test edilebilirlik.

## Segment Tabanlı Optimizasyon Modeli

Bireysel müşteri yerine **segment bazlı agregasyon** kullanılır. Bu yaklaşım 25.000 müşteri × 20 kampanya = 500K değişken yerine, 5 segment × 20 kampanya = 100 değişken ile **~500x performans kazanımı** sağlar.

| Kampanya Tipi | Karar Değişkeni | Açıklama |
|---------------|-----------------|----------|
| **CRM** | `x[k,s] ∈ {0,1}` | Kampanya k, segment s'ye önerilsin mi? |
| **MASS** | `y[k] ∈ {0,1}` | Kampanya k tüm segmentlere aktif edilsin mi? |

**Kısıtlar:** Öneri limitleri (rMin/rMax), kampanya sayı sınırları (cMin/cMax, mMin/mMax), bütçe aralıkları (bMin/bMax) ve segment bazlı katılım kuralları.

## Entegrasyon Esnekliği

Gevşek bağlı mimari sayesinde sistem farklı bileşenlerle kolayca entegre edilebilir:

| Senaryo | Yaklaşım |
|---------|----------|
| **Yeni optimizasyon algoritması** | Python servisine endpoint ekle, backend'de HTTP çağrısını güncelle |
| **Farklı veritabanı** | Prisma ORM provider değiştir — domain katmanı etkilenmez |
| **CRM/ERP entegrasyonu** | NestJS'e yeni modül ekle, mevcut servisleri inject et |
| **Yeni auth yöntemi** | Passport strategy ekle (OAuth2, LDAP, SAML) — guard yapısı aynı kalır |
| **Frontend genişletme** | Redux slice + service katmanı ile bağımsız feature geliştir |

Backend'in modüler NestJS yapısı, her yeni özelliğin kendi modülü içinde izole edilmesini sağlar. Python servisinin stateless doğası ise optimizasyon katmanının bağımsız olarak değiştirilmesine, ölçeklenmesine veya tamamen farklı bir solver ile değiştirilmesine olanak tanır.
