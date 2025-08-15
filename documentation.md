## Peta Relasi antar Halaman

Dashboard (/) 
├── Overview KPIs
├── Recent Activities → Activities (/activities)
├── Generate Report → Reports (/reports)
└── Navigation → All Pages

Inventory (/inventory)
├── Tools Management
├── Materials Management  
├── Bulk Operations
├── CRUD Operations
└── Smart Processing → Activities

Activities (/activities)
├── Active Borrowings
├── Material Consumption
├── Transaction History
├── Return Processing
├── Due Date Extensions
└── Generate Report → Reports

Reports (/reports)
├── Dynamic Filtering
├── Live Preview
├── Export Functions
└── Analytics (placeholder)

## Relationship mapping

Users ←→ Borrowing Transactions ←→ Tools
Users ←→ Consumption Transactions ←→ Materials
Tools/Materials ←→ Categories
Transactions ←→ History/Audit Trail

## Database Blueprint

-- Users/Borrowers
users (id, name, email, phone, department, created_at, updated_at)

-- Categories
categories (id, name, type, description, created_at)

-- Tools
tools (id, name, category_id, condition, total_quantity, available_quantity, 
       location, supplier, purchase_date, created_at, updated_at)

-- Materials  
materials (id, name, category_id, current_quantity, threshold_quantity, 
           unit, location, supplier, created_at, updated_at)

-- Borrowing Transactions
borrowing_transactions (id, user_id, borrow_date, due_date, return_date, 
                       purpose, status, notes, created_at, updated_at)

-- Borrowing Items (Junction)
borrowing_items (id, borrowing_transaction_id, tool_id, quantity, 
                original_condition, return_condition, created_at)

-- Consumption Transactions
consumption_transactions (id, user_id, consumption_date, purpose, 
                         project_name, created_at, updated_at)

-- Consumption Items (Junction)
consumption_items (id, consumption_transaction_id, material_id, 
                  quantity, unit_price, total_value, created_at)

-- Activity Logs
activity_logs (id, entity_type, entity_id, action, user_id, 
              old_values, new_values, created_at)