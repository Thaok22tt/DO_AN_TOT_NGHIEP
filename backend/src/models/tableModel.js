const db = require('../config/database')

const tableSelect = `
  SELECT
    t.TableId AS id,
    t.TableName AS name,
    t.AreaId AS areaId,
    a.AreaName AS areaName,
    t.Status AS status,
    t.CreatedAt AS createdAt,
    t.UpdatedAt AS updatedAt
  FROM \`tables\` t
  INNER JOIN areas a ON a.AreaId = t.AreaId
`

const getTables = ({ keyword = '', areaId = 0 } = {}) => {
  const conditions = []
  const params = []
  let sql = tableSelect

  if (keyword) {
    conditions.push('(t.TableName LIKE ? OR a.AreaName LIKE ?)')
    const likeKeyword = `%${keyword}%`
    params.push(likeKeyword, likeKeyword)
  }

  if (areaId) {
    conditions.push('t.AreaId = ?')
    params.push(areaId)
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`
  }

  sql += ' ORDER BY t.TableId DESC'

  return db.promise().query(sql, params).then(([rows]) => rows)
}

const findById = (id) => {
  const sql = `${tableSelect} WHERE t.TableId = ? LIMIT 1`

  return db.promise().query(sql, [id]).then(([rows]) => rows[0])
}

const findByNameInArea = (name, areaId, excludeId) => {
  const params = [name, areaId]
  let sql = 'SELECT TableId AS id FROM `tables` WHERE TableName = ? AND AreaId = ?'

  if (excludeId) {
    sql += ' AND TableId <> ?'
    params.push(excludeId)
  }

  sql += ' LIMIT 1'

  return db.promise().query(sql, params).then(([rows]) => rows[0])
}

const createTable = async ({ name, areaId, status }) => {
  const sql = 'INSERT INTO `tables` (TableName, AreaId, Status) VALUES (?, ?, ?)'
  const [result] = await db.promise().query(sql, [name, areaId, status])

  return findById(result.insertId)
}

const updateTable = async (id, { name, areaId, status }) => {
  const sql = 'UPDATE `tables` SET TableName = ?, AreaId = ?, Status = ? WHERE TableId = ?'

  await db.promise().query(sql, [name, areaId, status, id])

  return findById(id)
}

const deleteTable = async (id) => {
  const [result] = await db.promise().query('DELETE FROM `tables` WHERE TableId = ?', [id])

  return result.affectedRows > 0
}

module.exports = {
  getTables,
  findById,
  findByNameInArea,
  createTable,
  updateTable,
  deleteTable,
}
