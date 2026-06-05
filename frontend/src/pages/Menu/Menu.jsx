import { useState } from 'react'
import { Boxes, Coffee } from 'lucide-react'
import PropTypes from 'prop-types'
import Pagination from '../../components/common/Pagination'
import { useConfirm } from '../../components/common/useConfirm'
import { getInventoryBootstrap, replaceProductRecipe } from '../../services/inventoryService'
import { PAGE_SIZE } from '../../utils/adminConfig'
import { categoryShape, productShape } from '../../utils/adminPropTypes'
import { renderMaterialIcon } from '../../utils/adminUtils'
import { formatCurrency } from '../../utils/formatCurrency'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

const getProductImageUrl = (image) => {
  if (!image) {
    return ''
  }

  if (/^https?:\/\//i.test(image)) {
    return image
  }

  return `${API_ORIGIN}${image}`
}

const formatRecipeQuantity = (value) => {
  const quantity = Number(value)
  if (!Number.isFinite(quantity)) return value || '0'
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/\.?0+$/, '')
}

const emptyRecipeItem = {
  ingredientId: '',
  quantity: '',
}

const buildRecipeFormItems = (items = []) =>
  items.length > 0
    ? items.map((item) => ({ ingredientId: String(item.ingredientId), quantity: formatRecipeQuantity(item.quantity) }))
    : [{ ...emptyRecipeItem }]

