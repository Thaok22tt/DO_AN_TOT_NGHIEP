const db = require('../config/database')

const schema = process.env.DB_NAME

const columnsToAdd = [
  {
    after: 'AccountId',
    column: "PromotionId INT NULL",
    name: 'PromotionId',
    table: 'invoices',
  },
  {
    after: 'InvoiceCode',
    column: 'ServiceNumber VARCHAR(20) NULL',
    name: 'ServiceNumber',
    table: 'invoices',
  },
  {
    after: 'PromotionId',
    column: "OrderType ENUM('DineIn', 'Takeaway', 'Ship') NOT NULL DEFAULT 'DineIn'",
    name: 'OrderType',
    table: 'invoices',
  },
  {
    after: 'OrderType',
    column: "KitchenStatus ENUM('Draft', 'Waiting', 'InProgress', 'Completed') NOT NULL DEFAULT 'Draft'",
    name: 'KitchenStatus',
    table: 'invoices',
  },
  {
    after: 'PaymentMethod',
    column: 'AmountReceived DECIMAL(12,2) NULL',
    name: 'AmountReceived',
    table: 'invoices',
  },
  {
    after: 'CustomerName',
    column: 'ShippingFee DECIMAL(12,2) NOT NULL DEFAULT 0',
    name: 'ShippingFee',
    table: 'invoices',
  },
  {
    after: 'AmountReceived',
    column: 'ChangeAmount DECIMAL(12,2) NULL',
    name: 'ChangeAmount',
    table: 'invoices',
  },
  {
    after: 'LineTotal',
    column: 'Note VARCHAR(200) NULL',
    name: 'Note',
    table: 'invoice_details',
  },
]

const connection = db.promise()

const columnExists = async (table, column) => {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [schema, table, column]
  )

  return Number(rows[0]?.total || 0) > 0
}

const constraintExists = async (table, constraintName) => {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
    `,
    [schema, table, constraintName]
  )

  return Number(rows[0]?.total || 0) > 0
}

async function run() {
  for (const item of columnsToAdd) {
    const exists = await columnExists(item.table, item.name)
    if (exists) {
      console.log(`SKIP column ${item.table}.${item.name}`)
      continue
    }

    await connection.query(`ALTER TABLE \`${item.table}\` ADD COLUMN ${item.column} AFTER ${item.after}`)
    console.log(`OK column ${item.table}.${item.name}`)
  }

  if (await columnExists('invoices', 'OrderType')) {
    await connection.query("ALTER TABLE invoices MODIFY COLUMN OrderType ENUM('DineIn', 'Takeaway', 'Ship') NOT NULL DEFAULT 'DineIn'")
    console.log('OK column invoices.OrderType supports Ship')
  }

  if (await columnExists('invoices', 'Status')) {
    await connection.query("ALTER TABLE invoices MODIFY COLUMN Status ENUM('Unpaid', 'Paid', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Unpaid'")
    console.log('OK column invoices.Status supports Completed')
  }

  if (await columnExists('invoices', 'KitchenStatus')) {
    await connection.query("UPDATE invoices SET Status = 'Completed', KitchenStatus = 'Completed' WHERE KitchenStatus = 'Served'")
    await connection.query("ALTER TABLE invoices MODIFY COLUMN KitchenStatus ENUM('Draft', 'Waiting', 'InProgress', 'Completed') NOT NULL DEFAULT 'Draft'")
    console.log('OK column invoices.KitchenStatus uses preparation statuses only')
  }

  if (!(await constraintExists('invoices', 'fk_invoices_promotion'))) {
    await connection.query(`
      ALTER TABLE invoices
      ADD CONSTRAINT fk_invoices_promotion
      FOREIGN KEY (PromotionId) REFERENCES promotions(PromotionId)
      ON UPDATE CASCADE
      ON DELETE SET NULL
    `)
    console.log('OK constraint invoices.fk_invoices_promotion')
  } else {
    console.log('SKIP constraint invoices.fk_invoices_promotion')
  }
}

run()
  .then(() => {
    console.log('Workstation schema migration done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Workstation schema migration failed')
    console.error(error)
    process.exit(1)
  })
