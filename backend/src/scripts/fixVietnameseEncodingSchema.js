const db = require('../config/database')

const statements = [
  "ALTER TABLE employees MODIFY Gender VARCHAR(20) NULL",
  "ALTER TABLE employees MODIFY WorkShift VARCHAR(20) NULL",
  `
    UPDATE employees
    SET Gender = CASE Gender
      WHEN 'Ná»¯' THEN 'Nữ'
      WHEN 'KhĂ¡c' THEN 'Khác'
      ELSE Gender
    END,
    WorkShift = CASE WorkShift
      WHEN 'SĂ¡ng' THEN 'Sáng'
      WHEN 'Chiá»u' THEN 'Chiều'
      WHEN 'Tá»‘i' THEN 'Tối'
      ELSE WorkShift
    END,
    Position = CASE Position
      WHEN 'NhĂ¢n viĂªn' THEN 'Nhân viên'
      WHEN 'Pha cháº¿' THEN 'Pha chế'
      WHEN 'Thu ngĂ¢n' THEN 'Thu ngân'
      WHEN 'Phá»¥c vá»¥' THEN 'Phục vụ'
      WHEN 'Quáº£n lĂ½' THEN 'Quản lý'
      ELSE Position
    END
  `,
  `
    UPDATE roles
    SET RoleName = CASE RoleName
      WHEN 'NhĂ¢n viĂªn' THEN 'Nhân viên'
      WHEN 'Pha cháº¿' THEN 'Pha chế'
      ELSE RoleName
    END
  `,
  "ALTER TABLE employees MODIFY Gender ENUM('Nam', 'Nữ', 'Khác') NULL",
  "ALTER TABLE employees MODIFY WorkShift ENUM('Sáng', 'Chiều', 'Tối', 'Full') NULL",
]

const run = async () => {
  for (const statement of statements) {
    await db.promise().query(statement)
  }

  console.log('Vietnamese encoding schema/data is fixed.')
  db.end()
}

run().catch((error) => {
  console.error('Vietnamese encoding fix failed:', error)
  db.end()
  process.exit(1)
})
