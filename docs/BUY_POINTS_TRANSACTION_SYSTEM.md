# Buy Points Transaction System - Implementation Guide

## Overview
This system allows you to store and manage buy points transactions in the database. When customers purchase points through the payment system, transactions are recorded and managed according to the business rules.

## Key Features

### 1. Transaction Recording
- Transactions are automatically created when a payment request contains "BUYPOINTS" in the reference ID
- Stores transaction details including: customer ID, IDs, staff info, status, and points amount
- Status tracking: `pending` → `confirmed` → `failed`

### 2. Database Schema
A new table `buy_points_transactions` stores all transaction data:
```sql
- id: Primary key
- customer_id: Reference to vault_customers
- collecto_id: Collecto identifier
- client_id: Client identifier
- transaction_id: Unique payment transaction ID
- reference_id: Reference containing "BUYPOINTS" indicator
- points: Number of points purchased
- amount: Payment amount
- payment_method: Method of payment
- status: Transaction status (pending/confirmed/failed)
- staff_id: Staff member processing (optional)
- staff_name: Staff member name (optional)
- created_at: Transaction creation timestamp
- updated_at: Last update timestamp
```

### 3. Transaction Flow

#### Step 1: Create Request to Pay
When initiating a buy points payment:
```bash
POST /requestToPay
{
  "collectoId": "COLL123",
  "clientId": "CLI456",
  "paymentOption": "mm",
  "phone": "256700000000",
  "amount": 50000,
  "reference": "BUYPOINTS-1000POINTS",  # Must contain "BUYPOINTS"
  "points": 1000,  # Number of points being purchased
  "paymentMethod": "mobile_money",
  "staffId": "STAFF123",              # Optional
  "staffName": "John Doe"             # Optional
}
```

**Response:**
```json
{
  "status": "200",
  "status_message": "success",
  "data": {
    "requestToPay": true,
    "message": "Confirm payment via the prompt on your phone.",
    "transactionId": "PMT154257"
  }
}
```

**What happens:**
- Transaction is created in `buy_points_transactions` table with status `pending`
- Transaction is stored in local cache for status tracking

#### Step 2: Check Payment Status
```bash
POST /requestToPayStatus
{
  "transactionId": "PMT154257",
  "collectoId": "COLL123",
  "clientId": "CLI456",
  "staffId": "STAFF123",              # Optional
  "staffName": "John Doe"             # Optional
}
```

**Response (if confirmed):**
```json
{
  "transactionId": "PMT154257",
  "status": "confirmed",
  "payment": { ... },
  "buyPointsResult": "Buy points transaction confirmed. Customer received 1000 points. Tier updated."
}
```

**What happens on confirmation:**
- Transaction status is updated to `confirmed`
- `vault_customers.bought_points` is incremented by purchased points
- `vault_customers.current_points` is incremented by purchased points
- Customer tier is recalculated based on new current points

### 4. Points System

**Three point types in Customer:**
- `earned_points`: Points earned from invoice payments (calculated from earning rules)
- `bought_points`: Points purchased by customer
- `current_points`: Total of earned + bought points (used for tier determination and redemption)

**Point Redemption Priority:**
- Earned points are consumed first
- Bought points are consumed after earned points are depleted

**Tier Calculation:**
- Based on `current_points` (all points combined)
- Recalculated whenever points are added or transaction confirmed
- Tier is updated automatically

## API Endpoints

### Query Transactions

#### Get All Transactions
```bash
GET /buy-points-transactions
GET /buy-points-transactions?collectoId=COLL123
GET /buy-points-transactions?status=confirmed
GET /buy-points-transactions?collectoId=COLL123&status=pending
```

#### Get Transactions by CollectoId
```bash
GET /buy-points-transactions/collecto/{collectoId}
```

#### Get Transactions by ClientId
```bash
GET /buy-points-transactions/client/{clientId}
```

#### Get Transactions by CustomerId
```bash
GET /buy-points-transactions/customer/{customerId}
```

#### Get Transactions by Status
```bash
GET /buy-points-transactions/customer/{customerId}/status?status=confirmed
```

#### Get Specific Transaction
```bash
GET /buy-points-transactions/transaction/{transactionId}
```

### Manage Transactions

