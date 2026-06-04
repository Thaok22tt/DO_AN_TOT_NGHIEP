const db = require('../config/database')

const employeeSelect = `
  SELECT
    e.EmployeeId AS id,
    e.FullName AS fullName,
    e.PhoneNumber AS phoneNumber,
    DATE_FORMAT(e.BirthDate, '%Y-%m-%d') AS birthDate,
    e.Gender AS gender,
    e.IdentityNumber AS identityNumber,
    DATE_FORMAT(e.HireDate, '%Y-%m-%d') AS hireDate,
    e.HourlyRate AS hourlyRate,
    e.Position AS position,
    e.WorkShift AS workShift,
    e.AccountId AS accountId,
    a.Username AS username,
    a.Status AS accountStatus,
    r.RoleName AS role
  FROM employees e
  INNER JOIN accounts a ON a.AccountId = e.AccountId
  INNER JOIN roles r ON r.RoleId = a.RoleId
`

const getEmployees = (keyword = '') => {
  const params = []
  let sql = employeeSelect

  if (keyword) {
    sql += `
      WHERE e.FullName LIKE ?
        OR e.PhoneNumber LIKE ?
        OR a.Username LIKE ?
    `
    const likeKeyword = `%${keyword}%`
    params.push(likeKeyword, likeKeyword, likeKeyword)
  }

  sql += ' ORDER BY e.EmployeeId DESC'

  return db.promise().query(sql, params).then(([rows]) => rows)
}

const findById = (id) => {
  const sql = `${employeeSelect} WHERE e.EmployeeId = ? LIMIT 1`

  return db.promise().query(sql, [id]).then(([rows]) => rows[0])
}

const findByAccountId = (accountId, excludeId) => {
  const params = [accountId]
  let sql = 'SELECT EmployeeId AS id FROM employees WHERE AccountId = ?'

  if (excludeId) {
    sql += ' AND EmployeeId <> ?'
    params.push(excludeId)
  }

  sql += ' LIMIT 1'

  return db.promise().query(sql, params).then(([rows]) => rows[0])
}

const getAssignableAccounts = (employeeId) => {
  const params = []
  let sql = `
    SELECT
      a.AccountId AS id,
      a.Username AS username,
      a.FullName AS fullName,
      a.Email AS email,
      a.PhoneNumber AS phoneNumber,
      a.Status AS status,
      r.RoleName AS role
    FROM accounts a
    INNER JOIN roles r ON r.RoleId = a.RoleId
    LEFT JOIN employees e ON e.AccountId = a.AccountId
    WHERE e.EmployeeId IS NULL
  `

  if (employeeId) {
    sql += ' OR e.EmployeeId = ?'
    params.push(employeeId)
  }

  sql += ' ORDER BY a.Username'

  return db.promise().query(sql, params).then(([rows]) => rows)
}

