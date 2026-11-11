# Restaurant OS SaaS Platform - API Schema

## Base URL
```
https://api.restaurant-os.com/v1
```

## Authentication
```
Authorization: Bearer {access_token}
```

---

## 1. Dashboard API

### Get Dashboard Overview
```
GET /dashboard/overview
```

**Response:**
```json
{
  "todayRevenue": 45230,
  "todayOrders": 42,
  "activeReservations": 8,
  "occupiedTables": 12,
  "totalTables": 15,
  "avgOrderValue": 1078.33,
  "revenueGrowth": 12.5,
  "ordersGrowth": 8.2,
  "topDishes": [
    {
      "id": "dish1",
      "name": "Butter Chicken",
      "quantity": 18,
      "revenue": 5400
    }
  ]
}
```

---

## 2. Tables Management API

### Get All Tables
```
GET /tables?section=all&status=all
```

**Query Parameters:**
- `section`: all | indoor | outdoor | vip | beach
- `status`: all | available | occupied | reserved | cleaning | out_of_service

**Response:**
```json
{
  "data": [
    {
      "id": "t1",
      "number": 1,
      "section": "indoor",
      "capacity": 4,
      "status": "available",
      "waiter": null,
      "guestCount": 0,
      "occupiedSince": null,
      "reservedBy": null,
      "reservedUntil": null
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 50
}
```

### Update Table Status
```
PUT /tables/{tableId}
```

**Request Body:**
```json
{
  "status": "occupied",
  "guestCount": 4,
  "waiter": "Rajesh Kumar",
  "occupiedSince": "2024-12-23T18:30:00Z"
}
```

### Reserve Table
```
POST /tables/{tableId}/reserve
```

**Request Body:**
```json
{
  "customerName": "Amit Patel",
  "customerPhone": "+91-98765-43210",
  "reservationTime": "2024-12-23T19:00:00Z",
  "partySize": 4,
  "specialRequests": "Window seat preferred"
}
```

---

## 3. Orders API

### Get All Orders
```
GET /orders?status=all&date=2024-12-23
```

**Query Parameters:**
- `status`: all | pending | accepted | cooking | ready | served | cancelled
- `date`: YYYY-MM-DD
- `tableId`: (optional)

**Response:**
```json
{
  "data": [
    {
      "id": "ORD-0290",
      "tableId": "t2",
      "tableNumber": 2,
      "items": [
        {
          "id": "item1",
          "name": "Butter Chicken",
          "quantity": 2,
          "price": 450,
          "specialInstructions": "Less spicy"
        }
      ],
      "status": "cooking",
      "totalAmount": 2400,
      "createdAt": "2024-12-23T18:45:00Z",
      "updatedAt": "2024-12-23T18:50:00Z",
      "waiter": "Rajesh Kumar",
      "estimatedReadyTime": "2024-12-23T19:05:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50
}
```

### Create Order
```
POST /orders
```

**Request Body:**
```json
{
  "tableId": "t2",
  "items": [
    {
      "menuItemId": "dish1",
      "quantity": 2,
      "specialInstructions": "Less spicy"
    },
    {
      "menuItemId": "drink1",
      "quantity": 2
    }
  ],
  "notes": "Rush order"
}
```

### Update Order Status
```
PATCH /orders/{orderId}
```

**Request Body:**
```json
{
  "status": "ready",
  "estimatedReadyTime": "2024-12-23T19:05:00Z"
}
```

### Get Order Details
```
GET /orders/{orderId}
```

---

## 4. Menu API

### Get All Menu Items
```
GET /menu/items?category=all&search=""
```

**Query Parameters:**
- `category`: all | appetizers | mains | desserts | drinks
- `search`: (optional text search)

**Response:**
```json
{
  "data": [
    {
      "id": "dish1",
      "name": "Butter Chicken",
      "description": "Tender chicken in creamy tomato sauce",
      "category": "mains",
      "price": 450,
      "cost": 180,
      "availability": true,
      "image": "https://cdn.restaurant-os.com/dishes/butter-chicken.jpg",
      "preparationTime": 25,
      "calories": 320,
      "isVegetarian": false,
      "isSpicy": true,
      "tags": ["popular", "bestseller"]
    }
  ],
  "total": 45,
  "page": 1
}
```

### Create Menu Item
```
POST /menu/items
```

**Request Body:**
```json
{
  "name": "Paneer Tikka",
  "description": "Grilled cottage cheese cubes",
  "category": "appetizers",
  "price": 320,
  "cost": 120,
  "preparationTime": 15,
  "calories": 280,
  "isVegetarian": true,
  "isSpicy": false,
  "image": "base64_or_url"
}
```

