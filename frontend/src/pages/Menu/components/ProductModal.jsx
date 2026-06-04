import { Plus, X } from 'lucide-react'
import PropTypes from 'prop-types'
import { categoryShape, productShape } from '../../../utils/adminPropTypes'

function ProductModal({ categories, form, mode, onChange, onClose, onFileChange, onSubmit, saving, selectedProduct }) {
  const isCreate = mode === 'product-create'

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal" onSubmit={onSubmit}>
        <div className="admin-modal-header">
          <h2>{isCreate ? 'Thêm món' : 'Cập nhật món'}</h2>
          <button aria-label="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="admin-form-grid">
          <label>
            <span>Tên món</span>
            <input maxLength="150" name="name" onChange={onChange} required type="text" value={form.name} />
          </label>
          <label>
            <span>Danh mục</span>
            <select name="categoryId" onChange={onChange} required value={form.categoryId}>
              <option value="">Chọn danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Giá</span>
            <input inputMode="numeric" name="price" onChange={onChange} pattern="[0-9.]*" placeholder="Nhập giá món" required type="text" value={form.price} />
          </label>
          <label>
            <span>Trạng thái</span>
            <select name="status" onChange={onChange} required value={form.status}>
              <option value="">Chọn trạng thái</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
          <label className="admin-form-full">
            <span>Mô tả</span>
            <textarea maxLength="500" name="description" onChange={onChange} rows="4" value={form.description} />
          </label>
          <label className="admin-form-full">
            <span>Ảnh món</span>
            <input accept=".jpg,.jpeg,.png,image/jpeg,image/png" name="image" onChange={onFileChange} type="file" />
            {!isCreate && selectedProduct?.image && !form.image && <small>Đang giữ ảnh hiện tại nếu không chọn ảnh mới.</small>}
          </label>
        </div>

        <div className="admin-modal-actions">
          <button className="admin-secondary-action" onClick={onClose} type="button">
            Hủy
          </button>
          <button className="admin-primary-action" disabled={saving} type="submit">
            <Plus aria-hidden="true" />
            <span>{saving ? (isCreate ? 'Đang thêm...' : 'Đang lưu...') : isCreate ? 'Thêm món' : 'Lưu món'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

ProductModal.propTypes = {
  categories: PropTypes.arrayOf(categoryShape).isRequired,
  form: PropTypes.shape({
    categoryId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    description: PropTypes.string.isRequired,
    image: PropTypes.instanceOf(File),
    name: PropTypes.string.isRequired,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,
  mode: PropTypes.oneOf(['product-create', 'product-edit']).isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  selectedProduct: productShape,
}

export default ProductModal
