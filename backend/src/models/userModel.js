const db = require('../config/database')

const connection = db.promise()

const findByUsername = (username) => {
  const sql = `
    SELECT
      a.AccountId AS id,
      a.Username AS username,
      a.Password AS password,
      a.FullName AS full_name,
      a.Status AS status,
      r.RoleName AS role
    FROM accounts a
    INNER JOIN roles r ON r.RoleId = a.RoleId
    WHERE a.Username = ?
    LIMIT 1
  `

  return connection.query(sql, [username]).then(([rows]) => rows[0])
}

const findByLogin = (login) => {
  const sql = `
    SELECT
      a.AccountId AS id,
      a.Username AS username,
      a.Password AS password,
      a.FullName AS full_name,
      a.Email AS email,
      a.Status AS status,
      r.RoleName AS role
    FROM accounts a
    INNER JOIN roles r ON r.RoleId = a.RoleId
    WHERE a.Username = ? OR a.Email = ?
    LIMIT 1
  `

  return connection.query(sql, [login, login]).then(([rows]) => rows[0])
}

const findById = (id) => {
  const sql = `
    SELECT
      a.AccountId AS id,
      a.Username AS username,
      a.FullName AS fullName,
      a.Email AS email,
      a.PhoneNumber AS phoneNumber,
      a.Status AS status,
      a.RoleId AS roleId,
      r.RoleName AS role
    FROM accounts a
    INNER JOIN roles r ON r.RoleId = a.RoleId
    WHERE a.AccountId = ?
    LIMIT 1
  `

  return connection.query(sql, [id]).then(([rows]) => rows[0])
}

const findAuthById = (id) => {
  const sql = `
    SELECT
      a.AccountId AS id,
      a.Username AS username,
      a.Password AS password,
      a.FullName AS fullName,
      a.Email AS email,
      a.PhoneNumber AS phoneNumber,
      a.Status AS status,
      a.RoleId AS roleId,
      r.RoleName AS role
    FROM accounts a
    INNER JOIN roles r ON r.RoleId = a.RoleId
    WHERE a.AccountId = ?
    LIMIT 1
  `

  return connection.query(sql, [id]).then(([rows]) => rows[0])
}

const findTodayShiftAssignmentByAccountId = (accountId) => {
  const sql = `
    SELECT
      sa.ShiftAssignmentId AS id,
      sa.EmployeeId AS employeeId,
      sa.ShiftTemplateId AS shiftTemplateId,
      st.ShiftName AS shiftName,
      TIME_FORMAT(st.StartTime, '%H:%i') AS startTime,
      TIME_FORMAT(st.EndTime, '%H:%i') AS endTime,
      DATE_FORMAT(sa.WorkDate, '%Y-%m-%d') AS workDate,
      sa.Note AS note
    FROM shift_assignments sa
    INNER JOIN employees e ON e.EmployeeId = sa.EmployeeId
    INNER JOIN shift_templates st ON st.ShiftTemplateId = sa.ShiftTemplateId
    WHERE e.AccountId = ?
      AND sa.WorkDate = CURDATE()
      AND st.Status = 'Active'
    ORDER BY st.StartTime ASC, sa.ShiftAssignmentId ASC
    LIMIT 1
  `

  return connection.query(sql, [accountId]).then(([rows]) => rows[0] || null)
}

const findEmployeeShiftByAccountId = (accountId) => {
  const sql = `
    SELECT
      e.EmployeeId AS employeeId,
      e.WorkShift AS shiftName,
      CASE e.WorkShift
        WHEN 'Sáng' THEN '06:00'
        WHEN 'Chiều' THEN '11:00'
        WHEN 'Tối' THEN '17:00'
        WHEN 'Full' THEN '08:00'
        ELSE NULL
      END AS startTime,
      CASE e.WorkShift
        WHEN 'Sáng' THEN '11:00'
        WHEN 'Chiều' THEN '17:00'
        WHEN 'Tối' THEN '22:00'
        WHEN 'Full' THEN '17:00'
        ELSE NULL
      END AS endTime
    FROM employees e
    WHERE e.AccountId = ?
      AND e.WorkShift IS NOT NULL
      AND e.WorkShift <> ''
    LIMIT 1
  `

  return connection.query(sql, [accountId]).then(([rows]) => rows[0] || null)
}