### Update Menu Item
```
PATCH /menu/items/{itemId}
```

### Delete Menu Item
```
DELETE /menu/items/{itemId}
```

### Get Menu Categories
```
GET /menu/categories
```

---

## 5. Inventory API

### Get All Inventory Items
```
GET /inventory?search=""&lowStock=false
```

**Response:**
```json
{
  "data": [
    {
      "id": "inv1",
      "name": "Saffron (Kashmiri)",
      "sku": "SF-001",
      "category": "Spices",
      "quantity": 120,
      "unit": "grams",
      "reorderLevel": 150,
      "price": 2400,
      "supplier": "Premium Spices Co.",
      "lastRestockDate": "2024-12-15",
      "expiryDate": "2025-12-15",
      "status": "low-stock"
    }
  ],
  "total": 50,
  "lowStockCount": 5,
  "criticalCount": 2
}
```

### Update Inventory Item
```
PATCH /inventory/{itemId}
```

**Request Body:**
```json
{
  "quantity": 150,
  "reorderLevel": 100,
  "lastRestockDate": "2024-12-23"
}
```

### Create Reorder
```
POST /inventory/{itemId}/reorder
```

**Request Body:**
```json
{
  "quantity": 100,
  "supplierId": "supp1",
  "expectedDelivery": "2024-12-28"
}
```

---

## 6. Kitchen Display System (KDS) API

### Get Active Orders for Kitchen
```
GET /kitchen/orders?status=pending,accepted,cooking
```

**Response:**
```json
{
  "data": [
    {
      "id": "ORD-0290",
      "tableNumber": 2,
      "items": [
        {
          "id": "item1",
          "name": "Butter Chicken",
          "quantity": 2,
          "specialInstructions": "Less spicy",
          "status": "cooking"
        }
      ],
      "status": "cooking",
      "createdAt": "2024-12-23T18:45:00Z",
      "preparationTime": 20,
      "priority": "normal"
    }
  ]
}
```

### Update Order Item Status
```
PATCH /kitchen/orders/{orderId}/items/{itemId}
```

**Request Body:**
```json
{
  "status": "ready"
}
```

---

## 7. Reservations API

### Get All Reservations
```
GET /reservations?date=2024-12-23&status=all
```

**Response:**
```json
{
  "data": [
    {
      "id": "res1",
      "customerName": "Rahul Gupta",
      "customerPhone": "+91-98765-43212",
      "email": "rahul@email.com",
      "reservationTime": "2024-12-23T19:00:00Z",
      "partySize": 4,
      "tableId": "t3",
      "status": "confirmed",
      "specialRequests": "Window seat",
      "notes": "Birthday celebration",
      "createdAt": "2024-12-20T10:30:00Z"
    }
  ],
  "total": 12,
  "page": 1
}
```

### Create Reservation
```
POST /reservations
```

**Request Body:**
```json
{
  "customerName": "Priya Sharma",
  "customerPhone": "+91-98765-43211",
  "email": "priya@email.com",
  "reservationTime": "2024-12-24T20:00:00Z",
  "partySize": 6,
  "specialRequests": "High chair needed",
  "notes": "Anniversary dinner"
}
```

### Update Reservation
```
PATCH /reservations/{reservationId}
```

### Cancel Reservation
```
DELETE /reservations/{reservationId}
```

---

## 8. POS/Billing API

### Create Bill
```
POST /billing/bills
```

**Request Body:**
```json
{
  "orderId": "ORD-0290",
  "tableId": "t2",
  "items": [
    {
      "menuItemId": "dish1",
      "quantity": 2,
      "price": 450,
      "tax": 81
    }
  ],
  "subtotal": 900,
  "tax": 162,
  "discount": 0,
  "total": 1062,
  "paymentMethod": "card",
  "paymentStatus": "pending"
}
```

### Get Bill Details
```
GET /billing/bills/{billId}
```

### Update Payment Status
```
PATCH /billing/bills/{billId}
```

**Request Body:**
```json
{
  "paymentStatus": "completed",
  "paymentMethod": "card",
  "transactionId": "txn_12345"
}
```

### Get Daily Revenue
```
GET /billing/revenue?date=2024-12-23
```

**Response:**
```json
{
  "date": "2024-12-23",
  "totalRevenue": 45230,
  "totalOrders": 42,
  "avgOrderValue": 1078.33,
  "paymentBreakdown": {
    "cash": 15000,
    "card": 25000,
    "upi": 5230
  },
  "tax": 8140,
  "discount": 1200
}
```

---

## 9. Staff Management API

### Get All Staff
```
GET /staff?role=all&status=all
```

