# 📊 Campaign Optimization Model - Detaylı Rehber

Bu dokümanda, Campaign Optimization Service'nin matematiksel modeli, karar değişkenleri ve kısıtları detaylı olarak açıklanmıştır.

---

## 📋 İçindekiler

1. [Karar Değişkenleri (Decision Variables)](#karar-değişkenleri)
2. [Objective Function](#objective-function)
3. [Kısıtlar (Constraints)](#kısıtlar)
4. [CRM vs MASS Kampanyaları](#crm-vs-mass-kampanyaları)
5. [Önemli Notlar](#önemli-notlar)
6. [Gerçek Senaryo Örneği](#gerçek-senaryo-örneği)

---

## 📊 Karar Değişkenleri

### x[k, s] - CRM Kampanyaları

**Python Kodu (optimizer.py:233-238):**
```python
# x[k, s] = 1 means CRM campaign k is recommended to segment s
x: Dict[Tuple[str, str], object] = {}
for k in K_crm:
    for s in S:
        x[k, s] = model.addVar(vtype="BINARY", name=f"x_{k}_{s}")
```

**Açıklama:**
| Özellik | Değer |
|---------|-------|
| **Tanım** | Kampanya k, Segment s'ye önerilsin mi? |
| **Tür** | BINARY (0 veya 1) |
| **Değer = 1** | ✅ Kampanya k → Segment s'ye gider |
| **Değer = 0** | ❌ Kampanya k → Segment s'ye GITMEZ |

**Pratik Örnek:**
```
x["campaign-8", "Premium"]   = 1   ✅ campaign-8 → Premium'a gider
x["campaign-8", "Gold"]      = 1   ✅ campaign-8 → Gold'a gider
x["campaign-20", "Premium"]  = 0   ❌ campaign-20 → Premium'a GITMEZ
```

---

### y[k] - MASS Kampanyaları

**Python Kodu (optimizer.py:240-243):**
```python
# y[k] = 1 means campaign k is selected (CRM or Mass)
y: Dict[str, object] = {}
for k in K_crm + K_mass:
    y[k] = model.addVar(vtype="BINARY", name=f"y_{k}")
```

**Açıklama:**
| Özellik | Değer |
|---------|-------|
| **Tanım** | Kampanya k seçilsin mi? (CRM ve MASS kampanyalar için) |
| **Tür** | BINARY (0 veya 1) |
| **Değer = 1** | ✅ Kampanya k seçildi (CRM ise segment bazlı, MASS ise tüm segmentlere) |
| **Değer = 0** | ❌ Kampanya k → Seçilmedi |

**Pratik Örnek:**
```
y["campaign-17"] = 1  ✅ campaign-17 MASS → TÜM 5 segment'e gider
```

---

### Değişken Sayısı Hesabı

**Senaryo: 3 CRM + 5 Segment + 1 MASS**

```
CRM Değişkenleri (x):
  3 kampanya × 5 segment = 15 değişken

MASS Değişkenleri (y):
  1 kampanya = 1 değişken

TOPLAM: 16 karar değişkeni
```

---

## ⚙️ Objective Function

**Matematiksel Form:**
```
Maximize:
  Σ Σ (customer_count[s] × p_ks[k,s] × z_k[k] × x[k,s])    # CRM kâr
  k∈K_crm s∈S

  + Σ (y[k] × z_k[k] × Σ(customer_count[s] × p_ks[k,s]))  # MASS kâr
    k∈K_mass           s∈S
```

**Python Kodu (optimizer.py:249-262):**
```python
model.setObjective(
    quicksum(
        seg_data[s].customer_count * p_ks.get((k, s), 0) * campaign_params[k].z_k * x[k, s]
        for k in K_crm
        for s in S
    )
    + quicksum(
        y[k] * campaign_params[k].z_k * quicksum(
            seg_data[s].customer_count * p_ks.get((k, s), 0) for s in S
        )
        for k in K_mass
    ),
    "maximize",
)
```

### Parametreler

| Parameter | Tanım | Örnek |
|-----------|-------|--------|
| **customer_count[s]** | Segment'teki müşteri sayısı | 5,000 |
| **p_ks[k, s]** | Kampanya k'nın segment s'ye propensity score | 0.35 |
| **z_k[k]** | Kampanya k'nın birim kâr marjı | ₹150 |
| **x[k, s]** | Karar değişkeni (0 veya 1) | 1 |

### Hesaplama Örneği

**Campaign-8, Premium Segment için:**
```
customer_count     = 5,000 müşteri
propensity_score   = 0.08 (%8 katılım olasılığı)
z_k (profit_margin)= ₹150/müşteri
x[campaign-8, Premium] = 1 (SEÇİLDİ)

Contribution = 5,000 × 0.08 × 150 × 1 = ₹60,000
```

---

## 🔒 Kısıtlar (Constraints)

### 1. CRM Kampanya Kapasitesi Kısıtı

**Matematiksel Form:**
```
r_min[k] ≤ Σ (customer_count[s] × x[k,s]) ≤ r_max[k]  ∀k ∈ K_crm
           s∈S
```

**Anlamı:** Kampanya k'nın ulaştığı toplam müşteri sayısı (segment ağırlıklı) r_min ile r_max arasında olmalı

**Python Kodu (optimizer.py:271-281):**
```python
for k in K_crm:
    params = campaign_params[k]
    reach = quicksum(seg_data[s].customer_count * x[k, s] for s in S)
    model.addCons(
        reach >= params.r_min,
        name=f"crm_min_{k}",
    )
    model.addCons(
        reach <= params.r_max,
        name=f"crm_max_{k}",
    )
```

**Örnek:**
```
campaign-8 için r_min=1000, r_max=30000 ise:
  x[campaign-8, Premium]   = 1  → 5,000 müşteri
  x[campaign-8, Gold]      = 1  → 8,000 müşteri
  x[campaign-8, Silver]    = 1  → 12,000 müşteri
  x[campaign-8, Bronze]    = 0  → 0
  x[campaign-8, Standard]  = 0  → 0
  ──────────────────────────────────────
  TOPLAM REACH = 25,000 müşteri
  1,000 ≤ 25,000 ≤ 30,000 ✓ (sağlanıyor)
```

---

### 1.2 CRM Kampanya Seçim Bağlantısı (Linking Constraint)

**Matematiksel Form:**
```
x[k,s] ≤ y[k]  ∀k ∈ K_crm, ∀s ∈ S
```

**Anlamı:** Kampanya k seçilmediyse (y[k]=0), hiçbir segmente atanamaz

**Python Kodu (optimizer.py:285-290):**
```python
for k in K_crm:
    for s in S:
        model.addCons(
            x[k, s] <= y[k],
            name=f"crm_link_{k}_{s}",
        )
```

**Açıklama:**
- y[k] = 0 → x[k,s] ≤ 0 → tüm segmentlerde x[k,s] = 0 (kampanya hiçbir yere gidemez)
- y[k] = 1 → x[k,s] ≤ 1 → solver segment bazında karar verebilir (0 veya 1)

**Solver Perspektifi:**

Her kampanya-segment çifti için KURAL KOYAR:

```
Solver düşünüyor:
  "campaign-1'i Premium'a atayabilir miyim?"

  y[campaign-1] = 0 (seçilmedi):
    → x[campaign-1, Premium] ≤ 0 → ATANAMAZ ❌
    → x[campaign-1, Gold] ≤ 0    → ATANAMAZ ❌

  y[campaign-1] = 1 (seçildi):
    → x[campaign-1, Premium] ≤ 1 → ATANABİLİR (solver karar verir)
    → x[campaign-1, Gold] ≤ 1    → ATANABİLİR (solver karar verir)
```

**Örnek:**
```
y[campaign-1] = 1 (seçildi)
  x[campaign-1, Premium] = 1  ≤ 1 ✓ (atandı)
  x[campaign-1, Gold]    = 0  ≤ 1 ✓ (atanmadı ama olabilirdi)

y[campaign-2] = 0 (seçilmedi)
  x[campaign-2, Premium] = 0  ≤ 0 ✓ (atanamaz)
  x[campaign-2, Gold]    = 0  ≤ 0 ✓ (atanamaz)
```

---

### 1.5 CRM Kampanya Sayısı Kısıtı (MIN/MAX)

**Matematiksel Form:**
```
c_min ≤ Σ y_crm[k] ≤ c_max
        k∈K_crm
```

**Anlamı:** Seçilen CRM kampanyalarının sayısı, minimum c_min ile maksimum c_max arasında olmalı

**Python Kodu (optimizer.py:293-305):**
```python
# Minimum seçilen kampanya sayısı
model.addCons(
    quicksum(y_crm[k] for k in K_crm) >= campaign_params_with_general.c_min,
    name="crm_count_min",
)

# Maksimum seçilen kampanya sayısı
model.addCons(
    quicksum(y_crm[k] for k in K_crm) <= campaign_params_with_general.c_max,
    name="crm_count_max",
)
```

**Örnek: c_min=2, c_max=4**
```
Toplam 8 CRM kampanyası varsa:
  ✅ 2 kampanya seçildi (2 ≤ 2 ≤ 4) - VALID
  ✅ 3 kampanya seçildi (2 ≤ 3 ≤ 4) - VALID
  ✅ 4 kampanya seçildi (2 ≤ 4 ≤ 4) - VALID
  ❌ 1 kampanya seçildi (1 < 2) - VIOLATION
  ❌ 5 kampanya seçildi (5 > 4) - VIOLATION
```

**r_max ile Fark:**
- `r_max`: Her kampanya kaç segment'e gidebileceğinin maksimumu
- `c_min/c_max`: TOPLAM kaç kampanyanın seçilmesi gerektiği

**Nasıl Çalışır?**

Constraint 1.2 ile birlikte:
```
1. Linking (1.2): y_crm[k] = 1 ise Σ x[k,s] ≥ 1 (EN AZ 1 SEGMENT'E)
2. Count (1.5):   c_min ≤ Σ y_crm[k] ≤ c_max    (TOPLAM SAY KONTROLÜ)

Sonuç:
  ✓ Seçilen kampanya sayısı 2-4 arasında
  ✓ Seçilen her kampanya en az 1 segment'e gidiyor
  ✓ Hiç "boş" seçili kampanya yok
```

**Gerçek Senaryo:**
```
8 kampanya var, c_min=2, c_max=4

Solver çözüyor:
  y_crm[campaign-1] = 1 → Premium, Gold'a gidiyor ✓
  y_crm[campaign-2] = 1 → Silver'a gidiyor ✓
  y_crm[campaign-3] = 1 → Bronze'a gidiyor ✓
  y_crm[campaign-4 to 8] = 0 → Seçilmedi

Toplam: 3 kampanya (2 ≤ 3 ≤ 4) ✓ SAĞLANDI
```

---

### 2. Mass Kampanya Sayısı Kısıtı

**Matematiksel Form:**
```
m_min ≤ Σ y[k] ≤ m_max
        k∈K_mass
```

**Anlamı:** Toplam en az m_min, en fazla m_max mass kampanya seçilir

**Python Kodu (optimizer.py:280-288):**
```python
if K_mass:
    model.addCons(
        quicksum(y[k] for k in K_mass) >= campaign_params_with_general.m_min,
        name="mass_min",
    )
    model.addCons(
        quicksum(y[k] for k in K_mass) <= campaign_params_with_general.m_max,
        name="mass_max",
    )
```

**Örnek:**
```
m_min=0, m_max=2 ise:
  Minimum 0, maksimum 2 MASS kampanya seçilebilir

  Geçerli:
    y[campaign-17] = 1  (1 kampanya seçildi) ✓
    y[campaign-17] = 0  (0 kampanya seçildi) ✓

  Geçersiz:
    3 MASS kampanya seçilirse ✗ (m_max aşıldı)
```

---

### 3. Segment Başına Kampanya Limiti

**Matematiksel Form:**
```
Σ x[k,s] + Σ y[k] ≤ n_max  ∀s ∈ S
k∈K_crm   k∈K_mass
```

**Anlamı:** Her segment'e maximum n_max kampanya gider

**Python Kodu (optimizer.py:293-300):**
```python
for s in S:
    total_campaigns = quicksum(x[k, s] for k in K_crm)
    if K_mass:
        total_campaigns += quicksum(y[k] for k in K_mass)
    model.addCons(
        total_campaigns <= campaign_params_with_general.n_max,
        name=f"segment_campaign_limit_{s}"
    )
```

**Örnek: n_max=2**
```
Premium Segment'e:
  ✅ campaign-8 (x=1) + campaign-17 MASS (y=1) = 2 kampanya ✓
  ❌ campaign-8 (x=1) + campaign-18 (x=1) + campaign-17 (y=1) = 3 ✗ (VIOLATION)
```

---

### 4. Global Bütçe Kısıtı (Katılım Bazlı)

**Matematiksel Form:**
```
                   Σ   Σ  (c_k × customer_count[s] × p_ks[k,s] × x[k,s])
                 k∈K_crm s∈S
global_cost =
               + Σ  (c_k × Σ(customer_count[s] × p_ks[k,s]) × y[k])
                 k∈K_mass   s∈S

b_min ≤ global_cost ≤ b_max
```

**Anlamı:** Maliyet sadece **katılan** müşteriler için hesaplanır. c_k katılım başına birim maliyet (redemption cost per participant) olduğu için propensity score ile çarpılır. Böylece yüksek katılım olasılığı olan segmentler daha fazla maliyet üretir.

**Python Kodu (optimizer.py:328-352):**
```python
global_cost = quicksum(
    campaign_params[k].c_k * seg_data[s].customer_count * p_ks.get((k, s), 0) * x[k, s]
    for k in K_crm
    for s in S
)
if K_mass:
    global_cost += quicksum(
        campaign_params[k].c_k * quicksum(
            seg_data[s].customer_count * p_ks.get((k, s), 0) for s in S
        ) * y[k]
        for k in K_mass
    )

model.addCons(
    global_cost >= campaign_params_with_general.b_min,
    name="budget_min",
)
model.addCons(
    global_cost <= campaign_params_with_general.b_max,
    name="budget_max",
)
```

**Örnek: b_min=10,000, b_max=5,000,000**
```
CRM Maliyetleri (c_k × customer_count × propensity × x[k,s]):
  campaign-8 (c_k=150) → Premium (x=1, 5000 müşteri, p=0.08):
    150 × 5,000 × 0.08 = 60,000 ₹
  campaign-8 (c_k=150) → Gold (x=1, 8000 müşteri, p=0.15):
    150 × 8,000 × 0.15 = 180,000 ₹
  campaign-8 (c_k=150) → Silver (x=0):
    150 × 12,000 × 0.25 × 0 = 0 ₹

MASS Maliyetleri (c_k × Σ(customer_count × propensity) × y[k]):
  campaign-17 (c_k=158.01, y=1):
    Katılan müşteri = 5000×0.10 + 8000×0.12 + 12000×0.20 + 15000×0.25 + 20000×0.30
                    = 500 + 960 + 2400 + 3750 + 6000 = 13,610 katılımcı
    158.01 × 13,610 = 2,150,916 ₹

  ──────────────────────────────────────────────────
  Global Maliyet = 60,000 + 180,000 + 2,150,916 = 2,390,916 ₹

Kısıt Kontrolü:
  ✓ 10,000 ≤ 2,390,916 ≤ 5,000,000 (VALID!)
```

---

## 🎯 CRM vs MASS Kampanyaları

### CRM Kampanyaları (x[k, s])

| Özellik | Açıklama |
|---------|----------|
| **Tanım** | Segmente özel, hedefli kampanyalar |
| **Karar** | Her segment için AYRI karar verilir |
| **Örnek** | "Premium müşterilere özel indirim", "Student discount" |
| **Esneklik** | ✅ Yüksek (segment'e göre değişir) |
| **Hedefleme** | ✅ Hassas (belirli segment'lere) |

**Örnek Senaryo:**
```python
K_crm = ["campaign-8", "campaign-18", "campaign-20"]

# Herbir kampanya, herbir segment için BAĞIMSIZ karar
x["campaign-8", "Premium"]   = 1     ✅ Gider
x["campaign-8", "Gold"]      = 1     ✅ Gider
x["campaign-8", "Standard"]  = 0     ❌ Gitmez (karlı değil)

x["campaign-18", "Premium"]  = 1     ✅ Gider
x["campaign-18", "Gold"]     = 0     ❌ Gitmez (maliyetli)
```

---

### MASS Kampanyaları (y[k])

| Özellik | Açıklama |
|---------|----------|
| **Tanım** | Broadcast, tüm segmentlere giden kampanyalar |
| **Karar** | Bir kere seçilirse TÜM segmentlere gider |
| **Örnek** | "Newsletter", "Flash sale", "App update" |
| **Esneklik** | ❌ Düşük (hepsi aynı) |
| **Hedefleme** | ❌ Geniş (tüm customer'lara) |

**Örnek Senaryo:**
```python
K_mass = ["campaign-17"]

# Kampanya seçilirse, TÜM segmentlere otomatik gider
y["campaign-17"] = 1

# Otomatik sonuç:
x["campaign-17", "Premium"]   = 1    ✅ Gider (y=1 olduğu için)
x["campaign-17", "Gold"]      = 1    ✅ Gider (y=1 olduğu için)
x["campaign-17", "Silver"]    = 1    ✅ Gider (y=1 olduğu için)
x["campaign-17", "Bronze"]    = 1    ✅ Gider (y=1 olduğu için)
x["campaign-17", "Standard"]  = 1    ✅ Gider (y=1 olduğu için)
```

---

### Karşılaştırma Tablosu

| Kriter | **CRM** | **MASS** |
|--------|---------|---------|
| **Karar Seviyesi** | Segment bazlı | Global bazlı |
| **Değişken Sayısı** | \|K_crm\| × \|S\| | \|K_mass\| |
| **Esneklik** | ✅ Yüksek | ❌ Düşük |
| **Hedefleme** | ✅ Hassas | ❌ Geniş |
| **Maliyet Kontrol** | ✅ Segment'e göre | ❌ Sabit |
| **Başlangıç Maliyeti** | Düşük | Yüksek |

---

## 💡 Önemli Notlar

### Decision Variables İlişkisi

```
CRM Kampanyaları (x[k, s]):
  └─ Herbir kampanya, herbir segment için BAĞIMSIZ karar
     x[k1, s1] = 1 olabilir     ✅
     x[k1, s2] = 0 olabilir     ✅
     (aynı kampanya k1 için farklı değerler)

MASS Kampanyaları (y[k]):
  └─ Kampanya seçilirse, TÜM segmentlere gider
     y[k] = 1  →  Tüm s için otomatik gider
     y[k] = 0  →  Kampanya seçilmedi
```

---

### Constraints Hierarchysi (Öncelik Sırası)

**En katı kısıtlardan en gevşek kısıtlara:**

1. **Budget Constraint (En katı)** ⚠️
   - Global bütçe kısıtı (katılım bazlı - propensity ile çarpılır)
   - c_k × customer_count × propensity ile tahmini katılım maliyeti hesaplanır
   - Genellikle bu kısıt optimization'ı en çok etkiler

2. **Campaign Limit (Segment)**
   - Her segment max n_max kampanya
   - İkinci en önemli kısıt

3. **Campaign Limit (CRM)**
   - Her CRM kampanya max r_max segment'e
   - Kampanya bazında kontrol

4. **Campaign Count (MASS)** (En gevşek)
   - Toplam m_min-m_max MASS kampanya
   - Genellikle en az sıkı kısıt

**Sonuç:** Eğer bu kısıtlardan biri çok katı ise → **INFEASIBLE** ❌

---

### Propensity Score Kullanımı

```
Propensity Score [0, 1] = Kampanyaya katılım olasılığı

Örneğin campaign-8:
  p_ks["campaign-8", "Premium"]   = 0.08  → %8 olasılıkla katılır
  p_ks["campaign-8", "Gold"]      = 0.15  → %15 olasılıkla katılır
  p_ks["campaign-8", "Standard"]  = 0.50  → %50 olasılıkla katılır

Solver'ın Davranışı:
  YÜKSEK propensity score'lu kombinasyonları tercih eder
  Çünkü contribution = customer_count × propensity_score × profit_margin

  Standard segment (0.50) → Premium segment (0.08) tercih edilirse,
  Standard daha karlı olacaktır (500 × 0.50 = 250 vs 5000 × 0.08 = 400)
```

---

### Cost Calculation (Katılım Bazlı Maliyet Hesabı)

```
Global toplam maliyet (c_k = katılım başına birim maliyet):

  global_cost = Σ Σ (c_k × customer_count[s] × p_ks[k,s] × x[k, s])
                k∈K_crm s∈S
              + Σ (c_k × Σ(customer_count[s] × p_ks[k,s]) × y[k])
                k∈K_mass  s∈S

Neden propensity ile çarpıyoruz?
  c_k = katılım maliyeti (kupon, cashback, indirim gibi)
  Sadece KATILAN müşteriler maliyet üretir
  Katılan müşteri sayısı = customer_count × propensity_score

Detaylı Örnek (campaign-8 c_k=150):
  Premium  (x=1, 5,000 müşteri, p=0.08):  150 × 5,000 × 0.08 = 60,000 ₹
  Gold     (x=1, 8,000 müşteri, p=0.15):  150 × 8,000 × 0.15 = 180,000 ₹
  Silver   (x=1, 12,000 müşteri, p=0.25): 150 × 12,000 × 0.25 = 450,000 ₹
  Bronze   (x=0):  atanmadı → 0 ₹
  Standard (x=0):  atanmadı → 0 ₹
  ──────────────────────────────────────────────────────────────
  Campaign-8 Maliyet = 60,000 + 180,000 + 450,000 = 690,000 ₹

Karşılaştırma:
  Eski (gönderim bazlı):  150 × 25,000 = 3,750,000 ₹ (tüm müşteriler)
  Yeni (katılım bazlı):   690,000 ₹ (sadece katılanlar)
```

---

### ROI Hesaplama

```
ROI = (Total Contribution - Total Cost) / Total Cost × 100%

Senaryo Örneği:
  Total Contribution = ₹32,565,400  (tüm segments)
  Total Cost         = ₹22,055,400  (tüm segments)

  ROI = (32,565,400 - 22,055,400) / 22,055,400 × 100%
      = 10,510,000 / 22,055,400 × 100%
      = 47.65%

Yorumlama:
  Her ₹1 harcama → ₹0.4765 net kâr
  Çok kârlı bir kampanya! ✅
```

---

## 🎯 Gerçek Senaryo Örneği (Scenario 821c788e)

### Giriş Verileri

```
Kampanya Sayısı: 4
  ├─ CRM Kampanyaları (3):
  │  ├─ campaign-8   (c_k=150.00)
  │  ├─ campaign-18  (c_k=32.15)
  │  └─ campaign-20  (c_k=27.43)
  └─ MASS Kampanyaları (1):
     └─ campaign-17  (c_k=158.01)

Customer Segments (5):
  ├─ Premium   (5,000 müşteri, lifetime_value=15,000)
  ├─ Gold      (8,000 müşteri, lifetime_value=8,000)
  ├─ Silver    (12,000 müşteri, lifetime_value=4,000)
  ├─ Bronze    (15,000 müşteri, lifetime_value=2,000)
  └─ Standard  (20,000 müşteri, lifetime_value=1,000)

Genel Parametreler:
  n_max=2              (Segment başına max 2 kampanya)
  b_min=100, b_max=10,000,000 (Global bütçe - tüm kampanyalar ve segmentler için)
  m_min=0, m_max=3     (Mass kampanya sayısı)
```

---

### Solver Sonuçları

```
Optimization Status: OPTIMAL ✅

Decision Variables:
├─ CRM x değişkenleri:
│  x["campaign-8", "Premium"]   = 1  ✅
│  x["campaign-8", "Gold"]      = 1  ✅
│  x["campaign-8", "Silver"]    = 1  ✅
│  x["campaign-8", "Bronze"]    = 1  ✅
│  x["campaign-8", "Standard"]  = 1  ✅
│  (campaign-18 ve campaign-20 de tüm segments'e gitti)
│
└─ MASS y değişkenleri:
   y["campaign-17"] = 1  ✅ (TÜM segments'e gider)
```

---

### Maliyet Hesabı (Cost Matching)

**Database'deki kayıtlar:**
```
campaignId=campaign-8, segmentId=Premium, cost=750,000 ₹
campaignId=campaign-8, segmentId=Gold, cost=1,200,000 ₹
campaignId=campaign-8, segmentId=Silver, cost=1,800,000 ₹
campaignId=campaign-8, segmentId=Bronze, cost=2,250,000 ₹
campaignId=campaign-8, segmentId=Standard, cost=3,000,000 ₹
```

**Backend Processing (Cost Matching):**
```
for each dbResult in database:
  if dbResult.campaignId == summary.campaignId:
    totalCost += dbResult.cost

campaign-8 için:
  750,000 + 1,200,000 + 1,800,000 + 2,250,000 + 3,000,000 = 9,000,000 ₹

Sonuç: Cost = ₹9,000,000 ✅
```

---

### Final Results

```
┌─ Özet Sonuçlar ───────────────────────────────┐
│ Recommended Customers: 60,000                 │
│ Total Recommendations: 240,000                │
│ Estimated Participation: 80,000               │
│ Estimated Contribution: ₹32,565,400          │
│ Estimated Cost: ₹22,055,400                  │
│ Estimated ROI: 47.65%                        │
└───────────────────────────────────────────────┘

Campaign Başına Özet:
┌──────────────────┬──────────────┬────────────────┬─────────┐
│ Campaign         │ Cost         │ Contribution   │ ROI     │
├──────────────────┼──────────────┼────────────────┼─────────┤
│ campaign-8       │ ₹9,000,000   │ ₹19,453,198    │ 116.3%  │
│ campaign-17 MASS │ ₹9,480,600   │ ₹17,629,579    │ 85.9%   │
│ campaign-18      │ ₹1,929,000   │ ₹12,844,935    │ 565.9%  │
│ campaign-20      │ ₹1,645,800   │ ₹14,714,606    │ 794.0%  │
├──────────────────┼──────────────┼────────────────┼─────────┤
│ TOPLAM           │ ₹22,055,400  │ ₹32,565,400    │ 47.65%  │
└──────────────────┴──────────────┴────────────────┴─────────┘
```

**Yorumlama:**
- campaign-20 en karlı (794% ROI) ✅
- campaign-18 ikinci en karlı (565.9% ROI) ✅
- campaign-8 ve campaign-17 MASS daha düşük ROI ama yüksek volume
- **Genel ROI: 47.65%** = Çok başarılı bir optimization! 🎉

---

## 📚 Kaynaklar

- **Ana README:** [README.md](./README.md)
- **Optimizer Kodu:** `app/services/optimizer.py`
- **Modeller:** `app/models/optimization.py`
- **Test Dosyaları:** `tests/`

---

## 🔗 Linkler

| Dosya | Satırlar | Açıklama |
|-------|----------|----------|
| `optimizer.py` | 234-238 | CRM Decision Variables (x) |
| `optimizer.py` | 240-243 | Campaign Selection Variables (y) - CRM + MASS |
| `optimizer.py` | 249-262 | Objective Function |
| `optimizer.py` | 271-281 | CRM Capacity Constraint (customer_count weighted) |
| `optimizer.py` | 283-290 | CRM Selection Link (x[k,s] <= y[k]) |
| `optimizer.py` | 295-302 | CRM Campaign Count (c_min/c_max) |
| `optimizer.py` | 306-314 | MASS Campaign Count (m_min/m_max) |
| `optimizer.py` | 319-326 | Segment Campaign Limit (n_max) |
| `optimizer.py` | 328-352 | Global Budget Constraint (katılım bazlı: c_k × count × propensity) |

---

**Son Güncelleme:** 2026-03-03