const findRoleById = (roleId) => {
  const sql = `
    SELECT RoleId AS id, RoleName AS name
    FROM roles
    WHERE RoleId = ?
    LIMIT 1
  `

  return connection.query(sql, [roleId]).then(([rows]) => rows[0])
}

const findByUsernameOrEmail = (username, email, excludeId) => {
  const params = [username]
  let sql = `
    SELECT
      AccountId AS id,
      Username AS username,
      Email AS email
    FROM accounts
    WHERE Username = ?
  `

  if (email) {
    sql += ' OR Email = ?'
    params.push(email)
  }

  if (excludeId) {
    sql = `SELECT * FROM (${sql}) existing_accounts WHERE id <> ?`
    params.push(excludeId)
  }

  sql += ' LIMIT 1'

  return connection.query(sql, params).then(([rows]) => rows[0])
}

const getRoles = () => {
  const sql = `
    SELECT RoleId AS id, RoleName AS name
    FROM roles
    ORDER BY RoleName
  `

  return connection.query(sql).then(([rows]) => rows)
}

const getAccounts = () => {
  const sql = `
    SELECT
      a.AccountId AS id,
      a.Username AS username,
      a.FullName AS fullName,
      a.Email AS email,
      a.PhoneNumber AS phoneNumber,
      a.Status AS status,
      a.RoleId AS roleId,
      r.RoleName AS role,
      ws.LoginAt AS shiftLoginAt,
      CASE WHEN ws.WorkShiftId IS NULL THEN 0 ELSE 1 END AS isOnShift,
      a.CreatedAt AS createdAt
    FROM accounts a
    INNER JOIN roles r ON r.RoleId = a.RoleId
    LEFT JOIN work_shifts ws ON ws.AccountId = a.AccountId AND ws.LogoutAt IS NULL
    ORDER BY a.AccountId DESC
  `

  return connection.query(sql).then(([rows]) => rows)
}

