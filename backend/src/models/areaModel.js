const db = require('../config/database')

const areaSelect = `
  SELECT
    AreaId AS id,
    AreaName AS name,
    Description AS description,
    CreatedAt AS createdAt,
    UpdatedAt AS updatedAt
  FROM areas
`

const getAreas = (keyword = '') => {
  const params = []
  let sql = areaSelect

  if (keyword) {
    sql += `
      WHERE AreaName LIKE ?
        OR Description LIKE ?
    `
    const likeKeyword = `%${keyword}%`
    params.push(likeKeyword, likeKeyword)
  }

  sql += ' ORDER BY AreaId DESC'

  return db.promise().query(sql, params).then(([rows]) => rows)
}

const findById = (id) => {
  const sql = `${areaSelect} WHERE AreaId = ? LIMIT 1`

  return db.promise().query(sql, [id]).then(([rows]) => rows[0])
}

const findByName = (name, excludeId) => {
  const params = [name]
  let sql = 'SELECT AreaId AS id FROM areas WHERE AreaName = ?'

  if (excludeId) {
    sql += ' AND AreaId <> ?'
    params.push(excludeId)
  }

  sql += ' LIMIT 1'

  return db.promise().query(sql, params).then(([rows]) => rows[0])
}

const createArea = async ({ name, description }) => {
  const sql = 'INSERT INTO areas (AreaName, Description) VALUES (?, ?)'
  const [result] = await db.promise().query(sql, [name, description || null])

  return findById(result.insertId)
}

const updateArea = async (id, { name, description }) => {
  const sql = 'UPDATE areas SET AreaName = ?, Description = ? WHERE AreaId = ?'

  await db.promise().query(sql, [name, description || null, id])

  return findById(id)
}

const getLinkedTableSource = async () => {
  const sql = `
    SELECT TABLE_NAME AS tableName
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('tables', 'coffee_tables')
      AND COLUMN_NAME = 'AreaId'
    LIMIT 1
  `
  const [rows] = await db.promise().query(sql)

  return rows[0]?.tableName || null
}

const countLinkedTables = async (id) => {
  const tableName = await getLinkedTableSource()

  if (!tableName) {
    return 0
  }

  const [rows] = await db.promise().query(`SELECT COUNT(*) AS total FROM \`${tableName}\` WHERE AreaId = ?`, [id])

  return Number(rows[0]?.total) || 0
}

const deleteArea = async (id) => {
  const [result] = await db.promise().query('DELETE FROM areas WHERE AreaId = ?', [id])

  return result.affectedRows > 0
}

module.exports = {
  getAreas,
  findById,
  findByName,
  createArea,
  updateArea,
  countLinkedTables,
  deleteArea,
}
