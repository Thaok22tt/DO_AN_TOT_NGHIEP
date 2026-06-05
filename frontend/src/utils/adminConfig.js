import { Badge, Boxes, Gauge, LineChart, Menu, Percent, ReceiptText, Users, Warehouse } from 'lucide-react'

export const navItems = [
  {
    key: 'overview',
    label: 'Dashboard',
    title: 'Dashboard',
    description: '',
    icon: Gauge,
    materialIcon: 'dashboard',
  },
  {
    key: 'accounts',
    label: 'Quản lý tài khoản',
    title: 'Quản lý tài khoản',
    description: 'Quản lý quyền truy cập và người dùng hệ thống.',
    icon: Users,
    materialIcon: 'person',
  },
  {
    key: 'employees',
    label: 'Quản lý nhân viên',
    title: 'Nhân viên',
    description: 'Quản lý đội ngũ và phân ca làm việc của Mơ Coffee.',
    icon: Badge,
    materialIcon: 'badge',
  },
  {
    key: 'categories',
    label: 'Danh mục',
    title: 'Quản lý danh mục',
    description: 'Sắp xếp các nhóm sản phẩm đang kinh doanh tại quán.',
    icon: Boxes,
    materialIcon: 'category',
  },
  {
    key: 'menu',
    label: 'Quản lý menu',
    title: 'Quản lý menu',
    description: 'Cập nhật giá, hình ảnh và trạng thái các sản phẩm của bạn.',
    icon: Menu,
    materialIcon: 'restaurant_menu',
  },
  {
    key: 'inventory',
    label: 'Quản lý kho',
    title: 'Quản lý kho',
    description: 'Theo dõi nguyên liệu, nhập kho, công thức món và cảnh báo tồn kho thấp.',
    icon: Warehouse,
    materialIcon: 'inventory_2',
  },
  {
    key: 'invoices',
    label: 'Quản lý hóa đơn',
    title: 'Quản lý hóa đơn',
    description: 'Theo dõi và quản lý các giao dịch tại cửa hàng Mơ Coffee.',
    icon: ReceiptText,
    materialIcon: 'receipt_long',
  },
  {
    key: 'promotions',
    label: 'Quản lý khuyến mãi',
    title: 'Quản lý khuyến mãi',
    description: 'Theo dõi và tối ưu hóa các chiến dịch ưu đãi của Mơ Coffee.',
    icon: Percent,
    materialIcon: 'local_offer',
  },
  {
    key: 'financial',
    label: 'Báo cáo',
    title: 'Báo cáo',
    icon: LineChart,
    materialIcon: 'analytics',
  },
].filter((item) => item.key !== 'categories')

export const emptyAccountForm = {
  username: '',
  password: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  roleId: '',
  status: '',
}

export const emptyEmployeeForm = {
  accountId: '',
  birthDate: '',
  fullName: '',
  gender: '',
  hireDate: '',
  hourlyRate: '',
  phoneNumber: '',
  position: '',
  workShift: '',
}

export const emptyCategoryForm = {
  name: '',
  description: '',
}

export const emptyAreaForm = {
  name: '',
  description: '',
}

export const emptyTableForm = {
  name: '',
  areaId: '',
  status: '',
}

export const emptyProductForm = {
  name: '',
  categoryId: '',
  price: '',
  description: '',
  image: null,
  status: '',
}

export const emptyPromotionForm = {
  name: '',
  code: '',
  discountType: '',
  discountValue: '',
  startDate: '',
  endDate: '',
  status: '',
}

export const PAGE_SIZE = 9