**Response:**
```json
{
  "data": [
    {
      "id": "staff1",
      "name": "Rajesh Sharma",
      "email": "rajesh@restaurant.com",
      "phone": "+91-98765-43220",
      "role": "Head Chef",
      "department": "Kitchen",
      "status": "working",
      "shift": {
        "start": "10:00 AM",
        "end": "10:00 PM"
      },
      "joinDate": "2023-05-15",
      "salary": 45000
    }
  ]
}
```

### Create Staff Member
```
POST /staff
```

**Request Body:**
```json
{
  "name": "Priya Verma",
  "email": "priya@restaurant.com",
  "phone": "+91-98765-43221",
  "role": "Sous Chef",
  "department": "Kitchen",
  "salary": 35000,
  "joinDate": "2024-12-01"
}
```

### Update Staff
```
PATCH /staff/{staffId}
```

### Get Staff Attendance
```
GET /staff/{staffId}/attendance?month=2024-12
```

---

## 10. Customer Relationship Management (CRM) API

### Get All Customers
```
GET /crm/customers?tier=all&search=""
```

**Response:**
```json
{
  "data": [
    {
      "id": "cust1",
      "name": "Amit Patel",
      "phone": "+91-98765-43210",
      "email": "amit.patel@email.com",
      "totalSpent": 15240,
      "visits": 12,
      "lastVisit": "2024-12-22T19:30:00Z",
      "tier": "gold",
      "loyaltyPoints": 1524,
      "preferences": ["Less spicy", "Window seat"],
      "notes": "Prefers table near window"
    }
  ],
  "total": 250,
  "page": 1
}
```

### Create Customer
```
POST /crm/customers
```

**Request Body:**
```json
{
  "name": "Neha Singh",
  "phone": "+91-98765-43213",
  "email": "neha@email.com",
  "preferences": ["Vegetarian options"],
  "notes": "Birthday on Dec 25"
}
```

### Update Customer
```
PATCH /crm/customers/{customerId}
```

### Add Loyalty Points
```
POST /crm/customers/{customerId}/loyalty
```

**Request Body:**
```json
{
  "points": 100,
  "reason": "Birthday bonus"
}
```

---

## 11. Analytics API

### Get Sales Analytics
```
GET /analytics/sales?from=2024-12-01&to=2024-12-23&interval=daily
```

**Response:**
```json
{
  "data": [
    {
      "date": "2024-12-23",
      "revenue": 45230,
      "orders": 42,
      "avgOrderValue": 1078.33,
      "topDish": "Butter Chicken"
    }
  ],
  "summary": {
    "totalRevenue": 1250000,
    "totalOrders": 1200,
    "avgOrderValue": 1041.67,
    "growth": 12.5
  }
}
```

### Get Table Analytics
```
GET /analytics/tables?from=2024-12-01&to=2024-12-23
```

**Response:**
```json
{
  "data": [
    {
      "tableId": "t1",
      "tableNumber": 1,
      "utilizationRate": 75,
      "avgOrderValue": 1200,
      "turnovers": 8,
      "peakHours": ["19:00-21:00"]
    }
  ]
}
```

### Get Menu Analytics
```
GET /analytics/menu?period=monthly
```

---

## 12. Settings API

### Get Restaurant Settings
```
GET /settings
```

**Response:**
```json
{
  "restaurantName": "Spice Garden",
  "email": "info@spicegarden.com",
  "phone": "+91-22-1234-5678",
  "address": "Mumbai Central",
  "timezone": "Asia/Kolkata",
  "currency": "INR",
  "operatingHours": {
    "monday": { "open": "11:00", "close": "23:00" },
    "tuesday": { "open": "11:00", "close": "23:00" }
  },
  "notifications": {
    "email": true,
    "sms": true,
    "push": true
  }
}
```

### Update Settings
```
PATCH /settings
```

---

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "price",
        "message": "Price must be greater than 0"
      }
    ]
  }
}
```

---

## Standard Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request data |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMIT | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)
- `sort`: Field to sort by (default: -createdAt)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "total": 250,
    "page": 1,
    "limit": 50,
    "totalPages": 5
  }
}
```

---

## Date Format

All dates should be in ISO 8601 format:
```
2024-12-23T18:30:00Z
```

---

## Webhook Events

Subscribe to events via:
```
POST /webhooks/subscribe
```

**Available Events:**
- `order.created`
- `order.status_changed`
- `reservation.created`
- `reservation.confirmed`
- `bill.created`
- `bill.paid`
- `inventory.low_stock`
- `customer.created`

---

## Rate Limiting

- Standard: 1000 requests per hour
- Premium: 10000 requests per hour

Headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1703340600
```
