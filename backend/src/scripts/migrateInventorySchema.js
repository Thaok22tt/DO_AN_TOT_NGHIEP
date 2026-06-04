const db = require('../config/database')

const statements = [
  `
    CREATE TABLE IF NOT EXISTS suppliers (
      SupplierId INT AUTO_INCREMENT PRIMARY KEY,
      SupplierName VARCHAR(150) NOT NULL UNIQUE,
      Phone VARCHAR(20) NULL,
      Email VARCHAR(120) NULL,
      Address VARCHAR(300) NULL,
      Status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS ingredient_categories (
      IngredientCategoryId INT AUTO_INCREMENT PRIMARY KEY,
      CategoryName VARCHAR(150) NOT NULL UNIQUE,
      Description VARCHAR(300) NULL,
      Status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS ingredients (
      IngredientId INT AUTO_INCREMENT PRIMARY KEY,
      IngredientName VARCHAR(150) NOT NULL UNIQUE,
      Unit VARCHAR(30) NOT NULL,
      MinStock DECIMAL(12, 3) NOT NULL DEFAULT 0,
      CurrentStock DECIMAL(12, 3) NOT NULL DEFAULT 0,
      CostPrice DECIMAL(12, 2) NOT NULL DEFAULT 0,
      CategoryId INT NULL,
      SupplierId INT NULL,
      Status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_ingredients_category
        FOREIGN KEY (CategoryId) REFERENCES ingredient_categories(IngredientCategoryId)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
      CONSTRAINT fk_ingredients_supplier
        FOREIGN KEY (SupplierId) REFERENCES suppliers(SupplierId)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
      CONSTRAINT chk_ingredients_min_stock CHECK (MinStock >= 0),
      CONSTRAINT chk_ingredients_current_stock CHECK (CurrentStock >= 0),
      CONSTRAINT chk_ingredients_cost_price CHECK (CostPrice >= 0)
    )
  `,
  `
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
    )
  `,
  `
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
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS stock_receipt_details (
      StockReceiptDetailId INT AUTO_INCREMENT PRIMARY KEY,
      StockReceiptId INT NOT NULL,
      IngredientId INT NOT NULL,
      PurchaseQuantity DECIMAL(12, 3) NULL,
      PurchaseUnit VARCHAR(30) NULL,
      ConversionQuantity DECIMAL(12, 3) NULL,
      BaseUnit VARCHAR(30) NULL,
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
    )
  `,
  `
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
    )
  `,
]

const run = async () => {
  try {
    for (const statement of statements) {
      await db.promise().query(statement)
    }

    const [categoryColumnRows] = await db.promise().query(
      `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'ingredients'
          AND COLUMN_NAME = 'CategoryId'
      `
    )

    if (categoryColumnRows.length === 0) {
      await db.promise().query('ALTER TABLE ingredients ADD COLUMN CategoryId INT NULL AFTER CostPrice')
    }

    const [categoryConstraintRows] = await db.promise().query(
      `
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'ingredients'
          AND COLUMN_NAME = 'CategoryId'
          AND REFERENCED_TABLE_NAME = 'ingredient_categories'
      `
    )

    if (categoryConstraintRows.length === 0) {
      await db.promise().query(
        `
          ALTER TABLE ingredients
          ADD CONSTRAINT fk_ingredients_category
          FOREIGN KEY (CategoryId) REFERENCES ingredient_categories(IngredientCategoryId)
          ON UPDATE CASCADE
          ON DELETE SET NULL
        `
      )
    }

    const ensureColumn = async (tableName, columnName, definition) => {
      const [rows] = await db.promise().query(
        `
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME = ?
        `,
        [tableName, columnName]
      )

      if (rows.length === 0) {
        await db.promise().query(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`)
      }
    }

    await ensureColumn('stock_receipt_details', 'PurchaseQuantity', 'PurchaseQuantity DECIMAL(12, 3) NULL AFTER IngredientId')
    await ensureColumn('stock_receipt_details', 'PurchaseUnit', 'PurchaseUnit VARCHAR(30) NULL AFTER PurchaseQuantity')
    await ensureColumn('stock_receipt_details', 'ConversionQuantity', 'ConversionQuantity DECIMAL(12, 3) NULL AFTER PurchaseUnit')
    await ensureColumn('stock_receipt_details', 'BaseUnit', 'BaseUnit VARCHAR(30) NULL AFTER ConversionQuantity')

    console.log('Inventory schema migration completed')
    process.exit(0)
  } catch (error) {
    console.error('Inventory schema migration failed', error)
    process.exit(1)
  }
}

run()
