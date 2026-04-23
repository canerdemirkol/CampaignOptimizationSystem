# API Endpoints Reference

Bu belge, Kampanya Optimizasyon Sistemi'nin tüm REST API endpoints'lerini listeler.

**Base URL:** `http://localhost:3001/api`

> **Auth:** Tüm endpoints JWT token gerektirir (httpOnly cookie'de otomatik gönderilir)

---

## 📋 İçindekiler

1. [Authentication](#authentication)
2. [Users](#users)
3. [Customers](#customers)
4. [Customer Segments](#customer-segments)
5. [Default Parameters](#default-parameters)
6. [Campaigns](#campaigns)
7. [Campaign Parameters](#campaign-parameters)
8. [Optimization Scenarios](#optimization-scenarios)
9. [Results](#results)
10. [Health](#health)

---

## 🔐 Authentication

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123"
}

Response: 201
{
  "id": "uuid",
  "username": "newuser",
  "email": "user@example.com",
  "role": "USER"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response: 200
{
  "access_token": "jwt_token",
  "refresh_token": "jwt_token"
}

Cookies (httpOnly):
- access_token
- refresh_token
```

### Logout
```http
POST /auth/logout
Response: 200 { "message": "Logged out" }
```

### Refresh Token
```http
POST /auth/refresh
Response: 200
{
  "access_token": "new_jwt_token"
}
```

### Get Current User
```http
GET /auth/me
Response: 200
{
  "id": "uuid",
  "username": "admin",
  "email": "admin@example.com",
  "role": "ADMIN"
}
```

---

## 👥 Users (ADMIN Only)

### List Users
```http
GET /users?page=1&limit=10
Response: 200
{
  "data": [
    {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "isActive": true
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 10
}
```

### Get User Detail
```http
GET /users/:id
Response: 200
{
  "id": "uuid",
  "username": "admin",
  "email": "admin@example.com",
  "role": "ADMIN",
  "isActive": true,
  "createdAt": "2026-02-25T10:00:00Z"
}
```

### Update User Role
```http
PATCH /users/:id/role
Content-Type: application/json

{
  "role": "USER"  // "ADMIN" | "USER" | "VIEWER"
}

Response: 200
{
  "id": "uuid",
  "role": "USER"
}
```

### Update User Status
```http
PATCH /users/:id/status
Content-Type: application/json

{
  "isActive": false
}

Response: 200
{
  "id": "uuid",
  "isActive": false
}
```

### Delete User
```http
DELETE /users/:id
Response: 204 (No Content)
```

---

## 👨‍💼 Customers

### List Customers
```http
GET /customers?page=1&limit=20
Response: 200
{
  "data": [
    {
      "id": "uuid",
      "customerNo": "CUST001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+90123456789",
      "age": 35,
      "gender": "Male",
      "segment": "Premium",
      "churnScore": 0.08,
      "lifetimeValue": 15000.00,
      "incomeLevel": "High"
    }
  ],
  "total": 1000,
  "page": 1,
  "limit": 20
}
```

### Download Template
```http
GET /customers/template
Response: 200 (binary)
[Excel dosyası indir]
```

### Get Customer Detail
```http
GET /customers/:id
Response: 200
{
  "id": "uuid",
  "customerNo": "CUST001",
  "firstName": "John",
  "lastName": "Doe",
  ...
}
```

### Create Customer
```http
POST /customers
Content-Type: application/json

{
  "customerNo": "CUST002",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+90987654321",
  "age": 28,
  "gender": "Female",
  "churnScore": 0.15,
  "lifetimeValue": 8000.00,
  "incomeLevel": "Medium-High"
}

Response: 201
{
  "id": "uuid",
  "customerNo": "CUST002",
  ...
}
```

### Bulk Import (Excel)
```http
POST /customers/bulk-import
Content-Type: multipart/form-data

file: [Excel .xlsx file]

Response: 200
{
  "total": 100,
  "inserted": 95,
  "skipped": 5,
  "errors": [
    {
      "row": 10,
      "reason": "Duplicate email"
    }
  ]
}
```

### Update Customer
```http
PUT /customers/:id
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith"
}

Response: 200
{
  "id": "uuid",
  "firstName": "Jane",
  ...
}
```

### Delete Customer (ADMIN)
```http
DELETE /customers/:id
Response: 204
```

---

## 📊 Customer Segments

### List Segments
```http
GET /customer-segments?page=1&limit=10
Response: 200
{
  "data": [
    {
      "id": "uuid",
      "name": "Premium",
      "description": "High value customers",
      "customerCount": 5000,
      "churnScore": 0.08,
      "lifetimeValue": 15000.00,
      "incomeLevel": "High"
    }
  ],
  "total": 5,
  "page": 1
}
```

### Get Total Customer Count
```http
GET /customer-segments/total-count
Response: 200
{
  "totalCount": 60000
}
```

### Get Segment Detail
```http
GET /customer-segments/:id
Response: 200
{
  "id": "uuid",
  "name": "Premium",
  ...
}
```

### Create Segment
```http
POST /customer-segments
Content-Type: application/json

{
  "name": "Platinum",
  "description": "Ultra high value customers",
  "customerCount": 1000,
  "churnScore": 0.05,
  "lifetimeValue": 50000.00,
  "incomeLevel": "High"
}

Response: 201
{
  "id": "uuid",
  "name": "Platinum",
  ...
}
```

### Update Segment
```http
PUT /customer-segments/:id
Content-Type: application/json

{
  "customerCount": 1200,
  "churnScore": 0.04
}

Response: 200
{
  "id": "uuid",
  "customerCount": 1200,
  ...
}
```

### Delete Segment
```http
DELETE /customer-segments/:id
Response: 204
```

---

## ⚙️ Default Parameters

### Get Default Parameters
```http
GET /default-general-parameters
Response: 200
{
  "id": "uuid",
  "cMin": 1,
  "cMax": 10,
  "nMin": 1,
  "nMax": 5,
  "bMin": 100.00,
  "bMax": 10000.00,
  "mMin": 0,
  "mMax": 3
}
```

### Update Default Parameters
```http
PUT /default-general-parameters
Content-Type: application/json

{
  "cMin": 1,
  "cMax": 15,
  "nMin": 1,
  "nMax": 6,
  "bMin": 100.00,
  "bMax": 20000.00,
  "mMin": 0,
  "mMax": 5
}

Response: 200
{
  "id": "uuid",
  "cMin": 1,
  ...
}
```

---

## 📢 Campaigns

### List Campaigns
```http
GET /campaigns?page=1&limit=20
Response: 200
{
  "data": [
    {
      "id": "uuid",
      "name": "Black Friday 2026",
      "type": "CRM",
      "status": "DRAFT",
      "createdAt": "2026-02-25T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1
}
```

### Get Campaign Detail
```http
GET /campaigns/:id
Response: 200
{
  "id": "uuid",
  "name": "Black Friday 2026",
  "type": "CRM",
  "status": "DRAFT",
  "createdAt": "2026-02-25T10:00:00Z"
}
```

### Get Campaign Details (with parameters & results)
```http
GET /campaigns/:id/details
Response: 200
{
  "campaign": {
    "id": "uuid",
    "name": "Black Friday 2026",
    "type": "CRM",
    "status": "CALCULATED"
  },
  "generalParameters": { ... },
  "campaignParameters": { ... },
  "results": [ ... ]
}
```

### Create Campaign
```http
POST /campaigns
Content-Type: application/json

{
  "name": "Winter Sale 2026",
  "type": "CRM"  // "CRM" | "MASS"
}

Response: 201
{
  "id": "uuid",
  "name": "Winter Sale 2026",
  "type": "CRM",
  "status": "DRAFT"
}
```

### Update Campaign
```http
PUT /campaigns/:id
Content-Type: application/json

{
  "name": "Winter Sale 2026 - Updated"
}

Response: 200
{
  "id": "uuid",
  "name": "Winter Sale 2026 - Updated"
}
```

### Delete Campaign
```http
DELETE /campaigns/:id
Response: 204
```

### Get Status Counts
```http
GET /campaigns/stats/status-counts
Response: 200
{
  "DRAFT": 5,
  "READY_FOR_CALCULATION": 3,
  "CALCULATING": 0,
  "CALCULATED": 10,
  "APPROVED": 20,
  "OPTIMIZING": 0,
  "OPTIMIZED": 5
}
```

---

## 🔄 Campaign State Transitions

### Approve Campaign (DRAFT → READY_FOR_CALCULATION)
```http
POST /campaigns/:id/approve
Response: 200
{
  "id": "uuid",
  "status": "READY_FOR_CALCULATION"
}
```

### Complete Calculation (CALCULATING → CALCULATED)
```http
POST /campaigns/:id/complete-calculation
Response: 200
{
  "id": "uuid",
  "status": "CALCULATED"
}
```

### Approve Campaign (CALCULATED → APPROVED)
```http
POST /campaigns/:id/approve-campaign
Response: 200
{
  "id": "uuid",
  "status": "APPROVED"
}
```

---

## 📋 Campaign Parameters

### Get General Parameters
```http
GET /campaigns/:id/general-parameters
Response: 200
{
  "id": "uuid",
  "campaignId": "uuid",
  "cMin": 1,
  "cMax": 10,
  ...
}
```

### Create/Update General Parameters
```http
POST /campaigns/:id/general-parameters
Content-Type: application/json

{
  "cMin": 1,
  "cMax": 10,
  "nMin": 1,
  "nMax": 5,
  "bMin": 100.00,
  "bMax": 10000.00,
  "mMin": 0,
  "mMax": 3
}

Response: 201 or 200
{
  "id": "uuid",
  "campaignId": "uuid",
  ...
}
```

### Get Campaign Parameters
```http
GET /campaigns/:id/campaign-parameters
Response: 200
{
  "data": [
    {
      "id": "uuid",
      "campaignId": "uuid",
      "rMin": 100,
      "rMax": 5000,
      "zK": 500.00,
      "cK": 50.00
    }
  ]
}
```

### Create Campaign Parameter
```http
POST /campaigns/:id/campaign-parameters
Content-Type: application/json

{
  "rMin": 100,
  "rMax": 5000,
  "zK": 500.00,
  "cK": 50.00
}

Response: 201
{
  "id": "uuid",
  "campaignId": "uuid",
  ...
}
```

### Update Campaign Parameter
```http
PUT /campaigns/campaign-parameters/:id
Content-Type: application/json

{
  "rMax": 6000,
  "zK": 550.00
}

Response: 200
{
  "id": "uuid",
  ...
}
```

### Delete Campaign Parameter
```http
DELETE /campaigns/campaign-parameters/:id
Response: 204
```

### Save Parameters to Multiple Campaigns
```http
POST /campaigns/scenario-save-parameters
Content-Type: application/json

{
  "generalParameters": {
    "cMin": 1,
    "cMax": 10,
    "nMin": 1,
    "nMax": 5,
    "bMin": 100,
    "bMax": 10000,
    "mMin": 0,
    "mMax": 3
  },
  "campaignParameters": {
    "rMin": 100,
    "rMax": 5000,
    "zK": 500,
    "cK": 50
  },
  "campaignIds": ["uuid1", "uuid2", "uuid3"]
}

Response: 200
{
  "success": true,
  "saved": 3,
  "failed": 0,
  "errors": []
}
```

---

## 🎯 Optimization Scenarios

### List Scenarios
```http
GET /optimization-scenarios?page=1&limit=10
Response: 200
{
  "data": [
    {
      "id": "uuid",
      "name": "Feb 2026 Optimization",
      "description": "Monthly campaign optimization",
      "status": "CALCULATED",
      "createdAt": "2026-02-25T10:00:00Z"
    }
  ],
  "total": 5
}
```

### Create Scenario
```http
POST /optimization-scenarios
Content-Type: application/json

{
  "name": "March 2026 Optimization",
  "description": "Monthly campaign optimization"
}

Response: 201
{
  "id": "uuid",
  "name": "March 2026 Optimization",
  "status": "DRAFT"
}
```

### Get Scenario Detail
```http
GET /optimization-scenarios/:id
Response: 200
{
  "id": "uuid",
  "name": "Feb 2026 Optimization",
  "status": "CALCULATED",
  "campaigns": [
    {
      "campaignId": "uuid",
      "campaignName": "Black Friday",
      "campaignType": "CRM",
      "parameters": { ... }
    }
  ],
  "results": [
    {
      "id": "uuid",
      "campaignId": "uuid",
      "segmentId": "uuid",
      "status": "SUCCESS",
      "recommendations": { ... },
      "totalProfit": 125000.00
    }
  ]
}
```

### Update Scenario
```http
PUT /optimization-scenarios/:id
Content-Type: application/json

{
  "name": "Feb 2026 Optimization - Updated"
}

Response: 200
{
  "id": "uuid",
  "name": "Feb 2026 Optimization - Updated"
}
```

### Add Campaigns to Scenario
```http
POST /optimization-scenarios/:id/campaigns
Content-Type: application/json

{
  "campaignIds": ["uuid1", "uuid2"],
  "campaignParameters": {
    "rMin": 100,
    "rMax": 5000,
    "zK": 500,
    "cK": 50
  },
  "generalParameters": {
    "cMin": 1,
    "cMax": 10,
    "nMin": 1,
    "nMax": 5,
    "bMin": 100,
    "bMax": 10000,
    "mMin": 0,
    "mMax": 3
  }
}

Response: 200
{
  "scenarioId": "uuid",
  "campaignsAdded": 2
}
```

### Remove Campaign from Scenario
```http
DELETE /optimization-scenarios/:id/campaigns/:campaignId
Response: 204
```

### Run Optimization (Async)
```http
POST /optimization-scenarios/:id/run
Response: 200
{
  "id": "uuid",
  "status": "CALCULATING",
  "message": "Optimization started"
}
```

### Delete Scenario
```http
DELETE /optimization-scenarios/:id
Response: 204
```

---

## 📊 Results

### Get Optimization Results
```http
GET /optimization/:campaignId/summary
Response: 200
{
  "id": "uuid",
  "campaignId": "uuid",
  "recommendedCustomerCount": 5000,
  "estimatedParticipation": 1600.0,
  "estimatedContribution": 1275244.0,
  "estimatedCost": 1547100.0,
  "estimatedROI": -17.57,
  "approved": false
}
```

### Get Result Details (Segment-based)
```http
GET /optimization/:campaignId/details
Response: 200
{
  "data": [
    {
      "id": "uuid",
      "campaignId": "uuid",
      "segmentId": "uuid",
      "segmentName": "Premium",
      "recommendedCampaigns": [...],
      "totalProfit": 1275244.0
    }
  ]
}
```

### Approve Results
```http
POST /optimization/:campaignId/approve
Response: 200
{
  "id": "uuid",
  "approved": true
}
```

---

## 🏥 Health Checks

### Backend Health
```http
GET /health
Response: 200
{
  "status": "healthy",
  "uptime": 3600,
  "database": "connected",
  "python_service": "connected"
}
```

### Simple Ping
```http
GET /
Response: 200
{
  "message": "API is running"
}
```

---

## 📝 Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Missing or invalid token"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Campaign not found"
}
```

### 500 Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## 🔗 Example Workflow

### 1. Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt
```

### 2. Create Campaign
```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"Summer Sale","type":"CRM"}'
```

### 3. Add Parameters
```bash
curl -X POST http://localhost:3001/api/campaigns/scenario-save-parameters \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "generalParameters":{...},
    "campaignParameters":{...},
    "campaignIds":["uuid"]
  }'
```

### 4. Create & Run Scenario
```bash
curl -X POST http://localhost:3001/api/optimization-scenarios \
  -b cookies.txt \
  -d '{"name":"March 2026"}'

curl -X POST http://localhost:3001/api/optimization-scenarios/:id/run \
  -b cookies.txt
```
