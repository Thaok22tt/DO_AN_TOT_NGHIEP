import { useEffect, useState } from 'react'
import {
  adjustIngredientStock,
  createIngredientCategory,
  createIngredient,
  createStockReceipt,
  deleteIngredientCategory,
  getInventoryBootstrap,
  updateIngredientCategory,
  updateIngredient,
} from '../../services/inventoryService'
import { formatCurrency, formatCurrencyInput, parseCurrency, sanitizeDecimalInput } from '../../utils/formatCurrency'
import { renderMaterialIcon } from '../../utils/adminUtils'
import { useConfirm } from '../../components/common/useConfirm'

const emptyReceiptForm = {
  note: '',
  supplierId: '',
}

const emptyReceiptItem = {
  baseUnit: '',
  categoryId: '',
  conversionQuantity: '',
  ingredientId: '',
  isNewIngredient: false,
  minStock: '',
  name: '',
  purchaseUnit: '',
  quantity: '',
  unitPrice: '',
}

const emptyLossForm = {
  ingredientId: '',
  note: '',
  quantity: '',
}

const emptyIngredientForm = {
  categoryId: '',
  costPrice: '',
  currentStock: '',
  minStock: '',
  name: '',
  status: 'Active',
  unit: '',
}

const emptyCategoryForm = {
  description: '',
  name: '',
}

const receiptPurchaseUnits = ['chai', 'kg', 'vỉ', 'túi', 'cái', 'hộp', 'lon', 'thùng', 'lít']

const inventoryTabs = [
  ['catalog', 'Danh mục'],
  ['stock', 'Nguyên liệu'],
  ['receipts', 'Nhập kho'],
  ['movements', 'Nhật ký'],
]

const formatQuantity = (value) => {
  const numberValue = Number(value || 0)
  return Number.isInteger(numberValue) ? String(numberValue) : String(Number(numberValue.toFixed(3)))
}

const parseDecimalInput = (value) => Number(sanitizeDecimalInput(value) || 0)

const formatDateTime = (value) => {
  if (!value) return 'Chưa cập nhật'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : date.toLocaleString('vi-VN')
}

const getStockPercent = (ingredient) => {
  const current = Number(ingredient.currentStock || 0)
  const min = Number(ingredient.minStock || 0)
  if (min <= 0) return current > 0 ? 100 : 0
  return Math.min(100, Math.round((current / Math.max(min * 2, 1)) * 100))
}

const getMovementMeta = (movement = {}) => {
  const type = String(movement.movementType || '').toLowerCase()
  const note = String(movement.note || '').toLowerCase()
  if (type.includes('import')) return { className: 'in', icon: 'arrow_downward', label: 'Nhập kho', sign: '+' }
  if (type.includes('sale') || type.includes('export')) return { className: 'out', icon: 'arrow_upward', label: 'Xuất kho', sign: '-' }
  if (note.includes('hao hụt') || note.includes('hao hut')) return { className: 'loss', icon: 'remove_shopping_cart', label: 'Hao hụt', sign: '-' }
  if (type.includes('adjust')) return { className: 'adjust', icon: 'tune', label: 'Điều chỉnh', sign: '' }
  return { className: 'loss', icon: 'history', label: movement.movementType || 'Biến động', sign: '' }
}

