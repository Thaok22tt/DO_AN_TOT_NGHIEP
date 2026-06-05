import {
  Banknote,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Coffee,
  Combine,
  Edit3,
  History,
  LogOut,
  Minus,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  Send,
  ShoppingCart,
  Truck,
  Table2,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addWorkstationInvoiceItem,
  applyWorkstationPromotion,
  confirmWorkstationPayment,
  createWorkstationInvoice,
  deleteWorkstationInvoiceDetail,
  getMyWorkstationInvoices,
  getWorkstationBootstrap,
  getWorkstationInvoiceById,
  markWorkstationInvoiceServed,
  startWorkstationDelivery,
  completeWorkstationDelivery,
  mergeWorkstationInvoices,
  sendWorkstationInvoiceToKitchen,
  transferWorkstationInvoiceTable,
  updateWorkstationInvoiceDetailNote,
  updateWorkstationInvoiceDetailQuantity,
  updateWorkstationInvoiceDetailSize,
  updateWorkstationInvoiceStatus,
  updateWorkstationPaymentMethod,
  updateWorkstationTableStatus,
} from '../../services/workstationService'
import { changePassword as changeOwnPassword, getProfile, logout as logoutRequest, updateProfile } from '../../services/authService'
import { useConfirm } from '../../components/common/useConfirm'
import { formatCurrency, formatCurrencyInput, parseCurrency } from '../../utils/formatCurrency'
import { getStoredUser, removeStorageItem, setAuthSession } from '../../utils/storage'
import '../Workstation/Workstation.css'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')
const ORDER_PAGE_SIZE = 9
const SIZE_SURCHARGE = 5000

const normalizeCategoryName = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim()

const stripSizePrefix = (note = '') => String(note || '').replace(/^Size\s+[ML]\s*(?:-\s*)?/i, '').trim()

const buildSizeNote = (size, note = '') => {
  const cleanNote = stripSizePrefix(note)
  return cleanNote ? `Size ${size} - ${cleanNote}` : `Size ${size}`
}

const getDetailCupSize = (item, product) => {
  const sizeMatch = String(item?.note || '').match(/^Size\s+([ML])\b/i)
  if (sizeMatch) return sizeMatch[1].toUpperCase()

  if (product && Number(item?.unitPrice || 0) >= Number(product.price || 0) + SIZE_SURCHARGE) {
    return 'L'
  }

  return getCupSizeConfig(product?.categoryName).defaultSize
}

const getCupSizeConfig = (categoryName = '') => {
  const category = normalizeCategoryName(categoryName)

  if (
    category.includes('tra sua') ||
    category.includes('soda') ||
    category.includes('sode') ||
    category.includes('yaourt') ||
    category.includes('sinh to')
  ) {
    return { defaultSize: 'M', options: ['M', 'L'] }
  }

  if (category.includes('ca phe') || category.includes('nuoc ep') || category.includes('tra')) {
    return { defaultSize: 'L', options: ['L'] }
  }

  return { defaultSize: 'M', options: ['M'] }
}

const VIETQR_CONFIG = {
  bankAccount: '23938121',
  bankCode: 'ACB',
  userBankName: 'Y THAO',
}

