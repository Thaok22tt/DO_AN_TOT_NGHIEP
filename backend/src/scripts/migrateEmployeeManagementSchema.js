const db = require('../config/database')

const statements = [
  "ALTER TABLE employees ADD COLUMN IdentityNumber VARCHAR(20) NULL AFTER Gender",
  "ALTER TABLE employees ADD COLUMN HireDate DATE NULL AFTER IdentityNumber",
  "ALTER TABLE employees ADD COLUMN HourlyRate DECIMAL(12, 0) NOT NULL DEFAULT 0 AFTER HireDate",
  `
    CREATE TABLE IF NOT EXISTS shift_templates (
      ShiftTemplateId INT AUTO_INCREMENT PRIMARY KEY,
      ShiftName VARCHAR(100) NOT NULL UNIQUE,
      StartTime TIME NOT NULL,
      EndTime TIME NOT NULL,
      Status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `,
  `
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
    )
  `,
  `
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
    )
  `,
]

const run = async () => {
  for (const statement of statements) {
    try {
      await db.promise().query(statement)
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME' && error.code !== 'ER_CANT_CREATE_TABLE') {
        throw error
      }
    }
  }

  console.log('Employee management schema is up to date.')
  db.end()
}

run().catch((error) => {
  console.error('Employee management migration failed:', error)
  db.end()
  process.exit(1)
})