function InventorySection() {
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState('catalog')
  const [data, setData] = useState({
    categories: [],
    ingredients: [],
    lowStock: [],
    movements: [],
    receipts: [],
    suppliers: [],
  })
  const [receiptForm, setReceiptForm] = useState(emptyReceiptForm)
  const [receiptItems, setReceiptItems] = useState([])
  const [receiptDraftItem, setReceiptDraftItem] = useState(emptyReceiptItem)
  const [editingReceiptItemIndex, setEditingReceiptItemIndex] = useState(null)
  const [lossForm, setLossForm] = useState(emptyLossForm)
  const [ingredientForm, setIngredientForm] = useState(emptyIngredientForm)
  const [editingIngredientId, setEditingIngredientId] = useState(null)
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [thresholdValues, setThresholdValues] = useState({})
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showIngredientForm, setShowIngredientForm] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [errorDialog, setErrorDialog] = useState('')

  const loadInventory = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getInventoryBootstrap()
      setData({
        categories: result.categories || [],
        ingredients: result.ingredients || [],
        lowStock: result.lowStock || [],
        movements: result.movements || [],
        receipts: result.receipts || [],
        suppliers: result.suppliers || [],
      })
    } catch (loadError) {
      setErrorDialog(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [])

  useEffect(() => {
    if (categoryFilter !== 'all' && data.categories.length > 0) {
      const exists = data.categories.some((c) => String(c.id) === String(categoryFilter))
      if (!exists) setCategoryFilter('all')
    }
  }, [data.categories, categoryFilter])

  const getIngredientById = (id) => visibleIngredients.find((ingredient) => String(ingredient.id) === String(id))
  const getReceiptBaseQuantity = (item) => parseDecimalInput(item.quantity) * Math.max(parseDecimalInput(item.conversionQuantity) || 1, 1)
  const getReceiptBaseUnitPrice = (item) => {
    const conversionQuantity = Math.max(parseDecimalInput(item.conversionQuantity) || 1, 1)
    return parseCurrency(item.unitPrice) / conversionQuantity
  }
  const receiptTotal = receiptItems.reduce((sum, item) => sum + parseDecimalInput(item.quantity) * parseCurrency(item.unitPrice), 0)
  const ingredientLineTotal = parseDecimalInput(ingredientForm.currentStock) * parseCurrency(ingredientForm.costPrice)
  const visibleIngredients = data.ingredients.filter((ingredient) => ingredient.status !== 'Inactive')
  const normalizedSearch = ingredientSearch.trim().toLowerCase()
  const filteredIngredients = visibleIngredients.filter((ingredient) => {
    const isLowStock = Number(ingredient.currentStock || 0) <= Number(ingredient.minStock || 0)
    const matchesCategory = categoryFilter === 'all' || String(ingredient.categoryId || '') === String(categoryFilter)
    const matchesSearch =
      !normalizedSearch ||
      String(ingredient.name || '').toLowerCase().includes(normalizedSearch) ||
      String(ingredient.categoryName || '').toLowerCase().includes(normalizedSearch) ||
      String(ingredient.unit || '').toLowerCase().includes(normalizedSearch)

    if (!matchesCategory) return false
    if (!matchesSearch) return false
    if (stockFilter === 'low') return isLowStock
    if (stockFilter === 'normal') return !isLowStock
    return true
  })
  const receiptDraftCategoryIngredients = visibleIngredients.filter(
    (ingredient) => String(ingredient.categoryId || '') === String(receiptDraftItem.categoryId || '')
  )
  const getReceiptItemIngredient = (item) =>
    item.isNewIngredient
      ? {
          categoryId: item.categoryId,
          categoryName: data.categories.find((category) => String(category.id) === String(item.categoryId))?.name || 'Chưa phân loại',
          id: null,
          name: item.name,
          unit: item.baseUnit,
        }
      : getIngredientById(item.ingredientId)
  const runAction = async (action, successMessage) => {
    void successMessage
    setSaving(true)
    setError('')
    setMessage('')

    try {
      await action()
      await loadInventory()
      return true
    } catch (actionError) {
      setErrorDialog(actionError.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const updateIngredientForm = (field, value) => {
    setIngredientForm((current) => ({
      ...current,
      [field]: field === 'costPrice' ? formatCurrencyInput(value) : ['currentStock', 'minStock'].includes(field) ? sanitizeDecimalInput(value) : value,
    }))
  }

  const getIngredientCode = (ingredient) => `NL-${String(ingredient.id || '').padStart(3, '0')}`

  const getCategoryCode = (category) => `DMK-${String(category.id || '').padStart(3, '0')}`

  const getIngredientStatus = (ingredient) => {
    const isLowStock = Number(ingredient.currentStock || 0) <= Number(ingredient.minStock || 0)
    return {
      className: isLowStock ? 'warning' : 'ok',
      label: isLowStock ? 'Sắp hết' : 'Đủ hàng',
    }
  }

  const updateCategoryForm = (field, value) => {
    setCategoryForm((current) => ({ ...current, [field]: value }))
  }

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategoryForm)
    setEditingCategoryId(null)
    setShowCategoryForm(false)
  }

  const startCreateCategory = () => {
    setCategoryForm(emptyCategoryForm)
    setEditingCategoryId(null)
    setShowCategoryForm(true)
  }

  const saveCategory = async (event) => {
    event.preventDefault()
    const id = editingCategoryId
    const description = categoryForm.description.trim()
    const name = categoryForm.name.trim()

    if (!name) {
      setError('Vui lòng nhập tên nguyên liệu')
      return
    }

    const confirmed = await confirm({
      body: editingCategoryId ? `Cập nhật danh mục "${name}"?` : `Thêm danh mục "${name}"?`,
      confirmLabel: editingCategoryId ? 'Xác nhận' : 'Tiếp tục',
    })
    if (!confirmed) return

    const success = await runAction(
      () =>
        editingCategoryId
          ? updateIngredientCategory(id, { description, name, status: 'Active' })
          : createIngredientCategory({ description, name, status: 'Active' }),
      editingCategoryId ? `Đã cập nhật danh mục ${name}` : `Đã thêm danh mục ${name}`
    )

    if (success) resetCategoryForm()
  }

  const editCategory = (category) => {
    setEditingCategoryId(category.id)
    setCategoryForm({ description: category.description || '', name: category.name })
    setShowCategoryForm(true)
  }

  const deleteCategory = async (category) => {
    const confirmed = await confirm({
      body: (
        <>
          Xóa danh mục <strong>{category.name}</strong>? Hành động này không thể hoàn tác.
        </>
      ),
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return
    await runAction(() => deleteIngredientCategory(category.id), `Đã xóa danh mục ${category.name}`)
    if (editingCategoryId === category.id) resetCategoryForm()
  }

  const resetIngredientForm = () => {
    setIngredientForm(emptyIngredientForm)
    setEditingIngredientId(null)
    setShowIngredientForm(false)
  }

  const saveIngredient = async (event) => {
    event.preventDefault()

    const payload = {
      categoryId: ingredientForm.categoryId || null,
      costPrice: parseCurrency(ingredientForm.costPrice),
      minStock: parseDecimalInput(ingredientForm.minStock),
      name: ingredientForm.name.trim(),
      status: 'Active',
      supplierId: null,
      unit: ingredientForm.unit.trim(),
    }

    if (!payload.name || !payload.unit) {
      setError('Vui lòng nhập tên nguyên liệu và đơn vị')
      return
    }

    const confirmed = await confirm({
      body: `Cập nhật nguyên liệu "${payload.name}"?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    const nextStock = parseDecimalInput(ingredientForm.currentStock)
    const previousIngredient = visibleIngredients.find((ingredient) => String(ingredient.id) === String(editingIngredientId))
    const shouldAdjustStock = Number(previousIngredient?.currentStock || 0) !== nextStock

    const success = await runAction(
      async () => {
        await updateIngredient(editingIngredientId, payload)
        if (shouldAdjustStock) {
          await adjustIngredientStock(editingIngredientId, { note: 'Cập nhật số lượng từ danh sách nguyên liệu', quantity: nextStock })
        }
      },
      `Đã cập nhật nguyên liệu ${payload.name}`
    )

    if (success) {
      resetIngredientForm()
    }
  }

  const editIngredient = (ingredient) => {
    setActiveTab('stock')
    setEditingIngredientId(ingredient.id)
    setShowIngredientForm(true)
    setIngredientForm({
      costPrice: ingredient.costPrice ? formatCurrencyInput(ingredient.costPrice) : '',
      currentStock: formatQuantity(ingredient.currentStock ?? 0),
      categoryId: ingredient.categoryId || '',
      minStock: formatQuantity(ingredient.minStock ?? 0),
      name: ingredient.name || '',
      status: 'Active',
      unit: ingredient.unit || '',
    })
  }

  const deleteIngredient = async (ingredient) => {
    const confirmed = await confirm({
      body: (
        <>
          Xóa nguyên liệu <strong>{ingredient.name}</strong> khỏi danh mục?
        </>
      ),
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    await runAction(
      () =>
        updateIngredient(ingredient.id, {
          costPrice: Number(ingredient.costPrice || 0),
          categoryId: ingredient.categoryId || null,
          minStock: Number(ingredient.minStock || 0),
          name: ingredient.name,
          status: 'Inactive',
          supplierId: ingredient.supplierId || null,
          unit: ingredient.unit,
        }),
      `Đã xóa nguyên liệu ${ingredient.name}`
    )
  }

  const updateReceiptDraftItem = (field, value) => {
    setReceiptDraftItem((current) => {
      if (field === 'categoryId') {
        if (current.isNewIngredient) {
          // Nguyên liệu mới: chỉ đổi danh mục, giữ nguyên tên/đơn vị/ngưỡng
          return { ...current, categoryId: value }
        }
        // Nguyên liệu có sẵn: reset ingredient vì danh mục thay đổi
        return {
          ...current,
          categoryId: value,
          ingredientId: '',
          isNewIngredient: false,
          name: '',
          baseUnit: '',
          minStock: '',
        }
      }

      if (field !== 'ingredientId') {
        return {
          ...current,
          [field]: field === 'unitPrice' ? formatCurrencyInput(value) : ['quantity', 'conversionQuantity', 'minStock'].includes(field) ? sanitizeDecimalInput(value) : value,
        }
      }

      if (value === '__new__') {
        return {
          ...current,
          baseUnit: '',
          conversionQuantity: current.conversionQuantity,
          ingredientId: '',
          isNewIngredient: true,
          minStock: '',
          name: '',
          purchaseUnit: current.purchaseUnit || '',
        }
      }

      const ingredient = getIngredientById(value)
      return {
        ...current,
        baseUnit: ingredient?.unit || '',
        ingredientId: value,
        isNewIngredient: false,
        minStock: ingredient?.minStock || '',
        name: ingredient?.name || '',
        conversionQuantity: current.conversionQuantity,
        purchaseUnit: current.purchaseUnit,
      }
    })
  }

  const resetReceiptDraftItem = () => {
    setReceiptDraftItem(emptyReceiptItem)
    setEditingReceiptItemIndex(null)
  }

  const saveReceiptDraftItem = () => {
    const selectedIngredient = getReceiptItemIngredient(receiptDraftItem)
    const quantity = parseDecimalInput(receiptDraftItem.quantity)
    const conversionQuantity = parseDecimalInput(receiptDraftItem.conversionQuantity)
    const unitPrice = parseCurrency(receiptDraftItem.unitPrice)
    const minStock = parseDecimalInput(receiptDraftItem.minStock)

    if (!receiptDraftItem.categoryId) {
      setError('Vui lòng chọn danh mục trước khi thêm nguyên liệu vào phiếu')
      return
    }

    if (receiptDraftItem.isNewIngredient && (!receiptDraftItem.name.trim() || !receiptDraftItem.baseUnit || !Number.isFinite(minStock) || minStock < 0)) {
      setError('Vui lòng nhập tên nguyên liệu mới, đơn vị tồn kho và ngưỡng tối thiểu hợp lệ')
      return
    }

    if (!selectedIngredient || quantity <= 0 || conversionQuantity <= 0 || unitPrice < 0 || !receiptDraftItem.purchaseUnit) {
      setError('Vui lòng chọn nguyên liệu, số lượng, đơn vị nhập, quy đổi và giá nhập hợp lệ')
      return
    }

    const nextItem = { ...receiptDraftItem, baseUnit: selectedIngredient.unit, name: selectedIngredient.name }
    setReceiptItems((current) =>
      editingReceiptItemIndex === null
        ? [nextItem, ...current]
        : current.map((item, index) => (index === editingReceiptItemIndex ? nextItem : item))
    )
    setError('')
    resetReceiptDraftItem()
  }

  const editReceiptItem = (index) => {
    setReceiptDraftItem(receiptItems[index])
    setEditingReceiptItemIndex(index)
  }

  const removeReceiptItem = (index) => {
    setReceiptItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
    if (editingReceiptItemIndex === index) {
      resetReceiptDraftItem()
    } else if (editingReceiptItemIndex !== null && index < editingReceiptItemIndex) {
      setEditingReceiptItemIndex(editingReceiptItemIndex - 1)
    }
  }

  const saveReceipt = async (event) => {
    event.preventDefault()

    if (receiptItems.length === 0) {
      setError('Vui lòng thêm ít nhất một nguyên liệu vào phiếu nhập')
      return
    }

    const confirmed = await confirm({
      body: `Tạo phiếu nhập kho với ${receiptItems.length} nguyên liệu?`,
      confirmLabel: 'Tiếp tục',
    })
    if (!confirmed) return

    const success = await runAction(async () => {
      const resolvedDetails = []

      for (const item of receiptItems) {
        let ingredient = getIngredientById(item.ingredientId)

        if (item.isNewIngredient) {
          const result = await createIngredient({
            categoryId: item.categoryId,
            costPrice: getReceiptBaseUnitPrice(item),
            currentStock: 0,
            minStock: parseDecimalInput(item.minStock),
            name: item.name.trim(),
            status: 'Active',
            supplierId: null,
            unit: item.baseUnit,
          })
          ingredient = result.ingredient
        }

        if (!ingredient) {
          throw new Error(`Không tìm thấy nguyên liệu ${item.name || item.ingredientId}`)
        }

        resolvedDetails.push({
          baseUnit: ingredient.unit,
          conversionQuantity: parseDecimalInput(item.conversionQuantity) || 1,
          expiryDate: null,
          ingredientId: ingredient.id,
          purchaseQuantity: parseDecimalInput(item.quantity),
          purchaseUnit: item.purchaseUnit,
          purchaseUnitPrice: parseCurrency(item.unitPrice),
          quantity: getReceiptBaseQuantity(item),
          unitPrice: getReceiptBaseUnitPrice(item),
        })
      }

      await createStockReceipt({
        ...receiptForm,
        supplierId: receiptForm.supplierId || null,
        details: resolvedDetails,
      })
    }, 'Đã tạo phiếu nhập kho')

    if (success) {
      setReceiptForm(emptyReceiptForm)
      setReceiptItems([])
      resetReceiptDraftItem()
      setShowReceiptForm(false)
    }
  }

  const saveManualLoss = async (event) => {
    event.preventDefault()
    const ingredient = visibleIngredients.find((item) => String(item.id) === String(lossForm.ingredientId))
    const lossQuantity = parseDecimalInput(lossForm.quantity)

    if (!ingredient || !Number.isFinite(lossQuantity) || lossQuantity <= 0) {
      setError('Vui lòng chọn nguyên liệu và nhập số lượng hao hụt hợp lệ')
      return
    }

    const confirmed = await confirm({
      body: `Xác nhận xuất hao hụt ${formatQuantity(lossQuantity)} ${ingredient.unit} ${ingredient.name}?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    const currentStock = Number(ingredient.currentStock || 0)
    const nextStock = Math.max(0, currentStock - lossQuantity)
    const note = `Hao hụt thủ công${lossForm.note ? `: ${lossForm.note}` : ''}`
    const success = await runAction(
      () => adjustIngredientStock(ingredient.id, { note, quantity: nextStock }),
      `Đã xuất hao hụt ${formatQuantity(lossQuantity)} ${ingredient.unit} ${ingredient.name}`
    )

    if (success) {
      setLossForm(emptyLossForm)
    }
  }

  const saveThreshold = async (ingredient) => {
    const minStock = parseDecimalInput(thresholdValues[ingredient.id] ?? ingredient.minStock ?? 0)
    if (!Number.isFinite(minStock) || minStock < 0) {
      setError('Ngưỡng cảnh báo không hợp lệ')
      return
    }

    const confirmed = await confirm({
      body: `Cập nhật ngưỡng tối thiểu của "${ingredient.name}" thành ${formatQuantity(minStock)} ${ingredient.unit}?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    const payload = {
      costPrice: Number(ingredient.costPrice || 0),
      categoryId: ingredient.categoryId || null,
      minStock,
      name: ingredient.name,
      status: ingredient.status || 'Active',
      supplierId: ingredient.supplierId || null,
      unit: ingredient.unit,
    }
    const success = await runAction(() => updateIngredient(ingredient.id, payload), `Đã cập nhật ngưỡng cảnh báo ${ingredient.name}`)
    if (success) {
      setThresholdValues((current) => {
        const next = { ...current }
        delete next[ingredient.id]
        return next
      })
    }
  }

  const renderInventoryHeader = () => (
    <section className="inventory-toolbar" aria-label="Chức năng quản lý kho">
      <div className="inventory-redesign-tabs">
        {inventoryTabs.map(([value, label]) => (
          <button className={activeTab === value ? 'active' : ''} key={value} onClick={() => setActiveTab(value)} type="button">
            {label}
          </button>
        ))}
      </div>
      <div className="inventory-toolbar-actions">
        <label className="inventory-search-box">
          {renderMaterialIcon('search')}
          <input onChange={(event) => setIngredientSearch(event.target.value)} placeholder="Tìm kiếm nguyên liệu..." value={ingredientSearch} />
        </label>
        <label className="inventory-category-filter">
          {renderMaterialIcon('category')}
          <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            <option value="all">Tất cả nguyên liệu</option>
            {data.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {categoryFilter !== 'all' && (
            <button
              onClick={() => setCategoryFilter('all')}
              type="button"
              title="Xóa lọc danh mục"
              style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'#888',color:'#fff',border:'none',borderRadius:'50%',width:18,height:18,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}
            >×</button>
          )}
        </label>
        <section className="inventory-filter-menu">
          <button className={showFilterPanel ? 'active' : ''} onClick={() => setShowFilterPanel((current) => !current)} type="button">
            {renderMaterialIcon('filter_list')}
            <span>Lọc</span>
          </button>
          {showFilterPanel && (
            <div className="inventory-filter-popover">
              {[
                ['all', 'Tất cả'],
                ['low', 'Sắp hết'],
                ['normal', 'Bình thường'],
              ].map(([value, label]) => (
                <button className={stockFilter === value ? 'active' : ''} key={value} onClick={() => setStockFilter(value)} type="button">
                  {label}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )

  const renderStockRows = ({ thresholdMode = false } = {}) =>
    filteredIngredients.map((ingredient) => {
      const isLowStock = Number(ingredient.currentStock || 0) <= Number(ingredient.minStock || 0)
      const stockPercent = getStockPercent(ingredient)

      return (
        <tr key={ingredient.id}>
          <td>
            <div className="inventory-name-cell">
              <span>{renderMaterialIcon('restaurant')}</span>
              <div>
                <strong>{ingredient.name}</strong>
                <small>NL-{String(ingredient.id).padStart(5, '0')}</small>
              </div>
            </div>
          </td>
          <td>{ingredient.unit}</td>
          <td>
            <div className="inventory-stock-cell">
              <strong className={isLowStock ? 'danger' : ''}>{formatQuantity(ingredient.currentStock)}</strong>
              <div>
                <span style={{ width: `${stockPercent}%` }} />
              </div>
            </div>
          </td>
          <td>
            {thresholdMode ? (
              <input
                min="0"
                inputMode="decimal"
                onChange={(event) => setThresholdValues((current) => ({ ...current, [ingredient.id]: sanitizeDecimalInput(event.target.value) }))}
                type="text"
                value={thresholdValues[ingredient.id] ?? formatQuantity(ingredient.minStock)}
              />
            ) : (
              formatQuantity(ingredient.minStock)
            )}
          </td>
          <td>
            <span className={`inventory-status-chip ${isLowStock ? 'warning' : 'ok'}`}>{isLowStock ? 'Sắp hết' : 'Bình thường'}</span>
          </td>
          {thresholdMode && (
            <td>
              <button className="inventory-primary-button" disabled={saving} onClick={() => saveThreshold(ingredient)} type="button">
                {renderMaterialIcon('save')}
                <span>Lưu ngưỡng</span>
              </button>
            </td>
          )}
        </tr>
      )
    })

  const renderCategoryForm = () => (
    <form className="inventory-form-card embedded inventory-modal-form-body inventory-category-form" onSubmit={saveCategory}>
      <div className="inventory-form-grid">
        <label>
          <span>Tên nguyên liệu <b>*</b></span>
          <input onChange={(event) => updateCategoryForm('name', event.target.value)} placeholder="VD: Sữa & Kem" required value={categoryForm.name} />
        </label>
        <label className="full">
          <span>Mô tả</span>
          <textarea onChange={(event) => updateCategoryForm('description', event.target.value)} placeholder="Nhập mô tả danh mục..." rows="3" value={categoryForm.description} />
        </label>
      </div>
      <footer>
        <button className="inventory-secondary-button" onClick={resetCategoryForm} type="button">
          Hủy
        </button>
        <button className="inventory-primary-button" type="submit">
          {renderMaterialIcon(editingCategoryId ? 'save' : 'add')}
          <span>{editingCategoryId ? 'Lưu danh mục' : 'Thêm danh mục'}</span>
        </button>
      </footer>
    </form>
  )

  const renderIngredientForm = () => (
    <form className="inventory-form-card embedded inventory-modal-form-body inventory-ingredient-form" onSubmit={saveIngredient}>
      <div className="inventory-form-grid">
        <label>
          <span>Tên nguyên liệu <b>*</b></span>
          <input onChange={(event) => updateIngredientForm('name', event.target.value)} placeholder="VD: Whipping cream" required value={ingredientForm.name} />
        </label>
        <label>
          <span>Danh mục</span>
          <select onChange={(event) => updateIngredientForm('categoryId', event.target.value)} value={ingredientForm.categoryId}>
            <option value="">Chưa phân loại</option>
            {data.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Đơn vị tính <b>*</b></span>
          <select onChange={(event) => updateIngredientForm('unit', event.target.value)} required value={ingredientForm.unit}>
            <option value="">Chọn đơn vị...</option>
            {['ml', 'gram', 'g', 'kg', 'lít', 'chai', 'quả', 'hũ', 'cái', 'túi', 'hộp'].map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <small>Chọn đơn vị nhỏ nhất để tính chính xác</small>
        </label>
        <label>
          <span>Tồn kho hiện tại <b>*</b></span>
          <input inputMode="decimal" onChange={(event) => updateIngredientForm('currentStock', event.target.value)} placeholder="VD: 2000" type="text" value={ingredientForm.currentStock} />
          <small>Chỉnh sửa để điều chỉnh tồn kho</small>
        </label>
        <label>
          <span>Ngưỡng cảnh báo tối thiểu <b>*</b></span>
          <input inputMode="decimal" onChange={(event) => updateIngredientForm('minStock', event.target.value)} placeholder="VD: 500" type="text" value={ingredientForm.minStock} />
          <small>Khi tồn kho dưới mức này hệ thống cảnh báo</small>
        </label>
        <label>
          <span>Giá nhập</span>
          <input inputMode="numeric" onChange={(event) => updateIngredientForm('costPrice', event.target.value)} placeholder="VD: 28.000" type="text" value={ingredientForm.costPrice} />
        </label>
        <label>
          <span>Thành tiền</span>
          <input readOnly value={formatCurrency(ingredientLineTotal)} />
        </label>
      </div>
      <footer>
        <button className="inventory-secondary-button" onClick={resetIngredientForm} type="button">
          Hủy
        </button>
        <button className="inventory-primary-button" disabled={saving} type="submit">
          {renderMaterialIcon('save')}
          <span>Lưu nguyên liệu</span>
        </button>
      </footer>
    </form>
  )

  const renderReceiptForm = () => (
    <form className="inventory-receipt-create inventory-modal-form-body" onSubmit={saveReceipt}>
      <section className="inventory-receipt-entry">
        <div className="inventory-receipt-line">
          <select onChange={(event) => updateReceiptDraftItem('categoryId', event.target.value)} value={receiptDraftItem.categoryId}>
            <option value="">Chọn danh mục</option>
            {data.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select disabled={!receiptDraftItem.categoryId} onChange={(event) => updateReceiptDraftItem('ingredientId', event.target.value)} value={receiptDraftItem.isNewIngredient ? '__new__' : receiptDraftItem.ingredientId}>
            <option value="">Chọn nguyên liệu</option>
            <option value="__new__">+ Nguyên liệu mới</option>
            {receiptDraftCategoryIngredients.map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>
            ))}
          </select>
          {receiptDraftItem.isNewIngredient && (
            <>
              <input onChange={(event) => updateReceiptDraftItem('name', event.target.value)} placeholder="Tên nguyên liệu mới" value={receiptDraftItem.name} />
              <select onChange={(event) => updateReceiptDraftItem('baseUnit', event.target.value)} value={receiptDraftItem.baseUnit}>
                <option value="">Đơn vị tồn kho</option>
                {['ml', 'gram', 'kg', 'lít', 'chai', 'quả', 'hũ', 'cái', 'túi', 'hộp'].map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              <input inputMode="decimal" onChange={(event) => updateReceiptDraftItem('minStock', event.target.value)} placeholder="Ngưỡng tối thiểu" type="text" value={receiptDraftItem.minStock} />
            </>
          )}
          <input inputMode="decimal" onChange={(event) => updateReceiptDraftItem('quantity', event.target.value)} placeholder="SL nhập" type="text" value={receiptDraftItem.quantity} />
          <select onChange={(event) => updateReceiptDraftItem('purchaseUnit', event.target.value)} value={receiptDraftItem.purchaseUnit}>
            <option value="">Đơn vị nhập</option>
            {receiptPurchaseUnits.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          <input
            min="1"
            onChange={(event) => updateReceiptDraftItem('conversionQuantity', event.target.value)}
            placeholder={(() => { const ing = getReceiptItemIngredient(receiptDraftItem); if (!ing) return 'Quy đổi'; const to = ing.unit; return `1 ${receiptDraftItem.purchaseUnit || 'đv'} = ?${to ? ` ${to}` : ''}`; })()}
            inputMode="decimal"
            type="text"
            value={receiptDraftItem.conversionQuantity}
          />
          <input inputMode="numeric" onChange={(event) => updateReceiptDraftItem('unitPrice', event.target.value)} placeholder="Giá / đơn vị nhập" type="text" value={receiptDraftItem.unitPrice} />
          <span className="inventory-receipt-conversion">
            {getReceiptItemIngredient(receiptDraftItem) && Number(receiptDraftItem.quantity || 0) > 0
              ? `+${formatQuantity(getReceiptBaseQuantity(receiptDraftItem))} ${getReceiptItemIngredient(receiptDraftItem).unit}`
              : 'Quy về tồn kho'}
          </span>
        </div>
        <div className="inventory-receipt-entry-actions">
          <button className="inventory-secondary-button" onClick={saveReceiptDraftItem} type="button">
            {renderMaterialIcon(editingReceiptItemIndex === null ? 'add' : 'save')}
            {editingReceiptItemIndex === null ? 'Thêm dòng' : 'Lưu dòng'}
          </button>
          {editingReceiptItemIndex !== null && (
            <button className="inventory-secondary-button" onClick={resetReceiptDraftItem} type="button">Hủy sửa</button>
          )}
        </div>
      </section>
      <div className="inventory-receipt-draft-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Danh mục</th>
              <th>Tên nguyên liệu</th>
              <th>Số lượng nhập</th>
              <th>Đơn vị nhập</th>
              <th>Quy đổi tồn kho</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {receiptItems.length === 0 ? (
              <tr>
                <td className="inventory-empty-row" colSpan="9">Chưa có nguyên liệu trong phiếu nhập</td>
              </tr>
            ) : (
              receiptItems.map((item, index) => {
                const ingredient = getReceiptItemIngredient(item)
                return (
                  <tr key={`${item.ingredientId}-${index}`}>
                    <td className="inventory-code-cell">{ingredient?.id ? getIngredientCode(ingredient) : 'Mới'}</td>
                    <td>{ingredient?.categoryName || 'Chưa phân loại'}</td>
                    <td><strong>{ingredient?.name || '-'}</strong></td>
                    <td>{formatQuantity(item.quantity)}</td>
                    <td>{item.purchaseUnit}</td>
                    <td>{ingredient ? `${formatQuantity(getReceiptBaseQuantity(item))} ${ingredient.unit}` : '-'}</td>
                    <td>{formatCurrency(parseCurrency(item.unitPrice))}</td>
                    <td>{formatCurrency(parseDecimalInput(item.quantity) * parseCurrency(item.unitPrice))}</td>
                    <td>
                      <div className="inventory-row-actions">
                        <button onClick={() => editReceiptItem(index)} type="button">{renderMaterialIcon('edit')}</button>
                        <button className="inventory-icon-button danger" onClick={() => removeReceiptItem(index)} type="button">{renderMaterialIcon('delete')}</button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <footer>
        <strong>Tổng tiền: {formatCurrency(receiptTotal)}</strong>
        <div>
          <button className="inventory-primary-button inventory-confirm-receipt-btn" disabled={saving} type="submit">{renderMaterialIcon('check_circle')}<span>Xác nhận nhập kho</span></button>
        </div>
      </footer>
    </form>
  )

  return (
    <section className="admin-inventory inventory-redesign">
      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {message && <div className="admin-alert">{message}</div>}

      {renderInventoryHeader()}

      {loading && <div className="admin-empty-state">Đang tải dữ liệu kho...</div>}

      {!loading && activeTab === 'catalog' && (
        <section className="inventory-table-card inventory-category-table-card inventory-scroll-card">
          <header>
            <div>
              <h3>Danh mục nguyên liệu</h3>
              <p>Đang hiển thị {data.categories.length} trên {data.categories.length} kết quả</p>
            </div>
            <button onClick={startCreateCategory} type="button">
              {renderMaterialIcon('add')}
              Thêm danh mục
            </button>
          </header>
          <div className="inventory-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên nguyên liệu</th>
                  <th>Mô tả</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((category) => (
                  <tr key={category.id}>
                    <td className="inventory-code-cell">{getCategoryCode(category)}</td>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-avatar">{String(category.name || '?').trim().charAt(0).toUpperCase()}</span>
                        <strong>{category.name}</strong>
                      </div>
                    </td>
                    <td className="inventory-muted-cell">{category.description || 'Chưa cập nhật'}</td>
                    <td>
                      <div className="inventory-row-actions">
                        <button onClick={() => editCategory(category)} type="button">{renderMaterialIcon('edit')}</button>
                        <button className="inventory-icon-button danger" onClick={() => deleteCategory(category)} type="button">{renderMaterialIcon('delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && activeTab === 'stock' && (
        <section className="inventory-log-page inventory-stock-page">
          <section className="inventory-table-card">
            <header>
              <div>
                <h3>Danh sách nguyên liệu</h3>
                <p>Đang hiển thị {filteredIngredients.length} trên {filteredIngredients.length} kết quả</p>
              </div>
            </header>
            <div className="inventory-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Danh mục</th>
                    <th>Tên nguyên liệu</th>
                    <th>Đơn vị</th>
                    <th>Tồn kho</th>
                    <th>Ngưỡng tối thiểu</th>
                    <th>Giá nhập</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIngredients.map((ingredient) => {
                    const status = getIngredientStatus(ingredient)

                    return (
                      <tr key={ingredient.id}>
                        <td className="inventory-code-cell">{getIngredientCode(ingredient)}</td>
                        <td className="inventory-muted-cell">{ingredient.categoryName || 'Chưa phân loại'}</td>
                        <td><strong>{ingredient.name}</strong></td>
                        <td className="inventory-muted-cell">{ingredient.unit}</td>
                        <td><strong>{formatQuantity(ingredient.currentStock)}</strong> <span className="inventory-muted-cell">{ingredient.unit}</span></td>
                        <td className="inventory-muted-cell">{formatQuantity(ingredient.minStock)} {ingredient.unit}</td>
                        <td className="inventory-muted-cell">{formatCurrency(ingredient.costPrice || 0)}<span style={{fontSize:'0.8em',opacity:0.6}}>/{ingredient.unit}</span></td>
                        <td>
                          <span className={`inventory-status-chip ${status.className}`}>{status.label}</span>
                        </td>
                        <td>
                          <div className="inventory-row-actions">
                            <button aria-label={`Sửa ${ingredient.name}`} onClick={() => editIngredient(ingredient)} type="button">
                              {renderMaterialIcon('edit')}
                            </button>
                            <button aria-label={`Xóa ${ingredient.name}`} className="inventory-icon-button danger" onClick={() => deleteIngredient(ingredient)} type="button">
                              {renderMaterialIcon('delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {!loading && activeTab === 'receipts' && (
        <section className="inventory-log-page inventory-stock-page">
          <section className="inventory-table-card">
            <header>
              <div>
                <h3>Danh sách phiếu nhập</h3>
                <p>Đang hiển thị {data.receipts.length} trên {data.receipts.length} kết quả</p>
              </div>
              <button onClick={() => setShowReceiptForm(true)} type="button">
                {renderMaterialIcon('add_shopping_cart')}
                Thêm phiếu nhập
              </button>
            </header>
            <div className="inventory-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>ID nhân viên</th>
                    <th>Tên nhân viên</th>
                    <th>Thời gian</th>
                    <th>Tổng giá</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {data.receipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td className="inventory-code-cell">{receipt.code || receipt.id}</td>
                      <td>{receipt.accountId || '-'}</td>
                      <td>{receipt.employeeName || 'Admin'}</td>
                      <td>{formatDateTime(receipt.createdAt)}</td>
                      <td>{formatCurrency(receipt.totalAmount || 0)}</td>
                      <td>
                        <button className="inventory-small-button" onClick={() => setSelectedReceipt(receipt)} type="button">
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {!loading && activeTab === 'loss' && (
        <section className="inventory-redesign-grid">
          <form className="inventory-form-card" onSubmit={saveManualLoss}>
            <header>
              <h3>{renderMaterialIcon('remove_shopping_cart')} Xuất kho thủ công (hao hụt)</h3>
              <span>Hao hụt</span>
            </header>
            <div className="inventory-form-grid single">
              <label>
                <span>Nguyên liệu</span>
                <select onChange={(event) => setLossForm((current) => ({ ...current, ingredientId: event.target.value }))} required value={lossForm.ingredientId}>
                  <option value="">Chọn nguyên liệu</option>
                  {visibleIngredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} - tồn {formatQuantity(ingredient.currentStock)} {ingredient.unit}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Số lượng hao hụt</span>
                <input inputMode="decimal" onChange={(event) => setLossForm((current) => ({ ...current, quantity: sanitizeDecimalInput(event.target.value) }))} placeholder="0" required type="text" value={lossForm.quantity} />
              </label>
              <label>
                <span>Lý do / ghi chú</span>
                <textarea onChange={(event) => setLossForm((current) => ({ ...current, note: event.target.value }))} placeholder="Ví dụ: đổ vỡ, hư hỏng, kiểm kê thiếu..." rows="3" value={lossForm.note} />
              </label>
            </div>
            <footer>
              <button className="inventory-primary-button" disabled={saving} type="submit">
                {renderMaterialIcon('check_circle')}
                <span>Xác nhận xuất hao hụt</span>
              </button>
            </footer>
          </form>

          <section className="inventory-table-card">
            <header>
              <div>
                <h3>Nguyên liệu sắp hết</h3>
                <p>Dùng để kiểm tra trước khi xuất hao hụt</p>
              </div>
            </header>
            <div className="inventory-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nguyên liệu</th>
                    <th>Đơn vị</th>
                    <th>Tồn kho hiện tại</th>
                    <th>Ngưỡng tối thiểu</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>{renderStockRows()}</tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {!loading && activeTab === 'thresholds' && (
        <section className="inventory-table-card">
          <header>
            <div>
              <h3>Đặt ngưỡng cảnh báo tối thiểu</h3>
              <p>Cập nhật mức tồn tối thiểu để hệ thống cảnh báo sắp hết hàng</p>
            </div>
          </header>
          <div className="inventory-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nguyên liệu</th>
                  <th>Đơn vị</th>
                  <th>Tồn kho hiện tại</th>
                  <th>Ngưỡng tối thiểu</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>{renderStockRows({ thresholdMode: true })}</tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && activeTab === 'movements' && (
        <section className="inventory-log-page inventory-movements-page">
          <section className="inventory-table-card">
            <header>
              <div>
                <h3>Xem nhật ký xuất nhập kho</h3>
                <p>100 giao dịch gần nhất từ dữ liệu kho</p>
              </div>
            </header>
            <div className="inventory-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Loại giao dịch</th>
                    <th>Nguyên liệu</th>
                    <th>Số lượng</th>
                    <th>Người thực hiện</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movements.map((movement) => {
                    const meta = getMovementMeta(movement)
                    return (
                      <tr key={movement.id}>
                        <td>{formatDateTime(movement.createdAt)}</td>
                        <td><span className={`inventory-movement-chip ${meta.className}`}>{renderMaterialIcon(meta.icon)} {meta.label}</span></td>
                        <td>
                          <div className="inventory-name-cell compact">
                            <span>{renderMaterialIcon('restaurant')}</span>
                            <div>
                              <strong>{movement.ingredientName}</strong>
                              <small>NL-{String(movement.ingredientId || '').padStart(5, '0')}</small>
                            </div>
                          </div>
                        </td>
                        <td className={`inventory-movement-quantity ${meta.className}`}>
                          {meta.sign} {formatQuantity(Math.abs(Number(movement.quantity || 0)))} <span>{movement.unit}</span>
                        </td>
                        <td>{movement.employeeName || 'Admin'}</td>
                        <td>{movement.note || 'Không có'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {showCategoryForm && (
        <div className="inventory-modal" role="dialog" aria-modal="true" aria-label={editingCategoryId ? 'Sửa danh mục' : 'Thêm danh mục'}>
          <button className="inventory-modal-backdrop" onClick={resetCategoryForm} type="button" aria-label="Đóng" />
          <section className="inventory-receipt-detail inventory-form-modal inventory-category-modal">
            <header>
              <h3>{editingCategoryId ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
              <button onClick={resetCategoryForm} type="button">{renderMaterialIcon('close')}</button>
            </header>
            {renderCategoryForm()}
          </section>
        </div>
      )}

      {showIngredientForm && (
        <div className="inventory-modal" role="dialog" aria-modal="true" aria-label="Sửa nguyên liệu">
          <button className="inventory-modal-backdrop" onClick={resetIngredientForm} type="button" aria-label="Đóng" />
          <section className="inventory-receipt-detail inventory-form-modal wide inventory-ingredient-modal">
            <header>
              <h3>Sửa nguyên liệu</h3>
              <button onClick={resetIngredientForm} type="button">{renderMaterialIcon('close')}</button>
            </header>
            {renderIngredientForm()}
          </section>
        </div>
      )}

      {showReceiptForm && (
        <div className="inventory-modal" role="dialog" aria-modal="true" aria-label="Thêm phiếu nhập">
          <button className="inventory-modal-backdrop" onClick={() => setShowReceiptForm(false)} type="button" aria-label="Đóng" />
          <section className="inventory-receipt-detail inventory-form-modal wide inventory-receipt-modal">
            <header>
              <h3>Thêm phiếu nhập</h3>
              <button onClick={() => setShowReceiptForm(false)} type="button">{renderMaterialIcon('close')}</button>
            </header>
            {renderReceiptForm()}
          </section>
        </div>
      )}

      {selectedReceipt && (
        <div className="inventory-modal" role="dialog" aria-modal="true" aria-label="Chi tiết phiếu nhập">
          <button className="inventory-modal-backdrop" onClick={() => setSelectedReceipt(null)} type="button" aria-label="Đóng" />
          <section className="inventory-receipt-detail">
            <header>
              <h3>Chi tiết phiếu nhập</h3>
              <button onClick={() => setSelectedReceipt(null)} type="button">{renderMaterialIcon('close')}</button>
            </header>
            <div className="inventory-detail-grid">
              <label>
                <span>ID</span>
                <input readOnly value={selectedReceipt.code || selectedReceipt.id} />
              </label>
              <label>
                <span>ID người nhập</span>
                <input readOnly value={selectedReceipt.accountId || '-'} />
              </label>
              <label>
                <span>Tên người nhập</span>
                <input readOnly value={selectedReceipt.employeeName || 'Admin'} />
              </label>
              <label>
                <span>Thời gian nhập</span>
                <input readOnly value={formatDateTime(selectedReceipt.createdAt)} />
              </label>
            </div>
            <div className="inventory-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên nguyên liệu</th>
                    <th>Số lượng nhập</th>
                    <th>Quy đổi</th>
                    <th>Đơn giá nhập</th>
                    <th>Thành tiền</th>
                    <th>Cộng kho</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedReceipt.details || []).map((item) => (
                    <tr key={item.id}>
                      <td className="inventory-code-cell">NL-{String(item.ingredientId || '').padStart(3, '0')}</td>
                      <td>{item.ingredientName}</td>
                      <td>{formatQuantity(item.purchaseQuantity)} {item.purchaseUnit}</td>
                      <td>1 {item.purchaseUnit} = {formatQuantity(item.conversionQuantity)} {item.baseUnit || item.unit}</td>
                      <td>{formatCurrency(Number(item.unitPrice || 0) * Number(item.conversionQuantity || 1))}</td>
                      <td>{formatCurrency(item.lineTotal || 0)}</td>
                      <td>{formatQuantity(item.quantity)} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer>
              <strong>Tổng tiền: {formatCurrency(selectedReceipt.totalAmount || 0)}</strong>
              <button className="inventory-primary-button" onClick={() => setSelectedReceipt(null)} type="button">Đóng</button>
            </footer>
          </section>
        </div>
      )}
      {errorDialog && (
        <div className="inventory-modal" role="alertdialog" aria-modal="true" aria-label="Thông báo lỗi" style={{zIndex: 9999}}>
          <div className="inventory-modal-backdrop" />
          <section className="inventory-error-dialog">
            <header>
              {renderMaterialIcon('error')}
              <h3>Có lỗi xảy ra</h3>
            </header>
            <p>{errorDialog}</p>
            <footer>
              <button className="inventory-primary-button" onClick={() => setErrorDialog('')} type="button">OK</button>
            </footer>
          </section>
        </div>
      )}
    </section>
  )
}

export default InventorySection
