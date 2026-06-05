import { Badge, Banknote, Boxes, Grid2X2, Lock, ReceiptText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createAccount,
  deleteAccount,
  getAccounts,
  getRoles,
  updateAccount,
  updateAccountStatus,
} from '../../services/accountService'
import {
  changePassword as changeOwnPassword,
  getProfile,
  logout as logoutRequest,
  updateProfile,
} from '../../services/authService'
import {
  createArea,
  deleteArea,
  getAreas,
  updateArea,
} from '../../services/areaService'
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../../services/categoryService'
import {
  createEmployee,
  deleteEmployee,
  getAssignableEmployeeAccounts,
  getAttendance,
  getEmployees,
  updateEmployee,
  updateEmployeeAccountStatus,
} from '../../services/employeeService'
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from '../../services/productService'
import {
  createPromotion,
  deletePromotion,
  getPromotions,
  updatePromotion,
} from '../../services/promotionService'
import {
  getInvoiceById,
  getInvoices,
} from '../../services/invoiceService'
import { getInventoryBootstrap } from '../../services/inventoryService'
import {
  createTable,
  deleteTable,
  getTables,
  updateTable,
} from '../../services/tableService'
import { emptyAccountForm, emptyAreaForm, emptyCategoryForm, emptyEmployeeForm, emptyProductForm, emptyPromotionForm, emptyTableForm, navItems, PAGE_SIZE } from '../../utils/adminConfig'
import { getErrorMessage } from '../../utils/adminUtils'
import { formatCurrencyInput, parseCurrency, sanitizeIntegerInput } from '../../utils/formatCurrency'
import { getStoredUser, removeStorageItem, setAuthSession } from '../../utils/storage'
import AdminAlert from '../../components/common/AdminAlert'
import ConfirmModal from '../../components/common/ConfirmModal'
import { useConfirm } from '../../components/common/useConfirm'
import AdminHeader from '../../components/layout/AdminHeader'
import AdminSidebar from '../../components/layout/AdminSidebar'
import PlaceholderSection from '../../components/common/PlaceholderSection'
import AccountModal from '../Account/components/AccountModal'
import AccountsSection from '../Account/Account'
import AreaModal from '../Area/components/AreaModal'
import TableModal from '../Area/components/TableModal'
import AreasSection from '../Area/Area'
import CategoryModal from '../Category/components/CategoryModal'
import OverviewSection from '../Dashboard/Dashboard'
import EmployeeModal from '../Employee/components/EmployeeModal'
import EmployeesSection from '../Employee/Employee'
import InvoiceDetailModal from '../Invoice/components/InvoiceDetailModal'
import InvoicesSection from '../Invoice/Invoice'
import InventorySection from '../Inventory/Inventory'
import ProductModal from '../Menu/components/ProductModal'
import MenuSection from '../Menu/Menu'
import PromotionModal from '../Promotion/components/PromotionModal'
import PromotionsSection from '../Promotion/Promotion'
import FinancialReportSection from '../Financial/FinancialReport'
import ReportSection from '../Report/Report'
import ProfileModal from './components/ProfileModal'
import './Admin.css'

const sameLocalDay = (firstDate, secondDate) => {
  if (!firstDate || !secondDate) return false
  return new Date(firstDate).toDateString() === new Date(secondDate).toDateString()
}

const emptyProfileForm = {
  email: '',
  fullName: '',
  phoneNumber: '',
  role: '',
  username: '',
}

const emptyPasswordForm = {
  confirmPassword: '',
  currentPassword: '',
  newPassword: '',
}

const VALID_ADMIN_KEYS = new Set(navItems.map((n) => n.key))

const getAdminNavFromHash = () => {
  const sub = window.location.hash.replace('#', '').split('/')[1] || ''
  return VALID_ADMIN_KEYS.has(sub) ? sub : 'overview'
}

