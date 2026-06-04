const db = require('../config/database')

const categorySelect = `
  SELECT
    CategoryId AS id,
    CategoryName AS name,
    Description AS description,
    CreatedAt AS createdAt,
    UpdatedAt AS updatedAt
  FROM categories
`

const getCategories = (keyword = '') => {
  const params = []
  let sql = categorySelect

  if (keyword) {
    sql += `
      WHERE CategoryName LIKE ?
        OR Description LIKE ?
    `
    const likeKeyword = `%${keyword}%`
    params.push(likeKeyword, likeKeyword)
  }

  sql += ' ORDER BY CategoryId DESC'

  return db.promise().query(sql, params).then(([rows]) => rows)
}

const findById = (id) => {
  const sql = `${categorySelect} WHERE CategoryId = ? LIMIT 1`

  return db.promise().query(sql, [id]).then(([rows]) => rows[0])
}

const findByName = (name, excludeId) => {
  const params = [name]
  let sql = 'SELECT CategoryId AS id FROM categories WHERE CategoryName = ?'

  if (excludeId) {
    sql += ' AND CategoryId <> ?'
    params.push(excludeId)
  }

  sql += ' LIMIT 1'

  return db.promise().query(sql, params).then(([rows]) => rows[0])
}

const createCategory = async ({ name, description }) => {
  const sql = 'INSERT INTO categories (CategoryName, Description) VALUES (?, ?)'
  const [result] = await db.promise().query(sql, [name, description || null])

  return findById(result.insertId)
}

const updateCategory = async (id, { name, description }) => {
  const sql = 'UPDATE categories SET CategoryName = ?, Description = ? WHERE CategoryId = ?'

  await db.promise().query(sql, [name, description || null, id])

  return findById(id)
}

const hasProductsTable = async () => {
  const sql = `
    SELECT COUNT(*) AS total
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
  `
  const [rows] = await db.promise().query(sql)

  return Number(rows[0]?.total) > 0
}

const countLinkedProducts = async (id) => {
  if (!(await hasProductsTable())) {
    return 0
  }

  const [rows] = await db.promise().query('SELECT COUNT(*) AS total FROM products WHERE CategoryId = ?', [id])

  return Number(rows[0]?.total) || 0
}

const deleteCategory = async (id) => {
  const [result] = await db.promise().query('DELETE FROM categories WHERE CategoryId = ?', [id])

  return result.affectedRows > 0
}

module.exports = {
  getCategories,
  findById,
  findByName,
  createCategory,
  updateCategory,
  countLinkedProducts,
  deleteCategory,
}
