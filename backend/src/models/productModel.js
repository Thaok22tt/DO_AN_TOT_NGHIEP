const db = require('../config/database')

const productSelect = `
  SELECT
    p.ProductId AS id,
    p.ProductName AS name,
    p.CategoryId AS categoryId,
    c.CategoryName AS categoryName,
    p.Price AS price,
    p.Description AS description,
    p.Image AS image,
    p.Status AS status,
    p.CreatedAt AS createdAt,
    p.UpdatedAt AS updatedAt
  FROM products p
  INNER JOIN categories c ON c.CategoryId = p.CategoryId
`

const getProducts = ({ keyword = '', categoryId = 0 } = {}) => {
  const conditions = []
  const params = []
  let sql = productSelect

  if (keyword) {
    conditions.push('(p.ProductName LIKE ? OR p.Description LIKE ? OR c.CategoryName LIKE ?)')
    const likeKeyword = `%${keyword}%`
    params.push(likeKeyword, likeKeyword, likeKeyword)
  }

  if (categoryId) {
    conditions.push('p.CategoryId = ?')
    params.push(categoryId)
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`
  }

  sql += ' ORDER BY p.ProductId DESC'

  return db.promise().query(sql, params).then(([rows]) => rows)
}

const findById = (id) => {
  const sql = `${productSelect} WHERE p.ProductId = ? LIMIT 1`

  return db.promise().query(sql, [id]).then(([rows]) => rows[0])
}

const createProduct = async ({ name, categoryId, price, description, image, status }) => {
  const sql = `
    INSERT INTO products
      (ProductName, CategoryId, Price, Description, Image, Status)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  const [result] = await db.promise().query(sql, [name, categoryId, price, description || null, image || null, status])

  return findById(result.insertId)
}

const updateProduct = async (id, { name, categoryId, price, description, image, status }) => {
  const sql = `
    UPDATE products
    SET ProductName = ?,
        CategoryId = ?,
        Price = ?,
        Description = ?,
        Image = ?,
        Status = ?
    WHERE ProductId = ?
  `

  await db.promise().query(sql, [name, categoryId, price, description || null, image || null, status, id])

  return findById(id)
}

const deleteProduct = async (id) => {
  const [result] = await db.promise().query('DELETE FROM products WHERE ProductId = ?', [id])

  return result.affectedRows > 0
}

module.exports = {
  getProducts,
  findById,
  createProduct,
  updateProduct,
  deleteProduct,
}