#### Confirm Transaction (Manual)
```bash
POST /buy-points-transactions/confirm/{transactionId}
{
  "staffId": "STAFF123",
  "staffName": "John Doe"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "transaction": { ... },
    "message": "Buy points transaction confirmed. Customer received 1000 points. Tier updated."
  }
}
```

#### Fail Transaction
```bash
POST /buy-points-transactions/fail/{transactionId}
```

**Response:**
```json
{
  "status": "success",
  "data": { ... },
  "message": "Transaction marked as failed"
}
```

## Business Rules

### Transaction Status Lifecycle
1. **Pending**: Transaction created, awaiting payment confirmation
2. **Confirmed**: Payment confirmed, points added to customer
   - Customer `bought_points` increased
   - Customer `current_points` increased
   - Tier recalculated and updated
   - Staff information recorded
3. **Failed**: Payment failed or manually marked as failed

### Earned Points (Different from Bought Points)
- Only updated when invoice details are returned with a paid transaction
- Calculated based on earning rules defined in `vault_earning_rules`
- Used for tier determination (combined with bought points)

### Tier System
- Customer tier is determined by `current_points` (earned + bought)
- Tier is automatically recalculated whenever:
  - Points are added (bought or earned)
  - Transaction is confirmed
  - Existing tier becomes invalid

## Implementation Files

### New Files Created
1. **Models**
   - `src/models/BuyPointsTransaction.model.ts` - Transaction entity

2. **Repositories**
   - `src/repositories/buy-points-transaction.repository.ts` - Database operations

3. **Services**
   - `src/services/buy-points-transaction.service.ts` - Business logic

4. **Controllers**
   - `src/contollers/buy-points-transaction.controller.ts` - API handlers

5. **Routes**
   - `src/routes/buy-points-transaction.routes.ts` - Endpoint definitions

6. **Migrations**
   - `src/migrations/001_create_buy_points_transactions_table.sql` - Database schema

### Modified Files
1. `src/routes/services.ts` - Added BUYPOINTS transaction creation and confirmation
2. `src/index.ts` - Registered new routes

## Database Migration

Run the migration to create the `buy_points_transactions` table:

```bash
# Using your migration script
npm run migrate
```

Or manually execute the SQL:
```sql
CREATE TABLE IF NOT EXISTS buy_points_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  collecto_id VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL UNIQUE,
  reference_id VARCHAR(255) NOT NULL,
  points INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
  staff_id VARCHAR(255),
  staff_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_customer_id (customer_id),
  INDEX idx_collecto_id (collecto_id),
  INDEX idx_client_id (client_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_reference_id (reference_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (customer_id) REFERENCES vault_customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Example Workflow

### Scenario: Customer Buys 1000 Points

1. **Customer initiates purchase:**
   ```bash
   POST /requestToPay
   {
     "collectoId": "BUSINESS1",
     "clientId": "CUSTOMER456",
     "paymentOption": "mm",
     "phone": "256701234567",
     "amount": 50000,
     "reference": "BUYPOINTS-1000",
     "points": 1000,
     "staffId": "STAFF001",
     "staffName": "Alice Smith"
   }
   ```

2. **Transaction created (status: pending):**
   - Entry added to `buy_points_transactions` table
   - Payment prompt sent to customer

3. **Customer confirms payment on phone**

4. **App checks payment status:**
   ```bash
   POST /requestToPayStatus
   {
     "transactionId": "PMT154257",
     "collectoId": "BUSINESS1",
     "clientId": "CUSTOMER456"
   }
   ```

5. **If confirmed, system automatically:**
   - Updates transaction status to `confirmed`
   - Adds 1000 to `bought_points`
   - Adds 1000 to `current_points`
   - Recalculates and updates customer tier
   - Records staff information

6. **Query transaction history:**
   ```bash
   GET /buy-points-transactions/customer/123
   ```
   Returns all transactions for customer

## Error Handling

- Invalid reference (no "BUYPOINTS"): Not stored as buy points transaction
- Missing points parameter: Returns 400 error
- Transaction already confirmed: Returns error
- Customer not found: Transaction stored but points not added (with warning)

## Notes

- Transactions are stored even if Collecto API is unreachable (local fallback)
- Staff information is optional but recommended for audit trails
- All timestamps are in server timezone (UTC recommended)
- Indexes created for efficient querying by customer, collecto, client, and transaction ID
