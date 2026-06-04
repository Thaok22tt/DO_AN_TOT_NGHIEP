const db = require('../config/database')

const promotionSelect = `
  SELECT
    PromotionId AS id,
    PromotionName AS name,
    PromotionCode AS code,
    DiscountType AS discountType,
    DiscountValue AS discountValue,
    DATE_FORMAT(StartDate, '%Y-%m-%d') AS startDate,
    DATE_FORMAT(EndDate, '%Y-%m-%d') AS endDate,
    Status AS status,
    CreatedAt AS createdAt,
    UpdatedAt AS updatedAt
  FROM promotions
`

const getPromotions = (keyword = '') => {
  const params = []
  let sql = promotionSelect

  if (keyword) {
    sql += `
      WHERE PromotionName LIKE ?
        OR DiscountType LIKE ?
        OR Status LIKE ?
    `
    const likeKeyword = `%${keyword}%`
    params.push(likeKeyword, likeKeyword, likeKeyword)
  }

  sql += ' ORDER BY PromotionId DESC'

  return db.promise().query(sql, params).then(([rows]) => rows)
}

const findById = (id) => {
  const sql = `${promotionSelect} WHERE PromotionId = ? LIMIT 1`

  return db.promise().query(sql, [id]).then(([rows]) => rows[0])
}

const findByName = (name, excludeId) => {
  const params = [name]
  let sql = 'SELECT PromotionId AS id FROM promotions WHERE PromotionName = ?'

  if (excludeId) {
    sql += ' AND PromotionId <> ?'
    params.push(excludeId)
  }

  sql += ' LIMIT 1'

  return db.promise().query(sql, params).then(([rows]) => rows[0])
}

const findActiveByName = (name) => {
  const sql = `
    SELECT PromotionId AS id
    FROM promotions
    WHERE LOWER(PromotionName) = LOWER(?)
      AND Status = 'Active'
      AND CURDATE() BETWEEN StartDate AND EndDate
    LIMIT 1
  `

  return db.promise().query(sql, [name]).then(([rows]) => rows[0])
}

const findActiveByCode = (code) => {
  const sql = `
    SELECT PromotionId AS id
    FROM promotions
    WHERE UPPER(PromotionCode) = UPPER(?)
      AND Status = 'Active'
      AND CURDATE() BETWEEN StartDate AND EndDate
    LIMIT 1
  `

  return db.promise().query(sql, [code]).then(([rows]) => rows[0])
}

const findByCode = (code, excludeId) => {
  const params = [code]
  let sql = 'SELECT PromotionId AS id FROM promotions WHERE PromotionCode = ?'

  if (excludeId) {
    sql += ' AND PromotionId <> ?'
    params.push(excludeId)
  }

  sql += ' LIMIT 1'

  return db.promise().query(sql, params).then(([rows]) => rows[0])
}

const buildPromotionCode = () => `KM${Date.now()}`

const createPromotion = async ({ name, discountType, discountValue, startDate, endDate, status }) => {
  const sql = `
    INSERT INTO promotions (PromotionName, PromotionCode, DiscountType, DiscountValue, StartDate, EndDate, Status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  const [result] = await db.promise().query(sql, [name, buildPromotionCode(), discountType, discountValue, startDate, endDate, status])

  return findById(result.insertId)
}

const updatePromotion = async (id, { name, discountType, discountValue, startDate, endDate, status }) => {
  const sql = `
    UPDATE promotions
    SET PromotionName = ?,
        DiscountType = ?,
        DiscountValue = ?,
        StartDate = ?,
        EndDate = ?,
        Status = ?
    WHERE PromotionId = ?
  `

  await db.promise().query(sql, [name, discountType, discountValue, startDate, endDate, status, id])

  return findById(id)
}

const isActivePromotion = async (id) => {
  const sql = `
    SELECT COUNT(*) AS total
    FROM promotions
    WHERE PromotionId = ?
      AND Status = 'Active'
      AND CURDATE() BETWEEN StartDate AND EndDate
  `
  const [rows] = await db.promise().query(sql, [id])

  return Number(rows[0]?.total) > 0
}

const deletePromotion = async (id) => {
  const [result] = await db.promise().query('DELETE FROM promotions WHERE PromotionId = ?', [id])

  return result.affectedRows > 0
}

module.exports = {
  getPromotions,
  findById,
  findActiveByCode,
  findActiveByName,
  findByCode,
  findByName,
  createPromotion,
  updatePromotion,
  isActivePromotion,
  deletePromotion,
}
