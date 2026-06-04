const db = require('../config/database')

const statements = [
  `
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
    )
  `,
]

const run = async () => {
  try {
    for (const statement of statements) {
      await db.promise().query(statement)
    }

    console.log('Auth schema migration completed')
  } catch (error) {
    console.error('Auth schema migration failed', error)
    process.exitCode = 1
  } finally {
    db.end()
  }
}

run()