const createEmployee = async ({ fullName, phoneNumber, birthDate, gender, identityNumber, hireDate, hourlyRate, position, workShift, accountId }) => {
  const sql = `
    INSERT INTO employees
      (FullName, PhoneNumber, BirthDate, Gender, IdentityNumber, HireDate, HourlyRate, Position, WorkShift, AccountId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  const rate = Number(hourlyRate) || 0
  const params = [
    fullName,
    phoneNumber || null,
    birthDate || null,
    gender || null,
    identityNumber || null,
    hireDate || null,
    rate,
    position || null,
    workShift || null,
    accountId,
  ]
  const [result] = await db.promise().query(sql, params)

  if (rate > 0) {
    const effectiveFrom = hireDate
      ? hireDate.slice(0, 7) + '-01'
      : new Date().toISOString().slice(0, 7) + '-01'
    await db.promise().query(
      'INSERT INTO hourly_rate_history (EmployeeId, HourlyRate, EffectiveFrom) VALUES (?, ?, ?)',
      [result.insertId, rate, effectiveFrom],
    )
  }

  return findById(result.insertId)
}

const updateEmployee = async (id, { fullName, phoneNumber, birthDate, gender, identityNumber, hireDate, hourlyRate, position, workShift }) => {
  const newRate = Number(hourlyRate) || 0

  // Kiểm tra lương có thay đổi không — nếu có thì ghi vào lịch sử
  const [[current]] = await db.promise().query(
    'SELECT HourlyRate FROM employees WHERE EmployeeId = ? LIMIT 1',
    [id],
  )
  if (current && Number(current.HourlyRate) !== newRate && newRate > 0) {
    // Lương mới có hiệu lực từ đầu tháng hiện tại
    const effectiveFrom = new Date().toISOString().slice(0, 7) + '-01'
    await db.promise().query(
      'INSERT INTO hourly_rate_history (EmployeeId, HourlyRate, EffectiveFrom) VALUES (?, ?, ?)',
      [id, newRate, effectiveFrom],
    )
  }

  const sql = `
    UPDATE employees
    SET FullName = ?,
        PhoneNumber = ?,
        BirthDate = ?,
        Gender = ?,
        IdentityNumber = ?,
        HireDate = ?,
        HourlyRate = ?,
        Position = ?,
        WorkShift = ?
    WHERE EmployeeId = ?
  `
  const params = [
    fullName,
    phoneNumber || null,
    birthDate || null,
    gender || null,
    identityNumber || null,
    hireDate || null,
    newRate,
    position || null,
    workShift || null,
    id,
  ]

  await db.promise().query(sql, params)

  return findById(id)
}

const deleteEmployee = async (id) => {
  const [result] = await db.promise().query('DELETE FROM employees WHERE EmployeeId = ?', [id])

  return result.affectedRows > 0
}

const updateAccountStatus = async (accountId, status) => {
  await db.promise().query('UPDATE accounts SET Status = ? WHERE AccountId = ?', [status, accountId])
}

const getShiftTemplates = () => {
  const sql = `
    SELECT
      ShiftTemplateId AS id,
      ShiftName AS name,
      StartTime AS startTime,
      EndTime AS endTime,
      Status AS status,
      CreatedAt AS createdAt,
      UpdatedAt AS updatedAt
    FROM shift_templates
    ORDER BY StartTime, ShiftTemplateId
  `

  return db.promise().query(sql).then(([rows]) => rows)
}

const createShiftTemplate = async ({ name, startTime, endTime, status }) => {
  const [result] = await db.promise().query(
    'INSERT INTO shift_templates (ShiftName, StartTime, EndTime, Status) VALUES (?, ?, ?, ?)',
    [name, startTime, endTime, status || 'Active'],
  )

  return getShiftTemplateById(result.insertId)
}

const getShiftTemplateById = (id) => {
  const sql = `
    SELECT
      ShiftTemplateId AS id,
      ShiftName AS name,
      StartTime AS startTime,
      EndTime AS endTime,
      Status AS status
    FROM shift_templates
    WHERE ShiftTemplateId = ?
    LIMIT 1
  `

  return db.promise().query(sql, [id]).then(([rows]) => rows[0])
}

const updateShiftTemplate = async (id, { name, startTime, endTime, status }) => {
  await db.promise().query(
    'UPDATE shift_templates SET ShiftName = ?, StartTime = ?, EndTime = ?, Status = ? WHERE ShiftTemplateId = ?',
    [name, startTime, endTime, status || 'Active', id],
  )

  return getShiftTemplateById(id)
}

const deleteShiftTemplate = async (id) => {
  const [result] = await db.promise().query('DELETE FROM shift_templates WHERE ShiftTemplateId = ?', [id])

  return result.affectedRows > 0
}

const getShiftAssignments = ({ startDate, endDate } = {}) => {
  const params = []
  let sql = `
    SELECT
      sa.ShiftAssignmentId AS id,
      sa.EmployeeId AS employeeId,
      e.FullName AS employeeName,
      e.Position AS position,
      sa.ShiftTemplateId AS shiftTemplateId,
      st.ShiftName AS shiftName,
      st.StartTime AS startTime,
      st.EndTime AS endTime,
      DATE_FORMAT(sa.WorkDate, '%Y-%m-%d') AS workDate,
      sa.Note AS note,
      sa.CreatedAt AS createdAt
    FROM shift_assignments sa
    INNER JOIN employees e ON e.EmployeeId = sa.EmployeeId
    INNER JOIN shift_templates st ON st.ShiftTemplateId = sa.ShiftTemplateId
    WHERE 1 = 1
  `

  if (startDate) {
    sql += ' AND sa.WorkDate >= ?'
    params.push(startDate)
  }

  if (endDate) {
    sql += ' AND sa.WorkDate <= ?'
    params.push(endDate)
  }

  sql += ' ORDER BY sa.WorkDate DESC, st.StartTime, e.FullName'

  return db.promise().query(sql, params).then(([rows]) => rows)
}

const createShiftAssignment = async ({ employeeId, shiftTemplateId, workDate, note }) => {
  const [result] = await db.promise().query(
    'INSERT INTO shift_assignments (EmployeeId, ShiftTemplateId, WorkDate, Note) VALUES (?, ?, ?, ?)',
    [employeeId, shiftTemplateId, workDate, note || null],
  )

  return getShiftAssignmentById(result.insertId)
}

const getShiftAssignmentById = (id) => {
  const sql = `
    SELECT
      sa.ShiftAssignmentId AS id,
      sa.EmployeeId AS employeeId,
      e.FullName AS employeeName,
      sa.ShiftTemplateId AS shiftTemplateId,
      st.ShiftName AS shiftName,
      st.StartTime AS startTime,
      st.EndTime AS endTime,
      DATE_FORMAT(sa.WorkDate, '%Y-%m-%d') AS workDate,
      sa.Note AS note
    FROM shift_assignments sa
    INNER JOIN employees e ON e.EmployeeId = sa.EmployeeId
    INNER JOIN shift_templates st ON st.ShiftTemplateId = sa.ShiftTemplateId
    WHERE sa.ShiftAssignmentId = ?
    LIMIT 1
  `

  return db.promise().query(sql, [id]).then(([rows]) => rows[0])
}

const updateShiftAssignment = async (id, { employeeId, shiftTemplateId, workDate, note }) => {
  await db.promise().query(
    'UPDATE shift_assignments SET EmployeeId = ?, ShiftTemplateId = ?, WorkDate = ?, Note = ? WHERE ShiftAssignmentId = ?',
    [employeeId, shiftTemplateId, workDate, note || null, id],
  )

  return getShiftAssignmentById(id)
}

const deleteShiftAssignment = async (id) => {
  const [result] = await db.promise().query('DELETE FROM shift_assignments WHERE ShiftAssignmentId = ?', [id])

  return result.affectedRows > 0
}

const getAttendance = ({ startDate, endDate } = {}) => {
  const params = []
  let sql = `
    SELECT
      ws.WorkShiftId AS id,
      ws.AccountId AS accountId,
      e.EmployeeId AS employeeId,
      COALESCE(e.FullName, a.FullName) AS employeeName,
      e.Position AS position,
      r.RoleName AS role,
      DATE_FORMAT(ws.WorkDate, '%Y-%m-%d') AS workDate,
      ws.LoginAt AS loginAt,
      ws.LogoutAt AS logoutAt,
      ws.TotalHours AS totalHours
    FROM work_shifts ws
    INNER JOIN accounts a ON a.AccountId = ws.AccountId
    INNER JOIN roles r ON r.RoleId = a.RoleId
    LEFT JOIN employees e ON e.AccountId = ws.AccountId
    WHERE LOWER(r.RoleName) NOT IN ('admin', 'administrator', 'quan tri vien', 'quản trị viên')
  `

  if (startDate) {
    sql += ' AND ws.WorkDate >= ?'
    params.push(startDate)
  }

  if (endDate) {
    sql += ' AND ws.WorkDate <= ?'
    params.push(endDate)
  }

  sql += ' ORDER BY ws.WorkDate DESC, ws.LoginAt DESC'

  return db.promise().query(sql, params).then(([rows]) => rows)
}

const updateAttendance = async (id, { loginAt, logoutAt, workDate, totalHours }) => {
  await db.promise().query(
    `
      UPDATE work_shifts
      SET LoginAt = ?,
          LogoutAt = ?,
          WorkDate = ?,
          TotalHours = ?
      WHERE WorkShiftId = ?
    `,
    [loginAt, logoutAt || null, workDate, totalHours, id],
  )

  const [rows] = await db.promise().query(
    `
      SELECT
        WorkShiftId AS id,
        AccountId AS accountId,
        LoginAt AS loginAt,
        LogoutAt AS logoutAt,
        DATE_FORMAT(WorkDate, '%Y-%m-%d') AS workDate,
        TotalHours AS totalHours
      FROM work_shifts
      WHERE WorkShiftId = ?
      LIMIT 1
    `,
    [id],
  )

  return rows[0]
}

const getPayroll = ({ month }) => {
  const sql = `
    SELECT
      e.EmployeeId AS employeeId,
      a.AccountId AS accountId,
      COALESCE(e.FullName, a.FullName, a.Username) AS employeeName,
      COALESCE(e.Position, r.RoleName) AS position,
      -- Ưu tiên: snapshot đã thanh toán > lịch sử lương tháng đó > lương hiện tại
      COALESCE(pp.HourlyRate, hrh.HourlyRate, e.HourlyRate, 0) AS hourlyRate,
      COALESCE(ROUND(SUM(
        COALESCE(
          ws.TotalHours,
          TIMESTAMPDIFF(
            MINUTE,
            ws.LoginAt,
            CASE
              WHEN ws.LogoutAt IS NOT NULL THEN ws.LogoutAt
              WHEN DATE_FORMAT(ws.WorkDate, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') THEN NOW()
              ELSE TIMESTAMP(ws.WorkDate, '23:59:59')
            END
          ) / 60
        )
      ), 2), 0) AS totalHours,
      COALESCE(ROUND(SUM(
        COALESCE(
          ws.TotalHours,
          TIMESTAMPDIFF(
            MINUTE,
            ws.LoginAt,
            CASE
              WHEN ws.LogoutAt IS NOT NULL THEN ws.LogoutAt
              WHEN DATE_FORMAT(ws.WorkDate, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') THEN NOW()
              ELSE TIMESTAMP(ws.WorkDate, '23:59:59')
            END
          ) / 60
        )
      ) * COALESCE(pp.HourlyRate, hrh.HourlyRate, e.HourlyRate, 0), 0), 0) AS salary,
      pp.Status AS paymentStatus,
      pp.PaidAt AS paidAt
    FROM accounts a
    INNER JOIN roles r ON r.RoleId = a.RoleId
    LEFT JOIN employees e ON e.AccountId = a.AccountId
    LEFT JOIN work_shifts ws
      ON ws.AccountId = a.AccountId
      AND DATE_FORMAT(ws.WorkDate, '%Y-%m') = ?
    LEFT JOIN payroll_payments pp
      ON pp.EmployeeId = e.EmployeeId
      AND pp.PayrollMonth = ?
    -- Tra lịch sử lương: lấy mức lương có hiệu lực gần nhất tính đến cuối tháng đang xem
    LEFT JOIN (
      SELECT h1.EmployeeId, h1.HourlyRate
      FROM hourly_rate_history h1
      WHERE h1.EffectiveFrom = (
        SELECT MAX(h2.EffectiveFrom)
        FROM hourly_rate_history h2
        WHERE h2.EmployeeId = h1.EmployeeId
          AND h2.EffectiveFrom <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))
      )
    ) hrh ON hrh.EmployeeId = e.EmployeeId
    WHERE LOWER(r.RoleName) NOT IN ('admin', 'administrator', 'quan tri vien', 'quản trị viên')
      AND (e.EmployeeId IS NOT NULL OR ws.WorkShiftId IS NOT NULL)
    GROUP BY e.EmployeeId, a.AccountId, a.FullName, a.Username, r.RoleName, e.FullName, e.Position, e.HourlyRate, hrh.HourlyRate, pp.Status, pp.PaidAt
    ORDER BY employeeName
  `

  return db.promise().query(sql, [month, month, month]).then(([rows]) => rows)
}

const markPayrollPaid = async ({ employeeId, month, status }) => {
  // Lấy HourlyRate hiện tại để snapshot — tháng sau đổi lương vẫn giữ đúng lịch sử
  const [[emp]] = await db.promise().query(
    'SELECT HourlyRate FROM employees WHERE EmployeeId = ? LIMIT 1',
    [employeeId]
  )
  const hourlyRate = emp?.HourlyRate ?? null

  await db.promise().query(
    `
      INSERT INTO payroll_payments (EmployeeId, PayrollMonth, Status, HourlyRate, PaidAt)
      VALUES (?, ?, ?, ?, CASE WHEN ? = 'Paid' THEN NOW() ELSE NULL END)
      ON DUPLICATE KEY UPDATE
        Status = VALUES(Status),
        HourlyRate = COALESCE(HourlyRate, VALUES(HourlyRate)),
        PaidAt = CASE WHEN VALUES(Status) = 'Paid' THEN NOW() ELSE NULL END
    `,
    [employeeId, month, status, hourlyRate, status],
  )
}

module.exports = {
  getEmployees,
  findById,
  findByAccountId,
  getAssignableAccounts,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updateAccountStatus,
  getShiftTemplates,
  getShiftTemplateById,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
  getShiftAssignments,
  getShiftAssignmentById,
  createShiftAssignment,
  updateShiftAssignment,
  deleteShiftAssignment,
  getAttendance,
  updateAttendance,
  getPayroll,
  markPayrollPaid,
}
