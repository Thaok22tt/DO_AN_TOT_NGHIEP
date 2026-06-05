import { Plus, X } from 'lucide-react'
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import { categoryShape, productShape } from '../../../utils/adminPropTypes'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

const toAbsoluteImageUrl = (image) => {
  if (!image) return ''
  if (/^https?:\/\//i.test(image)) return image
  return `${API_ORIGIN}${image}`
}

function ProductModal({ categories, form, mode, onChange, onClose, onFileChange, onSubmit, saving, selectedProduct }) {
  const isCreate = mode === 'product-create'
  const fileInputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(() => toAbsoluteImageUrl(selectedProduct?.image))

  const currentFileName = form.image instanceof File
    ? form.image.name
    : selectedProduct?.image
      ? selectedProduct.image.split('/').pop()
      : 'Chưa chọn file'

  useEffect(() => {
    if (!(form.image instanceof File)) {
      setPreviewUrl(toAbsoluteImageUrl(selectedProduct?.image))
      return
    }
    const url = URL.createObjectURL(form.image)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [form.image, selectedProduct?.image])

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
          <div className="admin-form-full">
            <span style={{ color: 'var(--admin-muted)', fontSize: '0.9rem', fontWeight: 700 }}>Ảnh món</span>
            <input accept=".jpg,.jpeg,.png,image/jpeg,image/png" name="image" onChange={onFileChange} ref={fileInputRef} style={{ display: 'none' }} type="file" />
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #ccc', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', background: '#fff', marginTop: '8px' }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <span style={{ background: '#eee', borderRadius: '4px', padding: '2px 10px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Chọn file</span>
              <span style={{ color: '#555', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentFileName}</span>
            </div>
            {previewUrl && (
              <img
                alt="Xem trước ảnh món"
                src={previewUrl}
                style={{ marginTop: '8px', maxHeight: '160px', maxWidth: '100%', borderRadius: '6px', objectFit: 'cover' }}
              />
            )}
          </div>
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
