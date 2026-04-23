#!/usr/bin/env python
# coding: utf-8

import numpy as np
import matplotlib.pyplot as plt
from pyscipopt import Model, quicksum
import random as rnd
import time
import pandas as pd
import os

# =========================
# PARAMETRELER
# =========================

K_crm = list(range(10))                 
K_mass = list(range(10, 20))           
K = K_crm + K_mass    

r_max = 6000
M = range(25000)

# Deterministic olsun istersen:
# rnd.seed(42)
# np.random.seed(42)

p_km = {(k, m): rnd.uniform(0.1, 1.0) for k in K for m in M}
z_k = {k: rnd.uniform(50, 200) for k in K}
c_k = {k: rnd.uniform(10, 200) for k in K}  # Dictionary olarak düzeltildi

b_min = 0 
b_max = 10000000

start = time.time()

# =========================
# PARAMETRELERİ CSV'YE YAZ
# =========================

output_dir = "parametre_output"
os.makedirs(output_dir, exist_ok=True)

# 1️⃣ Kampanya listesi
df_kampanya = pd.DataFrame({
    "kampanya_id": K,
    "tip": ["CRM" if k in K_crm else "Mass" for k in K]
})
df_kampanya.to_csv(f"{output_dir}/kampanyalar.csv", index=False)

# 2️⃣ z_k (kar)
df_zk = pd.DataFrame(list(z_k.items()), columns=["kampanya_id", "kar"])
df_zk.to_csv(f"{output_dir}/z_k_kar.csv", index=False)

# 3️⃣ c_k (cost)
df_ck = pd.DataFrame({
    "kampanya_id": K,
    "cost": [c_k[k] for k in K]  # Dictionary'den değerleri al
})
df_ck.to_csv(f"{output_dir}/c_k_cost.csv", index=False)

# 4️⃣ Global parametreler
df_global = pd.DataFrame({
    "parametre": ["r_max", "musteri_sayisi", "b_min", "b_max"],
    "deger": [r_max, len(M), b_min, b_max]
})
df_global.to_csv(f"{output_dir}/global_parametreler.csv", index=False)

# 5️⃣ p_km (HIZLI VERSİYON - dict yerine numpy grid)

print("p_km CSV yazılıyor...")

K_array = np.array(K)
M_array = np.array(list(M))

grid_k, grid_m = np.meshgrid(K_array, M_array, indexing='ij')

df_pkm = pd.DataFrame({
    "kampanya_id": grid_k.ravel(),
    "musteri_id": grid_m.ravel(),
    "egilim_skoru": np.random.uniform(0.1, 1.0, grid_k.size)
})

df_pkm.to_csv(f"{output_dir}/p_km_skor.csv", index=False)

print("CSV export tamamlandı.")

# =========================
# OPTİMİZASYON
# =========================

def kampanya_optimizasyonu(K, K_crm, K_mass, M, p_km, z_k, c_k, b_min, b_max):

    model = Model("Kampanya_Optimizasyonu")
    x = {}
    y = {}

    # x değişkenleri (CRM kampanyaları)
    for k in K_crm:
        for m in M:
            x[k, m] = model.addVar(vtype="BINARY", name=f"x_{k}_{m}")

    # y değişkenleri (Mass kampanyaları)
    for k in K_mass:
        y[k] = model.addVar(vtype="BINARY", name=f"y_{k}")

    # Amaç fonksiyonu
    model.setObjective(
        quicksum(p_km[k, m] * z_k[k] * x[k, m] for k in K_crm for m in M) +
        quicksum(y[k] * z_k[k] * quicksum(p_km[k, m] for m in M) for k in K_mass),
        "maximize"
    )

    # Kısıtlar
    for k in K_crm:
        model.addCons(
            quicksum(x[k, m] for m in M) <= r_max,
            name=f"crm_limit_{k}"
        )

    model.addCons(quicksum(y[k] for k in K_mass) <= 2, name="mass_max_limit")
    model.addCons(quicksum(y[k] for k in K_mass) >= 1, name="mass_min_limit")

    for m in M:
        model.addCons(
            quicksum(x[k, m] for k in K_crm) + quicksum(y[k] for k in K_mass) <= 2,
            name=f"musteri_kampanya_limit_{m}"
        )

    for m in M:
        total_cost = (
            quicksum(c_k[k] * x[k, m] for k in K_crm) +
            quicksum(c_k[k] * y[k] for k in K_mass)
        )
        model.addCons(total_cost >= b_min, name=f"min_cost_{m}")
        model.addCons(total_cost <= b_max, name=f"max_cost_{m}")

    # Optimizasyonu çalıştır
    model.optimize()

    # Çözüm sonrası kayıtlar
    x_records = []
    for k in K_crm:
        for m in M:
            var = x[k, m]
            x_records.append({
                "variable_name": var.name,
                "kampanya_id": k,
                "musteri_id": m,
                "vtype": var.vtype(),
                "lower_bound": var.getLbOriginal(),  # Düzeltildi
                "upper_bound": var.getUbOriginal(),  # Düzeltildi
                "solution_value": model.getVal(var)
            })

    df_x = pd.DataFrame(x_records)
    df_x.to_csv(f"{output_dir}/x_karar_degiskenleri.csv", index=False)
    print("x karar değişkenleri CSV'ye yazıldı.")

    y_records = []
    for k in K_mass:
        var = y[k]
        y_records.append({
            "variable_name": var.name,
            "kampanya_id": k,
            "vtype": var.vtype(),
            "lower_bound": var.getLbOriginal(),  # Düzeltildi
            "upper_bound": var.getUbOriginal(),  # Düzeltildi
            "solution_value": model.getVal(var)
        })

    df_y = pd.DataFrame(y_records)
    df_y.to_csv(f"{output_dir}/y_karar_degiskenleri.csv", index=False)
    print("y karar değişkenleri CSV'ye yazıldı.")

    # Sonuçları yazdır
    if model.getStatus() == 'optimal':
        print("\n=== OPTİMAL ÇÖZÜM BULUNDU ===")
        
        # Hedef müşteri kontrolü
        target_customer = 3634
        
        # CRM kampanyaları
        applied_crm = []
        for k in K_crm:
            if model.getVal(x[k, target_customer]) > 0.5:
                applied_crm.append(k)
                print(f"CRM Kampanya {k} -> Müşteri {target_customer}")
        
        # Mass kampanyaları
        applied_mass = []
        for k in K_mass:
            if model.getVal(y[k]) > 0.5:
                applied_mass.append(k)
                print(f"Mass Kampanya {k} -> Tüm müşteriler")
        
        print(f"\nMüşteri {target_customer} için CRM kampanyaları: {applied_crm}")
        print(f"Müşteri {target_customer} için Mass kampanyaları: {applied_mass}")
        
        # Genel istatistikler
        active_crm = sum(1 for k in K_crm for m in M if model.getVal(x[k, m]) > 0.5)
        active_mass = sum(1 for k in K_mass if model.getVal(y[k]) > 0.5)
        print(f"\nToplam aktif CRM kampanya-müşteri ataması: {active_crm}")
        print(f"Toplam aktif Mass kampanya sayısı: {active_mass}")
        
    else:
        print(f"Çözüm bulunamadı. Model durumu: {model.getStatus()}")

# =========================
# ÇALIŞTIR
# =========================

kampanya_optimizasyonu(K, K_crm, K_mass, M, p_km, z_k, c_k, b_min, b_max)

end = time.time()
print(f"\nÇalışma süresi: {end - start:.2f} saniye")