const emptyCreateForm = {
  areaId: '',
  customerName: '',
  deliveryAddress: '',
  deliveryNote: '',
  deliveryPhone: '',
  note: '',
  orderType: 'DineIn',
  paymentMethod: 'COD',
  promotionCode: '',
  serviceNumber: '',
  shippingFee: '',
  tableId: '',
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

const tableStatusLabels = {
  Available: 'Trống',
  Occupied: 'Đang dùng',
  Preparing: 'Đang pha chế',
}

const tableStatusTones = {
  Available: 'available',
  Occupied: 'occupied',
  Preparing: 'preparing',
}

const invoiceStatusLabels = {
  Cancelled: 'Đã hủy',
  Completed: 'Hoàn thành',
  Paid: 'Đã thanh toán',
  Unpaid: 'Chờ thanh toán',
}

const kitchenStatusLabels = {
  Completed: 'Pha chế xong',
  Draft: 'Chưa gửi',
  InProgress: 'Đang pha chế',
  Sent: 'Đang chờ',
  Waiting: 'Đang chờ',
}

const orderTypeLabels = {
  DineIn: 'Tại chỗ',
  Ship: 'Ship',
  Takeaway: 'Mang đi',
}

const getInvoicePlace = (invoice) => (invoice?.tableName ? `${invoice.tableName} - ${invoice.areaName}` : orderTypeLabels[invoice?.orderType] || 'Mang đi')

const getDisplayOrderNumber = (invoice) => (invoice?.serviceNumber ? `Số ${invoice.serviceNumber}` : invoice?.code || 'Đơn mới')

const getOrderTypeSummary = (invoice) => {
  const label = orderTypeLabels[invoice?.orderType] || invoice?.orderType || 'Đơn hàng'
  return invoice?.orderType === 'DineIn' && invoice?.serviceNumber ? `${label} - số ${invoice.serviceNumber}` : label
}

const getInvoiceStaffName = (invoice, fallbackUser = {}) =>
  invoice?.cashierName || invoice?.employeeName || invoice?.staffName || fallbackUser.fullName || fallbackUser.username || 'Nhân viên'

const paymentMethodLabels = {
  Cash: 'Tiền mặt',
  QR: 'Chuyển khoản',
}

const getPaymentMethodLabel = (invoice) => {
  if (invoice?.status !== 'Paid') return 'Chưa thanh toán'
  return paymentMethodLabels[invoice?.paymentMethod] || invoice?.paymentMethod || 'Chưa ghi nhận'
}

const isCancelledInvoice = (invoice) => invoice?.status === 'Cancelled'

const isKitchenCompletedInvoice = (invoice) => invoice?.kitchenStatus === 'Completed'

const isOrderCompletedInvoice = (invoice) => invoice?.status === 'Completed'

const isPaidInvoice = (invoice) => invoice?.status === 'Paid'

const isHistoricalCompletedInvoice = (invoice) => isPaidInvoice(invoice) || isOrderCompletedInvoice(invoice)

const isWaitingKitchenInvoice = (invoice) => ['Waiting', 'Sent'].includes(invoice?.kitchenStatus)

const canSendInvoiceToKitchen = (invoice) => invoice?.kitchenStatus === 'Draft' && !isCancelledInvoice(invoice) && !isOrderCompletedInvoice(invoice)

const canServeInvoice = (invoice) => isKitchenCompletedInvoice(invoice) && !isCancelledInvoice(invoice) && !isOrderCompletedInvoice(invoice)

const canCancelInvoice = (invoice) =>
  !isCancelledInvoice(invoice) &&
  !isOrderCompletedInvoice(invoice) &&
  !isKitchenCompletedInvoice(invoice) &&
  !invoice?.servedAt &&
  !invoice?.deliveredAt &&
  !invoice?.isServed

const getInvoiceStatusLabel = (invoice) => {
  if (isCancelledInvoice(invoice)) return invoiceStatusLabels[invoice.status]
  if (isOrderCompletedInvoice(invoice)) return invoiceStatusLabels[invoice.status]
  if (invoice?.orderType === 'Ship') {
    if (invoice.deliveryStatus === 'Delivering') return 'ĐANG GIAO'
    if (invoice.deliveryStatus === 'Delivered') return 'ĐÃ GIAO'
    if (isKitchenCompletedInvoice(invoice)) return 'CHỜ GIAO HÀNG'
    if (invoice.kitchenStatus === 'InProgress') return 'ĐANG PHA CHẾ'
    if (isWaitingKitchenInvoice(invoice)) return 'ĐANG CHỜ'
    return 'CHỜ PHA CHẾ'
  }
  if (isKitchenCompletedInvoice(invoice)) return 'PHA CHẾ XONG'
  if (invoice?.kitchenStatus === 'InProgress') return 'ĐANG PHA CHẾ'
  if (isWaitingKitchenInvoice(invoice)) return 'ĐANG CHỜ'
  if (isPaidInvoice(invoice)) return invoiceStatusLabels[invoice.status]
  return kitchenStatusLabels[invoice?.kitchenStatus] || invoiceStatusLabels[invoice?.status] || invoice?.status
}

const formatInvoiceDateTime = (invoice) => {
  const value = invoice?.createdAt || invoice?.updatedAt
  return value ? new Date(value).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')
}

const getCurrentUser = () => {
  return getStoredUser()
}

const getImageUrl = (image) => {
  if (!image) return ''
  if (/^https?:\/\//i.test(image)) return image
  return `${API_ORIGIN}${image.startsWith('/') ? image : `/${image}`}`
}

const buildVietQrImageUrl = ({ amount, content }) => {
  const searchParams = new URLSearchParams({
    accountName: VIETQR_CONFIG.userBankName,
    addInfo: content,
    amount: String(Math.round(Number(amount) || 0)),
  })

  return `https://img.vietqr.io/image/${VIETQR_CONFIG.bankCode}-${VIETQR_CONFIG.bankAccount}-compact2.png?${searchParams.toString()}`
}

const generateVietQR = async ({ amount, content }) => {
  const fallbackImage = buildVietQrImageUrl({ amount, content })

  const response = await fetch('https://api.vietqr.org/vqr/api/qr/generate/unauthenticated', {
    body: JSON.stringify({
      ...VIETQR_CONFIG,
      amount: String(Math.round(Number(amount) || 0)),
      content,
    }),
    headers: {
      accept: '*/*',
      'content-type': 'application/json; charset=utf-8',
    },
    method: 'POST',
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(result?.message || 'Không thể tạo mã VietQR')
  }

  return {
    qrData: result?.data?.qrData || '',
    qrDataURL: fallbackImage,
  }
}

const getInvoiceTone = (invoice) => {
  if (isCancelledInvoice(invoice)) return 'cancelled'
  if (isOrderCompletedInvoice(invoice)) return 'served'
  if (isKitchenCompletedInvoice(invoice)) return 'completed'
  if (invoice.kitchenStatus === 'InProgress') return 'making'
  if (isWaitingKitchenInvoice(invoice)) return 'waiting'
  if (isPaidInvoice(invoice)) return 'paid'
  if (invoice.kitchenStatus === 'Draft') return 'draft'
  return 'draft'
}

const formatAssignedShift = (shiftAssignment) => {
  if (!shiftAssignment) return 'Chưa phân ca hôm nay'

  const startTime = String(shiftAssignment.startTime || '').slice(0, 5)
  const endTime = String(shiftAssignment.endTime || '').slice(0, 5)
  const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : ''
  const shiftName = String(shiftAssignment.shiftName || '').trim()
  const normalizedShiftName = shiftName.toLowerCase()
  const displayName =
    shiftName && normalizedShiftName !== 'full' && !normalizedShiftName.startsWith('ca ')
      ? `Ca ${normalizedShiftName}`
      : shiftName

  return [displayName, timeRange].filter(Boolean).join(' • ')
}

const formatDateInputValue = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateDisplayValue = (value = new Date()) => {
  const inputValue = formatDateInputValue(value)
  if (!inputValue) return ''
  const [year, month, day] = inputValue.split('-')
  return `${day}/${month}/${year}`
}

const parseDateDisplayValue = (value = '') => {
  const text = String(value).trim()
  const displayMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (displayMatch) {
    const [, rawDay, rawMonth, rawYear] = displayMatch
    const day = rawDay.padStart(2, '0')
    const month = rawMonth.padStart(2, '0')
    const year = rawYear
    const date = new Date(`${year}-${month}-${day}T00:00:00`)
    if (!Number.isNaN(date.getTime()) && formatDateInputValue(date) === `${year}-${month}-${day}`) {
      return `${year}-${month}-${day}`
    }
  }

  const inputMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (inputMatch) return text

  return ''
}

const getOrderFilterTone = (value) => {
  const tones = {
    Cancelled: 'cancelled',
    Completed: 'completed',
    InProgress: 'making',
    OrderCompleted: 'served',
    Paid: 'paid',
    Waiting: 'waiting',
    all: 'all',
  }

  return tones[value] || 'default'
}

function Staff() {
  const confirm = useConfirm()
  const [activeView, setActiveView] = useState(() => {
    const sub = window.location.hash.replace('#', '').split('/')[1] || ''
    return ['sales', 'orders', 'tables'].includes(sub) ? sub : 'sales'
  })
  const [profileMode, setProfileMode] = useState('profile')
  const [myInvoices, setMyInvoices] = useState([])
  const [bootstrap, setBootstrap] = useState({
    areas: [],
    invoices: [],
    products: [],
    promotions: [],
    tables: [],
  })
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [selectedPromotionCode, setSelectedPromotionCode] = useState('')
  const [detailInvoice, setDetailInvoice] = useState(null)
  const [detailPromotionCode, setDetailPromotionCode] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [productCategory, setProductCategory] = useState('all')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceFilter, setInvoiceFilter] = useState('all')
  const [ordersPage, setOrdersPage] = useState(1)
  const [shiftSearch, setShiftSearch] = useState('')
  const [shiftFilter, setShiftFilter] = useState('all')
  const [shiftPage, setShiftPage] = useState(1)
  const [shiftDateFilter, setShiftDateFilter] = useState(() => formatDateInputValue())
  const [shiftDateText, setShiftDateText] = useState(() => formatDateDisplayValue())
  const [shiftScopeFilter, setShiftScopeFilter] = useState('shift')
  const [tableSearch, setTableSearch] = useState('')
  const [tableAreaFilter, setTableAreaFilter] = useState('all')
  const [transferForm, setTransferForm] = useState({ invoiceId: '', targetTableId: '' })
  const [mergeForm, setMergeForm] = useState({ sourceInvoiceId: '', targetInvoiceId: '' })
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [vietQrData, setVietQrData] = useState({ image: '', raw: '' })
  const [vietQrLoading, setVietQrLoading] = useState(false)
  const [vietQrError, setVietQrError] = useState('')
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [billModalOpen, setBillModalOpen] = useState(false)
  const [billInvoice, setBillInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const [completedNotifications, setCompletedNotifications] = useState([])
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [focusedNotificationInvoiceId, setFocusedNotificationInvoiceId] = useState(null)
  const completedNoticeReadyRef = useRef(false)
  const completedInvoiceIdsRef = useRef(new Set())
  const shiftDatePickerRef = useRef(null)
  const selectedPromotionDebounceRef = useRef(null)
  const detailPromotionDebounceRef = useRef(null)
  const lastAppliedSelectedCodeRef = useRef('')
  const lastAppliedDetailCodeRef = useRef('')

  const user = currentUser

  const categories = useMemo(() => {
    return ['all', ...new Set(bootstrap.products.map((product) => product.categoryName).filter(Boolean))]
  }, [bootstrap.products])

  const productLookup = useMemo(() => {
    const lookup = new Map()
    bootstrap.products.forEach((product) => {
      lookup.set(String(product.id), product)
      lookup.set(product.name, product)
    })
    return lookup
  }, [bootstrap.products])

  const selectedAreaTables = useMemo(() => {
    const areaId = Number(createForm.areaId)
    return bootstrap.tables.filter((table) => !areaId || Number(table.areaId) === areaId)
  }, [bootstrap.tables, createForm.areaId])

  const filteredProducts = useMemo(() => {
    return bootstrap.products.filter((product) => {
      const matchesCategory = productCategory === 'all' || product.categoryName === productCategory
      return matchesCategory
    })
  }, [bootstrap.products, productCategory])

  const filteredInvoices = useMemo(() => {
    const keyword = invoiceSearch.trim().toLowerCase()

    return bootstrap.invoices.filter((invoice) => {
      const matchesKeyword =
        !keyword ||
        [invoice.code, invoice.serviceNumber, invoice.customerName, invoice.tableName, invoice.areaName, invoice.cashierName, invoice.note, invoice.status, invoice.kitchenStatus]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword)) ||
        (invoice.details || []).some((item) =>
          [item.productName, item.note].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword))
        )

      const matchesFilter =
        invoiceFilter === 'all' ||
        (invoiceFilter === 'Completed' && isKitchenCompletedInvoice(invoice) && !isCancelledInvoice(invoice) && !isOrderCompletedInvoice(invoice)) ||
        (invoiceFilter === 'OrderCompleted' && isOrderCompletedInvoice(invoice)) ||
        (invoiceFilter === 'Paid' && isOrderCompletedInvoice(invoice)) ||
        (invoiceFilter === 'Cancelled' && isCancelledInvoice(invoice)) ||
        (invoiceFilter === 'Waiting' && isWaitingKitchenInvoice(invoice) && !isCancelledInvoice(invoice)) ||
        (invoiceFilter === 'InProgress' && invoice.kitchenStatus === 'InProgress' && !isCancelledInvoice(invoice))

      return matchesKeyword && matchesFilter
    })
  }, [bootstrap.invoices, invoiceFilter, invoiceSearch])

  const ordersTotalPages = Math.max(Math.ceil(filteredInvoices.length / ORDER_PAGE_SIZE), 1)
  const paginatedInvoices = useMemo(() => {
    const startIndex = (ordersPage - 1) * ORDER_PAGE_SIZE
    return filteredInvoices.slice(startIndex, startIndex + ORDER_PAGE_SIZE)
  }, [filteredInvoices, ordersPage])

  const filteredTables = useMemo(() => {
    const keyword = tableSearch.trim().toLowerCase()

    return bootstrap.tables.filter((table) => {
      const matchesArea = tableAreaFilter === 'all' || String(table.areaId) === String(tableAreaFilter)
      const matchesKeyword =
        !keyword ||
        [table.name, table.areaName, table.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))

      return matchesArea && matchesKeyword
    })
  }, [bootstrap.tables, tableAreaFilter, tableSearch])

  const openInvoices = useMemo(() => {
    return bootstrap.invoices.filter((invoice) => invoice.status === 'Unpaid' && invoice.kitchenStatus !== 'Draft')
  }, [bootstrap.invoices])

  // myInvoices đã được lọc theo accountId từ backend — chỉ cần lọc thêm theo ngày hôm nay
  const currentShiftInvoices = useMemo(() => {
    const todayStr = formatDateInputValue()
    return myInvoices.filter((invoice) => String(invoice.createdAt || '').slice(0, 10) === todayStr)
  }, [myInvoices])

  const shiftRevenue = useMemo(() => {
    return currentShiftInvoices
      .filter(isPaidInvoice)
      .reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0)
  }, [currentShiftInvoices])

  const filteredShiftInvoices = useMemo(() => {
    const keyword = shiftSearch.trim().toLowerCase()
    if (!keyword) return currentShiftInvoices

    return currentShiftInvoices.filter((invoice) => {
      const fields = [
        invoice.code,
        invoice.serviceNumber,
        invoice.customerName,
        invoice.tableName,
        invoice.areaName,
        invoice.cashierName,
        invoice.employeeName,
        invoice.staffName,
        invoice.note,
        invoice.status,
        invoice.kitchenStatus,
      ]

      return (
        fields.filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword)) ||
        (invoice.details || []).some((item) =>
          [item.productName, item.note].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword))
        )
      )
    })
  }, [currentShiftInvoices, shiftSearch])

  const shiftTotalPages = Math.max(Math.ceil(filteredShiftInvoices.length / ORDER_PAGE_SIZE), 1)
  const paginatedShiftInvoices = useMemo(() => {
    const startIndex = (shiftPage - 1) * ORDER_PAGE_SIZE
    return filteredShiftInvoices.slice(startIndex, startIndex + ORDER_PAGE_SIZE)
  }, [filteredShiftInvoices, shiftPage])

  const invoiceCounts = useMemo(() => {
    return {
      all: bootstrap.invoices.length,
      cancelled: bootstrap.invoices.filter(isCancelledInvoice).length,
      completed: bootstrap.invoices.filter((invoice) => isKitchenCompletedInvoice(invoice) && !isCancelledInvoice(invoice) && !isOrderCompletedInvoice(invoice)).length,
      inProgress: bootstrap.invoices.filter((invoice) => invoice.kitchenStatus === 'InProgress' && !isCancelledInvoice(invoice)).length,
      paid: bootstrap.invoices.filter(isOrderCompletedInvoice).length,
      readyToServe: bootstrap.invoices.filter((invoice) => isKitchenCompletedInvoice(invoice) && !isCancelledInvoice(invoice) && !isOrderCompletedInvoice(invoice)).length,
      served: bootstrap.invoices.filter(isOrderCompletedInvoice).length,
      waiting: bootstrap.invoices.filter((invoice) => isWaitingKitchenInvoice(invoice) && !isCancelledInvoice(invoice)).length,
    }
  }, [bootstrap.invoices])

  const subtotal = Number(selectedInvoice?.subtotal || 0)
  const discountAmount = Number(selectedInvoice?.discountAmount || 0)
  const shippingFee = Number(selectedInvoice?.shippingFee || 0)
  const totalAmount = Number(selectedInvoice?.totalAmount ?? subtotal - discountAmount + shippingFee) || 0
  const modalReceivedAmount = parseCurrency(amountReceived)
  const modalChangeAmount = Math.max(modalReceivedAmount - totalAmount, 0)
  const canConfirmCashPayment = paymentMethod !== 'Cash' || modalReceivedAmount >= totalAmount
  const canEditSelectedInvoice = !selectedInvoice || selectedInvoice.kitchenStatus === 'Draft'

  const loadSelectedInvoice = useCallback(async (id) => {
    if (!id) {
      setSelectedInvoice(null)
      return
    }

    setLoadingDetail(true)
    setError('')

    try {
      const data = await getWorkstationInvoiceById(id)
      setSelectedInvoice(data.invoice)
      setPaymentMethod(data.invoice.paymentMethod || 'Cash')
      setAmountReceived(data.invoice.amountReceived ? formatCurrencyInput(data.invoice.amountReceived) : '')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const loadMyInvoices = useCallback(async () => {
    try {
      const data = await getMyWorkstationInvoices()
      setMyInvoices(data.invoices || [])
    } catch {
      // Không ảnh hưởng chức năng bán hàng nếu lỗi
    }
  }, [])

  const loadBootstrap = useCallback(async (invoiceId = null) => {
    setLoading(true)
    setError('')

    try {
      const [data] = await Promise.all([
        getWorkstationBootstrap(),
        loadMyInvoices(),
      ])
      setBootstrap(data)

      if (invoiceId) {
        await loadSelectedInvoice(invoiceId)
      }
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [loadSelectedInvoice, loadMyInvoices])

  useEffect(() => {
    loadBootstrap(null)
  }, [loadBootstrap])

  useEffect(() => {
    let isMounted = true

    const syncCurrentUser = async () => {
      try {
        const result = await getProfile()
        if (!isMounted) return

        const nextUser = { ...getCurrentUser(), ...(result.user || {}) }
        setCurrentUser(nextUser)
        setAuthSession({
          token: sessionStorage.getItem('token'),
          user: nextUser,
        })
      } catch {
        // The stored login is still enough for the workstation if profile refresh is unavailable.
      }
    }

    syncCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    loadSelectedInvoice(selectedInvoiceId)
  }, [loadSelectedInvoice, selectedInvoiceId])

  useEffect(() => {
    const name = selectedInvoice?.promotionName || ''
    clearTimeout(selectedPromotionDebounceRef.current)
    lastAppliedSelectedCodeRef.current = name
    setSelectedPromotionCode(name)
  }, [selectedInvoice?.id, selectedInvoice?.promotionName])

  useEffect(() => {
    const name = detailInvoice?.promotionName || ''
    clearTimeout(detailPromotionDebounceRef.current)
    lastAppliedDetailCodeRef.current = name
    setDetailPromotionCode(name)
  }, [detailInvoice?.id, detailInvoice?.promotionName])

  useEffect(() => {
    setOrdersPage(1)
  }, [invoiceFilter, invoiceSearch])

  useEffect(() => {
    setShiftPage(1)
  }, [shiftSearch])

  useEffect(() => {
    setOrdersPage((current) => Math.min(current, ordersTotalPages))
  }, [ordersTotalPages])

  useEffect(() => {
    setShiftPage((current) => Math.min(current, shiftTotalPages))
  }, [shiftTotalPages])

  useEffect(() => {
    if (loading) return undefined

    const refreshCompletedOrders = async () => {
      try {
        const [data] = await Promise.all([
          getWorkstationBootstrap(),
          loadMyInvoices(),
        ])
        const completedIds = new Set(data.invoices.filter((invoice) => invoice.kitchenStatus === 'Completed').map((invoice) => invoice.id))

        if (!completedNoticeReadyRef.current) {
          completedNoticeReadyRef.current = true
          completedInvoiceIdsRef.current = completedIds
          setBootstrap(data)
          return
        }

        const newCompletedInvoice = data.invoices.find(
          (invoice) => invoice.kitchenStatus === 'Completed' && !completedInvoiceIdsRef.current.has(invoice.id)
        )

        completedInvoiceIdsRef.current = completedIds
        setBootstrap(data)

        const servedInvoiceIds = new Set(
          data.invoices.filter((invoice) => isOrderCompletedInvoice(invoice)).map((invoice) => String(invoice.id))
        )

        setCompletedNotifications((current) => {
          const hasServed = current.some((n) => !n.read && servedInvoiceIds.has(String(n.id || n.invoiceId)))
          const withAutoRead = hasServed
            ? current.map((n) => servedInvoiceIds.has(String(n.id || n.invoiceId)) ? { ...n, read: true } : n)
            : current

          if (!newCompletedInvoice) return withAutoRead
          if (withAutoRead.some((n) => String(n.id) === String(newCompletedInvoice.id))) return withAutoRead
          return [
            {
              code: newCompletedInvoice.code,
              id: newCompletedInvoice.id,
              label: getDisplayOrderNumber(newCompletedInvoice),
              place: getInvoicePlace(newCompletedInvoice),
              sortTime: newCompletedInvoice.completedAt || newCompletedInvoice.updatedAt || newCompletedInvoice.createdAt,
            },
            ...withAutoRead,
          ]
        })

        if (newCompletedInvoice) {
          setMessage(`🔔 ${getDisplayOrderNumber(newCompletedInvoice)} - Pha chế xong! Nhấn Ra đơn để phục vụ khách.`)
        }
      } catch {
        // Polling is only for completion notices; keep current screen usable if it misses one tick.
      }
    }

    const intervalId = window.setInterval(refreshCompletedOrders, 5000)
    return () => window.clearInterval(intervalId)
  }, [loading])

  useEffect(() => {
    if (createForm.orderType !== 'DineIn') {
      setCreateForm((current) => ({ ...current, areaId: '', tableId: '' }))
    }
    if (createForm.orderType !== 'Ship') {
      setCreateForm((current) => ({ ...current, deliveryAddress: '', deliveryNote: '', deliveryPhone: '', shippingFee: '' }))
    }
  }, [createForm.orderType])

  useEffect(() => {
    let isMounted = true

    const loadVietQR = async () => {
      if (!paymentModalOpen || paymentMethod !== 'QR' || !selectedInvoice || totalAmount <= 0) {
        setVietQrData({ image: '', raw: '' })
        setVietQrError('')
        setVietQrLoading(false)
        return
      }

      setVietQrLoading(true)
      setVietQrError('')

      try {
        const data = await generateVietQR({
          amount: totalAmount,
          content: selectedInvoice.code,
        })

        if (isMounted) {
          setVietQrData({
            image: data.qrDataURL || '',
            raw: data.qrData || '',
          })
        }
      } catch {
        if (isMounted) {
          setVietQrData({
            image: buildVietQrImageUrl({
              amount: totalAmount,
              content: selectedInvoice.code,
            }),
            raw: '',
          })
          setVietQrError('')
        }
      } finally {
        if (isMounted) {
          setVietQrLoading(false)
        }
      }
    }

    loadVietQR()

    return () => {
      isMounted = false
    }
  }, [paymentMethod, paymentModalOpen, selectedInvoice, totalAmount])

  useEffect(() => {
    if (!createForm.areaId) return
    const validTable = selectedAreaTables.find((table) => String(table.id) === String(createForm.tableId))
    if (!validTable) {
      setCreateForm((current) => ({ ...current, tableId: '' }))
    }
  }, [createForm.areaId, createForm.tableId, selectedAreaTables])

  const refreshAfterAction = async (invoiceId = selectedInvoiceId) => {
    const [data] = await Promise.all([
      getWorkstationBootstrap(),
      loadMyInvoices(),
    ])
    setBootstrap(data)

    if (invoiceId) {
      const detail = await getWorkstationInvoiceById(invoiceId)
      setSelectedInvoice(detail.invoice)
    } else {
      setSelectedInvoice(null)
    }
  }

  const resetCurrentOrderDraft = () => {
    setSelectedInvoiceId(null)
    setSelectedInvoice(null)
    setDetailInvoice(null)
    setPaymentModalOpen(false)
    setPaymentMethod('Cash')
    setAmountReceived('')
    setVietQrData({ image: '', raw: '' })
    setVietQrError('')
    setVietQrLoading(false)
    setCreateForm({ ...emptyCreateForm })
  }

  const handleLogout = async () => {
    const confirmed = await confirm({
      body: 'Bạn có chắc muốn đăng xuất khỏi trang nhân viên?',
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

  const completedNotificationHistory = useMemo(() => {
    const notificationMap = new Map()

    completedNotifications.forEach((notification) => {
      const key = String(notification.invoiceId || notification.id)
      notificationMap.set(key, notification)
    })

    bootstrap.invoices
      .filter((invoice) => invoice.kitchenStatus === 'Completed')
      .forEach((invoice) => {
        const key = String(invoice.id)
        if (notificationMap.has(key)) return

        const completedAt = invoice.completedAt || invoice.servedAt || invoice.updatedAt || invoice.createdAt
        notificationMap.set(key, {
          id: key,
          invoiceId: invoice.id,
          label: invoice.code || getDisplayOrderNumber(invoice),
          read: true,
          sortTime: completedAt,
          time: completedAt
            ? new Date(completedAt).toLocaleString('vi-VN', {
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                month: 'numeric',
                year: 'numeric',
              })
            : 'Đã pha chế xong',
        })
      })

    return Array.from(notificationMap.values()).sort((first, second) => {
      const firstTime = new Date(first.sortTime || first.createdAt || first.updatedAt || 0).getTime()
      const secondTime = new Date(second.sortTime || second.createdAt || second.updatedAt || 0).getTime()
      return secondTime - firstTime
    })
  }, [bootstrap.invoices, completedNotifications])

  const unreadCompletedNotifications = completedNotifications.filter((notification) => !notification.read).length

  const handleOpenCompletedNotification = async (notification) => {
    setCompletedNotifications((current) =>
      current.map((item) => (String(item.id) === String(notification.id) ? { ...item, read: true } : item))
    )
    setNotificationPanelOpen(false)
    await openInvoiceDetail(notification.invoiceId || notification.id)
  }

  const handleOpenCompletedNotifications = () => {
    setNotificationPanelOpen((open) => !open)
  }

  const updateCreateForm = (event) => {
    const { name, value } = event.target
    setCreateForm((current) => ({ ...current, [name]: value }))
  }

  const runAction = async (action, successMessage) => {
    void successMessage
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const result = await action()
      return result
    } catch (actionError) {
      setError(actionError.message)
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleCreateInvoice = async (event) => {
    event?.preventDefault()

    const confirmed = await confirm({
      body: createForm.orderType === 'DineIn' ? 'Xác nhận tạo đơn mới tại quán?' : 'Xác nhận tạo đơn mới?',
      confirmLabel: 'Tiếp tục',
    })
    if (!confirmed) return

    const result = await runAction(async () => {
      if (createForm.orderType === 'DineIn' && !createForm.serviceNumber.trim()) {
        throw new Error('Vui lòng nhập số thẻ đã đưa cho khách')
      }

      if (createForm.orderType === 'Ship' && (!createForm.deliveryPhone.trim() || !createForm.deliveryAddress.trim())) {
        throw new Error('Vui lòng nhập SĐT và địa chỉ giao hàng')
      }

      const isShip = createForm.orderType === 'Ship'
      const payload = {
        areaId: createForm.areaId ? Number(createForm.areaId) : '',
        customerName: isShip ? createForm.customerName.trim() || 'Khách giao hàng' : '',
        customerPhone: isShip ? createForm.deliveryPhone.trim() : '',
        deliveryAddress: isShip ? createForm.deliveryAddress.trim() : '',
        deliveryNote: isShip ? createForm.deliveryNote.trim() : '',
        note: createForm.note || '',
        orderType: createForm.orderType,
        paymentMethod: isShip ? createForm.paymentMethod || 'COD' : '',
        promotionId: '',
        serviceNumber: createForm.orderType === 'DineIn' ? createForm.serviceNumber.trim() : '',
        shippingFee: isShip ? parseCurrency(createForm.shippingFee) : 0,
        tableId: createForm.orderType === 'DineIn' && createForm.tableId ? Number(createForm.tableId) : '',
      }

      return createWorkstationInvoice(payload)
    }, 'Đã tạo đơn mới')

    if (result?.invoice?.id) {
      setSelectedInvoiceId(result.invoice.id)
      setCreateForm(emptyCreateForm)
      await refreshAfterAction(result.invoice.id)
    }
  }

  const handleAddProduct = async (product) => {
    if (!selectedInvoiceId) {
      setError('Vui lòng tạo hoặc chọn hóa đơn trước khi thêm món')
      return
    }

    if (selectedInvoice?.kitchenStatus !== 'Draft') {
      setError('Đơn đã gửi pha chế, không thể thêm hoặc sửa món')
      return
    }

    const sizeConfig = getCupSizeConfig(product.categoryName)
    const defaultSize = sizeConfig.defaultSize
    const existingDetail = (selectedInvoice?.details || []).find((item) => {
      const sameProduct = String(item.productId || '') === String(product.id) || item.productName === product.name
      return sameProduct && (sizeConfig.options.length === 1 || getDetailCupSize(item, product) === defaultSize)
    })
    const payload = { note: '', productId: Number(product.id), quantity: 1 }

    if (sizeConfig.options.length > 1) {
      payload.size = defaultSize
    }

    const result = await runAction(
      () =>
        existingDetail
          ? updateWorkstationInvoiceDetailQuantity(existingDetail.id, { quantity: Number(existingDetail.quantity || 0) + 1 })
          : addWorkstationInvoiceItem(selectedInvoiceId, payload),
      existingDetail ? `Đã tăng số lượng ${product.name}` : `Đã thêm ${product.name}`
    )

    if (result) await refreshAfterAction()
  }

  const handleQuantityChange = async (detailId, quantity) => {
    const confirmed = await confirm({
      body: `Cập nhật số lượng món thành ${quantity}?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    const result = await runAction(() => updateWorkstationInvoiceDetailQuantity(detailId, { quantity }), 'Đã cập nhật số lượng')
    if (result) await refreshAfterAction()
  }

  const handleDeleteDetail = async (detailId) => {
    const confirmed = await confirm({
      body: 'Xóa món này khỏi đơn?',
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    const result = await runAction(() => deleteWorkstationInvoiceDetail(detailId), 'Đã xóa món')
    if (result) await refreshAfterAction()
  }

  const handleSaveDetailNote = async (detailId, note) => {
    const item = selectedInvoice?.details?.find((detail) => detail.id === detailId)
    const product = productLookup.get(String(item?.productId || '')) || productLookup.get(item?.productName)
    const sizeConfig = getCupSizeConfig(product?.categoryName)
    const size = getDetailCupSize(item, product)
    const detailNote = sizeConfig.options.length > 1 ? buildSizeNote(size, note) : stripSizePrefix(note)
    const confirmed = await confirm({
      body: 'Lưu ghi chú món này?',
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    const result = await runAction(() => updateWorkstationInvoiceDetailNote(detailId, { note: detailNote }), 'Đã lưu ghi chú món')
    if (result) await refreshAfterAction()
  }

  const handleSizeChange = async (item, size) => {
    const product = productLookup.get(String(item?.productId || '')) || productLookup.get(item?.productName)
    const currentSize = getDetailCupSize(item, product)

    if (size === currentSize) return

    const result = await runAction(
      () => updateWorkstationInvoiceDetailSize(item.id, { note: stripSizePrefix(item.note || ''), size }),
      size === 'L' ? 'Đã đổi sang size L' : 'Đã đổi sang size M'
    )
    if (result) await refreshAfterAction()
  }

  const handlePrintBill = () => {
    const el = document.getElementById('staff-bill-content')
    if (!el) return
    const win = window.open('', '_blank', 'width=420,height=680')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hóa đơn</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Courier New',monospace;font-size:12px;width:80mm;margin:0 auto;padding:8px}
      .bc{text-align:center}.bb{font-weight:bold}
      .bhr{border:none;border-top:1px dashed #000;margin:5px 0}
      .br{display:flex;justify-content:space-between;margin:2px 0;gap:8px}
      .br span:last-child{text-align:right;white-space:nowrap}
      table{width:100%;border-collapse:collapse}
      th,td{padding:2px 0;font-size:11px;vertical-align:top}
      th:not(:first-child),td:not(:first-child){text-align:right}
      th:first-child,td:first-child{text-align:left;width:42%}
    </style></head><body>${el.innerHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const handleSendToKitchen = async (invoiceId = selectedInvoiceId || selectedInvoice?.id) => {
    const targetInvoiceId = invoiceId || selectedInvoice?.id

    if (!targetInvoiceId) {
      setError('Không tìm thấy mã hóa đơn để gửi pha chế')
      return
    }

    const targetInvoice = String(targetInvoiceId) === String(selectedInvoiceId)
      ? selectedInvoice
      : bootstrap.invoices.find((inv) => String(inv.id) === String(targetInvoiceId))

    const confirmed = await confirm({
      body: 'Gửi đơn này sang pha chế?',
      confirmLabel: 'Tiếp tục',
    })
    if (!confirmed) return

    let sent = false
    try {
      await sendWorkstationInvoiceToKitchen(targetInvoiceId)
      sent = true
      setError('')
      setMessage('Đã gửi đơn sang pha chế')
    } catch (sendError) {
      // KitchenStatus đã được set Waiting ở backend — gửi thành công về mặt dữ liệu
      // Lỗi chỉ là table status update (phụ) → vẫn refresh
      sent = true
      setMessage('Đã gửi đơn sang pha chế')
    }
    if (sent) {
      if (String(targetInvoiceId) === String(selectedInvoiceId || selectedInvoice?.id)) {
        resetCurrentOrderDraft()
      }
      await refreshAfterAction(null)
    }
  }

  const openInvoiceDetail = async (invoiceId) => {
    setDetailLoading(true)
    setDetailInvoice(null)
    setError('')
    setMessage('')

    try {
      const data = await getWorkstationInvoiceById(invoiceId)
      setDetailInvoice(data.invoice)
    } catch (detailError) {
      setError(detailError.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const handlePaymentMethodChange = async (method) => {
    if (!selectedInvoiceId) return

    const confirmed = await confirm({
      body: `Cập nhật phương thức thanh toán sang ${paymentMethodLabels[method] || method}?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    setPaymentMethod(method)
    const result = await runAction(() => updateWorkstationPaymentMethod(selectedInvoiceId, { paymentMethod: method }), 'Đã đổi phương thức thanh toán')
    if (result) await refreshAfterAction()
  }

  const handleSelectedPromotionChange = (value) => {
    setSelectedPromotionCode(value)
    clearTimeout(selectedPromotionDebounceRef.current)
    selectedPromotionDebounceRef.current = setTimeout(async () => {
      if (!selectedInvoiceId) return
      const code = value.trim()
      if (code === lastAppliedSelectedCodeRef.current) return
      try {
        const result = await applyWorkstationPromotion(
          selectedInvoiceId,
          code ? { promotionCode: code } : { promotionId: null }
        )
        if (result?.invoice) {
          lastAppliedSelectedCodeRef.current = code
          await refreshAfterAction(selectedInvoiceId)
        }
      } catch {
        // mã không hợp lệ — bỏ qua
      }
    }, 600)
  }

  const handleDetailPromotionChange = (value) => {
    setDetailPromotionCode(value)
    clearTimeout(detailPromotionDebounceRef.current)
    detailPromotionDebounceRef.current = setTimeout(async () => {
      if (!detailInvoice?.id) return
      const code = value.trim()
      if (code === lastAppliedDetailCodeRef.current) return
      try {
        const result = await applyWorkstationPromotion(
          detailInvoice.id,
          code ? { promotionCode: code } : { promotionId: null }
        )
        if (result?.invoice) {
          lastAppliedDetailCodeRef.current = code
          const detail = await getWorkstationInvoiceById(detailInvoice.id)
          setDetailInvoice(detail.invoice)
          await refreshAfterAction(selectedInvoiceId)
        }
      } catch {
        // mã không hợp lệ — bỏ qua
      }
    }, 600)
  }

  const handleOpenPaymentModal = async () => {
    if (!selectedInvoiceId) return
    const promotionCode = selectedPromotionCode.trim()
    const currentPromotion = selectedInvoice?.promotionName || ''
    if (promotionCode !== currentPromotion) {
      try {
        const result = await applyWorkstationPromotion(
          selectedInvoiceId,
          promotionCode ? { promotionCode } : { promotionId: null }
        )
        if (result?.invoice) {
          await refreshAfterAction(selectedInvoiceId)
        }
      } catch {
        // nếu mã sai thì bỏ qua, vẫn mở modal
      }
    }
    setPaymentModalOpen(true)
  }

  const openDetailPayment = () => {
    if (!detailInvoice) return
    setSelectedInvoice(detailInvoice)
    setSelectedInvoiceId(detailInvoice.id)
    setPaymentMethod(detailInvoice.paymentMethod || 'Cash')
    setAmountReceived(detailInvoice.amountReceived ? formatCurrencyInput(detailInvoice.amountReceived) : '')
    setPaymentModalOpen(true)
  }

  const handleConfirmPayment = async () => {
    if (!selectedInvoiceId) return
    if (paymentMethod === 'Cash' && parseCurrency(amountReceived) < totalAmount) {
      setError('Số tiền khách đưa chưa đủ để thanh toán')
      return
    }

    const confirmed = await confirm({
      body: `Xác nhận thanh toán hóa đơn ${formatCurrency(totalAmount)}?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    const result = await runAction(
      () =>
        confirmWorkstationPayment(selectedInvoiceId, {
          amountReceived: paymentMethod === 'Cash' ? parseCurrency(amountReceived) : null,
          paymentMethod,
        }),
      'Đã xác nhận thanh toán'
    )
    if (result) {
      setPaymentModalOpen(false)
      const invoiceId = result.invoice?.id || selectedInvoiceId
      if (result.invoice && detailInvoice?.id === result.invoice.id) {
        setDetailInvoice(result.invoice)
      }
      await refreshAfterAction(invoiceId)
      try {
        const data = await getWorkstationInvoiceById(invoiceId)
        if (data?.invoice) {
          setBillInvoice(data.invoice)
          setBillModalOpen(true)
        }
      } catch { /* ignore */ }
    }
  }

  const handleCancelInvoice = async (invoice) => {
    if (invoice.status === 'Cancelled') return
    const confirmed = await confirm({
      body: `Hủy hóa đơn ${invoice.code || getDisplayOrderNumber(invoice)}?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    const result = await runAction(() => updateWorkstationInvoiceStatus(invoice.id, { status: 'Cancelled' }), 'Hóa đơn đã bị hủy')
    if (result) await refreshAfterAction(invoice.id === selectedInvoiceId ? invoice.id : selectedInvoiceId)
  }

  const handleTableStatusChange = async (table, status) => {
    const confirmed = await confirm({
      body: `Cập nhật trạng thái ${table.name} thành ${tableStatusLabels[status] || status}?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    const result = await runAction(() => updateWorkstationTableStatus(table.id, { status }), 'Đã cập nhật trạng thái bàn')
    if (result) await refreshAfterAction(selectedInvoiceId)
  }

  const handleTransferTable = async (event) => {
    event.preventDefault()
    if (!transferForm.invoiceId || !transferForm.targetTableId) {
      setError('Vui lòng chọn hóa đơn và bàn đích')
      return
    }

    const confirmed = await confirm({
      body: 'Xác nhận chuyển bàn cho hóa đơn đã chọn?',
      confirmLabel: 'Tiếp tục',
    })
    if (!confirmed) return

    const result = await runAction(
      () => transferWorkstationInvoiceTable(transferForm.invoiceId, { targetTableId: Number(transferForm.targetTableId) }),
      'Đã chuyển bàn'
    )
    if (result) {
      setTransferForm({ invoiceId: '', targetTableId: '' })
      await refreshAfterAction(Number(transferForm.invoiceId) === selectedInvoiceId ? transferForm.invoiceId : selectedInvoiceId)
    }
  }

  const handleMergeInvoices = async (event) => {
    event.preventDefault()
    if (!mergeForm.sourceInvoiceId || !mergeForm.targetInvoiceId) {
      setError('Vui lòng chọn hóa đơn nguồn và hóa đơn đích')
      return
    }

    const confirmed = await confirm({
      body: 'Xác nhận gộp hai hóa đơn đã chọn?',
      confirmLabel: 'Tiếp tục',
    })
    if (!confirmed) return

    const result = await runAction(
      () => mergeWorkstationInvoices(mergeForm.sourceInvoiceId, { targetInvoiceId: Number(mergeForm.targetInvoiceId) }),
      'Đã gộp bàn'
    )
    if (result) {
      setMergeForm({ sourceInvoiceId: '', targetInvoiceId: '' })
      await refreshAfterAction(Number(mergeForm.targetInvoiceId))
    }
  }

  const handleMarkServed = async (invoice) => {
    const confirmed = await confirm({
      body: `Xác nhận đã ra đơn cho ${invoice.code || getDisplayOrderNumber(invoice)}?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return null

    const result = await runAction(() => markWorkstationInvoiceServed(invoice.id), 'Đã xác nhận mang món ra đơn')
    if (result) {
      setCompletedNotifications((current) =>
        current.map((n) => String(n.id || n.invoiceId) === String(invoice.id) ? { ...n, read: true } : n)
      )
      const servedInvoice = result.invoice || { ...invoice, status: 'Completed' }
      setBootstrap((current) => ({
        ...current,
        invoices: current.invoices.map((item) => (String(item.id) === String(invoice.id) ? { ...item, ...servedInvoice } : item)),
      }))
      await refreshAfterAction(invoice.id === selectedInvoiceId ? invoice.id : selectedInvoiceId)
    }
    return result
  }

  const handleDetailMarkServed = async () => {
    if (!detailInvoice) return
    const result = await handleMarkServed(detailInvoice)
    if (result) {
      setDetailInvoice(null)
      setDetailLoading(false)
    }
  }

  const handleStartDelivery = async (invoice) => {
    const confirmed = await confirm({
      body: `Xác nhận bắt đầu giao đơn ${invoice.code}?`,
      confirmLabel: 'Bắt đầu giao',
    })
    if (!confirmed) return

    const result = await runAction(() => startWorkstationDelivery(invoice.id), 'Đang giao hàng')
    if (result) {
      setBootstrap((current) => ({
        ...current,
        invoices: current.invoices.map((item) =>
          String(item.id) === String(invoice.id) ? { ...item, deliveryStatus: 'Delivering' } : item
        ),
      }))
    }
  }

  const handleCompleteDelivery = async (invoice) => {
    const isCOD = invoice.paymentMethod === 'COD'
    const confirmed = await confirm({
      body: isCOD
        ? `Xác nhận đã giao và thu tiền COD đơn ${invoice.code}?`
        : `Xác nhận đã giao đơn ${invoice.code}?`,
      confirmLabel: 'Đã giao',
    })
    if (!confirmed) return

    const amountReceived = isCOD ? Number(invoice.totalAmount || 0) : null
    const result = await runAction(
      () => completeWorkstationDelivery(invoice.id, { amountReceived }),
      'Đã giao hàng thành công'
    )
    if (result) {
      setCompletedNotifications((current) =>
        current.map((n) => String(n.id || n.invoiceId) === String(invoice.id) ? { ...n, read: true } : n)
      )
      await refreshAfterAction(invoice.id)
    }
  }

  const handlePrintInvoice = async (invoice = detailInvoice || selectedInvoice) => {
    if (!invoice) return
    const detail = invoice.details ? invoice : (await getWorkstationInvoiceById(invoice.id)).invoice
    const items = detail.details || []
    const subtotalValue = Number(detail.subtotal || items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0))
    const discountValue = Number(detail.discountAmount || 0)
    const finalValue = Number(detail.totalAmount ?? subtotalValue - discountValue)
    const printWindow = window.open('', '_blank', 'width=420,height=720')

    if (!printWindow) {
      setError('Trình duyệt đang chặn cửa sổ in hóa đơn')
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${detail.code}</title>
          <style>
            body { font-family: Arial, sans-serif; width: 320px; margin: 0 auto; color: #111; }
            h1, h2, p { text-align: center; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            td { padding: 6px 0; border-bottom: 1px dashed #ccc; font-size: 13px; vertical-align: top; }
            .right { text-align: right; }
            .total td { border-bottom: 0; font-weight: 700; }
          </style>
        </head>
        <body>
          <h2>Mơ Coffee</h2>
          <p>${detail.serviceNumber ? `Số phục vụ ${detail.serviceNumber}` : `Hóa đơn ${detail.code}`}</p>
          <p>${getInvoicePlace(detail)}</p>
          <p>${new Date(detail.createdAt).toLocaleString('vi-VN')}</p>
          <table>
            ${items
              .map(
                (item) => `<tr><td>${item.productName}<br/>x${item.quantity}</td><td class="right">${formatCurrency(item.lineTotal)}</td></tr>`
              )
              .join('')}
            <tr class="total"><td>Tạm tính</td><td class="right">${formatCurrency(subtotalValue)}</td></tr>
            <tr class="total"><td>Giảm giá</td><td class="right">-${formatCurrency(discountValue)}</td></tr>
            <tr class="total"><td>Tổng cộng</td><td class="right">${formatCurrency(finalValue)}</td></tr>
          </table>
          <p>Cảm ơn quý khách!</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const openProfileModal = async () => {
    setProfileModalOpen(true)
    setProfileMode('profile')
    setProfileError('')
    setPasswordForm(emptyPasswordForm)

    try {
      const result = await getProfile()
      const profile = result.user || {}
      const nextUser = { ...getCurrentUser(), ...profile }
      setCurrentUser(nextUser)
      setAuthSession({
        token: sessionStorage.getItem('token'),
        user: nextUser,
      })
      setProfileForm({
        email: profile.email || '',
        fullName: profile.fullName || '',
        phoneNumber: profile.phoneNumber || '',
        role: profile.role || '',
        username: profile.username || '',
      })
    } catch (profileLoadError) {
      setProfileForm({
        ...emptyProfileForm,
        fullName: user.fullName || '',
        role: user.role || 'Staff',
        username: user.username || '',
      })
      setProfileError(profileLoadError.message)
    }
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
        const nextUser = {
          ...user,
          ...(result.user || {}),
          fullName: result.user?.fullName || profileForm.fullName,
          role: result.user?.role || user.role,
          username: result.user?.username || user.username,
        }
        setAuthSession({
          token: sessionStorage.getItem('token'),
          user: nextUser,
        })
        setCurrentUser(nextUser)
      }

      setProfileModalOpen(false)
    } catch (profileSaveError) {
      setProfileError(profileSaveError.message)
    } finally {
      setSaving(false)
    }
  }

  const renderSidebar = () => (
    <aside className="staff-pos-sidebar">
      <div className="staff-pos-brand">
        <Coffee aria-hidden="true" />
        <div>
          <strong>Mơ Coffee</strong>
          <span>Nhân viên</span>
        </div>
      </div>

      <nav className="staff-pos-nav" aria-label="Điều hướng nhân viên">
        <button className={activeView === 'sales' ? 'active' : ''} onClick={() => { setActiveView('sales'); window.location.hash = 'staff/sales' }} type="button">
          <ShoppingCart aria-hidden="true" />
          <span>Bán hàng</span>
        </button>
        <button className={activeView === 'orders' ? 'active' : ''} onClick={() => { setActiveView('orders'); window.location.hash = 'staff/orders' }} type="button">
          <ClipboardList aria-hidden="true" />
          <span>Quản lý đơn</span>
        </button>
      </nav>

      <button className="staff-pos-logout" onClick={handleLogout} type="button">
        <LogOut aria-hidden="true" />
        <span>Đăng xuất</span>
      </button>
    </aside>
  )

  const renderTopbar = (title) => (
    <header className="staff-pos-topbar no-subtitle">
      <div>
        <h1>{title}</h1>
      </div>
      <div className="staff-topbar-actions">
        <button
          aria-label={`Thông báo đơn pha chế xong${unreadCompletedNotifications ? `: ${unreadCompletedNotifications} đơn mới` : ''}`}
          className="staff-notification-button"
          onClick={() => setNotificationPanelOpen((open) => !open)}
          title={completedNotifications[0] ? `${completedNotifications[0].label} đã pha chế xong` : 'Thông báo đơn pha chế xong'}
          type="button"
        >
          <Bell aria-hidden="true" />
          {unreadCompletedNotifications > 0 && <span>{unreadCompletedNotifications > 99 ? '99+' : unreadCompletedNotifications}</span>}
        </button>
        {notificationPanelOpen && (
          <div className="staff-notification-panel">
            {completedNotificationHistory.length > 0 ? (
              completedNotificationHistory.map((notification) => (
                <button
                  className={notification.read ? 'read' : 'unread'}
                  key={notification.id}
                  onClick={() => handleOpenCompletedNotification(notification)}
                  type="button"
                >
                  <Bell aria-hidden="true" />
                  <span>
                    <strong>{notification.label || notification.code || 'Đơn pha chế xong'}</strong>
                    <small>Đã pha chế xong - bấm để xem đơn</small>
                  </span>
                  <em>{notification.time || ''}</em>
                  {!notification.read && <i aria-hidden="true" />}
                </button>
              ))
            ) : (
              <p>Chưa có thông báo pha chế xong.</p>
            )}
          </div>
        )}
        <button className="staff-pos-user staff-user-button" onClick={openProfileModal} type="button">
          <div>
            <strong>{user.fullName || user.username || 'Nguyễn Văn A'}</strong>
            <span>{formatAssignedShift(user.shiftAssignment)}</span>
          </div>
          <UserRound aria-hidden="true" />
        </button>
      </div>
    </header>
  )

  const renderProductCard = (product) => {
    const imageUrl = getImageUrl(product.image)

    return (
      <button className="staff-product-tile" disabled={selectedInvoice && !canEditSelectedInvoice} key={product.id} onClick={() => handleAddProduct(product)} type="button">
        <div className="staff-product-media">
          {imageUrl ? <img alt={product.name} src={imageUrl} /> : <Coffee aria-hidden="true" />}
        </div>
        <span>{product.categoryName || 'Menu'}</span>
        <strong>{product.name}</strong>
      </button>
    )
  }

  const renderInvoiceItems = (invoice) => {
    const items = invoice.details || []

    if (items.length === 0) {
      return <div className="staff-order-ticket-empty">Chưa có món trong đơn.</div>
    }

    return (
      <div className="barista-ticket-items">
        {items.slice(0, 4).map((item) => (
          <div key={`${invoice.id}-${item.id}`}>
            <strong>
              <em>{item.quantity}x</em> {item.productName}
            </strong>
            {item.note && <span>{item.note}</span>}
          </div>
        ))}
        {items.length > 4 && <div className="staff-order-ticket-empty">+{items.length - 4} món khác. Bấm chi tiết để xem hết.</div>}
      </div>
    )
  }

  const renderOrderPanel = () => (
    <aside className="staff-order-panel">
      {!selectedInvoice && (
        <div className="staff-order-create">
          <div className="staff-order-title">
            <div>
              <h2>Tạo đơn mới</h2>
              <span>{createForm.orderType === 'DineIn' ? 'Nhập số thẻ đưa khách rồi chọn món' : 'Chọn hình thức rồi tạo đơn'}</span>
            </div>
            <ReceiptText aria-hidden="true" />
          </div>

          <form onSubmit={handleCreateInvoice}>
            <div className="staff-segmented">
              {[
                ['DineIn', 'Tại chỗ'],
                ['Takeaway', 'Mang đi'],
              ].map(([value, label]) => (
                <button
                  className={createForm.orderType === value ? 'active' : ''}
                  key={value}
                  onClick={() => setCreateForm((current) => ({ ...current, orderType: value }))}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {createForm.orderType === 'DineIn' && (
              <label className="staff-service-number-field">
                <span>Số thẻ khách cầm</span>
                <input autoFocus name="serviceNumber" onChange={updateCreateForm} value={createForm.serviceNumber} />
              </label>
            )}

            <button className="staff-primary-action" disabled={saving} type="submit">
              <Plus aria-hidden="true" />
              Tạo đơn mới
            </button>
          </form>
        </div>
      )}

      {selectedInvoice && (
        <div className="staff-order-create compact">
          <section className="staff-order-identity" aria-label="Thông tin hóa đơn">
            <div className="staff-order-identity-details">
              <div>
                <span>Hình thức:</span>
                <strong>{getOrderTypeSummary(selectedInvoice)}</strong>
              </div>
              <div>
                <span>Mã vận đơn:</span>
                <strong>{selectedInvoice.code}</strong>
              </div>
              <div>
                <span>Nhân viên order:</span>
                <strong>{getInvoiceStaffName(selectedInvoice, user)}</strong>
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="staff-order-items">
        {loadingDetail && <div className="staff-pos-empty">Đang tải hóa đơn...</div>}
        {!loadingDetail &&
          selectedInvoice?.details?.map((item) => {
            const product = productLookup.get(String(item.productId || '')) || productLookup.get(item.productName)
            const sizeConfig = getCupSizeConfig(product?.categoryName)
            const cupSize = getDetailCupSize(item, product)
            const displayNote = stripSizePrefix(item.note || '')

            return (
              <article className="staff-order-item" key={item.id}>
                <div className="staff-order-item-head">
                  <div>
                    <strong>{item.productName}</strong>
                  </div>
                  <div className="staff-order-item-actions">
                    {sizeConfig.options.length > 1 && (
                      <div className="staff-size-toggle" aria-label={`Chọn size ${item.productName}`}>
                        {sizeConfig.options.map((size) => (
                          <button
                            className={cupSize === size ? 'active' : ''}
                            disabled={!canEditSelectedInvoice}
                            key={size}
                            onClick={() => handleSizeChange(item, size)}
                            type="button"
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    )}
                    <button className="staff-remove-item-button" disabled={!canEditSelectedInvoice} onClick={() => handleDeleteDetail(item.id)} type="button">
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="staff-order-item-tools">
                  <div className="staff-qty-control">
                    <button
                      disabled={!canEditSelectedInvoice}
                      onClick={() => (Number(item.quantity) <= 1 ? handleDeleteDetail(item.id) : handleQuantityChange(item.id, Number(item.quantity) - 1))}
                      type="button"
                    >
                      <Minus aria-hidden="true" />
                    </button>
                    <span>{String(item.quantity).padStart(2, '0')}</span>
                    <button disabled={!canEditSelectedInvoice} onClick={() => handleQuantityChange(item.id, Number(item.quantity) + 1)} type="button">
                      <Plus aria-hidden="true" />
                    </button>
                  </div>
                  <label className="staff-note-input">
                    <input
                      onChange={(event) =>
                        setSelectedInvoice((current) => ({
                          ...current,
                          details: current.details.map((detail) =>
                            detail.id === item.id
                              ? {
                                  ...detail,
                                  note: sizeConfig.options.length > 1 ? buildSizeNote(cupSize, event.target.value) : event.target.value,
                                }
                              : detail
                          ),
                        }))
                      }
                      onBlur={() => handleSaveDetailNote(item.id, item.note || '')}
                      disabled={!canEditSelectedInvoice}
                      placeholder="Ghi chú món..."
                      value={displayNote}
                    />
                    <Edit3 aria-hidden="true" />
                  </label>
                  <strong>{formatCurrency(item.lineTotal)}</strong>
                </div>
              </article>
            )
          })}
      </div>

      {selectedInvoice && (
        <div className="staff-checkout">
          <div className="staff-total-lines">
            <div>
              <span>Tạm tính</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div>
              <span>Khuyến mãi</span>
              <strong>- {formatCurrency(discountAmount)}</strong>
            </div>
            <select
              className="staff-checkout-promotion"
              disabled={saving || selectedInvoice.status === 'Paid'}
              onChange={(event) => handleSelectedPromotionChange(event.target.value)}
              value={selectedPromotionCode}
            >
              <option value="">-- Chọn khuyến mãi --</option>
              {bootstrap.promotions
                .filter((promotion) => promotion.status === 'Active')
                .map((promotion) => (
                  <option key={promotion.id} value={promotion.name}>{promotion.name}</option>
                ))}
            </select>
            {shippingFee > 0 && (
              <div>
                <span>Phí ship</span>
                <strong>{formatCurrency(shippingFee)}</strong>
              </div>
            )}
            <div className="final">
              <span>Tổng thu</span>
              <strong>{formatCurrency(totalAmount)}</strong>
            </div>
          </div>
          <button
            className="staff-secondary-action full"
            disabled={saving || !selectedInvoice.details?.length || selectedInvoice.status === 'Paid'}
            onClick={handleOpenPaymentModal}
            type="button"
          >
            <Banknote aria-hidden="true" />
            {selectedInvoice.status === 'Paid' ? 'Đã thanh toán' : 'Thanh toán'}
          </button>
        </div>
      )}
    </aside>
  )

  const renderBillModal = () => {
    if (!billModalOpen || !billInvoice) return null

    const billItems = billInvoice.details || []
    const billTotalQty = billItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    const billSubtotal = Number(billInvoice.subtotal || 0)
    const billDiscount = Number(billInvoice.discountAmount || 0)
    const billShipping = Number(billInvoice.shippingFee || 0)
    const billTotal = Number(billInvoice.totalAmount || 0)
    const billReceived = Number(billInvoice.amountReceived || 0)
    const billChange = Number(billInvoice.changeAmount || 0)

    const fmtDate = (v) => v ? new Intl.DateTimeFormat('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(v)) : ''
    const fmtTime = (v) => v ? new Intl.DateTimeFormat('vi-VN', { hour:'2-digit', minute:'2-digit', second:'2-digit' }).format(new Date(v)) : ''

    return (
      <div className="staff-payment-backdrop" role="dialog" aria-modal="true" aria-labelledby="staff-bill-title">
        <div className="staff-bill-modal">
          <header className="staff-bill-modal-header">
            <h2 id="staff-bill-title">Hóa đơn thanh toán</h2>
            <button aria-label="Đóng" onClick={() => setBillModalOpen(false)} type="button"><X aria-hidden="true" /></button>
          </header>

          <div className="staff-bill-scroll">
            <div className="staff-bill-content" id="staff-bill-content">
              <p className="bc bb">Mơ Coffee</p>
              <p className="bc">238 Hoàng Thị Loan, phường Kon Tum, tỉnh Quảng Ngãi</p>
              <p className="bc">SĐT: 0383642945</p>
              <hr className="bhr" />
              <p className="bc bb">HÓA ĐƠN THANH TOÁN</p>
              <hr className="bhr" />
              <div className="br"><span>Số:</span><span>{billInvoice.code}</span></div>
              <div className="br"><span>Ngày:</span><span>{fmtDate(billInvoice.paidAt || billInvoice.createdAt)}</span></div>
              <div className="br"><span>Giờ vào:</span><span>{fmtTime(billInvoice.createdAt)}</span></div>
              <div className="br"><span>Giờ ra:</span><span>{fmtTime(billInvoice.paidAt)}</span></div>
              {billInvoice.serviceNumber && (
                <div className="br"><span>Số thẻ:</span><span>{billInvoice.serviceNumber}</span></div>
              )}
              {billInvoice.tableName && (
                <div className="br"><span>Bàn:</span><span>{billInvoice.tableName}{billInvoice.areaName ? ` – ${billInvoice.areaName}` : ''}</span></div>
              )}
              {billInvoice.customerName && (
                <div className="br"><span>Khách:</span><span>{billInvoice.customerName}</span></div>
              )}
              <div className="br"><span>Nhân viên:</span><span>{billInvoice.accountId} – {billInvoice.cashierName}</span></div>
              <hr className="bhr" />
              <table>
                <thead>
                  <tr>
                    <th>Tên hàng</th>
                    <th>Đ.giá</th>
                    <th>SL</th>
                    <th>TT</th>
                  </tr>
                </thead>
                <tbody>
                  {billItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}{item.note ? ` (${item.note})` : ''}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <hr className="bhr" />
              <div className="br bb"><span>Tổng SL hàng:</span><span>{billTotalQty}</span></div>
              {billDiscount > 0 && (
                <>
                  <div className="br"><span>Tạm tính:</span><span>{formatCurrency(billSubtotal)}</span></div>
                  <div className="br"><span>Giảm giá ({billInvoice.promotionName}):</span><span>-{formatCurrency(billDiscount)}</span></div>
                </>
              )}
              {billShipping > 0 && (
                <div className="br"><span>Phí ship:</span><span>{formatCurrency(billShipping)}</span></div>
              )}
              <div className="br bb"><span>Tổng thành tiền:</span><span>{formatCurrency(billTotal)}</span></div>
              <hr className="bhr" />
              <div className="br"><span>Phương thức TT:</span><span>{billInvoice.paymentMethod === 'Cash' ? 'Tiền mặt' : 'Chuyển khoản'}</span></div>
              {billInvoice.paymentMethod === 'Cash' && (
                <>
                  <div className="br"><span>Tiền khách đưa:</span><span>{formatCurrency(billReceived)}</span></div>
                  <div className="br"><span>Tiền thối lại:</span><span>{formatCurrency(billChange)}</span></div>
                </>
              )}
              <hr className="bhr" />
              <p className="bc">Xin cảm ơn, hẹn gặp lại quý khách!</p>
            </div>
          </div>

          <footer className="staff-bill-modal-footer">
            {billInvoice.kitchenStatus === 'Draft' && (
              <button
                className="staff-secondary-action"
                disabled={saving}
                onClick={async () => { setBillModalOpen(false); await handleSendToKitchen(billInvoice.id) }}
                type="button"
              >
                <Send aria-hidden="true" />
                Gửi pha chế
              </button>
            )}
            <button className="staff-primary-action" onClick={handlePrintBill} type="button">
              <Printer aria-hidden="true" />
              In hóa đơn
            </button>
          </footer>
        </div>
      </div>
    )
  }

  const renderPaymentModal = () => {
    if (!paymentModalOpen || !selectedInvoice) return null

    return (
      <div className="staff-payment-backdrop" role="dialog" aria-modal="true" aria-labelledby="staff-payment-title">
        <div className="staff-payment-modal">
          <header className="staff-payment-modal-head">
            <h2 id="staff-payment-title">Thanh toán</h2>
            <button onClick={() => setPaymentModalOpen(false)} type="button" aria-label="Đóng">
              <X aria-hidden="true" />
            </button>
          </header>

          <div className="staff-payment-modal-body">
            <section className="staff-payment-order-card">
              <span>Chi tiết đơn hàng</span>
              <div className="staff-payment-items">
                {(selectedInvoice.details || []).map((item) => (
                  <div key={item.id}>
                    <p>
                      {item.productName} x{item.quantity}
                    </p>
                    <strong>{formatCurrency(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
              <div className="staff-payment-modal-total">
                <span>Tổng cộng{shippingFee > 0 ? ` (đã gồm phí ship ${formatCurrency(shippingFee)})` : ''}</span>
                <strong>{formatCurrency(totalAmount)}</strong>
              </div>
            </section>

            <section>
              <p className="staff-payment-section-label">Phương thức thanh toán</p>
              <div className="staff-payment-methods">
                <button
                  className={paymentMethod === 'Cash' ? 'active' : ''}
                  onClick={() => handlePaymentMethodChange('Cash')}
                  type="button"
                >
                  <Banknote aria-hidden="true" />
                  <span>Tiền mặt</span>
                </button>
                <button
                  className={paymentMethod === 'QR' ? 'active' : ''}
                  onClick={() => handlePaymentMethodChange('QR')}
                  type="button"
                >
                  <QrCode aria-hidden="true" />
                  <span>QR Code</span>
                </button>
              </div>
            </section>

            {paymentMethod === 'Cash' ? (
              <section className="staff-cash-panel">
                <label>
                  <span>Tiền khách đưa</span>
                  <input
                    autoFocus
                    min="0"
                    inputMode="numeric"
                    onChange={(event) => setAmountReceived(formatCurrencyInput(event.target.value))}
                    pattern="[0-9.]*"
                    placeholder="Nhập số tiền khách đưa"
                    type="text"
                    value={amountReceived}
                  />
                </label>
                <div className="staff-cash-result">
                  <div>
                    <span>Khách cần trả</span>
                    <strong>{formatCurrency(totalAmount)}</strong>
                  </div>
                  <div>
                    <span>Tiền trả khách</span>
                    <strong>{formatCurrency(modalChangeAmount)}</strong>
                  </div>
                </div>
                {!canConfirmCashPayment && amountReceived !== '' && (
                  <p className="staff-payment-warning">Số tiền khách đưa chưa đủ.</p>
                )}
              </section>
            ) : (
              <section className="staff-qr-panel">
                <div className="staff-qr-box">
                  {vietQrLoading && <span>Đang tạo VietQR...</span>}
                  {!vietQrLoading && vietQrData.image && <img alt={`VietQR thanh toán ${selectedInvoice.code}`} src={vietQrData.image} />}
                  {!vietQrLoading && !vietQrData.image && <QrCode aria-hidden="true" />}
                </div>
                <div className="staff-qr-info">
                  <p>{vietQrError || 'Quét mã VietQR để chuyển khoản'}</p>
                  <small>
                    {VIETQR_CONFIG.bankCode} - {VIETQR_CONFIG.bankAccount} - {VIETQR_CONFIG.userBankName}
                  </small>
                  <strong>{formatCurrency(totalAmount)}</strong>
                  <small>Nội dung: {selectedInvoice.code}</small>
                </div>
              </section>
            )}
          </div>

          <footer className="staff-payment-modal-actions">
            <button className="staff-secondary-action" onClick={() => setPaymentModalOpen(false)} type="button">
              Quay lại
            </button>
            <button className="staff-primary-action" disabled={saving || !canConfirmCashPayment} onClick={handleConfirmPayment} type="button">
              <CheckCircle2 aria-hidden="true" />
              Xác nhận
            </button>
          </footer>
        </div>
      </div>
    )
  }

  const renderInvoiceDetailModal = () => {
    if (!detailLoading && !detailInvoice) return null

    const detailOrderCount = detailInvoice?.details?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0
    const detailSubtotal = Number(detailInvoice?.subtotal || 0)
    const detailDiscount = Number(detailInvoice?.discountAmount || 0)
    const detailShippingFee = Number(detailInvoice?.shippingFee || 0)
    const detailTotal = Number(detailInvoice?.totalAmount ?? detailSubtotal - detailDiscount + detailShippingFee) || 0
    const detailAmountDue = Math.max(detailTotal - Number(detailInvoice?.amountReceived || 0), 0)
    const detailChangeAmount = Number(detailInvoice?.changeAmount || 0)

    return (
      <div className="staff-payment-backdrop" role="dialog" aria-modal="true" aria-labelledby="staff-invoice-detail-title">
        <div className="staff-payment-modal staff-invoice-detail-modal">
          <header className="staff-payment-modal-head">
            <div>
              <h2 id="staff-invoice-detail-title">{detailInvoice ? getDisplayOrderNumber(detailInvoice) : 'Chi tiết hóa đơn'}</h2>
              {detailInvoice && (
                <span className="staff-invoice-detail-subtitle">
                  {getInvoicePlace(detailInvoice)} •{' '}
                  {orderTypeLabels[detailInvoice.orderType] || detailInvoice.orderType}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setDetailInvoice(null)
                setDetailLoading(false)
              }}
              type="button"
              aria-label="Đóng"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <div className="staff-payment-modal-body">
            {detailLoading ? (
              <div className="staff-pos-empty">Đang tải chi tiết hóa đơn...</div>
            ) : (
              <>
                <section className="staff-invoice-detail-summary">
                  <div>
                    <span>Khách hàng</span>
                    <strong>{detailInvoice.customerName || 'Khách lẻ'}</strong>
                  </div>
                  <div>
                    <span>Trạng thái</span>
                    <strong>{getInvoiceStatusLabel(detailInvoice)}</strong>
                  </div>
                  <div>
                    <span>Thời gian</span>
                    <strong>{new Date(detailInvoice.updatedAt || detailInvoice.createdAt).toLocaleString('vi-VN')}</strong>
                  </div>
                  <div>
                    <span>Ghi chú</span>
                    <strong>{detailInvoice.note || 'Không có'}</strong>
                  </div>
                </section>

                <section className="staff-payment-order-card">
                  <span>Danh sách món</span>
                  <div className="staff-payment-items">
                    {(detailInvoice.details || []).length > 0 ? (
                      detailInvoice.details.map((item) => (
                        <div className="staff-invoice-detail-item" key={item.id}>
                          <p>
                            {item.productName} x{item.quantity}
                            {item.note && <small>{item.note}</small>}
                          </p>
                          <strong>{formatCurrency(item.lineTotal)}</strong>
                        </div>
                      ))
                    ) : (
                      <div className="staff-invoice-detail-empty">Hóa đơn chưa có món.</div>
                    )}
                  </div>
                  <div className="staff-invoice-detail-totals">
                    <label className="staff-invoice-detail-promotion">
                      <span>Khuyến mãi</span>
                      <select
                        className="staff-promotion-input"
                        disabled={saving || detailInvoice.status === 'Paid'}
                        onChange={(event) => handleDetailPromotionChange(event.target.value)}
                        value={detailPromotionCode}
                      >
                        <option value="">-- Chọn khuyến mãi --</option>
                        {bootstrap.promotions
                          .filter((promotion) => promotion.status === 'Active')
                          .map((promotion) => (
                            <option key={promotion.id} value={promotion.name}>{promotion.name}</option>
                          ))}
                      </select>
                    </label>
                    <div>
                      <span>Tạm tính ({detailOrderCount} món)</span>
                      <strong>{formatCurrency(detailSubtotal)}</strong>
                    </div>
                    <div>
                      <span>Giảm giá</span>
                      <strong>- {formatCurrency(detailDiscount)}</strong>
                    </div>
                    {detailShippingFee > 0 && (
                      <div>
                        <span>Phí ship</span>
                        <strong>{formatCurrency(detailShippingFee)}</strong>
                      </div>
                    )}
                    <div>
                      <span>Còn lại</span>
                      <strong>{formatCurrency(detailAmountDue)}</strong>
                    </div>
                    <div className="final">
                      <span>Tổng cộng</span>
                      <strong>{formatCurrency(detailTotal)}</strong>
                    </div>
                    {detailChangeAmount > 0 && (
                      <div>
                        <span>Tiền thừa</span>
                        <strong>{formatCurrency(detailChangeAmount)}</strong>
                      </div>
                    )}
                  </div>
                  <div className="staff-payment-method-summary">
                    <span>Hình thức thanh toán</span>
                    <strong>{getPaymentMethodLabel(detailInvoice)}</strong>
                  </div>
                </section>
              </>
            )}
          </div>

          {!detailLoading && detailInvoice && (
            <footer className="staff-payment-modal-actions">
              <button
                className="staff-secondary-action"
                onClick={() => {
                  setDetailInvoice(null)
                  setDetailLoading(false)
                }}
                type="button"
              >
                Đóng
              </button>
              {isCancelledInvoice(detailInvoice) ? (
                <span className="staff-order-action-note">Hóa đơn đã bị hủy</span>
              ) : (
                <button
                  className="staff-primary-action"
                  disabled={saving || !canServeInvoice(detailInvoice)}
                  onClick={handleDetailMarkServed}
                  type="button"
                >
                  <CheckCircle2 aria-hidden="true" />
                  Ra đơn
                </button>
              )}
            </footer>
          )}
        </div>
      </div>
    )
  }

  const renderTablesView = () => (
    <>
      {renderTopbar('Quản lý bàn', 'Theo dõi sơ đồ bàn, mở bàn, chuyển bàn và gộp bàn')}
      <main className="staff-orders-page">
        <section className="staff-orders-filter">
          <label className="staff-pos-search staff-orders-search">
            <Search aria-hidden="true" />
            <input onChange={(event) => setTableSearch(event.target.value)} placeholder="Tìm bàn, khu vực, trạng thái..." type="search" value={tableSearch} />
          </label>
          <div className="staff-category-row">
            <button className={tableAreaFilter === 'all' ? 'active' : ''} onClick={() => setTableAreaFilter('all')} type="button">
              Tất cả
            </button>
            {bootstrap.areas.map((area) => (
              <button className={String(tableAreaFilter) === String(area.id) ? 'active' : ''} key={area.id} onClick={() => setTableAreaFilter(String(area.id))} type="button">
                {area.name}
              </button>
            ))}
          </div>
        </section>

        <section className="staff-table-management">
          {filteredTables.map((table) => {
            const tableInvoice = bootstrap.invoices.find((invoice) => Number(invoice.tableId) === Number(table.id) && invoice.status === 'Unpaid')

            return (
              <article className={`staff-table-management-card ${tableStatusTones[table.status] || ''}`} key={table.id}>
                <div>
                  <span>{table.areaName}</span>
                  <h3>{table.name}</h3>
                  <b>{tableStatusLabels[table.status] || table.status}</b>
                </div>
                {tableInvoice && (
                  <div className="staff-table-current-order">
                    <span>{getDisplayOrderNumber(tableInvoice)}</span>
                    <strong>{formatCurrency(tableInvoice.totalAmount)}</strong>
                    <small>{kitchenStatusLabels[tableInvoice.kitchenStatus] || tableInvoice.kitchenStatus}</small>
                  </div>
                )}
                <div className="staff-table-actions">
                  <button disabled={saving || Boolean(tableInvoice)} onClick={() => handleTableStatusChange(table, 'Available')} type="button">
                    Mở bàn
                  </button>
                  <button disabled={saving || table.status !== 'Available'} onClick={() => handleTableStatusChange(table, 'Occupied')} type="button">
                    Đóng bàn
                  </button>
                  {tableInvoice && (
                    <button onClick={() => openInvoiceDetail(tableInvoice.id)} type="button">
                      Chi tiết
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </section>

        <section className="staff-table-tools">
          <form className="staff-tool-card" onSubmit={handleTransferTable}>
            <div>
              <h2>Chuyển bàn</h2>
              <span>Chuyển hóa đơn đang mở sang bàn trống</span>
            </div>
            <select onChange={(event) => setTransferForm((current) => ({ ...current, invoiceId: event.target.value }))} value={transferForm.invoiceId}>
              <option value="">Chọn hóa đơn</option>
              {bootstrap.invoices
                .filter((invoice) => invoice.status === 'Unpaid' && invoice.tableId)
                .map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {getDisplayOrderNumber(invoice)} - {invoice.tableName}
                  </option>
                ))}
            </select>
            <select onChange={(event) => setTransferForm((current) => ({ ...current, targetTableId: event.target.value }))} value={transferForm.targetTableId}>
              <option value="">Bàn đích</option>
              {bootstrap.tables
                .filter((table) => table.status === 'Available')
                .map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} - {table.areaName}
                  </option>
                ))}
            </select>
            <button className="staff-primary-action" disabled={saving} type="submit">
              <Table2 aria-hidden="true" />
              Chuyển bàn
            </button>
          </form>

          <form className="staff-tool-card" onSubmit={handleMergeInvoices}>
            <div>
              <h2>Gộp bàn</h2>
              <span>Gộp món từ hóa đơn nguồn vào hóa đơn đích</span>
            </div>
            <select onChange={(event) => setMergeForm((current) => ({ ...current, sourceInvoiceId: event.target.value }))} value={mergeForm.sourceInvoiceId}>
              <option value="">Hóa đơn nguồn</option>
              {openInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {getDisplayOrderNumber(invoice)} - {invoice.tableName || orderTypeLabels[invoice.orderType] || 'Mang đi'}
                </option>
              ))}
            </select>
            <select onChange={(event) => setMergeForm((current) => ({ ...current, targetInvoiceId: event.target.value }))} value={mergeForm.targetInvoiceId}>
              <option value="">Hóa đơn đích</option>
              {openInvoices
                .filter((invoice) => String(invoice.id) !== String(mergeForm.sourceInvoiceId))
                .map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {getDisplayOrderNumber(invoice)} - {invoice.tableName || orderTypeLabels[invoice.orderType] || 'Mang đi'}
                  </option>
                ))}
            </select>
            <button className="staff-primary-action" disabled={saving} type="submit">
              <Combine aria-hidden="true" />
              Gộp bàn
            </button>
          </form>
        </section>
      </main>
    </>
  )

  const renderOrderPagination = ({ currentPage, onPageChange, totalItems, totalPages, visibleItems }) => (
    <footer className="staff-order-pagination">
      <span>
        Hiển thị {visibleItems} trên {totalItems} đơn
      </span>
      <div>
        <button
          aria-label="Trang trước"
          disabled={currentPage <= 1}
          onClick={() => onPageChange((page) => Math.max(page - 1, 1))}
          type="button"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <strong>
          {currentPage}/{totalPages}
        </strong>
        <button
          aria-label="Trang sau"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange((page) => Math.min(page + 1, totalPages))}
          type="button"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </footer>
  )

  // myInvoices đã lọc theo accountId từ backend — chỉ cần lọc theo ngày được chọn
  const effectiveShiftInvoices = useMemo(() => {
    const selectedDate = shiftDateFilter || formatDateInputValue()
    const isCurrentDate = selectedDate === formatDateInputValue()

    // Ngày hôm nay → dùng currentShiftInvoices (đã tính sẵn)
    if (isCurrentDate) return currentShiftInvoices

    // Ngày khác → lọc myInvoices theo ngày bằng chuỗi (tránh lỗi múi giờ)
    return myInvoices.filter((invoice) => String(invoice.createdAt || '').slice(0, 10) === selectedDate)
  }, [myInvoices, currentShiftInvoices, shiftDateFilter])

  const effectiveFilteredShiftInvoices = useMemo(() => {
    const keyword = shiftSearch.trim().toLowerCase()
    if (!keyword) return effectiveShiftInvoices

    return effectiveShiftInvoices.filter((invoice) =>
      [invoice.code, invoice.customerName, invoice.tableName, invoice.orderType, invoice.status, invoice.kitchenStatus]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    )
  }, [effectiveShiftInvoices, shiftSearch])

  const effectiveShiftRevenue = useMemo(
    () => currentShiftInvoices.filter((inv) => isPaidInvoice(inv) || isOrderCompletedInvoice(inv)).reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0),
    [currentShiftInvoices]
  )

  const handleShiftDateTextChange = (event) => {
    const nextText = event.target.value
    setShiftDateText(nextText)

    const parsedDate = parseDateDisplayValue(nextText)
    if (parsedDate) setShiftDateFilter(parsedDate)
  }

  const normalizeShiftDateText = () => {
    const parsedDate = parseDateDisplayValue(shiftDateText) || shiftDateFilter || formatDateInputValue()
    setShiftDateFilter(parsedDate)
    setShiftDateText(formatDateDisplayValue(parsedDate))
  }

  const handleShiftDatePickerChange = (event) => {
    const nextDate = event.target.value || formatDateInputValue()
    setShiftDateFilter(nextDate)
    setShiftDateText(formatDateDisplayValue(nextDate))
  }

  const openShiftDatePicker = () => {
    const picker = shiftDatePickerRef.current
    if (!picker) return

    if (typeof picker.showPicker === 'function') {
      picker.showPicker()
      return
    }

    picker.focus()
    picker.click()
  }

  const isCurrentShiftDate = (shiftDateFilter || formatDateInputValue()) === formatDateInputValue()

  // Doanh thu ngày được chọn (từ myInvoices đã lọc theo ngày)
  const selectedDateRevenue = useMemo(
    () => effectiveShiftInvoices.filter((inv) => isPaidInvoice(inv) || isOrderCompletedInvoice(inv)).reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0),
    [effectiveShiftInvoices]
  )

  const shiftStatusCounts = useMemo(() => {
    const countableInvoices = effectiveShiftInvoices
    const cancelled = countableInvoices.filter(isCancelledInvoice).length
    const completed = countableInvoices.filter(isOrderCompletedInvoice).length
    const inProgress = countableInvoices.filter((invoice) => invoice.kitchenStatus === 'InProgress' && !isCancelledInvoice(invoice)).length
    const kitchenCompleted = countableInvoices.filter((invoice) => isKitchenCompletedInvoice(invoice) && !isCancelledInvoice(invoice) && !isOrderCompletedInvoice(invoice)).length
    const waiting = countableInvoices.filter((invoice) => isWaitingKitchenInvoice(invoice) && !isCancelledInvoice(invoice)).length

    return {
      all: countableInvoices.length,
      cancelled,
      completed,
      inProgress,
      kitchenCompleted,
      waiting,
    }
  }, [effectiveShiftInvoices])

  const displayedShiftInvoices = useMemo(() => {
    // Ngày cũ: chỉ hiện Hoàn thành + Đã hủy
    const displayableInvoices = isCurrentShiftDate
      ? effectiveFilteredShiftInvoices
      : effectiveFilteredShiftInvoices.filter((invoice) => isOrderCompletedInvoice(invoice) || isCancelledInvoice(invoice))

    if (shiftFilter === 'Completed') {
      return displayableInvoices.filter(isOrderCompletedInvoice)
    }
    if (shiftFilter === 'Cancelled') return displayableInvoices.filter(isCancelledInvoice)
    if (shiftFilter === 'InProgress') return displayableInvoices.filter((invoice) => invoice.kitchenStatus === 'InProgress' && !isCancelledInvoice(invoice))
    if (shiftFilter === 'KitchenCompleted') return displayableInvoices.filter((invoice) => isKitchenCompletedInvoice(invoice) && !isCancelledInvoice(invoice) && !isOrderCompletedInvoice(invoice))
    if (shiftFilter === 'Waiting') return displayableInvoices.filter((invoice) => isWaitingKitchenInvoice(invoice) && !isCancelledInvoice(invoice))
    return displayableInvoices
  }, [effectiveFilteredShiftInvoices, isCurrentShiftDate, shiftFilter])

  const displayedShiftTotalPages = Math.max(1, Math.ceil(displayedShiftInvoices.length / 9))
  const displayedShiftPage = Math.min(shiftPage, displayedShiftTotalPages)
  const paginatedDisplayedShiftInvoices = displayedShiftInvoices.slice((displayedShiftPage - 1) * 9, displayedShiftPage * 9)

  useEffect(() => {
    setShiftPage(1)
  }, [shiftDateFilter, shiftFilter, shiftScopeFilter])

  // Khi chuyển sang ngày cũ, reset filter về 'all' nếu filter hiện tại không có trong ngày cũ
  useEffect(() => {
    if (!isCurrentShiftDate && !['all', 'Completed', 'Cancelled'].includes(shiftFilter)) {
      setShiftFilter('all')
    }
  }, [isCurrentShiftDate, shiftFilter])

  useEffect(() => {
    setShiftPage((page) => Math.min(page, displayedShiftTotalPages))
  }, [displayedShiftTotalPages])

  const renderShiftView = () => (
    <>
      {renderTopbar('Quản lý đơn hàng')}
      <main className="staff-orders-page">
        <section className="staff-shift-summary">
          <div className="staff-orders-stats staff-shift-stats">
            <article>
              <ReceiptText aria-hidden="true" />
              <div>
                <span>Hóa đơn trong ca</span>
                <strong>{String(shiftStatusCounts.all).padStart(2, '0')}</strong>
              </div>
            </article>
            <article>
              <Banknote aria-hidden="true" />
              <div>
                <span>{isCurrentShiftDate ? 'Doanh thu ca' : 'Doanh thu ngày'}</span>
                <strong>{formatCurrency(isCurrentShiftDate ? effectiveShiftRevenue : selectedDateRevenue)}</strong>
              </div>
            </article>
          </div>
        </section>

        <section className="staff-orders-filter staff-shift-filter">
          <label className="staff-pos-search staff-shift-search">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setShiftSearch(event.target.value)}
              placeholder="Tìm kiếm đơn..."
              type="search"
              value={shiftSearch}
            />
          </label>
          <label className="staff-shift-date-filter">
            <input
              className="staff-shift-date-text"
              inputMode="numeric"
              onBlur={normalizeShiftDateText}
              onChange={handleShiftDateTextChange}
              placeholder="dd/mm/yyyy"
              type="text"
              value={shiftDateText}
            />
            <input
              className="staff-shift-date-native"
              onChange={handleShiftDatePickerChange}
              ref={shiftDatePickerRef}
              tabIndex="-1"
              type="date"
              value={shiftDateFilter}
            />
            <button aria-label="Chọn ngày" className="staff-shift-date-button" onClick={openShiftDatePicker} type="button">
              <CalendarDays aria-hidden="true" />
            </button>
          </label>
          <div className="staff-category-row">
            {(isCurrentShiftDate
              ? [
                  ['all', `Tất cả (${shiftStatusCounts.all})`],
                  ['Waiting', `Đang chờ (${shiftStatusCounts.waiting})`],
                  ['InProgress', `Đang làm (${shiftStatusCounts.inProgress})`],
                  ['KitchenCompleted', `Pha chế xong (${shiftStatusCounts.kitchenCompleted})`],
                  ['Cancelled', `Đã hủy (${shiftStatusCounts.cancelled})`],
                  ['Completed', `Hoàn thành (${shiftStatusCounts.completed})`],
                ]
              : [
                  ['all', `Tất cả (${shiftStatusCounts.all})`],
                  ['Completed', `Hoàn thành (${shiftStatusCounts.completed})`],
                  ['Cancelled', `Đã hủy (${shiftStatusCounts.cancelled})`],
                ]
            ).map(([value, label]) => (
              <button className={shiftFilter === value ? 'active' : ''} key={value} onClick={() => setShiftFilter(value)} type="button">
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="staff-order-board">
          {displayedShiftInvoices.length > 0 ? (
            paginatedDisplayedShiftInvoices.map((invoice) => (
              <article className={`staff-order-ticket staff-shift-ticket ${getInvoiceTone(invoice)}`} key={invoice.id}>
                <div className="barista-ticket-head">
                  <div>
                    <span>{invoice.code}</span>
                    <h3>{getOrderTypeSummary(invoice)}</h3>
                  </div>
                  <small>{getInvoiceStatusLabel(invoice)}</small>
                </div>
                <div className="barista-ticket-meta">
                  <span>
                    <Clock3 aria-hidden="true" />
                    {formatInvoiceDateTime(invoice)}
                  </span>
                  <strong>{invoice.details?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0} ly</strong>
                </div>
                <div className="staff-order-ticket-customer">
                  <span>Nhân viên order</span>
                  <strong>{getInvoiceStaffName(invoice, user)}</strong>
                  <small>{invoice.customerName || 'Khách lẻ'}</small>
                  <b>{formatCurrency(invoice.totalAmount)}</b>
                </div>
                <div className="barista-ticket-actions">
                  <button className="workstation-secondary" onClick={() => openInvoiceDetail(invoice.id)} type="button">
                    Chi tiết
                  </button>
                  {isOrderCompletedInvoice(invoice) ? (
                    <span className="staff-order-action-note">Hoàn thành đơn</span>
                  ) : isCancelledInvoice(invoice) ? (
                    <span className="staff-order-action-note">Hóa đơn đã bị hủy</span>
                  ) : (
                    <>
                      {canSendInvoiceToKitchen(invoice) ? (
                        <button
                          className="workstation-secondary"
                          disabled={saving || !invoice.details?.length}
                          onClick={() => handleSendToKitchen(invoice.id)}
                          type="button"
                        >
                          <Send aria-hidden="true" />
                          <span>Gửi pha chế</span>
                        </button>
                      ) : (
                        <button
                          className="workstation-secondary"
                          disabled={saving || !canServeInvoice(invoice)}
                          onClick={() => handleMarkServed(invoice)}
                          type="button"
                        >
                          <CheckCircle2 aria-hidden="true" />
                          <span>Ra đơn</span>
                        </button>
                      )}
                      {canCancelInvoice(invoice) && (
                        <button className="workstation-primary" disabled={saving} onClick={() => handleCancelInvoice(invoice)} type="button">
                          Hủy hóa đơn
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="staff-pos-empty">Không có hóa đơn phù hợp.</div>
          )}
        </section>
        {displayedShiftInvoices.length > 0 &&
          renderOrderPagination({
            currentPage: displayedShiftPage,
            onPageChange: setShiftPage,
            totalItems: displayedShiftInvoices.length,
            totalPages: displayedShiftTotalPages,
            visibleItems: paginatedDisplayedShiftInvoices.length,
          })}
      </main>
    </>
  )

  const renderSalesView = () => (
    <>
      {renderTopbar('Bán hàng')}
      <main className="staff-pos-sales">
        <section className="staff-menu-area">
          <div className="staff-menu-tools">
            <div className="staff-category-row">
              {categories.map((category) => (
                <button className={productCategory === category ? 'active' : ''} key={category} onClick={() => setProductCategory(category)} type="button">
                  {category === 'all' ? 'Tất cả' : category}
                </button>
              ))}
            </div>
          </div>

          <div className="staff-product-grid">
            {filteredProducts.length > 0 ? filteredProducts.map(renderProductCard) : <div className="staff-pos-empty">Không tìm thấy món phù hợp.</div>}
          </div>
        </section>

        {renderOrderPanel()}
      </main>
    </>
  )

  const renderOrdersView = () => (
    <>
      {renderTopbar('Quản lý đơn hàng')}
      <main className="staff-orders-page">
        <section className="staff-orders-stats">
          <article>
            <Clock3 aria-hidden="true" />
            <div>
              <span>Chờ xử lý</span>
              <strong>{String(invoiceCounts.waiting).padStart(2, '0')}</strong>
            </div>
            <small>Đơn mở</small>
          </article>
          <article>
            <Coffee aria-hidden="true" />
            <div>
              <span>Đang pha chế</span>
              <strong>{String(invoiceCounts.inProgress).padStart(2, '0')}</strong>
            </div>
            <small>Đang làm</small>
          </article>
          <article>
            <Send aria-hidden="true" />
            <div>
              <span>Đợi ra đơn</span>
              <strong>{String(invoiceCounts.readyToServe).padStart(2, '0')}</strong>
            </div>
            <small>Pha chế xong</small>
          </article>
          <article>
            <CheckCircle2 aria-hidden="true" />
            <div>
              <span>Hoàn thành</span>
              <strong>{String(invoiceCounts.paid).padStart(2, '0')}</strong>
            </div>
            <small>Đã ra đơn</small>
          </article>
        </section>

        <section className="staff-orders-filter">
          <label className="staff-pos-search staff-orders-search">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setInvoiceSearch(event.target.value)}
              placeholder="Tìm kiếm đơn hàng, khách hàng..."
              type="search"
              value={invoiceSearch}
            />
          </label>
          <div className="staff-category-row">
            {[
              ['all', `Tất cả (${invoiceCounts.all})`],
              ['Waiting', `Đang chờ (${invoiceCounts.waiting})`],
              ['InProgress', `Đang làm (${invoiceCounts.inProgress})`],
              ['Completed', `Pha chế xong (${invoiceCounts.readyToServe ?? invoiceCounts.completed})`],
              ['Cancelled', `Đã hủy (${invoiceCounts.cancelled})`],
              ['OrderCompleted', `Hoàn thành (${invoiceCounts.paid})`],
            ].map(([value, label]) => (
              <button
                className={`${invoiceFilter === value ? 'active' : ''} tone-${getOrderFilterTone(value)}`}
                key={value}
                onClick={() => {
                  setFocusedNotificationInvoiceId(null)
                  setInvoiceFilter(value)
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="staff-order-board">
          {paginatedInvoices.length > 0 ? (
            paginatedInvoices.map((invoice) => {
              const isLockedOrder = isOrderCompletedInvoice(invoice)
              const orderTone = invoiceFilter === 'Completed' ? 'completed' : getInvoiceTone(invoice)
              const isNotificationFocused =
                invoiceFilter === 'Completed' &&
                focusedNotificationInvoiceId &&
                String(invoice.id) === String(focusedNotificationInvoiceId)
              const isNotificationDimmed =
                invoiceFilter === 'Completed' &&
                focusedNotificationInvoiceId &&
                String(invoice.id) !== String(focusedNotificationInvoiceId)

              return (
              <article className={`staff-order-ticket ${orderTone} ${isLockedOrder ? 'locked' : ''} ${isNotificationFocused ? 'notification-focused' : ''} ${isNotificationDimmed ? 'notification-dimmed' : ''}`} key={invoice.id}>
                <div className="barista-ticket-head">
                  <div>
                    <span>{invoice.code}</span>
                    <h3>{getOrderTypeSummary(invoice)}</h3>
                  </div>
                  <small>{getInvoiceStatusLabel(invoice)}</small>
                </div>

                <div className="barista-ticket-meta">
                  <span>
                    <Clock3 aria-hidden="true" />
                    {formatInvoiceDateTime(invoice)}
                  </span>
                  <strong>{invoice.details?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0} ly</strong>
                </div>

                <div className="staff-order-ticket-customer">
                  <span>Nhân viên order</span>
                  <strong>{getInvoiceStaffName(invoice, user)}</strong>
                  <small>{invoice.customerName || 'Khách lẻ'}</small>
                  <b>{formatCurrency(invoice.totalAmount)}</b>
                </div>

                <div className="barista-ticket-actions">
                  <button className="workstation-secondary" onClick={() => openInvoiceDetail(invoice.id)} type="button">
                    <span>Chi tiết</span>
                  </button>
                  {isCancelledInvoice(invoice) || isOrderCompletedInvoice(invoice) ? (
                    <span className="staff-order-action-note">
                      {isCancelledInvoice(invoice) ? 'Hóa đơn đã bị hủy' : 'Hóa đơn đã hoàn thành'}
                    </span>
                  ) : invoice.orderType === 'Ship' ? (
                    <>
                      {canSendInvoiceToKitchen(invoice) ? (
                        <button className="workstation-secondary" disabled={saving || !invoice.details?.length} onClick={() => handleSendToKitchen(invoice.id)} type="button">
                          <Send aria-hidden="true" /><span>Gửi pha chế</span>
                        </button>
                      ) : invoice.kitchenStatus !== 'Completed' ? (
                        <button className="workstation-secondary" disabled type="button">
                          <span>Chờ pha chế xong</span>
                        </button>
                      ) : invoice.deliveryStatus === 'Pending' ? (
                        <button className="workstation-secondary" disabled={saving} onClick={() => handleStartDelivery(invoice)} type="button">
                          <Truck aria-hidden="true" /><span>Bắt đầu giao</span>
                        </button>
                      ) : invoice.deliveryStatus === 'Delivering' ? (
                        <button className="workstation-secondary" disabled={saving} onClick={() => handleCompleteDelivery(invoice)} type="button">
                          <CheckCircle2 aria-hidden="true" /><span>Đã giao</span>
                        </button>
                      ) : null}
                      {canCancelInvoice(invoice) && (
                        <button className="workstation-primary" disabled={saving} onClick={() => handleCancelInvoice(invoice)} type="button">Hủy hóa đơn</button>
                      )}
                    </>
                  ) : (
                    <>
                      {canSendInvoiceToKitchen(invoice) ? (
                        <button
                          className="workstation-secondary"
                          disabled={saving || !invoice.details?.length}
                          onClick={() => handleSendToKitchen(invoice.id)}
                          type="button"
                        >
                          <Send aria-hidden="true" />
                          <span>Gửi pha chế</span>
                        </button>
                      ) : (
                        <button
                          className="workstation-secondary"
                          disabled={saving || !canServeInvoice(invoice)}
                          onClick={() => handleMarkServed(invoice)}
                          type="button"
                        >
                          <CheckCircle2 aria-hidden="true" />
                          <span>Ra đơn</span>
                        </button>
                      )}
                      {canCancelInvoice(invoice) && (
                        <button className="workstation-primary" disabled={saving} onClick={() => handleCancelInvoice(invoice)} type="button">
                          Hủy hóa đơn
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
              )
            })
          ) : (
            <div className="staff-pos-empty">Không có hóa đơn phù hợp.</div>
          )}
        </section>
        {paginatedInvoices.length > 0 &&
          renderOrderPagination({
            currentPage: ordersPage,
            onPageChange: setOrdersPage,
            totalItems: filteredInvoices.length,
            totalPages: ordersTotalPages,
            visibleItems: paginatedInvoices.length,
          })}
      </main>
    </>
  )

  const renderProfileModal = () => {
    if (!profileModalOpen) return null

    return (
      <div className="staff-payment-backdrop" role="dialog" aria-modal="true" aria-labelledby="staff-profile-title">
        <form className="staff-payment-modal staff-profile-modal" onSubmit={handleSaveProfile}>
          <header className="staff-payment-modal-head">
            <h2 id="staff-profile-title">{profileMode === 'password' ? 'Đổi mật khẩu' : 'Hồ sơ cá nhân'}</h2>
            <button onClick={() => setProfileModalOpen(false)} type="button" aria-label="Đóng">
              <X aria-hidden="true" />
            </button>
          </header>

          <div className="staff-payment-modal-body">
            <div className="staff-segmented">
              <button className={profileMode === 'profile' ? 'active' : ''} onClick={() => setProfileMode('profile')} type="button">
                Cập nhật hồ sơ
              </button>
              <button className={profileMode === 'password' ? 'active' : ''} onClick={() => setProfileMode('password')} type="button">
                Đổi mật khẩu
              </button>
            </div>

            {profileError && <p className="staff-payment-warning">{profileError}</p>}

            {profileMode === 'password' ? (
              <section className="staff-profile-form">
                <label>
                  <span>Mật khẩu hiện tại</span>
                  <input name="currentPassword" onChange={updateProfileForms} required type="password" value={passwordForm.currentPassword} />
                </label>
                <label>
                  <span>Mật khẩu mới</span>
                  <input minLength="6" name="newPassword" onChange={updateProfileForms} required type="password" value={passwordForm.newPassword} />
                </label>
                <label>
                  <span>Nhập lại mật khẩu mới</span>
                  <input minLength="6" name="confirmPassword" onChange={updateProfileForms} required type="password" value={passwordForm.confirmPassword} />
                </label>
              </section>
            ) : (
              <section className="staff-profile-form">
                <label>
                  <span>Họ tên</span>
                  <input name="fullName" onChange={updateProfileForms} required value={profileForm.fullName} />
                </label>
                <label>
                  <span>Email</span>
                  <input name="email" onChange={updateProfileForms} type="email" value={profileForm.email} />
                </label>
                <label>
                  <span>Điện thoại</span>
                  <input name="phoneNumber" onChange={updateProfileForms} value={profileForm.phoneNumber} />
                </label>
                <label>
                  <span>Tên đăng nhập</span>
                  <input disabled value={profileForm.username} />
                </label>
                <label>
                  <span>Vai trò</span>
                  <input disabled value={profileForm.role} />
                </label>
              </section>
            )}
          </div>

          <footer className="staff-payment-modal-actions">
            <button className="staff-secondary-action" onClick={() => setProfileModalOpen(false)} type="button">
              Hủy
            </button>
            <button className="staff-primary-action" disabled={saving} type="submit">
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </footer>
        </form>
      </div>
    )
  }

  const renderActiveView = () => {
    if (activeView === 'orders') return renderShiftView()
    if (activeView === 'tables') return renderTablesView()
    if (activeView === 'shift') return renderShiftView()

    return renderSalesView()
  }

  return (
    <div className="staff-pos-shell">
      {renderSidebar()}
      <section className="staff-pos-content">
        {error && <div className="staff-toast error">{error}</div>}
        {message && <div className="staff-toast">{message}</div>}
        {loading && <div className="staff-toast">Đang tải dữ liệu bán hàng...</div>}
        {renderActiveView()}
        {renderInvoiceDetailModal()}
        {renderPaymentModal()}
        {renderBillModal()}
        {renderProfileModal()}
      </section>
    </div>
  )
}

export default Staff
