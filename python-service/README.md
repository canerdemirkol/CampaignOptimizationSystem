# Campaign Optimization Service (Python FastAPI)

Enterprise-grade kampanya optimizasyon mikroservisi. PySCIPOpt (SCIP solver) kullanarak Mixed Integer Programming (MIP) ile optimal kampanya-müşteri eşleşmesi yapar.

## Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│  NestJS Backend                                                  │
│  POST /api/optimization/:campaignId/run                         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP POST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  FastAPI Service (Port 8000)                                     │
│                                                                  │
│  POST /optimize/campaign                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ CampaignOptimizer                                         │  │
│  │  ├─ _build_model()    → PySCIPOpt model oluştur           │  │
│  │  ├─ _solve_model()    → MIP solver çalıştır               │  │
│  │  └─ _extract_results() → JSON response oluştur            │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ JSON Response
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  NestJS Backend                                                  │
│  → OptimizationResultSummary & Details kaydet                   │
└─────────────────────────────────────────────────────────────────┘
```

## Önemli Kural

> **Bu servis STATELESS'tır ve DB'ye DOKUNMAZ!**
>
> Tüm veriler NestJS backend'den gelir, hesaplama yapılır ve sonuç JSON olarak döner.

## Proje Yapısı

```
python-service/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI uygulama & middleware
│   ├── api/
│   │   ├── __init__.py
│   │   └── endpoints/
│   │       ├── __init__.py
│   │       ├── health.py           # Health check endpoints
│   │       └── optimization.py     # Optimization endpoints
│   ├── models/
│   │   ├── __init__.py
│   │   └── optimization.py         # Pydantic request/response modelleri
│   ├── services/
│   │   ├── __init__.py
│   │   └── optimizer.py            # PySCIPOpt optimizer sınıfı
│   └── utils/
│       ├── __init__.py
│       └── logging_config.py       # JSON structured logging
├── requirements.txt
├── .env.example
└── README.md
```

## Teknoloji Stack

| Kategori | Paket | Versiyon |
|----------|-------|----------|
| **Framework** | FastAPI | 0.109.2 |
| | Uvicorn | 0.27.1 |
| **Optimizasyon** | PySCIPOpt | 4.4.0 |
| | NumPy | 1.26.4 |
| **Validation** | Pydantic | 2.6.1 |
| **Logging** | python-json-logger | 2.0.7 |
| **Testing** | pytest, pytest-asyncio | 8.0.0+ |

## API Endpoints

### Health Check

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/health` | Servis sağlık durumu |
| GET | `/ready` | Servis hazır mı? |

### Optimization

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/optimization/campaign` | Senkron optimizasyon |
| POST | `/optimization/campaign/async` | Asenkron optimizasyon (placeholder) |
| POST | `/optimization/scenario/{scenario_id}` | Senaryo bazlı optimizasyon |

## Optimizasyon Modeli

### pyscipopt_version.ipynb'den Dönüşüm

Bu servis, `pyscipopt_version.ipynb` Jupyter notebook'undaki prototip algoritmanın production versiyonudur.

| Notebook | FastAPI Service |
|----------|-----------------|
| `kampanya_optimizasyonu()` | `CampaignOptimizer.optimize()` |
| `x[k,m]` değişkeni | `_build_model()` içinde aynı |
| `y[k]` değişkeni | `_build_model()` içinde aynı |
| `quicksum()` objective | Aynı matematiksel model |
| `model.optimize()` | `_solve_model()` içinde |
| Print çıktıları | JSON response |

### Matematiksel Model

Detaylı açıklama için bkz: [OPTIMIZATION_MODEL_GUIDE.md](./OPTIMIZATION_MODEL_GUIDE.md)

#### Karar Değişkenleri

```
x[k,s] ∈ {0,1}  → CRM kampanya k, segment s'ye önerilsin mi?
y[k] ∈ {0,1}    → Mass kampanya k aktif mi? (tüm segmentlere gider)
```

#### Objective Function (Maksimize)

```
Maximize:
  Σ(customer_count[s] × p_ks[k,s] × z_k[k] × x[k,s])       # CRM kâr
  + Σ(y[k] × z_k[k] × Σ(customer_count[s] × p_ks[k,s]))   # MASS kâr
```

#### Constraints (Kısıtlar)

```
1. CRM Kampanya Kapasitesi:
   r_min[k] ≤ Σ(customer_count[s] × x[k,s]) ≤ r_max[k]  ∀k ∈ CRM

1.2 CRM Kampanya Seçim Bağlantısı (Linking):
   x[k,s] ≤ y[k]  ∀k ∈ CRM, ∀s ∈ S

1.5 CRM Kampanya Sayısı (MIN/MAX):
   c_min ≤ Σ y[k] ≤ c_max
            k∈K_crm

2. Mass Kampanya Sayısı:
   m_min ≤ Σ y[k] ≤ m_max

3. Segment Başına Kampanya Limiti:
   Σ x[k,s] + Σ y[k] ≤ n_max  ∀s

4. Global Bütçe (katılım bazlı: c_k = katılım başına maliyet):
   b_min ≤ Σ Σ(c_k × customer_count[s] × p_ks[k,s] × x[k,s]) + Σ(c_k × Σ(count[s]×p[k,s]) × y[k]) ≤ b_max