function Admin() {
  const confirm = useConfirm()
  const [activeNavKey, setActiveNavKey] = useState(getAdminNavFromHash)
  const [accounts, setAccounts] = useState([])
  const [areas, setAreas] = useState([])
  const [categories, setCategories] = useState([])
  const [employees, setEmployees] = useState([])
  const [todayAttendance, setTodayAttendance] = useState([])
  const [invoices, setInvoices] = useState([])
  const [overviewInvoiceDetails, setOverviewInvoiceDetails] = useState([])
  const [inventorySummary, setInventorySummary] = useState({ ingredients: [], lowStock: [] })
  const [products, setProducts] = useState([])
  const [promotions, setPromotions] = useState([])
  const [tables, setTables] = useState([])
  const [assignableAccounts, setAssignableAccounts] = useState([])
  const [roles, setRoles] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [areaFilter, setAreaFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all')
  const [promotionStatusFilter, setPromotionStatusFilter] = useState('all')
  const [invoiceDateRange, setInvoiceDateRange] = useState({ startDate: '', endDate: '' })
  const [sortMode, setSortMode] = useState('newest')
  const [areaTab, setAreaTab] = useState('tables')
  const [menuTab, setMenuTab] = useState('products')
  const [employeeTab, setEmployeeTab] = useState('employees')
  const [page, setPage] = useState(1)
  const [modalMode, setModalMode] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedArea, setSelectedArea] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedPromotion, setSelectedPromotion] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [form, setForm] = useState(emptyAccountForm)
  const [areaForm, setAreaForm] = useState(emptyAreaForm)
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm)
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [promotionForm, setPromotionForm] = useState(emptyPromotionForm)
  const [tableForm, setTableForm] = useState(emptyTableForm)
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [profileMode, setProfileMode] = useState('profile')
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [profileError, setProfileError] = useState('')
  const [changePassword, setChangePassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState(() => getStoredUser())
  const activeNavItem = navItems.find((item) => item.key === activeNavKey) || navItems[1]
  const isOverview = activeNavKey === 'overview'
  const isAccountManagement = activeNavKey === 'accounts'
  const isAreaManagement = activeNavKey === 'areas'
  const isCategoryManagement = activeNavKey === 'categories'
  const isEmployeeManagement = activeNavKey === 'employees'
  const isInvoiceManagement = activeNavKey === 'invoices'
  const isInventoryManagement = activeNavKey === 'inventory'
  const isMenuManagement = activeNavKey === 'menu'
  const isPromotionManagement = activeNavKey === 'promotions'
  const isFinancialReport = activeNavKey === 'financial'

  const fetchAdminData = useCallback(async () => {
    setLoading(true)
    setError('')

    const today = new Date().toISOString().slice(0, 10)
    const [accountResult, roleResult, employeeResult, categoryResult, productResult, promotionResult, areaResult, tableResult, invoiceResult, inventoryResult, attendanceResult] = await Promise.allSettled([
      getAccounts(),
      getRoles(),
      getEmployees(),
      getCategories(),
      getProducts(),
      getPromotions(),
      getAreas(),
      getTables(),
      getInvoices(),
      getInventoryBootstrap(),
      getAttendance({ startDate: today, endDate: today }),
    ])

    if (accountResult.status === 'fulfilled') {
      setAccounts(accountResult.value.accounts || [])
    } else {
      setAccounts([])
      setError(getErrorMessage(accountResult.reason))
    }

    if (roleResult.status === 'fulfilled') {
      setRoles(roleResult.value.roles || [])
    } else {
      setError(getErrorMessage(roleResult.reason))
    }

    if (employeeResult.status === 'fulfilled') {
      setEmployees(employeeResult.value.employees || [])
    } else if (activeNavKey === 'employees') {
      setEmployees([])
      setError(getErrorMessage(employeeResult.reason))
    }

    if (categoryResult.status === 'fulfilled') {
      setCategories(categoryResult.value.categories || [])
    } else if (activeNavKey === 'menu' || activeNavKey === 'categories') {
      setCategories([])
      setError(getErrorMessage(categoryResult.reason))
    }

    if (productResult.status === 'fulfilled') {
      setProducts(productResult.value.products || [])
    } else if (activeNavKey === 'menu') {
      setProducts([])
      setError(getErrorMessage(productResult.reason))
    }

    if (promotionResult.status === 'fulfilled') {
      setPromotions(promotionResult.value.promotions || [])
    } else if (activeNavKey === 'promotions') {
      setPromotions([])
      setError(getErrorMessage(promotionResult.reason))
    }

    if (areaResult.status === 'fulfilled') {
      setAreas(areaResult.value.areas || [])
    } else if (activeNavKey === 'areas') {
      setAreas([])
      setError(getErrorMessage(areaResult.reason))
    }

    if (tableResult.status === 'fulfilled') {
      setTables(tableResult.value.tables || [])
    } else if (activeNavKey === 'areas') {
      setTables([])
      setError(getErrorMessage(tableResult.reason))
    }

    if (invoiceResult.status === 'fulfilled') {
      setInvoices(invoiceResult.value.invoices || [])
    } else if (activeNavKey === 'invoices') {
      setInvoices([])
      setError(getErrorMessage(invoiceResult.reason))
    }

    if (inventoryResult.status === 'fulfilled') {
      setInventorySummary({
        ingredients: inventoryResult.value.ingredients || [],
        lowStock: inventoryResult.value.lowStock || [],
      })
    } else if (activeNavKey === 'inventory' || activeNavKey === 'overview') {
      setInventorySummary({ ingredients: [], lowStock: [] })
      setError(getErrorMessage(inventoryResult.reason))
    }

    if (attendanceResult.status === 'fulfilled') {
      setTodayAttendance(attendanceResult.value.attendance || attendanceResult.value || [])
    } else {
      setTodayAttendance([])
    }

    setLoading(false)
  }, [activeNavKey])

  useEffect(() => {
    fetchAdminData()
    // Tự động cập nhật giờ làm mỗi 2 phút
    const interval = setInterval(fetchAdminData, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAdminData])

  useEffect(() => {
    let isMounted = true

    const syncCurrentUser = async () => {
      try {
        const result = await getProfile()
        if (!isMounted) return

        const nextUser = { ...getStoredUser(), ...(result.user || {}) }
        setCurrentUser(nextUser)
        setAuthSession({
          token: sessionStorage.getItem('token'),
          user: nextUser,
        })
      } catch {
        // Keep the cached login visible if profile refresh cannot complete.
      }
    }

    syncCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const todayInvoices = invoices.filter((invoice) => sameLocalDay(invoice.createdAt || invoice.updatedAt, new Date())).slice(0, 12)

    if (todayInvoices.length === 0) {
      setOverviewInvoiceDetails([])
      return
    }

    let isMounted = true

    Promise.allSettled(todayInvoices.map((invoice) => getInvoiceById(invoice.id))).then((results) => {
      if (!isMounted) return

      setOverviewInvoiceDetails(
        results
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value.invoice)
          .filter(Boolean)
      )
    })

    return () => {
      isMounted = false
    }
  }, [invoices])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, roleFilter, areaFilter, categoryFilter, invoiceStatusFilter, promotionStatusFilter, invoiceDateRange, sortMode, activeNavKey, areaTab, menuTab])

  const filteredAccounts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()

    return accounts
      .filter((account) => {
        const matchesKeyword =
          !keyword ||
          [account.username, account.fullName, account.email, account.phoneNumber, account.role]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        const matchesRole = roleFilter === 'all' || String(account.roleId) === roleFilter

        return matchesKeyword && matchesRole
      })
      .sort((first, second) => {
        if (sortMode === 'name') {
          return String(first.fullName || first.username).localeCompare(String(second.fullName || second.username), 'vi')
        }

        if (sortMode === 'role') {
          return String(first.role).localeCompare(String(second.role), 'vi')
        }

        if (sortMode === 'status') {
          return Number(second.status) - Number(first.status)
        }

        return Number(second.id) - Number(first.id)
      })
  }, [accounts, roleFilter, searchTerm, sortMode])

  const filteredEmployees = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase().slice(0, 100)

    return employees
      .filter((employee) => {
        if (!keyword) {
          return true
        }

        return [employee.fullName, employee.phoneNumber, employee.username, employee.gender, employee.position, employee.workShift]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      })
      .sort((first, second) => {
        if (sortMode === 'name') {
          return String(first.fullName || first.username).localeCompare(String(second.fullName || second.username), 'vi')
        }

        if (sortMode === 'status') {
          return Number(second.accountStatus) - Number(first.accountStatus)
        }

        return Number(second.id) - Number(first.id)
      })
  }, [employees, searchTerm, sortMode])

  const filteredCategories = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase().slice(0, 100)

    return categories
      .filter((category) => {
        if (!keyword) {
          return true
        }

        return [category.name, category.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword))
      })
      .sort((first, second) => {
        if (sortMode === 'name') {
          return String(first.name).localeCompare(String(second.name), 'vi')
        }

        return Number(second.id) - Number(first.id)
      })
  }, [categories, searchTerm, sortMode])

  const filteredAreas = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase().slice(0, 100)

    return areas
      .filter((area) => {
        if (!keyword) {
          return true
        }

        return [area.name, area.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword))
      })
      .sort((first, second) => {
        if (sortMode === 'name') {
          return String(first.name).localeCompare(String(second.name), 'vi')
        }

        return Number(second.id) - Number(first.id)
      })
  }, [areas, searchTerm, sortMode])

  const filteredTables = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase().slice(0, 100)

    return tables
      .filter((table) => {
        const matchesKeyword =
          !keyword ||
          [table.name, table.areaName, table.status]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        const matchesArea = areaFilter === 'all' || String(table.areaId) === areaFilter

        return matchesKeyword && matchesArea
      })
      .sort((first, second) => {
        if (sortMode === 'name') {
          return String(first.name).localeCompare(String(second.name), 'vi')
        }

        return Number(second.id) - Number(first.id)
      })
  }, [areaFilter, searchTerm, sortMode, tables])

  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase().slice(0, 100)

    return products
      .filter((product) => {
        const matchesKeyword =
          !keyword ||
          [product.name, product.description, product.categoryName]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        const matchesCategory = categoryFilter === 'all' || String(product.categoryId) === categoryFilter

        return matchesKeyword && matchesCategory
      })
      .sort((first, second) => {
        if (sortMode === 'name') {
          return String(first.name).localeCompare(String(second.name), 'vi')
        }

        if (sortMode === 'price') {
          return Number(second.price) - Number(first.price)
        }

        if (sortMode === 'status') {
          return String(first.status).localeCompare(String(second.status), 'vi')
        }

        return Number(second.id) - Number(first.id)
      })
  }, [categoryFilter, products, searchTerm, sortMode])

  const filteredPromotions = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase().slice(0, 100)

    return promotions
      .filter((promotion) => {
        const matchesKeyword =
          !keyword ||
          [promotion.name, promotion.discountType, promotion.status]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        const matchesStatus = promotionStatusFilter === 'all' || promotion.status === promotionStatusFilter

        return matchesKeyword && matchesStatus
      })
      .sort((first, second) => {
        if (sortMode === 'name') {
          return String(first.name).localeCompare(String(second.name), 'vi')
        }

        if (sortMode === 'value') {
          return Number(second.discountValue) - Number(first.discountValue)
        }

        if (sortMode === 'status') {
          return String(first.status).localeCompare(String(second.status), 'vi')
        }

        return Number(second.id) - Number(first.id)
      })
  }, [promotionStatusFilter, promotions, searchTerm, sortMode])

  const filteredInvoices = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase().slice(0, 100)
    const { startDate, endDate } = invoiceDateRange

    return invoices
      .filter((invoice) => {
        const createdDate = invoice.createdAt ? String(invoice.createdAt).slice(0, 10) : ''
        const matchesKeyword =
          !keyword ||
          [invoice.code, invoice.customerName, invoice.tableName, invoice.areaName, invoice.cashierName]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        const matchesStatus = invoiceStatusFilter === 'all' || invoice.status === invoiceStatusFilter
        const matchesStart = !startDate || createdDate >= startDate
        const matchesEnd = !endDate || createdDate <= endDate

        return matchesKeyword && matchesStatus && matchesStart && matchesEnd
      })
      .sort((first, second) => Number(second.id) - Number(first.id))
  }, [invoiceDateRange, invoiceStatusFilter, invoices, searchTerm])

  // Hiển thị tất cả, không phân trang — dùng scroll thay pagination
  const visibleAccounts = filteredAccounts
  const visibleEmployees = filteredEmployees
  const visibleCategories = filteredCategories
  const visibleAreas = filteredAreas
  const visibleTables = filteredTables
  const visibleProducts = filteredProducts
  const visiblePromotions = filteredPromotions
  const visibleInvoices = filteredInvoices

  const overviewStats = useMemo(() => {
    const now = new Date()
    const todayInvoices = invoices.filter((invoice) => sameLocalDay(invoice.createdAt || invoice.updatedAt, now))
    const todayRevenue = todayInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0)
    const openInvoices = invoices.filter((invoice) => String(invoice.status).toLowerCase() === 'unpaid').length
    const occupiedTables = tables.filter((table) => ['busy', 'occupied', 'serving', 'in_use'].includes(String(table.status).toLowerCase())).length
    const lowStockCount = inventorySummary.lowStock.length

    return [
      {
        delta: '+12% so hôm qua',
        deltaTone: 'positive',
        icon: Banknote,
        label: 'Doanh thu hôm nay',
        tone: 'tone-revenue',
        value: todayRevenue,
        valueType: 'currency',
      },
      {
        icon: ReceiptText,
        label: 'Hóa đơn hôm nay',
        note: `${openInvoices} đang mở`,
        tone: 'tone-orders',
        value: todayInvoices.length,
      },
      {
        icon: Boxes,
        label: 'Cảnh báo kho',
        note: lowStockCount > 0 ? 'Sắp hết nguyên liệu' : 'Kho ổn định',
        tone: 'tone-stock',
        value: lowStockCount,
      },
    ]
  }, [inventorySummary.lowStock, invoices, tables])

  const overviewShiftEmployees = useMemo(
    () =>
      todayAttendance
        .filter((row) => row.loginAt && !row.logoutAt)
        .map((row) => ({
          id: row.employeeId || row.accountId,
          accountId: row.accountId,
          fullName: row.employeeName,
          username: row.employeeName,
          position: row.position || row.role,
          workShift: null,
        }))
        .slice(0, 6),
    [todayAttendance]
  )

  const overviewTopProducts = useMemo(() => {
    const productMap = new Map()

    overviewInvoiceDetails.forEach((invoice) => {
      ;(invoice.details || []).forEach((item) => {
        const name = item.productName || 'Món chưa đặt tên'
        const entry = productMap.get(name) || { quantity: 0, image: null }
        const found = products.find((p) => (p.name || p.productName) === name)
        productMap.set(name, {
          quantity: entry.quantity + Number(item.quantity || 0),
          image: entry.image || found?.image || null,
          categoryName: entry.categoryName || found?.categoryName || '',
        })
      })
    })

    return [...productMap.entries()]
      .map(([name, data]) => ({ name, quantity: data.quantity, image: data.image, categoryName: data.categoryName }))
      .sort((first, second) => second.quantity - first.quantity)
      .slice(0, 5)
  }, [overviewInvoiceDetails, products])
  const recentInvoices = useMemo(
    () =>
      [...invoices]
        .sort((first, second) => new Date(second.updatedAt || second.createdAt || 0) - new Date(first.updatedAt || first.createdAt || 0))
        .slice(0, 5),
    [invoices]
  )

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - offset))
      return date
    })

    return days.map((date) => {
      const amount = invoices
        .filter((invoice) => sameLocalDay(invoice.createdAt || invoice.updatedAt, date))
        .reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0)

      return {
        amount,
        label: date.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('.', ''),
      }
    })
  }, [invoices])

  const overviewMonthlyRevenue = useMemo(() => {
    const now = new Date()
    return invoices
      .filter((inv) => {
        const d = new Date(inv.updatedAt || inv.createdAt)
        const s = String(inv.status || '')
        return (s === 'Paid' || s === 'Completed') && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0)
  }, [invoices])

  const overviewYearlyRevenue = useMemo(() => {
    const now = new Date()
    return invoices
      .filter((inv) => {
        const d = new Date(inv.updatedAt || inv.createdAt)
        const s = String(inv.status || '')
        return (s === 'Paid' || s === 'Completed') && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0)
  }, [invoices])

  const dashboardAlerts = useMemo(() => {
    const lockedAccounts = accounts.filter((account) => Number(account.status) === 0).length
    const unpaidInvoices = invoices.filter((invoice) => String(invoice.status).toLowerCase() === 'unpaid').length
    const activePromotions = promotions.filter((promotion) => String(promotion.status).toLowerCase() === 'active').length

    return [
      unpaidInvoices > 0 && {
        description: `${unpaidInvoices} hóa đơn chưa thanh toán cần theo dõi.`,
        icon: ReceiptText,
        title: 'Hóa đơn chờ thanh toán',
      },
      lockedAccounts > 0 && {
        description: `${lockedAccounts} tài khoản đang tạm khóa trong hệ thống.`,
        icon: Lock,
        title: 'Tài khoản bị khóa',
      },
      activePromotions > 0 && {
        description: `${activePromotions} chương trình khuyến mãi đang hoạt động.`,
        icon: Badge,
        title: 'Khuyến mãi đang chạy',
      },
    ].filter(Boolean)
  }, [accounts, invoices, promotions])

  const getEmployeeFormFromAccount = (account, currentForm = emptyEmployeeForm) => {
    const roleToPosition = { 'Nhân viên': 'Nhân viên', 'Pha chế': 'Pha chế' }
    return {
      ...currentForm,
      accountId: account?.id ? String(account.id) : '',
      fullName: account?.fullName || '',
      phoneNumber: account?.phoneNumber || '',
      position: roleToPosition[account?.role] || currentForm.position || '',
    }
  }

  const handleLogout = async () => {
    const confirmed = await confirm({
      body: 'Bạn có chắc muốn đăng xuất khỏi trang Admin?',
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    try {
      await logoutRequest()
    } finally {
      removeStorageItem('token')
      removeStorageItem('user')
      window.location.hash = 'home'
    }
  }

  const handleNavSelect = (key) => {
    setActiveNavKey(key)
    window.location.hash = `admin/${key}`
    setMessage('')
    setError('')
    closeModal()
  }

  const handleOpenInvoices = () => handleNavSelect('invoices')


  const handleMenuTabChange = (tab) => {
    setMenuTab(tab)
    setSearchTerm('')
    setSortMode('newest')
    setPage(1)
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedAccount(null)
    setSelectedArea(null)
    setSelectedCategory(null)
    setSelectedEmployee(null)
    setSelectedInvoice(null)
    setSelectedProduct(null)
    setSelectedPromotion(null)
    setSelectedTable(null)
    setForm(emptyAccountForm)
    setAreaForm(emptyAreaForm)
    setCategoryForm(emptyCategoryForm)
    setEmployeeForm(emptyEmployeeForm)
    setProductForm(emptyProductForm)
    setPromotionForm(emptyPromotionForm)
    setTableForm(emptyTableForm)
    setProfileForm(emptyProfileForm)
    setPasswordForm(emptyPasswordForm)
    setProfileError('')
    setProfileMode('profile')
    setAssignableAccounts([])
    setChangePassword(false)
  }

  const openProfileModal = async () => {
    setError('')
    setMessage('')
    setProfileError('')
    setPasswordForm(emptyPasswordForm)
    setProfileMode('profile')

    try {
      const result = await getProfile()
      const currentProfileUser = result.user || {}
      const nextUser = { ...getStoredUser(), ...currentProfileUser }
      setCurrentUser(nextUser)
      setAuthSession({
        token: sessionStorage.getItem('token'),
        user: nextUser,
      })
      setProfileForm({
        email: currentProfileUser.email || '',
        fullName: currentProfileUser.fullName || '',
        phoneNumber: currentProfileUser.phoneNumber || '',
        role: currentProfileUser.role || '',
        username: currentProfileUser.username || '',
      })
    } catch (profileLoadError) {
      const cachedUser = getStoredUser()
      setProfileForm({
        ...emptyProfileForm,
        fullName: cachedUser.fullName || '',
        role: cachedUser.role || '',
        username: cachedUser.username || '',
      })
      setProfileError(getErrorMessage(profileLoadError))
    }

    setModalMode('profile')
  }

  const updateProfileForms = (event) => {
    const { name, value } = event.target

    if (profileMode === 'password') {
      setPasswordForm((current) => ({ ...current, [name]: value }))
      return
    }

    setProfileForm((current) => ({ ...current, [name]: value }))
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    const confirmed = await confirm({
      body: profileMode === 'password' ? 'Xác nhận đổi mật khẩu?' : 'Xác nhận cập nhật hồ sơ cá nhân?',
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    setSaving(true)
    setProfileError('')
    setMessage('')

    try {
      if (profileMode === 'password') {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          throw new Error('Mật khẩu mới nhập lại chưa khớp')
        }

        await changeOwnPassword({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        })
      } else {
        const result = await updateProfile(profileForm)
        const currentSessionUser = getStoredUser()
        const nextUser = {
          ...currentSessionUser,
          ...(result.user || {}),
          fullName: result.user?.fullName || profileForm.fullName,
          role: result.user?.role || currentSessionUser.role,
          username: result.user?.username || currentSessionUser.username,
        }
        setAuthSession({
          token: sessionStorage.getItem('token'),
          user: nextUser,
        })
        setCurrentUser(nextUser)
      }

      closeModal()
    } catch (profileSaveError) {
      setProfileError(getErrorMessage(profileSaveError))
    } finally {
      setSaving(false)
    }
  }

  const closeInvoiceDetail = () => {
    setModalMode(null)
    setSelectedInvoice(null)
    setInvoiceDetailLoading(false)
  }

  const openCreateModal = () => {
    setError('')
    setMessage('')
    setSelectedAccount(null)
    setChangePassword(true)
    setForm(emptyAccountForm)
    setModalMode('create')
  }

  const openEditModal = (account) => {
    setError('')
    setMessage('')
    setSelectedAccount(account)
    setChangePassword(false)
    setForm({
      username: account.username || '',
      password: '',
      fullName: account.fullName || '',
      email: account.email || '',
      phoneNumber: account.phoneNumber || '',
      roleId: account.roleId ? String(account.roleId) : '',
      status: Number(account.status) === 1 ? 1 : 0,
    })
    setModalMode('edit')
  }

  const openCreateEmployeeModal = async () => {
    setError('')
    setMessage('')
    setSelectedEmployee(null)
    setEmployeeForm(emptyEmployeeForm)
    setSaving(true)

    try {
      const data = await getAssignableEmployeeAccounts()
      const availableAccounts = data.accounts || []
      setAssignableAccounts(availableAccounts)
      setEmployeeForm(emptyEmployeeForm)
      setModalMode('employee-create')
    } catch (accountError) {
      setError(getErrorMessage(accountError))
    } finally {
      setSaving(false)
    }
  }

  const openEditEmployeeModal = (employee) => {
    setError('')
    setMessage('')
    setSelectedEmployee(employee)
    setAssignableAccounts([])
    setEmployeeForm({
      fullName: employee.fullName || '',
      phoneNumber: employee.phoneNumber || '',
      birthDate: employee.birthDate || '',
      gender: employee.gender || '',
      hireDate: employee.hireDate || '',
      hourlyRate: employee.hourlyRate ? formatCurrencyInput(employee.hourlyRate) : '',
      position: employee.position || '',
      workShift: employee.workShift || '',
      accountId: employee.accountId ? String(employee.accountId) : '',
    })
    setModalMode('employee-edit')
  }

  const openCreateCategoryModal = () => {
    setError('')
    setMessage('')
    setSelectedCategory(null)
    setCategoryForm(emptyCategoryForm)
    setModalMode('category-create')
  }

  const openEditCategoryModal = (category) => {
    setError('')
    setMessage('')
    setSelectedCategory(category)
    setCategoryForm({
      name: category.name || '',
      description: category.description || '',
    })
    setModalMode('category-edit')
  }

  const openCreateAreaModal = () => {
    setError('')
    setMessage('')
    setSelectedArea(null)
    setAreaForm(emptyAreaForm)
    setModalMode('area-create')
  }

  const openEditAreaModal = (area) => {
    setError('')
    setMessage('')
    setSelectedArea(area)
    setAreaForm({
      name: area.name || '',
      description: area.description || '',
    })
    setModalMode('area-edit')
  }

  const openCreateTableModal = () => {
    setError('')
    setMessage('')
    setSelectedTable(null)
    setTableForm(emptyTableForm)
    setModalMode('table-create')
  }

  const openEditTableModal = (table) => {
    setError('')
    setMessage('')
    setSelectedTable(table)
    setTableForm({
      name: table.name || '',
      areaId: table.areaId ? String(table.areaId) : '',
      status: table.status || 'Available',
    })
    setModalMode('table-edit')
  }

  const openCreateProductModal = () => {
    setError('')
    setMessage('')
    setSelectedProduct(null)
    setProductForm(emptyProductForm)
    setModalMode('product-create')
  }

  const openEditProductModal = (product) => {
    setError('')
    setMessage('')
    setSelectedProduct(product)
    setProductForm({
      name: product.name || '',
      categoryId: product.categoryId ? String(product.categoryId) : '',
      price: product.price ? formatCurrencyInput(product.price) : '',
      description: product.description || '',
      image: null,
      status: product.status || 'Active',
    })
    setModalMode('product-edit')
  }

  const openCreatePromotionModal = () => {
    setError('')
    setMessage('')
    setSelectedPromotion(null)
    setPromotionForm(emptyPromotionForm)
    setModalMode('promotion-create')
  }

  const openEditPromotionModal = (promotion) => {
    setError('')
    setMessage('')
    setSelectedPromotion(promotion)
    setPromotionForm({
      name: promotion.name || '',
      code: promotion.code || '',
      discountType: promotion.discountType || 'Percent',
      discountValue: promotion.discountValue ? (promotion.discountType === 'Fixed' ? formatCurrencyInput(promotion.discountValue) : sanitizeIntegerInput(promotion.discountValue)) : '',
      startDate: promotion.startDate || '',
      endDate: promotion.endDate || '',
      status: promotion.status || 'Active',
    })
    setModalMode('promotion-edit')
  }

  const updateForm = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: name === 'status' ? Number(value) : value }))
  }

  const updateEmployeeForm = (event) => {
    const { name, value } = event.target
    if (name === 'accountId') {
      const selectedAccount = assignableAccounts.find((account) => String(account.id) === String(value))
      setEmployeeForm((current) => getEmployeeFormFromAccount(selectedAccount, current))
      return
    }

    setEmployeeForm((current) => ({
      ...current,
      [name]: name === 'hourlyRate' ? formatCurrencyInput(value) : value,
    }))
  }

  const updateCategoryForm = (event) => {
    const { name, value } = event.target
    setCategoryForm((current) => ({ ...current, [name]: value }))
  }

  const updateAreaForm = (event) => {
    const { name, value } = event.target
    setAreaForm((current) => ({ ...current, [name]: value }))
  }

  const updateTableForm = (event) => {
    const { name, value } = event.target
    setTableForm((current) => ({ ...current, [name]: value }))
  }

  const updateProductForm = (event) => {
    const { name, value } = event.target
    setProductForm((current) => ({
      ...current,
      [name]: name === 'price' ? formatCurrencyInput(value) : value,
    }))
  }

  const updatePromotionForm = (event) => {
    const { name, value } = event.target
    setPromotionForm((current) => {
      if (name === 'discountType') {
        return {
          ...current,
          discountType: value,
          discountValue: value === 'Fixed' ? formatCurrencyInput(current.discountValue) : sanitizeIntegerInput(current.discountValue),
        }
      }

      return {
        ...current,
        [name]: name === 'discountValue' && current.discountType === 'Fixed' ? formatCurrencyInput(value) : name === 'discountValue' ? sanitizeIntegerInput(value) : value,
      }
    })
  }

  const updateProductImage = (event) => {
    const file = event.target.files?.[0] || null

    setProductForm((current) => ({ ...current, image: file }))
  }

  const updateInvoiceDateRange = (event) => {
    const { name, value } = event.target
    setInvoiceDateRange((current) => {
      const nextRange = { ...current, [name]: value }

      if (nextRange.startDate && nextRange.endDate && nextRange.startDate > nextRange.endDate) {
        setError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc')
      } else {
        setError('')
      }

      return nextRange
    })
  }

  const openInvoiceDetailModal = async (invoice) => {
    setError('')
    setMessage('')
    setSelectedInvoice(invoice)
    setInvoiceDetailLoading(true)
    setModalMode('invoice-detail')

    try {
      const data = await getInvoiceById(invoice.id)
      setSelectedInvoice(data.invoice)
    } catch (detailError) {
      setError(getErrorMessage(detailError))
    } finally {
      setInvoiceDetailLoading(false)
    }
  }

  const handleSaveAccount = async (event) => {
    event.preventDefault()
    const confirmed = await confirm({
      body: modalMode === 'create' ? `Thêm tài khoản "${form.username}"?` : `Cập nhật tài khoản "${selectedAccount?.username || form.username}"?`,
      confirmLabel: modalMode === 'create' ? 'Tiếp tục' : 'Xác nhận',
    })
    if (!confirmed) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        ...form,
        roleId: Number(form.roleId),
        status: Number(form.status),
      }

      if (modalMode === 'edit' && (!changePassword || !payload.password)) {
        delete payload.password
      }

      if (modalMode === 'create') {
        await createAccount(payload)
      } else {
        await updateAccount(selectedAccount.id, payload)
      }

      closeModal()
      await fetchAdminData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!selectedAccount) {
      return
    }

    setError('')
    setMessage('')
    setSaving(true)

    try {
      await deleteAccount(selectedAccount.id)
      closeModal()
      await fetchAdminData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEmployee = async (event) => {
    event.preventDefault()
    const confirmed = await confirm({
      body: modalMode === 'employee-create' ? `Thêm nhân viên "${employeeForm.fullName}"?` : `Cập nhật nhân viên "${employeeForm.fullName}"?`,
      confirmLabel: modalMode === 'employee-create' ? 'Tiếp tục' : 'Xác nhận',
    })
    if (!confirmed) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        ...employeeForm,
        accountId: Number(employeeForm.accountId),
        hourlyRate: parseCurrency(employeeForm.hourlyRate),
      }

      if (modalMode === 'employee-create') {
        await createEmployee(payload)
      } else {
        await updateEmployee(selectedEmployee.id, payload)
      }

      closeModal()
      await fetchAdminData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCategory = async (event) => {
    event.preventDefault()
    const confirmed = await confirm({
      body: modalMode === 'category-create' ? `Thêm danh mục "${categoryForm.name}"?` : `Cập nhật danh mục "${categoryForm.name}"?`,
      confirmLabel: modalMode === 'category-create' ? 'Tiếp tục' : 'Xác nhận',
    })
    if (!confirmed) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (modalMode === 'category-create') {
        await createCategory(categoryForm)
      } else {
        await updateCategory(selectedCategory.id, categoryForm)
      }

      closeModal()
      await fetchAdminData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveArea = async (event) => {
    event.preventDefault()
    const confirmed = await confirm({
      body: modalMode === 'area-create' ? `Thêm khu vực "${areaForm.name}"?` : `Cập nhật khu vực "${areaForm.name}"?`,
      confirmLabel: modalMode === 'area-create' ? 'Tiếp tục' : 'Xác nhận',
    })
    if (!confirmed) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (modalMode === 'area-create') {
        await createArea(areaForm)
      } else {
        await updateArea(selectedArea.id, areaForm)
      }

      closeModal()
      await fetchAdminData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTable = async (event) => {
    event.preventDefault()
    const confirmed = await confirm({
      body: modalMode === 'table-create' ? `Thêm bàn "${tableForm.name}"?` : `Cập nhật bàn "${tableForm.name}"?`,
      confirmLabel: modalMode === 'table-create' ? 'Tiếp tục' : 'Xác nhận',
    })
    if (!confirmed) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        ...tableForm,
        areaId: Number(tableForm.areaId),
      }

      if (modalMode === 'table-create') {
        await createTable(payload)
      } else {
        await updateTable(selectedTable.id, payload)
      }

      closeModal()
      await fetchAdminData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProduct = async (event) => {
    event.preventDefault()
    const confirmed = await confirm({
      body: modalMode === 'product-create' ? `Thêm món "${productForm.name}"?` : `Cập nhật món "${productForm.name}"?`,
      confirmLabel: modalMode === 'product-create' ? 'Tiếp tục' : 'Xác nhận',
    })
    if (!confirmed) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        ...productForm,
        categoryId: Number(productForm.categoryId),
        price: parseCurrency(productForm.price),
      }

      if (modalMode === 'product-create') {
        await createProduct(payload)
      } else {
        await updateProduct(selectedProduct.id, payload)
      }

      closeModal()
      await fetchAdminData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const handleSavePromotion = async (event) => {
    event.preventDefault()
    const confirmed = await confirm({
      body: modalMode === 'promotion-create' ? `Thêm khuyến mại "${promotionForm.name}"?` : `Cập nhật khuyến mại "${promotionForm.name}"?`,
      confirmLabel: modalMode === 'promotion-create' ? 'Tiếp tục' : 'Xác nhận',
    })
    if (!confirmed) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        ...promotionForm,
        discountValue: promotionForm.discountType === 'Fixed' ? parseCurrency(promotionForm.discountValue) : Number(sanitizeIntegerInput(promotionForm.discountValue)),
      }

      if (modalMode === 'promotion-create') {
        await createPromotion(payload)
      } else {
        await updatePromotion(selectedPromotion.id, payload)
      }

      closeModal()
      await fetchAdminData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) {
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      await deleteEmployee(selectedEmployee.id)
      closeModal()
      await fetchAdminData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) {
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      await deleteCategory(selectedCategory.id)
      closeModal()
      await fetchAdminData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteArea = async () => {
    if (!selectedArea) {
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      await deleteArea(selectedArea.id)
      closeModal()
      await fetchAdminData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTable = async () => {
    if (!selectedTable) {
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      await deleteTable(selectedTable.id)
      closeModal()
      await fetchAdminData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) {
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      await deleteProduct(selectedProduct.id)
      closeModal()
      await fetchAdminData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePromotion = async () => {
    if (!selectedPromotion) {
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      await deletePromotion(selectedPromotion.id)
      closeModal()
      await fetchAdminData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleEmployeeAccountStatus = async (employee) => {
    const nextStatus = Number(employee.accountStatus) === 1 ? 0 : 1
    const confirmed = await confirm({
      body: `${nextStatus === 1 ? 'Mở khóa' : 'Khóa'} tài khoản của nhân viên "${employee.fullName}"?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      await updateEmployeeAccountStatus(employee.id, nextStatus)
      await fetchAdminData()
    } catch (statusError) {
      setError(getErrorMessage(statusError))
    }
  }

  const handleToggleAccountStatus = async (account) => {
    const nextStatus = Number(account.status) === 1 ? 0 : 1
    const confirmed = await confirm({
      body: `${nextStatus === 1 ? 'Mở khóa' : 'Khóa'} tài khoản "${account.username}"?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      await updateAccountStatus(account.id, nextStatus)
      await fetchAdminData()
    } catch (statusError) {
      setError(getErrorMessage(statusError))
    }
  }

  return (
    <main className="admin-page">
      <AdminSidebar activeNavKey={activeNavKey} onLogout={handleLogout} onSelect={handleNavSelect} />

      <section className="admin-content">
        <AdminHeader
          activeNavItem={activeNavItem}
          currentUser={currentUser}
          isAccountManagement={isAccountManagement}
          isAreaManagement={isAreaManagement}
          isCategoryManagement={isCategoryManagement}
          isEmployeeManagement={isEmployeeManagement}
          isInvoiceManagement={isInvoiceManagement}
          isInventoryManagement={isInventoryManagement}
          isMenuManagement={isMenuManagement}
          isPromotionManagement={isPromotionManagement}
          onOpenProfile={openProfileModal}
        />

        <AdminAlert error={error} message={message} onClearError={() => setError('')} />

        {isOverview && (
          <OverviewSection
            alerts={dashboardAlerts}
            chartData={chartData}
            inventoryAlerts={inventorySummary.lowStock}
            loading={loading}
            monthlyRevenue={overviewMonthlyRevenue}
            recentInvoices={recentInvoices}
            shiftEmployees={overviewShiftEmployees}
            stats={overviewStats}
            topProducts={overviewTopProducts}
            yearlyRevenue={overviewYearlyRevenue}
          />
        )}

        {isAccountManagement && (
          <AccountsSection
            accounts={{ filtered: filteredAccounts, visible: visibleAccounts }}
            loading={loading}
            onCreate={openCreateModal}
            onDelete={(account) => {
              setError('')
              setMessage('')
              setSelectedAccount(account)
              setModalMode('delete-confirm')
            }}
            onEdit={openEditModal}
            onPageChange={setPage}
            onRoleFilterChange={setRoleFilter}
            onSearchChange={setSearchTerm}
            onSortChange={setSortMode}
            onToggleStatus={handleToggleAccountStatus}
            page={page}
            roleFilter={roleFilter}
            roles={roles}
            searchTerm={searchTerm}
            sortMode={sortMode}
            totalPages={1}
          />
        )}

        {isEmployeeManagement && (
          <EmployeesSection
            employees={{ filtered: filteredEmployees, visible: visibleEmployees }}
            activeTab={employeeTab}
            loading={loading}
            todayAttendance={todayAttendance}
            onDelete={(employee) => {
              setError('')
              setMessage('')
              setSelectedEmployee(employee)
              setModalMode('employee-delete-confirm')
            }}
            onCreate={openCreateEmployeeModal}
            onEdit={openEditEmployeeModal}
            onEmployeeTabChange={setEmployeeTab}
            onPageChange={setPage}
            onSearchChange={setSearchTerm}
            onSortChange={setSortMode}
            onToggleStatus={handleToggleEmployeeAccountStatus}
            page={page}
            searchTerm={searchTerm}
            sortMode={sortMode}
            totalPages={1}
          />
        )}

        {isMenuManagement && (
          <MenuSection
            activeTab={menuTab}
            categories={categories}
            categoryFilter={categoryFilter}
            categoryRows={{ filtered: filteredCategories, visible: visibleCategories }}
            categoryTotalPages={1}
            loading={loading}
            onCategoryDelete={(category) => {
              setError('')
              setMessage('')
              setSelectedCategory(category)
              setModalMode('category-delete-confirm')
            }}
            onCategoryEdit={openEditCategoryModal}
            onCategoryFilterChange={setCategoryFilter}
            onCreateCategory={openCreateCategoryModal}
            onCreateProduct={openCreateProductModal}
            onDelete={(product) => {
              setError('')
              setMessage('')
              setSelectedProduct(product)
              setModalMode('product-delete-confirm')
            }}
            onEdit={openEditProductModal}
            onPageChange={setPage}
            onSearchChange={setSearchTerm}
            onSortChange={setSortMode}
            onTabChange={handleMenuTabChange}
            page={page}
            products={{ filtered: filteredProducts, visible: visibleProducts }}
            searchTerm={searchTerm}
            sortMode={sortMode}
            totalPages={1}
          />
        )}

        {isPromotionManagement && (
          <PromotionsSection
            loading={loading}
            onCreate={openCreatePromotionModal}
            onDelete={(promotion) => {
              setError('')
              setMessage('')
              setSelectedPromotion(promotion)
              setModalMode('promotion-delete-confirm')
            }}
            onEdit={openEditPromotionModal}
            onPageChange={setPage}
            onSearchChange={setSearchTerm}
            onSortChange={setSortMode}
            onStatusFilterChange={setPromotionStatusFilter}
            page={page}
            promotions={{ filtered: filteredPromotions, visible: visiblePromotions }}
            promotionUsage={invoices}
            searchTerm={searchTerm}
            sortMode={sortMode}
            statusFilter={promotionStatusFilter}
            totalPages={1}
          />
        )}

        {isFinancialReport && <FinancialReportSection />}

        {isInventoryManagement && <InventorySection products={products} />}

        {isAreaManagement && (
          <AreasSection
            activeTab={areaTab}
            areas={{ filtered: filteredAreas, visible: visibleAreas }}
            areaFilter={areaFilter}
            loading={loading}
            onAreaFilterChange={setAreaFilter}
            onCreateArea={openCreateAreaModal}
            onCreateTable={openCreateTableModal}
            onDelete={(area) => {
              setError('')
              setMessage('')
              setSelectedArea(area)
              setModalMode('area-delete-confirm')
            }}
            onEdit={openEditAreaModal}
            onPageChange={setPage}
            onSearchChange={setSearchTerm}
            onSortChange={setSortMode}
            onTabChange={setAreaTab}
            onTableDelete={(table) => {
              setError('')
              setMessage('')
              setSelectedTable(table)
              setModalMode('table-delete-confirm')
            }}
            onTableEdit={openEditTableModal}
            page={page}
            searchTerm={searchTerm}
            sortMode={sortMode}
            tableTotalPages={1}
            tables={{ filtered: filteredTables, visible: visibleTables }}
            totalPages={1}
          />
        )}

        {isInvoiceManagement && (
          <InvoicesSection
            dateRange={invoiceDateRange}
            invoices={{ filtered: filteredInvoices, visible: visibleInvoices }}
            loading={loading}
            onDateRangeChange={updateInvoiceDateRange}
            onPageChange={setPage}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setInvoiceStatusFilter}
            onViewDetail={openInvoiceDetailModal}
            page={page}
            searchTerm={searchTerm}
            statusFilter={invoiceStatusFilter}
            totalPages={1}
          />
        )}

        {!isOverview &&
          !isAccountManagement &&
          !isAreaManagement &&
          !isCategoryManagement &&
          !isEmployeeManagement &&
          !isInvoiceManagement &&
          !isInventoryManagement &&
          !isMenuManagement &&
          !isPromotionManagement &&
          !isFinancialReport && <PlaceholderSection navItem={activeNavItem} />}
      </section>

      {modalMode === 'delete-confirm' && selectedAccount && (
        <ConfirmModal
          body={
            <>
              Bạn có chắc muốn xóa tài khoản <strong>{selectedAccount.username}</strong>
              {selectedAccount.fullName ? ` (${selectedAccount.fullName})` : ''} không? Hành động này không thể hoàn tác.
            </>
          }
          loading={saving}
          onClose={closeModal}
          onConfirm={handleDeleteAccount}
        />
      )}

      {modalMode === 'employee-delete-confirm' && selectedEmployee && (
        <ConfirmModal
          body={
            <>
              Bạn có chắc muốn xóa nhân viên <strong>{selectedEmployee.fullName}</strong> không? Hành động này không thể hoàn tác.
            </>
          }
          loading={saving}
          onClose={closeModal}
          onConfirm={handleDeleteEmployee}
        />
      )}

      {modalMode === 'category-delete-confirm' && selectedCategory && (
        <ConfirmModal
          body={
            <>
              Bạn có chắc muốn xóa danh mục <strong>{selectedCategory.name}</strong> không? Không thể xóa nếu danh mục còn món liên kết.
            </>
          }
          loading={saving}
          onClose={closeModal}
          onConfirm={handleDeleteCategory}
        />
      )}

      {modalMode === 'area-delete-confirm' && selectedArea && (
        <ConfirmModal
          body={
            <>
              Bạn có chắc muốn xóa khu vực <strong>{selectedArea.name}</strong> không? Không thể xóa nếu khu vực còn bàn liên kết.
            </>
          }
          loading={saving}
          onClose={closeModal}
          onConfirm={handleDeleteArea}
        />
      )}

      {modalMode === 'table-delete-confirm' && selectedTable && (
        <ConfirmModal
          body={
            <>
              Bạn có chắc muốn xóa bàn <strong>{selectedTable.name}</strong> không?
            </>
          }
          loading={saving}
          onClose={closeModal}
          onConfirm={handleDeleteTable}
        />
      )}

      {modalMode === 'product-delete-confirm' && selectedProduct && (
        <ConfirmModal
          body={
            <>
              Bạn có chắc muốn xóa món <strong>{selectedProduct.name}</strong> khỏi menu không? Hành động này không thể hoàn tác.
            </>
          }
          loading={saving}
          onClose={closeModal}
          onConfirm={handleDeleteProduct}
        />
      )}

      {modalMode === 'promotion-delete-confirm' && selectedPromotion && (
        <ConfirmModal
          body={
            <>
              Bạn có chắc muốn xóa khuyến mại <strong>{selectedPromotion.name}</strong> không? Không thể xóa nếu khuyến mại đang áp dụng.
            </>
          }
          loading={saving}
          onClose={closeModal}
          onConfirm={handleDeletePromotion}
        />
      )}

      {modalMode === 'invoice-detail' && (
        <InvoiceDetailModal invoice={selectedInvoice} loading={invoiceDetailLoading} onClose={closeInvoiceDetail} />
      )}

      {modalMode === 'profile' && (
        <ProfileModal
          error={profileError}
          form={profileForm}
          mode={profileMode}
          onChange={updateProfileForms}
          onClose={closeModal}
          onModeChange={(mode) => {
            setProfileMode(mode)
            setProfileError('')
          }}
          onSubmit={handleSaveProfile}
          passwordForm={passwordForm}
          saving={saving}
        />
      )}

      {(modalMode === 'create' || modalMode === 'edit') && (
        <AccountModal
          changePassword={changePassword}
          form={form}
          mode={modalMode}
          onChange={updateForm}
          onClose={closeModal}
          onSetChangePassword={setChangePassword}
          onSubmit={handleSaveAccount}
          roles={roles}
          saving={saving}
        />
      )}

      {(modalMode === 'employee-create' || modalMode === 'employee-edit') && (
        <EmployeeModal
          assignableAccounts={assignableAccounts}
          form={employeeForm}
          mode={modalMode}
          onChange={updateEmployeeForm}
          onClose={closeModal}
          onSubmit={handleSaveEmployee}
          saving={saving}
          selectedEmployee={selectedEmployee}
        />
      )}

      {(modalMode === 'category-create' || modalMode === 'category-edit') && (
        <CategoryModal
          form={categoryForm}
          mode={modalMode}
          onChange={updateCategoryForm}
          onClose={closeModal}
          onSubmit={handleSaveCategory}
          saving={saving}
        />
      )}

      {(modalMode === 'area-create' || modalMode === 'area-edit') && (
        <AreaModal
          form={areaForm}
          mode={modalMode}
          onChange={updateAreaForm}
          onClose={closeModal}
          onSubmit={handleSaveArea}
          saving={saving}
        />
      )}

      {(modalMode === 'table-create' || modalMode === 'table-edit') && (
        <TableModal
          areas={areas}
          form={tableForm}
          mode={modalMode}
          onChange={updateTableForm}
          onClose={closeModal}
          onSubmit={handleSaveTable}
          saving={saving}
        />
      )}

      {(modalMode === 'product-create' || modalMode === 'product-edit') && (
        <ProductModal
          categories={categories}
          form={productForm}
          mode={modalMode}
          onChange={updateProductForm}
          onClose={closeModal}
          onFileChange={updateProductImage}
          onSubmit={handleSaveProduct}
          saving={saving}
          selectedProduct={selectedProduct}
        />
      )}

      {(modalMode === 'promotion-create' || modalMode === 'promotion-edit') && (
        <PromotionModal
          form={promotionForm}
          mode={modalMode}
          onChange={updatePromotionForm}
          onClose={closeModal}
          onSubmit={handleSavePromotion}
          saving={saving}
        />
      )}
    </main>
  )
}

export default Admin