const createAccount = async ({ username, password, fullName, email, phoneNumber, roleId, status }) => {
  const sql = `
    INSERT INTO accounts
      (Username, Password, FullName, Email, PhoneNumber, RoleId, Status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  const params = [username, password, fullName, email || null, phoneNumber || null, roleId, status]
  const [result] = await connection.query(sql, params)

  return findById(result.insertId)
}

const updateAccount = async (id, { username, fullName, email, phoneNumber, roleId, status, password }) => {
  const fields = [
    'Username = ?',
    'FullName = ?',
    'Email = ?',
    'PhoneNumber = ?',
    'RoleId = ?',
    'Status = ?',
  ]
  const params = [username, fullName, email || null, phoneNumber || null, roleId, status]

  if (password) {
    fields.push('Password = ?')
    params.push(password)
  }

  params.push(id)

  await connection.query(`UPDATE accounts SET ${fields.join(', ')} WHERE AccountId = ?`, params)

  return findById(id)
}

const updateStatus = async (id, status) => {
  await connection.query('UPDATE accounts SET Status = ? WHERE AccountId = ?', [status, id])

  return findById(id)
}

const updateRole = async (id, roleId) => {
  await connection.query('UPDATE accounts SET RoleId = ? WHERE AccountId = ?', [roleId, id])

  return findById(id)
}

const resetPassword = async (id, password) => {
  await connection.query('UPDATE accounts SET Password = ? WHERE AccountId = ?', [password, id])

  return findById(id)
}

const updateProfile = async (id, { fullName, email, phoneNumber }) => {
  await connection.query(
    'UPDATE accounts SET FullName = ?, Email = ?, PhoneNumber = ? WHERE AccountId = ?',
    [fullName, email || null, phoneNumber || null, id],
  )

  return findById(id)
}

const deleteAccount = async (id) => {
  await connection.query('DELETE FROM employees WHERE AccountId = ?', [id])
  const [result] = await connection.query('DELETE FROM accounts WHERE AccountId = ?', [id])

  return result.affectedRows > 0
}

const openWorkShift = async (accountId) => {
  const conn = await db.promise().getConnection()
  await conn.beginTransaction()

  try {
    await conn.query(
      `
        UPDATE work_shifts
        SET LogoutAt = TIMESTAMP(WorkDate, '23:59:59'),
            TotalHours = ROUND(TIMESTAMPDIFF(MINUTE, LoginAt, TIMESTAMP(WorkDate, '23:59:59')) / 60, 2)
        WHERE AccountId = ?
          AND LogoutAt IS NULL
          AND WorkDate < CURDATE()
      `,
      [accountId],
    )

    const [openRows] = await conn.query(
      `
        SELECT
          WorkShiftId AS id,
          AccountId AS accountId,
          LoginAt AS loginAt,
          LogoutAt AS logoutAt,
          WorkDate AS workDate,
          TotalHours AS totalHours
        FROM work_shifts
        WHERE AccountId = ?
          AND LogoutAt IS NULL
          AND WorkDate = CURDATE()
        ORDER BY WorkShiftId DESC
        LIMIT 1
        FOR UPDATE
      `,
      [accountId],
    )

    if (openRows[0]) {
      await conn.commit()
      return openRows[0]
    }

    const [result] = await conn.query(
      'INSERT INTO work_shifts (AccountId, LoginAt, WorkDate) VALUES (?, NOW(), CURDATE())',
      [accountId],
    )

    const [rows] = await conn.query(
      `
        SELECT
          WorkShiftId AS id,
          AccountId AS accountId,
          LoginAt AS loginAt,
          LogoutAt AS logoutAt,
          WorkDate AS workDate,
          TotalHours AS totalHours
        FROM work_shifts
        WHERE WorkShiftId = ?
        LIMIT 1
      `,
      [result.insertId],
    )

    await conn.commit()
    return rows[0]
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

const closeWorkShift = async (accountId) => {
  const [openRows] = await connection.query(
    'SELECT WorkShiftId AS id, LoginAt AS loginAt FROM work_shifts WHERE AccountId = ? AND LogoutAt IS NULL ORDER BY WorkShiftId DESC LIMIT 1',
    [accountId],
  )
  const shift = openRows[0]

  if (!shift) {
    return null
  }

  await connection.query(
    `
      UPDATE work_shifts
      SET LogoutAt = NOW(),
          TotalHours = ROUND(TIMESTAMPDIFF(MINUTE, LoginAt, NOW()) / 60, 2)
      WHERE WorkShiftId = ?
    `,
    [shift.id],
  )

  const [rows] = await connection.query(
    `
      SELECT
        WorkShiftId AS id,
        AccountId AS accountId,
        LoginAt AS loginAt,
        LogoutAt AS logoutAt,
        WorkDate AS workDate,
        TotalHours AS totalHours
      FROM work_shifts
      WHERE WorkShiftId = ?
      LIMIT 1
    `,
    [shift.id],
  )

  return rows[0]
}

module.exports = {
  findByUsername,
  findByLogin,
  findById,
  findAuthById,
  findTodayShiftAssignmentByAccountId,
  findEmployeeShiftByAccountId,
  findRoleById,
  findByUsernameOrEmail,
  getRoles,
  getAccounts,
  createAccount,
  updateAccount,
  updateRole,
  updateStatus,
  resetPassword,
  updateProfile,
  deleteAccount,
  openWorkShift,
  closeWorkShift,
}
