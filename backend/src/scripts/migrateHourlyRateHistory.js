require('dotenv').config()
const db = require('../config/database')

async function run() {
  // Tạo bảng hourly_rate_history nếu chưa có
  await db.promise().query(`
    CREATE TABLE IF NOT EXISTS hourly_rate_history (
      HistoryId INT AUTO_INCREMENT PRIMARY KEY,
      EmployeeId INT NOT NULL,
      HourlyRate DECIMAL(12, 0) NOT NULL,
      EffectiveFrom DATE NOT NULL,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (EmployeeId) REFERENCES employees(EmployeeId) ON DELETE CASCADE,
      INDEX idx_employee_date (EmployeeId, EffectiveFrom)
    )
  `)
  console.log('✅ Bảng hourly_rate_history đã sẵn sàng')

  // Seed dữ liệu ban đầu từ employees (mỗi nhân viên 1 record với lương hiện tại)
  const [inserted] = await db.promise().query(`
    INSERT INTO hourly_rate_history (EmployeeId, HourlyRate, EffectiveFrom)
    SELECT
      EmployeeId,
      HourlyRate,
      COALESCE(
        DATE_FORMAT(HireDate, '%Y-%m-01'),
        DATE_FORMAT(NOW(), '%Y-%m-01')
      )
    FROM employees
    WHERE HourlyRate > 0
      AND EmployeeId NOT IN (SELECT DISTINCT EmployeeId FROM hourly_rate_history)
  `)
  console.log(`✅ Đã seed ${inserted.affectedRows} bản ghi lịch sử lương ban đầu`)

  process.exit(0)
}

run().catch((err) => { console.error('❌', err.message); process.exit(1) })
