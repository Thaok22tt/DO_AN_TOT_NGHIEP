CREATE DATABASE IF NOT EXISTS QuanLyQuanCaPhe
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE QuanLyQuanCaPhe;

CREATE TABLE IF NOT EXISTS roles (
  RoleId INT AUTO_INCREMENT PRIMARY KEY,
  RoleName VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS accounts (
  AccountId INT AUTO_INCREMENT PRIMARY KEY,
  Username VARCHAR(100) NOT NULL UNIQUE,
  Password VARCHAR(255) NOT NULL,
  FullName VARCHAR(100) NOT NULL,
  Email VARCHAR(100) NULL UNIQUE,
  PhoneNumber VARCHAR(20) NULL,
  Status TINYINT(1) NOT NULL DEFAULT 1,
  RoleId INT NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_accounts_role
    FOREIGN KEY (RoleId) REFERENCES roles(RoleId)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS employees (
  EmployeeId INT AUTO_INCREMENT PRIMARY KEY,
  FullName VARCHAR(100) NOT NULL,
  PhoneNumber VARCHAR(20) NULL,
  BirthDate DATE NULL,
  IdentityNumber VARCHAR(20) NULL,
  HireDate DATE NULL,
  HourlyRate DECIMAL(12, 0) NOT NULL DEFAULT 0,
  Gender ENUM('Nam', 'Nữ', 'Khác') NULL,
  Position VARCHAR(50) NULL,
  WorkShift ENUM('Sáng', 'Chiều', 'Tối', 'Full') NULL,
  AccountId INT NOT NULL UNIQUE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_account
    FOREIGN KEY (AccountId) REFERENCES accounts(AccountId)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS shift_templates (
  ShiftTemplateId INT AUTO_INCREMENT PRIMARY KEY,
  ShiftName VARCHAR(100) NOT NULL UNIQUE,
  StartTime TIME NOT NULL,
  EndTime TIME NOT NULL,
  Status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shift_assignments (
  ShiftAssignmentId INT AUTO_INCREMENT PRIMARY KEY,
  EmployeeId INT NOT NULL,
  ShiftTemplateId INT NOT NULL,
  WorkDate DATE NOT NULL,
  Note VARCHAR(300) NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_shift_assignments_employee_date_shift UNIQUE (EmployeeId, ShiftTemplateId, WorkDate),
  CONSTRAINT fk_shift_assignments_employee
    FOREIGN KEY (EmployeeId) REFERENCES employees(EmployeeId)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_shift_assignments_template
    FOREIGN KEY (ShiftTemplateId) REFERENCES shift_templates(ShiftTemplateId)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payroll_payments (
  PayrollPaymentId INT AUTO_INCREMENT PRIMARY KEY,
  EmployeeId INT NOT NULL,
  PayrollMonth CHAR(7) NOT NULL,
  Status ENUM('Paid', 'Unpaid') NOT NULL DEFAULT 'Unpaid',
  PaidAt DATETIME NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_payroll_payments_employee_month UNIQUE (EmployeeId, PayrollMonth),
  CONSTRAINT fk_payroll_payments_employee
    FOREIGN KEY (EmployeeId) REFERENCES employees(EmployeeId)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  CategoryId INT AUTO_INCREMENT PRIMARY KEY,
  CategoryName VARCHAR(100) NOT NULL UNIQUE,
  Description VARCHAR(500) NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS areas (
  AreaId INT AUTO_INCREMENT PRIMARY KEY,
  AreaName VARCHAR(100) NOT NULL UNIQUE,
  Description VARCHAR(300) NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tables (
  TableId INT AUTO_INCREMENT PRIMARY KEY,
  TableName VARCHAR(100) NOT NULL,
  AreaId INT NOT NULL,
  Status ENUM('Available', 'Preparing', 'Occupied') NOT NULL DEFAULT 'Available',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_tables_area_name UNIQUE (AreaId, TableName),
  CONSTRAINT fk_tables_area
    FOREIGN KEY (AreaId) REFERENCES areas(AreaId)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS products (
  ProductId INT AUTO_INCREMENT PRIMARY KEY,
  ProductName VARCHAR(150) NOT NULL,
  CategoryId INT NOT NULL,
  Price DECIMAL(12, 2) NOT NULL,
  Description VARCHAR(500) NULL,
  Image VARCHAR(255) NULL,
  Status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category
    FOREIGN KEY (CategoryId) REFERENCES categories(CategoryId)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_products_price CHECK (Price > 0)
);

CREATE TABLE IF NOT EXISTS promotions (
  PromotionId INT AUTO_INCREMENT PRIMARY KEY,
  PromotionName VARCHAR(150) NOT NULL UNIQUE,
  DiscountType ENUM('Percent', 'Fixed') NOT NULL,
  DiscountValue DECIMAL(12, 2) NOT NULL,
  StartDate DATE NOT NULL,
  EndDate DATE NOT NULL,
  Status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_promotions_discount_value CHECK (DiscountValue > 0),
  CONSTRAINT chk_promotions_percent_value CHECK (DiscountType <> 'Percent' OR DiscountValue <= 100),
  CONSTRAINT chk_promotions_date_range CHECK (StartDate <= EndDate)
);

CREATE TABLE IF NOT EXISTS invoices (
  InvoiceId INT AUTO_INCREMENT PRIMARY KEY,
  InvoiceCode VARCHAR(30) NOT NULL UNIQUE,
  TableId INT NULL,
  AccountId INT NULL,
  PromotionId INT NULL,
  OrderType ENUM('DineIn', 'Takeaway', 'Ship') NOT NULL DEFAULT 'DineIn',
  KitchenStatus ENUM('Draft', 'Waiting', 'InProgress', 'Completed') NOT NULL DEFAULT 'Draft',
  DeliveryStatus ENUM('Pending', 'Delivering', 'Delivered') NULL,
  CustomerName VARCHAR(100) NULL,
  CustomerPhone VARCHAR(20) NULL,
  DeliveryAddress VARCHAR(300) NULL,
  DeliveryNote VARCHAR(300) NULL,
  ShippingFee DECIMAL(12, 2) NULL DEFAULT 0,
  TotalAmount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  Status ENUM('Unpaid', 'Paid', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Unpaid',
  PaymentMethod VARCHAR(50) NULL,
  AmountReceived DECIMAL(12, 2) NULL,
  ChangeAmount DECIMAL(12, 2) NULL,
  Note VARCHAR(500) NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_table
    FOREIGN KEY (TableId) REFERENCES tables(TableId)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_invoices_account
    FOREIGN KEY (AccountId) REFERENCES accounts(AccountId)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_invoices_promotion
    FOREIGN KEY (PromotionId) REFERENCES promotions(PromotionId)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT chk_invoices_total CHECK (TotalAmount >= 0)
);

CREATE TABLE IF NOT EXISTS invoice_details (
  InvoiceDetailId INT AUTO_INCREMENT PRIMARY KEY,
  InvoiceId INT NOT NULL,
  ProductId INT NULL,
  ProductName VARCHAR(150) NOT NULL,
  Quantity INT NOT NULL,
  UnitPrice DECIMAL(12, 2) NOT NULL,
  LineTotal DECIMAL(12, 2) NOT NULL,
  Note VARCHAR(200) NULL,
  CONSTRAINT fk_invoice_details_invoice
    FOREIGN KEY (InvoiceId) REFERENCES invoices(InvoiceId)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_invoice_details_product
    FOREIGN KEY (ProductId) REFERENCES products(ProductId)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT chk_invoice_details_quantity CHECK (Quantity > 0),
  CONSTRAINT chk_invoice_details_unit_price CHECK (UnitPrice >= 0),
  CONSTRAINT chk_invoice_details_line_total CHECK (LineTotal >= 0)
);

CREATE TABLE IF NOT EXISTS suppliers (
  SupplierId INT AUTO_INCREMENT PRIMARY KEY,
  SupplierName VARCHAR(150) NOT NULL UNIQUE,
  Phone VARCHAR(20) NULL,
  Email VARCHAR(120) NULL,
  Address VARCHAR(300) NULL,
  Status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingredients (
  IngredientId INT AUTO_INCREMENT PRIMARY KEY,
  IngredientName VARCHAR(150) NOT NULL UNIQUE,
  Unit VARCHAR(30) NOT NULL,
  MinStock DECIMAL(12, 3) NOT NULL DEFAULT 0,
  CurrentStock DECIMAL(12, 3) NOT NULL DEFAULT 0,
  CostPrice DECIMAL(12, 2) NOT NULL DEFAULT 0,
  SupplierId INT NULL,
  Status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ingredients_supplier
    FOREIGN KEY (SupplierId) REFERENCES suppliers(SupplierId)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT chk_ingredients_min_stock CHECK (MinStock >= 0),
  CONSTRAINT chk_ingredients_current_stock CHECK (CurrentStock >= 0),
  CONSTRAINT chk_ingredients_cost_price CHECK (CostPrice >= 0)
);

CREATE TABLE IF NOT EXISTS product_recipes (
  ProductRecipeId INT AUTO_INCREMENT PRIMARY KEY,
  ProductId INT NOT NULL,
  IngredientId INT NOT NULL,
  Quantity DECIMAL(12, 3) NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_product_recipe UNIQUE (ProductId, IngredientId),
  CONSTRAINT fk_product_recipes_product
    FOREIGN KEY (ProductId) REFERENCES products(ProductId)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_product_recipes_ingredient
    FOREIGN KEY (IngredientId) REFERENCES ingredients(IngredientId)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_product_recipes_quantity CHECK (Quantity > 0)
);

CREATE TABLE IF NOT EXISTS stock_receipts (
  StockReceiptId INT AUTO_INCREMENT PRIMARY KEY,
  ReceiptCode VARCHAR(30) NOT NULL UNIQUE,
  SupplierId INT NULL,
  AccountId INT NULL,
  TotalAmount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  Note VARCHAR(500) NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_receipts_supplier
    FOREIGN KEY (SupplierId) REFERENCES suppliers(SupplierId)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_stock_receipts_account
    FOREIGN KEY (AccountId) REFERENCES accounts(AccountId)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT chk_stock_receipts_total CHECK (TotalAmount >= 0)
);

CREATE TABLE IF NOT EXISTS stock_receipt_details (
  StockReceiptDetailId INT AUTO_INCREMENT PRIMARY KEY,
  StockReceiptId INT NOT NULL,
  IngredientId INT NOT NULL,
  Quantity DECIMAL(12, 3) NOT NULL,
  UnitPrice DECIMAL(12, 2) NOT NULL DEFAULT 0,
  LineTotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ExpiryDate DATE NULL,
  CONSTRAINT fk_stock_receipt_details_receipt
    FOREIGN KEY (StockReceiptId) REFERENCES stock_receipts(StockReceiptId)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_stock_receipt_details_ingredient
    FOREIGN KEY (IngredientId) REFERENCES ingredients(IngredientId)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_stock_receipt_details_quantity CHECK (Quantity > 0),
  CONSTRAINT chk_stock_receipt_details_unit_price CHECK (UnitPrice >= 0),
  CONSTRAINT chk_stock_receipt_details_line_total CHECK (LineTotal >= 0)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  StockMovementId INT AUTO_INCREMENT PRIMARY KEY,
  IngredientId INT NOT NULL,
  MovementType ENUM('Import', 'Sale', 'Adjust', 'Waste', 'Return') NOT NULL,
  Quantity DECIMAL(12, 3) NOT NULL,
  BeforeQuantity DECIMAL(12, 3) NOT NULL,
  AfterQuantity DECIMAL(12, 3) NOT NULL,
  ReferenceType VARCHAR(50) NULL,
  ReferenceId INT NULL,
  Note VARCHAR(500) NULL,
  AccountId INT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_movements_ingredient
    FOREIGN KEY (IngredientId) REFERENCES ingredients(IngredientId)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movements_account
    FOREIGN KEY (AccountId) REFERENCES accounts(AccountId)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_shifts (
  WorkShiftId INT AUTO_INCREMENT PRIMARY KEY,
  AccountId INT NOT NULL,
  LoginAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  LogoutAt DATETIME NULL,
  WorkDate DATE NOT NULL,
  TotalHours DECIMAL(6, 2) NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_work_shifts_account_date (AccountId, WorkDate),
  INDEX idx_work_shifts_open (AccountId, LogoutAt),
  CONSTRAINT fk_work_shifts_account
    FOREIGN KEY (AccountId) REFERENCES accounts(AccountId)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);