```

## Request/Response Format

### Request Body

```json
{
  "campaign_id": "uuid-string",
  "general_parameters": {
    "c_min": 1,
    "c_max": 10,
    "n_min": 1,
    "n_max": 5,
    "b_min": 0,
    "b_max": 10000,
    "m_min": 0,
    "m_max": 3
  },
  "campaign_parameters": [
    {
      "campaign_id": "campaign-uuid",
      "name": "Summer Sale",
      "type": "CRM",
      "r_min": 100,
      "r_max": 5000,
      "z_k": 150.0,
      "c_k": 25.0
    },
    {
      "campaign_id": "campaign-uuid-2",
      "name": "Newsletter",
      "type": "MASS",
      "r_min": 0,
      "r_max": 0,
      "z_k": 50.0,
      "c_k": 5.0
    }
  ],
  "customers": [
    {
      "id": "customer-uuid",
      "customer_no": "CUST001",
      "propensity_scores": {
        "campaign-uuid": 0.75,
        "campaign-uuid-2": 0.60
      },
      "churn_score": 0.15,
      "lifetime_value": 5000.0
    }
  ]
}
```

### Response Body

```json
{
  "status": "optimal",
  "summary": {
    "recommended_customer_count": 15000,
    "total_recommendations": 25000,
    "estimated_participation": 0.72,
    "estimated_contribution": 250000.0,
    "estimated_cost": 50000.0,
    "roi": 4.0
  },
  "details": [
    {
      "customer_id": "customer-uuid",
      "customer_no": "CUST001",
      "recommended_campaigns": [
        {
          "campaign_id": "campaign-uuid",
          "campaign_name": "Summer Sale",
          "score": 0.75,
          "expected_profit": 112.5
        }
      ],
      "total_expected_profit": 112.5
    }
  ],
  "execution_time": 120.5,
  "solver_status": "optimal"
}
```

### Response Status Değerleri

| Status | Açıklama |
|--------|----------|
| `optimal` | Optimal çözüm bulundu |
| `infeasible` | Kısıtlar sağlanamıyor |
| `unbounded` | Sınırsız çözüm |
| `timelimit` | Zaman limiti aşıldı |
| `error` | Hata oluştu |

## Kurulum

### Gereksinimler

- Python >= 3.10
- SCIP Solver (PySCIPOpt için)

### Manuel Kurulum

```bash
# Virtual environment oluştur
python -m venv venv

# Environment değişkenlerini ayarla
cp .env.example .env


# Hassas değerleri şifrele (SERVICE_USERNAME ve SERVICE_PASSWORD)
python scripts/encrypt_env.py

# Eğer "execution policy" hatası alırsan önce bunu çalıştır:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\venv\Scripts\Activate.ps1

source venv/bin/activate  # Linux/Mac
# veya
.\venv\Scripts\activate   # Windows

# Bağımlılıkları yükle
pip install -r requirements.txt

```

### Çalıştırma

```bash
# Stable run (no reload) - uzun süren optimizasyon jobs için önerilir
make run
# eşdeğeri:
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Development (hot reload) - aktif kod geliştirirken
make run-dev
# eşdeğeri:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production (multi-worker)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

> ⚠️ **Uzun süren optimizasyonlar (10K+ segment) için `make run` kullanın.**
> `--reload` modunda herhangi bir `.py` dosyası değişirse uvicorn process'i yeniden başlar ve çalışan SCIP solver iptal olur. `make run` reload'ı kapatır; Docker zaten reload'sız çalışır (`Dockerfile`'daki `CMD` etkilenmez).

### Docker

```bash
# Build (python-service dizininden)
cd python-service
docker build -t campaign-optimization-python .

# Run
docker run -p 8000:8000 campaign-optimization-python

# Veya docker-compose ile (diger servislerle network paylasimi icin)
docker network create campaign-network
docker-compose up -d --build
```

## Environment Variables

```env
# Server
HOST=0.0.0.0
PORT=8000

# Optimization
SOLVER_TIME_LIMIT=3600  # seconds (default: 1 hour)
SOLVER_GAP_LIMIT=0.01   # MIP gap tolerance (default: 1%)

# Logging
LOG_LEVEL=INFO
```

## Performans

### Benchmark (pyscipopt_version.ipynb)

| Metrik | Değer |
|--------|-------|
| Müşteri Sayısı | 25,000 |
| Kampanya Sayısı | 20 (10 CRM + 10 Mass) |
| Çalışma Süresi | ~46 dakika |
| Solver | SCIP (PySCIPOpt) |

### Optimizasyon İpuçları

1. **Time Limit**: Büyük veri setleri için time limit ayarlayın
2. **Gap Tolerance**: MIP gap'i artırarak daha hızlı (yaklaşık) çözüm alın
3. **Presolve**: SCIP'in presolve özelliği otomatik olarak model sadeleştirir
4. **Parallelization**: SCIP multi-thread destekler

## Middleware & Features

### CORS
Tüm origin'lere izin verilir (production'da kısıtlanmalı).

### Correlation ID
Her request'e `X-Correlation-ID` header'ı eklenir, loglarda takip için kullanılır.

### Process Time
Response header'ında `X-Process-Time` ile işlem süresi döner.

### JSON Logging
Structured logging ile ELK/Splunk entegrasyonuna hazır.


## Test

```bash
# Unit tests
pytest

# Coverage
pytest --cov=app --cov-report=html

# Specific test
pytest tests/test_optimizer.py -v

# Scenario optimization test
pytest tests/test_scenario_optimization.py -v
```

## API Dokümantasyonu

Servis çalışırken:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Hata Yönetimi

```json
{
  "detail": {
    "error": "OptimizationError",
    "message": "Model is infeasible - constraints cannot be satisfied",
    "correlation_id": "abc-123-def"
  }
}
```

| HTTP Status | Açıklama |
|-------------|----------|
| 200 | Başarılı |
| 400 | Geçersiz request |
| 422 | Validation hatası |
| 500 | Sunucu hatası |

## Lisans

MIT