function MenuSection({
  activeTab,
  categories,
  categoryFilter,
  categoryRows,
  categoryTotalPages,
  loading,
  onCategoryDelete,
  onCategoryEdit,
  onCategoryFilterChange,
  onCreateCategory,
  onCreateProduct,
  onDelete,
  onEdit,
  onPageChange,
  onSearchChange,
  onSortChange,
  onTabChange,
  page,
  products,
  searchTerm,
  sortMode,
  totalPages,
}) {
  const confirm = useConfirm()
  const isCategoryTab = activeTab === 'categories'
  const [recipeCache, setRecipeCache] = useState(null)
  const [recipeModal, setRecipeModal] = useState({
    error: '',
    formItems: [{ ...emptyRecipeItem }],
    ingredients: [],
    items: [],
    loading: false,
    message: '',
    open: false,
    product: null,
    saving: false,
  })

  const closeRecipeModal = () => {
    setRecipeModal((current) => ({ ...current, open: false }))
  }

  const showProductRecipe = async (product) => {
    setRecipeModal({
      error: '',
      formItems: [{ ...emptyRecipeItem }],
      ingredients: [],
      items: [],
      loading: true,
      message: '',
      open: true,
      product,
      saving: false,
    })

    try {
      const inventory = recipeCache || (await getInventoryBootstrap())
      const recipes = inventory.recipes || []
      const ingredients = inventory.ingredients || []
      if (!recipeCache) {
        setRecipeCache(inventory)
      }
      const items = recipes.filter((item) => String(item.productId) === String(product.id))

      setRecipeModal({
        error: '',
        formItems: buildRecipeFormItems(items),
        ingredients,
        items,
        loading: false,
        message: '',
        open: true,
        product,
        saving: false,
      })
    } catch (error) {
      setRecipeModal({
        error: error?.message || 'Không thể tải thành phần nguyên liệu của món.',
        formItems: [{ ...emptyRecipeItem }],
        ingredients: [],
        items: [],
        loading: false,
        message: '',
        open: true,
        product,
        saving: false,
      })
    }
  }

  const updateRecipeFormItem = (index, field, value) => {
    setRecipeModal((current) => ({
      ...current,
      formItems: current.formItems.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
      message: '',
    }))
  }

  const addRecipeFormItem = () => {
    setRecipeModal((current) => ({
      ...current,
      formItems: [...current.formItems, { ...emptyRecipeItem }],
      message: '',
    }))
  }

  const removeRecipeFormItem = async (index) => {
    const confirmed = await confirm({
      body: 'Xóa nguyên liệu này khỏi công thức?',
      confirmLabel: 'Xóa',
    })
    if (!confirmed) return

    setRecipeModal((current) => ({
      ...current,
      formItems: current.formItems.filter((_, itemIndex) => itemIndex !== index),
      message: '',
    }))
  }

  const getRecipeIngredient = (ingredientId) => recipeModal.ingredients.find((ingredient) => String(ingredient.id) === String(ingredientId))

  const saveProductRecipe = async (event) => {
    event.preventDefault()
    if (!recipeModal.product?.id) return

    const payload = {
      items: recipeModal.formItems
        .filter((item) => item.ingredientId && Number(item.quantity || 0) > 0)
        .map((item) => ({ ingredientId: item.ingredientId, quantity: Number(item.quantity) })),
    }

    const confirmed = await confirm({
      body: `Cập nhật công thức cho món "${recipeModal.product.name}"?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    setRecipeModal((current) => ({ ...current, error: '', message: '', saving: true }))

    try {
      const result = await replaceProductRecipe(recipeModal.product.id, payload)
      const savedRecipe = result.recipe || []
      setRecipeCache((current) => {
        const currentRecipes = current?.recipes || []
        return {
          ...(current || {}),
          ingredients: current?.ingredients || recipeModal.ingredients,
          recipes: [
            ...currentRecipes.filter((item) => String(item.productId) !== String(recipeModal.product.id)),
            ...savedRecipe,
          ],
        }
      })
      setRecipeModal((current) => ({
        ...current,
        error: '',
        formItems: buildRecipeFormItems(savedRecipe),
        items: savedRecipe,
        open: false,
        saving: false,
      }))
    } catch (error) {
      setRecipeModal((current) => ({
        ...current,
        error: error?.message || 'Không thể lưu công thức món.',
        saving: false,
      }))
    }
  }

  return (
    <>
      <section className="admin-toolbar admin-tabbed-toolbar" aria-label="Tim kiem va loc menu">
        <div className="admin-area-tabs" aria-label="Chon noi dung quan ly menu">
          <button className={isCategoryTab ? 'active' : ''} onClick={() => onTabChange('categories')} type="button">
            Quản lý danh mục
          </button>
          <button className={!isCategoryTab ? 'active' : ''} onClick={() => onTabChange('products')} type="button">
            Quản lý menu
          </button>
        </div>

        <div className="admin-toolbar-right">
          <label className="admin-search">
            {renderMaterialIcon('search')}
            <input
              maxLength="100"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={isCategoryTab ? 'Tìm kiếm danh mục...' : 'Tìm kiếm món...'}
              type="search"
              value={searchTerm}
            />
          </label>

          <div className="admin-toolbar-controls">
            {!isCategoryTab && (
              <label className="admin-select-wrap">
                {renderMaterialIcon('filter_list')}
                <select onChange={(event) => onCategoryFilterChange(event.target.value)} value={categoryFilter}>
                  <option value="all">Tất cả danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="admin-select-wrap">
              {renderMaterialIcon('sort')}
              <select onChange={(event) => onSortChange(event.target.value)} value={sortMode}>
                <option value="newest">Sắp xếp</option>
                <option value="name">Theo tên</option>
                {!isCategoryTab && <option value="price">Theo giá</option>}
                {!isCategoryTab && <option value="status">Theo trạng thái</option>}
              </select>
            </label>
          </div>
        </div>
      </section>

      {isCategoryTab && (
        <section className="admin-accounts-panel">
          <div className="admin-accounts-title">
            <div>
              <h2>Danh sách danh mục</h2>
              <span>
                Đang hiển thị {categoryRows.visible.length} trên {categoryRows.filtered.length} kết quả
              </span>
            </div>
            <button className="admin-primary-action" onClick={onCreateCategory} type="button">
              {renderMaterialIcon('add')}
              <span>Thêm danh mục</span>
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table admin-accounts-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên danh mục</th>
                  <th>Mô tả</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4">
                      <div className="admin-empty-state">Đang tải dữ liệu...</div>
                    </td>
                  </tr>
                ) : categoryRows.visible.length === 0 ? (
                  <tr>
                    <td colSpan="4">
                      <div className="admin-empty-state">
                        <Boxes aria-hidden="true" />
                        <strong>Chưa có danh mục nào</strong>
                        <span>Bắt đầu bằng cách thêm danh mục đồ uống mới vào hệ thống</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  categoryRows.visible.map((category, index) => (
                    <tr key={category.id}>
                      <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#33210d'}}>DM{String(category.id).padStart(3,'0')}</span></td>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-user-avatar">{String(category.name || '?').trim().charAt(0).toUpperCase()}</span>
                          <strong>{category.name}</strong>
                        </div>
                      </td>
                      <td>{category.description || 'Chưa cập nhật'}</td>
                      <td>
                        <div className="admin-row-actions">
                          <button aria-label="Sửa danh mục" onClick={() => onCategoryEdit(category)} type="button">
                            {renderMaterialIcon('edit')}
                          </button>
                          <button aria-label="Xóa danh mục" className="admin-danger-action" onClick={() => onCategoryDelete(category)} type="button">
                            {renderMaterialIcon('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            itemLabel="danh mục"
            onPageChange={onPageChange}
            totalItems={categoryRows.filtered.length}
            totalPages={categoryTotalPages}
            visibleCount={categoryRows.visible.length}
          />
        </section>
      )}

      {!isCategoryTab && (
        <section className="admin-accounts-panel">
          <div className="admin-accounts-title">
            <div>
              <h2>Danh sách menu</h2>
              <span>
                Đang hiển thị {products.visible.length} trên {products.filtered.length} kết quả
              </span>
            </div>
            <button className="admin-primary-action" disabled={categories.length === 0} onClick={onCreateProduct} type="button">
              {renderMaterialIcon('add')}
              <span>Thêm món</span>
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table admin-products-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Món</th>
                  <th>Danh mục</th>
                  <th>Giá</th>
                  <th>Mô tả</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7">
                      <div className="admin-empty-state">Đang tải dữ liệu...</div>
                    </td>
                  </tr>
                ) : products.visible.length === 0 ? (
                  <tr>
                    <td colSpan="7">
                      <div className="admin-empty-state">
                        <Coffee aria-hidden="true" />
                        <strong>Chưa có món nào</strong>
                        <span>Bắt đầu bằng cách thêm món đồ uống mới vào menu</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.visible.map((product, index) => (
                    <tr key={product.id}>
                      <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#33210d'}}>SP{String(product.id).padStart(3,'0')}</span></td>
                      <td>
                        <div className="admin-product-cell">
                          {product.image ? (
                            <img alt={product.name} src={getProductImageUrl(product.image)} />
                          ) : (
                            <span className="admin-product-placeholder">{renderMaterialIcon('local_cafe')}</span>
                          )}
                          <strong>{product.name}</strong>
                        </div>
                      </td>
                      <td>{product.categoryName || 'Chưa cập nhật'}</td>
                      <td>{formatCurrency(Number(product.price) || 0)}</td>
                      <td>{product.description || 'Chưa cập nhật'}</td>
                      <td>
                        <span className={`admin-status-chip ${product.status === 'Active' ? 'active' : 'locked'}`}>
                          {product.status === 'Active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button aria-label="Xem thành phần nguyên liệu" className="admin-recipe-action" onClick={() => showProductRecipe(product)} type="button">
                            {renderMaterialIcon('menu_book')}
                          </button>
                          <button aria-label="Sửa món" onClick={() => onEdit(product)} type="button">
                            {renderMaterialIcon('edit')}
                          </button>
                          <button aria-label="Xóa món" className="admin-danger-action" onClick={() => onDelete(product)} type="button">
                            {renderMaterialIcon('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            itemLabel="món"
            onPageChange={onPageChange}
            totalItems={products.filtered.length}
            totalPages={totalPages}
            visibleCount={products.visible.length}
          />
        </section>
      )}

      {recipeModal.open && (
        <div className="admin-modal-backdrop" role="presentation">
          <section aria-modal="true" className="admin-modal admin-recipe-modal" role="dialog">
            <div className="admin-modal-header">
              <div>
                <h2>Thành phần nguyên liệu</h2>
                <p>{recipeModal.product?.name || 'Món đang chọn'}</p>
              </div>
              <button aria-label="Đóng" onClick={closeRecipeModal} type="button">
                {renderMaterialIcon('close')}
              </button>
            </div>

            <div className="admin-recipe-modal-body">
              {recipeModal.loading ? (
                <div className="admin-empty-state">Đang tải thành phần nguyên liệu...</div>
              ) : (
                <form className="admin-recipe-editor" onSubmit={saveProductRecipe}>
                  {recipeModal.error && <div className="admin-inline-error">{recipeModal.error}</div>}

                  <div className="admin-recipe-editor-head">
                    <strong>Thành phần nguyên liệu</strong>
                    <button onClick={addRecipeFormItem} type="button">
                      {renderMaterialIcon('add_circle')}
                      <span>Thêm mới</span>
                    </button>
                  </div>

                  <div className="admin-recipe-editor-list">
                    {recipeModal.formItems.length > 0 && (
                      <div className="admin-recipe-editor-header">
                        <span>Nguyên liệu</span>
                        <span>Lượng</span>
                        <span>Đơn vị</span>
                        <span />
                      </div>
                    )}
                    {recipeModal.formItems.map((item, index) => {
                      const ingredient = getRecipeIngredient(item.ingredientId)

                      return (
                        <div className="admin-recipe-editor-row" key={`${index}-${item.ingredientId || 'new'}`}>
                          <select onChange={(event) => updateRecipeFormItem(index, 'ingredientId', event.target.value)} value={item.ingredientId}>
                            <option value="">Chọn nguyên liệu</option>
                            {recipeModal.ingredients.map((ingredientOption) => (
                              <option key={ingredientOption.id} value={ingredientOption.id}>
                                {ingredientOption.name}
                              </option>
                            ))}
                          </select>

                          <input
                            inputMode="decimal"
                            min="0"
                            onChange={(event) => updateRecipeFormItem(index, 'quantity', event.target.value)}
                            placeholder="0"
                            type="text"
                            value={item.quantity}
                          />

                          <span className="admin-recipe-unit">{ingredient?.unit || '—'}</span>

                          <div className="admin-recipe-row-actions">
                            <button aria-label="Xóa nguyên liệu" className="danger" onClick={() => removeRecipeFormItem(index)} type="button">
                              {renderMaterialIcon('delete')}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {recipeModal.message && <p className="admin-recipe-message">{recipeModal.message}</p>}

                  <div className="admin-recipe-editor-actions">
                    <button className="admin-secondary-action" onClick={closeRecipeModal} type="button">
                      Hủy bỏ
                    </button>
                    <button className="admin-primary-action" disabled={recipeModal.saving} type="submit">
                      Lưu công thức
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

MenuSection.propTypes = {
  activeTab: PropTypes.oneOf(['categories', 'products']).isRequired,
  categories: PropTypes.arrayOf(categoryShape).isRequired,
  categoryFilter: PropTypes.string.isRequired,
  categoryRows: PropTypes.shape({
    filtered: PropTypes.arrayOf(categoryShape).isRequired,
    visible: PropTypes.arrayOf(categoryShape).isRequired,
  }).isRequired,
  categoryTotalPages: PropTypes.number.isRequired,
  loading: PropTypes.bool.isRequired,
  onCategoryDelete: PropTypes.func.isRequired,
  onCategoryEdit: PropTypes.func.isRequired,
  onCategoryFilterChange: PropTypes.func.isRequired,
  onCreateCategory: PropTypes.func.isRequired,
  onCreateProduct: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  onTabChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  products: PropTypes.shape({
    filtered: PropTypes.arrayOf(productShape).isRequired,
    visible: PropTypes.arrayOf(productShape).isRequired,
  }).isRequired,
  searchTerm: PropTypes.string.isRequired,
  sortMode: PropTypes.string.isRequired,
  totalPages: PropTypes.number.isRequired,
}

export default MenuSection
