import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Coffee,
  CupSoda,
  LogOut,
  PackageSearch,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  acceptBaristaOrder,
  completeBaristaOrder,
  getBaristaHistory,
  getBaristaOrderById,
  getBaristaOrders,
  getBaristaWorkspace,
} from '../../services/baristaService'
import { changePassword as changeOwnPassword, getProfile, logout as logoutRequest, updateProfile } from '../../services/authService'
import { useConfirm } from '../../components/common/useConfirm'
import { getStoredUser, removeStorageItem, setAuthSession } from '../../utils/storage'
import '../Workstation/Workstation.css'

const statusLabels = {
  Completed: 'Hoàn thành',
  InProgress: 'Đang làm',
  Waiting: 'Đang chờ',
}

const statusClasses = {
  Completed: 'done',
  InProgress: 'making',
  Waiting: 'waiting',
}

const orderTypeLabels = {
  DineIn: 'Ngồi tại quán',
  Ship: 'Ship',
  Takeaway: 'Mang đi',
}

const emptyWorkspace = {
  ingredients: [],
  lowStock: [],
  movements: [],
  products: [],
  recipes: [],
}

const demoIngredientNames = new Set(['đá viên', 'trà đào syrup', 'đường trắng', 'hạt cà phê', 'sữa tươi'])

const isDemoIngredient = (ingredient) => {
  const name = String(ingredient?.name || '').trim().toLowerCase()
  return demoIngredientNames.has(name) && !ingredient?.supplierName
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

const BARISTA_ORDERS_PER_PAGE = 9

const getCurrentUser = () => {
  return getStoredUser()
}

const getStoredReadNotificationIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem('baristaReadNotificationIds') || '[]'))
  } catch {
    return new Set()
  }
}

const saveReadNotificationIds = (ids) => {
  localStorage.setItem('baristaReadNotificationIds', JSON.stringify(Array.from(ids)))
}

const getOrderPlace = (order) => (order.tableName ? `${order.tableName} - ${order.areaName}` : orderTypeLabels[order.orderType] || 'Mang đi')

const getOrderStaffName = (order) => order.cashierName || order.employeeName || order.staffName || order.createdByName || 'Nhân viên'

const getOrderTypeLabel = (order) => orderTypeLabels[order.orderType] || (order.tableName ? 'Ngồi tại quán' : 'Mang đi')

const getDisplayOrderNumber = (order) => (order?.serviceNumber ? `Số ${order.serviceNumber}` : order?.code || 'Đơn mới')

const getOrderCreatedTime = (order) => order?.createdAt || order?.updatedAt

const getBaristaOrderTitle = (order) => {
  const typeLabel = order?.orderType === 'DineIn' ? 'Tại chỗ' : getOrderTypeLabel(order)
  return order?.serviceNumber ? `${typeLabel} - số ${order.serviceNumber}` : typeLabel
}

const formatBaristaOrderDateTime = (order) => {
  const date = new Date(getOrderCreatedTime(order))
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
    second: '2-digit',
    year: 'numeric',
  })
}

const formatNotificationDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
    year: 'numeric',
  })
}

const formatDateInputValue = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value || 0))

const isCurrentBaristaOrder = (order) => {
  if (order.kitchenStatus === 'Waiting' || order.kitchenStatus === 'InProgress') return true

  const timestamp = new Date(getOrderCreatedTime(order))
  if (Number.isNaN(timestamp.getTime())) return false

  return timestamp.toDateString() === new Date().toDateString()
}

// "Hoàn thành" = barista đã pha xong (KitchenStatus=Completed)
// Thanh toán xảy ra TRƯỚC khi gửi pha chế nên status=Paid không đồng nghĩa hoàn thành
const isCompletedBaristaOrder = (order) =>
  !isCancelledBaristaOrder(order) && order.kitchenStatus === 'Completed'

const isCancelledBaristaOrder = (order) => order.status === 'Cancelled'

const getDateKey = (value) => {
  if (!value) return ''
  const text = String(value)
  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/)
  if (isoMatch) return isoMatch[0]

  const date = value instanceof Date ? value : new Date(value)
  return formatDateInputValue(date)
}

const isOrderOnDate = (order, dateInput) => {
  return getDateKey(getOrderCreatedTime(order)) === dateInput
}

const getBaristaTicketClass = (order) => {
  if (isCancelledBaristaOrder(order)) return 'cancelled'
  if (order.kitchenStatus === 'Completed') return 'brewed'
  return statusClasses[order.kitchenStatus] || 'waiting'
}

const getBaristaStatusLabel = (order) => {
  if (isCancelledBaristaOrder(order)) return 'Đã hủy'
  if (isCompletedBaristaOrder(order)) return 'Hoàn thành'
  if (order.kitchenStatus === 'Waiting') return 'Đang chờ'
  if (order.kitchenStatus === 'InProgress') return 'Đang làm'
  return order.kitchenStatus
}

const normalizeVi = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()

const getOrderMinutes = (order) => {
  const timestamp = new Date(order.updatedAt || order.createdAt).getTime()
  if (Number.isNaN(timestamp)) return 0
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000))
}

const formatOrderDuration = (minutes) => {
  if (minutes <= 0) return 'Vừa đặt'
  if (minutes < 60) return `${minutes} phút`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes > 0 ? `${hours} giờ ${remainingMinutes} phút` : `${hours} giờ`
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

function Barista() {
  const confirm = useConfirm()
  const [activeView, setActiveView] = useState(() => {
    const sub = window.location.hash.replace('#', '').split('/')[1] || ''
    return ['orders', 'recipes'].includes(sub) ? sub : 'orders'
  })
  const [orders, setOrders] = useState([])
  const [historyOrders, setHistoryOrders] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [workspace, setWorkspace] = useState(emptyWorkspace)
  const [statusFilter, setStatusFilter] = useState('all')
  const [orderPage, setOrderPage] = useState(1)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderDateFilter, setOrderDateFilter] = useState(() => formatDateInputValue())
  const [recipeSearch, setRecipeSearch] = useState('')
  const [stockSearch, setStockSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [topNotificationPanelOpen, setTopNotificationPanelOpen] = useState(false)
  const [topReadNotificationIds, setTopReadNotificationIds] = useState(getStoredReadNotificationIds)
  const selectedOrderRef = useRef(null)
  const knownOrderIdsRef = useRef(new Set())
  const knownCancelledOrderIdsRef = useRef(new Set())
  const initialOrdersLoadedRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileMode, setProfileMode] = useState('profile')
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)

  const pageHeadings = {
    notifications: {
      title: 'Thông báo',
      subtitle: 'Theo dõi đơn mới, đơn bị hủy và cảnh báo cần xử lý.',
    },
    orders: {
      title: 'Đơn pha chế',
      subtitle: 'Nhận đơn, theo dõi trạng thái và xác nhận hoàn thành.',
    },
    recipes: {
      title: 'Công thức',
      subtitle: 'Xem công thức pha chế và định lượng nguyên liệu.',
    },
    stock: {
      title: 'Kho nguyên liệu',
      subtitle: 'Theo dõi tồn kho và cảnh báo nguyên liệu sắp hết.',
    },
  }
  const pageHeading = pageHeadings[activeView] || pageHeadings.orders
  const [profileError, setProfileError] = useState('')
  const user = currentUser

  const setCurrentSelectedOrder = useCallback((order) => {
    selectedOrderRef.current = order
    setSelectedOrder(order)
  }, [])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getBaristaOrders()
      const nextOrders = data.orders || []
      const newWaitingOrder = nextOrders.find((order) => order.kitchenStatus === 'Waiting' && !knownOrderIdsRef.current.has(order.id))
      const newCancelledOrder = nextOrders.find((order) => order.status === 'Cancelled' && !knownCancelledOrderIdsRef.current.has(order.id))

      if (initialOrdersLoadedRef.current && newCancelledOrder) {
        setMessage(`${getDisplayOrderNumber(newCancelledOrder)} đã bị hủy`)
      }

      knownOrderIdsRef.current = new Set(nextOrders.map((order) => order.id))
      knownCancelledOrderIdsRef.current = new Set(nextOrders.filter((order) => order.status === 'Cancelled').map((order) => order.id))
      initialOrdersLoadedRef.current = true
      setOrders(nextOrders)

      const currentSelectedOrder = selectedOrderRef.current
      if (currentSelectedOrder) {
        const detail = await getBaristaOrderById(currentSelectedOrder.id)
        if (selectedOrderRef.current?.id === currentSelectedOrder.id) {
          setCurrentSelectedOrder(detail.order)
        }
      }
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [setCurrentSelectedOrder])

  const loadWorkspace = useCallback(async () => {
    setWorkspaceLoading(true)

    try {
      const data = await getBaristaWorkspace()
      setWorkspace({
        ingredients: data.ingredients || [],
        lowStock: data.lowStock || [],
        movements: data.movements || [],
        products: data.products || [],
        recipes: data.recipes || [],
      })
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setWorkspaceLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async (date) => {
    setHistoryLoading(true)
    try {
      const data = await getBaristaHistory({ startDate: date, endDate: date })
      setHistoryOrders(data.orders || [])
    } catch {
      setHistoryOrders([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
    loadWorkspace()
  }, [loadOrders, loadWorkspace])

  // Khi chuyển sang ngày khác (không phải hôm nay) → load lịch sử từ backend
  useEffect(() => {
    const today = formatDateInputValue()
    if (orderDateFilter && orderDateFilter !== today) {
      loadHistory(orderDateFilter)
    } else {
      setHistoryOrders([])
    }
  }, [orderDateFilter, loadHistory])

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
        // Keep the barista screen usable with the cached login.
      }
    }

    syncCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadOrders()
    }, 10000)

    return () => window.clearInterval(timer)
  }, [loadOrders])

  const averageInProgressMinutes = useMemo(() => {
    const inProgressOrders = orders.filter((order) => order.kitchenStatus === 'InProgress')
    if (inProgressOrders.length === 0) return 0
    const totalMinutes = inProgressOrders.reduce((sum, order) => sum + Math.max(1, getOrderMinutes(order)), 0)
    return Math.round(totalMinutes / inProgressOrders.length)
  }, [orders])

  const recipesByProduct = useMemo(() => {
    return workspace.products.map((product) => ({
      ...product,
      ingredients: workspace.recipes.filter((recipe) => String(recipe.productId) === String(product.id)),
    }))
  }, [workspace.products, workspace.recipes])

  const filteredRecipes = useMemo(() => {
    const keyword = normalizeVi(recipeSearch)

    return recipesByProduct.filter((product) => {
      if (!keyword) return true

      return (
        [product.name, product.categoryName, product.description]
          .filter(Boolean)
          .some((value) => normalizeVi(value).includes(keyword)) ||
        product.ingredients.some((item) =>
          [item.ingredientName, item.unit]
            .filter(Boolean)
            .some((value) => normalizeVi(value).includes(keyword))
        )
      )
    })
  }, [recipeSearch, recipesByProduct])

  const recipeSuggestions = useMemo(() => {
    const names = recipesByProduct.map((p) => p.name)
    const ingredients = recipesByProduct.flatMap((p) => p.ingredients.map((i) => i.ingredientName))
    return [...new Set([...names, ...ingredients])].filter(Boolean)
  }, [recipesByProduct])

  const filteredIngredients = useMemo(() => {
    const keyword = stockSearch.trim().toLowerCase()

    return workspace.ingredients.filter((ingredient) => {
      if (!keyword) return true

      return [ingredient.name, ingredient.unit, ingredient.supplierName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    })
  }, [stockSearch, workspace.ingredients])

  const notificationItems = useMemo(() => {
    const orderItems = orders.map((order) => {
      const cupCount = order.details?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0
      const isCancelled = isCancelledBaristaOrder(order)
      const isDone = isCompletedBaristaOrder(order)
      const isMaking = order.kitchenStatus === 'InProgress'

      return {
        id: `order-${order.id}`,
        tone: isCancelled ? 'danger' : isDone ? 'info' : isMaking ? 'warning' : 'danger',
        title: isCancelled
          ? `${getDisplayOrderNumber(order)} đã bị hủy`
          : isDone
            ? `${getDisplayOrderNumber(order)} đã hoàn thành`
            : isMaking
              ? `${getDisplayOrderNumber(order)} đang pha chế`
              : `Đơn mới ${getDisplayOrderNumber(order)}`,
        description: isCancelled
          ? `${getOrderPlace(order)} - không tiếp tục pha chế`
          : `${getOrderPlace(order)} - ${cupCount} ly`,
        time: formatNotificationDateTime(getOrderCreatedTime(order)),
      }
    })

    const stockItems = workspace.lowStock.map((ingredient) => ({
      id: `stock-${ingredient.id}`,
      tone: 'warning',
      title: `${ingredient.name} sắp hết`,
      description: `Còn ${ingredient.currentStock} ${ingredient.unit}, mức tối thiểu ${ingredient.minStock} ${ingredient.unit}`,
      time: 'Kho',
    }))

    const reminderItems = orders
      .filter((order) => order.kitchenStatus === 'InProgress' && getOrderMinutes(order) >= 15)
      .map((order) => ({
        id: `reminder-${order.id}`,
        tone: 'info',
        title: `Nhắc đơn ${getDisplayOrderNumber(order)}`,
        description: `Đơn đang pha ${formatOrderDuration(getOrderMinutes(order))}`,
        time: 'Nhắc nhở',
      }))

    return [...orderItems, ...stockItems, ...reminderItems]
  }, [orders, workspace.lowStock])

  const handleLogout = async () => {
    const confirmed = await confirm({
      body: 'Bạn có chắc muốn đăng xuất khỏi trang pha chế?',
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
        role: user.role || 'Pha chế',
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

  const runOrderAction = async (action, successMessage, { keepDetailOpen = false } = {}) => {
    void successMessage
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const data = await action()
      if (keepDetailOpen && data?.order) {
        setCurrentSelectedOrder(data.order)
        // Cập nhật ngay trong danh sách để không chờ polling
        setOrders((current) => current.map((o) => (o.id === data.order.id ? { ...o, ...data.order } : o)))
      }
      await loadOrders()
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setSaving(false)
    }
  }

  const openOrderDetail = async (order) => {
    setError('')
    setMessage('')

    try {
      const data = await getBaristaOrderById(order.id)
      setCurrentSelectedOrder(data.order)
    } catch (detailError) {
      setError(detailError.message)
    }
  }

  const closeOrderDetail = () => {
    setCurrentSelectedOrder(null)
  }

  const acceptOrder = async (order) => {
    const confirmed = await confirm({
      body: `Nhận pha chế ${getDisplayOrderNumber(order)}?`,
      confirmLabel: 'Tiếp tục',
    })
    if (!confirmed) return

    setTopReadNotificationIds((current) => {
      const next = new Set(current)
      next.add(`order-${order.id}`)
      saveReadNotificationIds(next)
      return next
    })

    runOrderAction(() => acceptBaristaOrder(order.id), 'Đã nhận đơn pha chế', {
      keepDetailOpen: selectedOrderRef.current?.id === order.id,
    })
  }

  const completeOrder = async (order) => {
    const confirmed = await confirm({
      body: `Xác nhận hoàn thành ${getDisplayOrderNumber(order)}?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    runOrderAction(() => completeBaristaOrder(order.id), 'Đã hoàn thành đơn và thông báo cho nhân viên', {
      keepDetailOpen: selectedOrderRef.current?.id === order.id,
    })
  }

  const isViewingToday = (orderDateFilter || formatDateInputValue()) === formatDateInputValue()

  const currentBaristaOrders = useMemo(() => {
    const today = formatDateInputValue()
    const isToday = (orderDateFilter || today) === today

    if (isToday) {
      // Đơn đang chờ/đang làm: luôn hiện dù tạo ngày nào (tránh bị ẩn khi ca đêm sang ngày mới)
      // Đơn đã xong/hủy: chỉ hiện của hôm nay
      return orders.filter((order) =>
        order.kitchenStatus === 'Waiting' ||
        order.kitchenStatus === 'InProgress' ||
        isOrderOnDate(order, today)
      )
    }
    // Ngày khác: dùng historyOrders từ backend
    return historyOrders
  }, [orderDateFilter, orders, historyOrders])

  const baristaStatusCounts = useMemo(
    () => ({
      all: currentBaristaOrders.length,
      cancelled: currentBaristaOrders.filter(isCancelledBaristaOrder).length,
      completed: currentBaristaOrders.filter(isCompletedBaristaOrder).length,
      inProgress: currentBaristaOrders.filter((order) => order.kitchenStatus === 'InProgress' && !isCancelledBaristaOrder(order)).length,
      waiting: currentBaristaOrders.filter((order) => order.kitchenStatus === 'Waiting' && !isCancelledBaristaOrder(order)).length,
    }),
    [currentBaristaOrders]
  )

  const currentFilteredOrders = useMemo(() => {
    const keyword = orderSearch.trim().toLowerCase()

    return currentBaristaOrders.filter((order) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'Waiting' && order.kitchenStatus === 'Waiting' && !isCancelledBaristaOrder(order)) ||
        (statusFilter === 'InProgress' && order.kitchenStatus === 'InProgress' && !isCancelledBaristaOrder(order)) ||
        (statusFilter === 'Completed' && isCompletedBaristaOrder(order)) ||
        (statusFilter === 'Cancelled' && isCancelledBaristaOrder(order))
      const matchesKeyword =
        !keyword ||
        [order.code, order.serviceNumber, order.tableName, order.areaName, order.customerName, order.note, order.kitchenStatus, order.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword)) ||
        (order.details || []).some((item) =>
          [item.productName, item.note].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword))
        )

      return matchesStatus && matchesKeyword
    })
  }, [currentBaristaOrders, orderSearch, statusFilter])
  const baristaOrderTotalPages = Math.max(1, Math.ceil(currentFilteredOrders.length / BARISTA_ORDERS_PER_PAGE))
  const paginatedBaristaOrders = currentFilteredOrders.slice((orderPage - 1) * BARISTA_ORDERS_PER_PAGE, orderPage * BARISTA_ORDERS_PER_PAGE)

  // Đổi ngày → luôn reset về "Tất cả" để tránh filter cũ che khuất dữ liệu
  useEffect(() => {
    setStatusFilter('all')
  }, [orderDateFilter])

  useEffect(() => {
    setOrderPage(1)
  }, [orderDateFilter, orderSearch, statusFilter])

  useEffect(() => {
    setOrderPage((page) => Math.min(page, baristaOrderTotalPages))
  }, [baristaOrderTotalPages])

  const getNotificationOrderId = (item) => {
    if (item.orderId) return item.orderId
    const parts = String(item.id || '').split('-')
    return parts[parts.length - 1]
  }

  const openNotificationOrder = (item) => {
    setReadNotificationIds((current) => {
      const next = new Set(current)
      next.add(item.id)
      return next
    })

    const orderId = getNotificationOrderId(item)
    const order = orders.find((candidate) => String(candidate.id) === String(orderId))
    if (order) {
      setActiveView('orders')
      openOrderDetail(order)
    }
  }

  const renderOrderItems = (order, { limit = null } = {}) => {
    const items = order.details || []
    const visibleItems = limit ? items.slice(0, limit) : items
    const hiddenCount = limit && items.length > limit ? items.length - limit : 0

    return (
      <div className="barista-ticket-items">
        {visibleItems.map((item) => (
          <div key={`${order.id}-${item.id}`}>
            <strong>
              <em>{item.quantity}x</em> {item.productName}
            </strong>
            {item.note && <span>{item.note}</span>}
          </div>
        ))}
        {hiddenCount > 0 && <div className="barista-ticket-more">+{hiddenCount} món khác. Bấm chi tiết để xem hết.</div>}
      </div>
    )
  }

  const renderOrdersView = () => (
    <>
      <div className="staff-orders-stats staff-shift-stats">
        <article>
          <ClipboardList aria-hidden="true" />
          <div>
            <span>Tổng đơn</span>
            <strong>{String(baristaStatusCounts.all).padStart(2, '0')}</strong>
          </div>
          <small>{isViewingToday ? 'Hôm nay' : 'Ngày đã chọn'}</small>
        </article>
        <article>
          <CheckCircle2 aria-hidden="true" />
          <div>
            <span>Hoàn thành</span>
            <strong>{String(baristaStatusCounts.completed).padStart(2, '0')}</strong>
          </div>
          <small>{isViewingToday ? 'Hôm nay' : 'Ngày đã chọn'}</small>
        </article>
      </div>

      <section className="barista-board">
        <div className="barista-board-header">
          <div className="barista-board-tools">
            <label className="staff-pos-search barista-search">
              <Search aria-hidden="true" />
              <input
                onChange={(event) => setOrderSearch(event.target.value)}
                placeholder="Tìm kiếm đơn..."
                type="search"
                value={orderSearch}
              />
            </label>
            <button className="barista-refresh-button" disabled={loading} onClick={loadOrders} title="Làm mới danh sách" type="button">
              <RefreshCw aria-hidden="true" />
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
            <label className="barista-date-filter">
              <input
                onChange={(event) => setOrderDateFilter(event.target.value || formatDateInputValue())}
                type="date"
                value={orderDateFilter}
              />
            </label>
            <div className="staff-category-row">
              {(isViewingToday
                ? [
                    ['all', `Tất cả (${baristaStatusCounts.all})`],
                    ['Waiting', `Đang chờ (${baristaStatusCounts.waiting})`],
                    ['InProgress', `Đang làm (${baristaStatusCounts.inProgress})`],
                    ['Completed', `Hoàn thành (${baristaStatusCounts.completed})`],
                    ['Cancelled', `Đã hủy (${baristaStatusCounts.cancelled})`],
                  ]
                : [
                    ['all', `Tất cả (${baristaStatusCounts.all})`],
                    ['Completed', `Hoàn thành (${baristaStatusCounts.completed})`],
                    ['Cancelled', `Đã hủy (${baristaStatusCounts.cancelled})`],
                  ]
              ).map(([value, label]) => (
                <button
                  className={statusFilter === value ? 'active' : ''}
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="barista-ticket-grid">
          {currentFilteredOrders.length === 0 ? (
            <div className="workstation-empty barista-empty">
              <CupSoda aria-hidden="true" />
              <strong>
                {(isViewingToday ? loading : historyLoading) ? 'Đang tải...' : 'Chưa có đơn pha chế'}
              </strong>
              <span>
                {isViewingToday
                  ? 'Nhân viên cần thanh toán đơn trước, rồi nhấn "Gửi pha chế" — đơn sẽ hiện ở đây.'
                  : 'Không có đơn nào cho ngày đã chọn.'}
              </span>
              {isViewingToday && !loading && (
                <button className="barista-refresh-button" onClick={loadOrders} style={{marginTop:8}} type="button">
                  <RefreshCw aria-hidden="true" />
                  Làm mới
                </button>
              )}
            </div>
          ) : (
            paginatedBaristaOrders.map((order) => (
              <article className={`barista-ticket ${getBaristaTicketClass(order)}`} key={order.id}>
                <div className="barista-ticket-head">
                  <div>
                    <span>{order.code || getDisplayOrderNumber(order)}</span>
                    <h3>{getBaristaOrderTitle(order)}</h3>
                  </div>
                  <small>{getBaristaStatusLabel(order)}</small>
                </div>

                <div className="barista-ticket-meta">
                  <span>
                    <Clock3 aria-hidden="true" />
                    {formatBaristaOrderDateTime(order)}
                  </span>
                  <strong>{order.details?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0} ly</strong>
                </div>

                <div className="barista-ticket-staff">
                  <span>Nhân viên order</span>
                  <strong>{getOrderStaffName(order)}</strong>
                  <small>{order.customerName || 'Khách lẻ'}</small>
                  <b>{formatCurrency(order.totalAmount)}</b>
                </div>

                <div className="barista-ticket-actions">
                  <button className="workstation-secondary" onClick={() => openOrderDetail(order)} type="button">
                    <span>Chi tiết</span>
                  </button>
                  {isCancelledBaristaOrder(order) ? (
                    <button className="workstation-primary" disabled type="button">Đã hủy</button>
                  ) : order.kitchenStatus === 'Completed' ? (
                    <button className="workstation-primary complete" disabled type="button">Hoàn thành</button>
                  ) : order.kitchenStatus === 'InProgress' ? (
                    <button className="workstation-primary complete" disabled={saving} onClick={() => completeOrder(order)} type="button">
                      Hoàn thành
                    </button>
                  ) : (
                    <button className="workstation-primary" disabled={saving || order.kitchenStatus !== 'Waiting'} onClick={() => acceptOrder(order)} type="button">
                      Nhận đơn
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        {currentFilteredOrders.length > 0 && (
          <footer className="staff-order-pagination barista-order-pagination">
            <span>
              Hiển thị {paginatedBaristaOrders.length} trên {currentFilteredOrders.length} đơn
            </span>
            <div>
              <button
                aria-label="Trang trước"
                disabled={orderPage <= 1}
                onClick={() => setOrderPage((page) => Math.max(page - 1, 1))}
                type="button"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <strong>
                {orderPage}/{baristaOrderTotalPages}
              </strong>
              <button
                aria-label="Trang sau"
                disabled={orderPage >= baristaOrderTotalPages}
                onClick={() => setOrderPage((page) => Math.min(page + 1, baristaOrderTotalPages))}
                type="button"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </footer>
        )}

      </section>
    </>
  )

  const renderRecipesView = () => (
    <section className="barista-board barista-data-board">
      <div className="barista-board-header">
        <div className="barista-board-tools">
          <label className="staff-pos-search barista-search">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setRecipeSearch(event.target.value)}
              placeholder="Tìm công thức theo tên món, nguyên liệu..."
              type="search"
              value={recipeSearch}
            />
          </label>
        </div>
      </div>

      <div className="barista-recipe-grid">
        {filteredRecipes.length === 0 ? (
          <div className="workstation-empty barista-empty">
            <BookOpen aria-hidden="true" />
            <strong>{workspaceLoading ? 'Đang tải công thức...' : 'Không có công thức phù hợp'}</strong>
            <span>Công thức món được Admin cấu hình trong quản lý kho.</span>
          </div>
        ) : (
          filteredRecipes.map((product) => (
            <article className="barista-recipe-card" key={product.id}>
              <header>
                <div>
                  <span>{product.categoryName || 'Menu'}</span>
                  <h3>{product.name}</h3>
                </div>
                <small>{product.ingredients.length} nguyên liệu</small>
              </header>
              {product.description && <p>{product.description}</p>}
              <button className="workstation-secondary barista-recipe-detail-button" onClick={() => setSelectedRecipe(product)} type="button">
                Xem chi tiết công thức
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  )

  const renderStockView = () => (
    <section className="barista-board barista-data-board">
      <div className="barista-board-header">
        <div className="barista-board-tools">
          <label className="staff-pos-search barista-search">
            <Search aria-hidden="true" />
            <input onChange={(event) => setStockSearch(event.target.value)} placeholder="Tìm nguyên liệu, nhà cung cấp..." type="search" value={stockSearch} />
          </label>
          <button className="barista-refresh-button" onClick={loadWorkspace} type="button">
            <RefreshCw aria-hidden="true" />
            Làm mới
          </button>
        </div>
      </div>

      <section className="barista-stock-alerts">
        <h2>Cảnh báo nguyên liệu sắp hết</h2>
        {workspace.lowStock.filter((ingredient) => !isDemoIngredient(ingredient)).length > 0 ? (
          <div>
            {workspace.lowStock.filter((ingredient) => !isDemoIngredient(ingredient)).map((ingredient) => (
              <article key={ingredient.id}>
                <AlertTriangle aria-hidden="true" />
                <strong>{ingredient.name}</strong>
                <span>
                  Còn {ingredient.currentStock} {ingredient.unit} / tối thiểu {ingredient.minStock} {ingredient.unit}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p>Không có nguyên liệu dưới mức tối thiểu.</p>
        )}
      </section>

      <div className="barista-stock-table">
        {filteredIngredients.filter((ingredient) => !isDemoIngredient(ingredient)).map((ingredient) => {
          const isLow = Number(ingredient.currentStock || 0) <= Number(ingredient.minStock || 0)

          return (
            <article className={isLow ? 'low' : ''} key={ingredient.id}>
              <div>
                <strong>{ingredient.name}</strong>
                <span>{ingredient.supplierName || 'Chưa có nhà cung cấp'}</span>
              </div>
              <b>
                {ingredient.currentStock} {ingredient.unit}
              </b>
              <small>Tối thiểu {ingredient.minStock}</small>
            </article>
          )
        })}
      </div>
    </section>
  )

  const renderNotificationsView = () => (
    <section className="barista-board barista-data-board barista-notifications-board">
      <div className="barista-board-header">
        <div className="barista-board-tools">
          <div className="workstation-section-title">
            <h2>Thông báo pha chế</h2>
            <span>Đơn mới, cảnh báo kho và nhắc nhở xử lý đơn</span>
          </div>
        </div>
      </div>

      <div className="barista-notification-list">
        {notificationItems.length > 0 ? (
          notificationItems.map((item) => {
            const isRead = readNotificationIds.has(item.id)

            return (
            <article
              className={`${item.tone} ${isRead ? 'read' : 'unread'}`}
              key={item.id}
              onClick={() => openNotificationOrder(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openNotificationOrder(item)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <Bell aria-hidden="true" />
              <div>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
              <small>{item.time}</small>
              {!isRead && <i aria-hidden="true" />}
            </article>
            )
          })
        ) : (
          <div className="workstation-empty barista-empty">
            <Bell aria-hidden="true" />
            <strong>Chưa có thông báo</strong>
            <span>Thông báo sẽ xuất hiện khi có đơn mới hoặc nguyên liệu sắp hết.</span>
          </div>
        )}
      </div>
    </section>
  )

  const renderActiveView = () => {
    if (activeView === 'recipes') return renderRecipesView()
    if (activeView === 'notifications') return renderNotificationsView()

    return renderOrdersView()
  }

  const renderProfileModal = () => {
    if (!profileModalOpen) return null

    return (
      <div className="staff-payment-backdrop" role="dialog" aria-modal="true" aria-labelledby="barista-profile-title">
        <form className="staff-payment-modal staff-profile-modal" onSubmit={handleSaveProfile}>
          <header className="staff-payment-modal-head">
            <h2 id="barista-profile-title">{profileMode === 'password' ? 'Đổi mật khẩu' : 'Hồ sơ cá nhân'}</h2>
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

  return (
    <main className="workstation-page barista-page">
      <aside className="workstation-sidebar">
        <div className="workstation-brand">
          <Coffee aria-hidden="true" />
          <div>
            <strong>Mơ Coffee</strong>
            <span>Pha chế</span>
          </div>
        </div>

        <nav className="barista-side-nav" aria-label="Điều hướng pha chế">
          <button className={activeView === 'orders' ? 'active' : ''} onClick={() => { setActiveView('orders'); window.location.hash = 'barista/orders' }} type="button">
            <CupSoda aria-hidden="true" />
            <span>Đơn pha chế</span>
          </button>
          <button className={activeView === 'recipes' ? 'active' : ''} onClick={() => { setActiveView('recipes'); window.location.hash = 'barista/recipes' }} type="button">
            <BookOpen aria-hidden="true" />
            <span>Công thức</span>
          </button>
        </nav>

        <button className="workstation-logout" onClick={handleLogout} type="button">
          <LogOut aria-hidden="true" />
          <span>Đăng xuất</span>
        </button>
      </aside>

      <section className="workstation-main">
        <header className="workstation-header">
          <div>
            <h1>{pageHeading.title}</h1>
          </div>
          <div className="barista-header-actions">
            <button className="staff-notification-button" onClick={() => setTopNotificationPanelOpen((open) => !open)} type="button" aria-label="Thông báo">
              <Bell aria-hidden="true" />
              {notificationItems.filter((item) => !topReadNotificationIds.has(item.id)).length > 0 && (
                <span>{notificationItems.filter((item) => !topReadNotificationIds.has(item.id)).length}</span>
              )}
            </button>
            <button className="barista-user-chip" onClick={openProfileModal} type="button">
              <div>
                <strong>{user.fullName || user.username || 'Pha chế'}</strong>
                <span>{formatAssignedShift(user.shiftAssignment)}</span>
              </div>
              <div className="barista-avatar">
                <UserRound aria-hidden="true" />
              </div>
            </button>
          </div>
          {topNotificationPanelOpen && (
            <div className="barista-top-notification-panel">
              {notificationItems.length > 0 ? (
                notificationItems.map((item) => {
                  const isRead = topReadNotificationIds.has(item.id)

                  return (
                    <button
                      className={isRead ? 'read' : 'unread'}
                      key={item.id}
                      onClick={() => {
                        setTopReadNotificationIds((current) => {
                          const next = new Set(current)
                          next.add(item.id)
                          saveReadNotificationIds(next)
                          return next
                        })
                        setTopNotificationPanelOpen(false)
                        const orderId = getNotificationOrderId(item)
                        const order = orders.find((candidate) => String(candidate.id) === String(orderId))
                        if (order) openOrderDetail(order)
                      }}
                      type="button"
                    >
                      <Bell aria-hidden="true" />
                      <span>
                        <strong>{item.title}</strong>
                        <small>Đơn mới - bấm để xem đơn</small>
                      </span>
                      <em>{item.time}</em>
                      {!isRead && <i aria-hidden="true" />}
                    </button>
                  )
                })
              ) : (
                <p>Chưa có thông báo</p>
              )}
            </div>
          )}
        </header>

        {error && <div className="workstation-alert workstation-alert-error">{error}</div>}
        {message && <div className="workstation-alert">{message}</div>}

        {renderActiveView()}

        {selectedOrder && (
          <div className="barista-detail-backdrop" role="presentation" onClick={closeOrderDetail}>
            <section className="barista-detail-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="barista-detail-title">
              <div className="barista-detail-head">
                <div className="workstation-section-title">
                  <h2 id="barista-detail-title">Chi tiết đơn pha chế</h2>
                  <span>{selectedOrder.code || getDisplayOrderNumber(selectedOrder)}</span>
                </div>
                <button className="barista-detail-close" onClick={closeOrderDetail} type="button" aria-label="Đóng">
                  ×
                </button>
              </div>

              <div className="barista-detail">
                <div className="workstation-summary">
                  <div>
                    <span>Mã đơn</span>
                    <strong>{selectedOrder.code || getDisplayOrderNumber(selectedOrder)}</strong>
                  </div>
                  <div>
                    <span>Hình thức</span>
                    <strong>{getBaristaOrderTitle(selectedOrder)}</strong>
                  </div>
                  <div>
                    <span>Khu vực / bàn</span>
                    <strong>{getOrderPlace(selectedOrder)}</strong>
                  </div>
                  <div>
                    <span>Nhân viên order</span>
                    <strong>{getOrderStaffName(selectedOrder)}</strong>
                  </div>
                  <div>
                    <span>Trạng thái</span>
                    <strong>{statusLabels[selectedOrder.kitchenStatus] || selectedOrder.kitchenStatus}</strong>
                  </div>
                  <div>
                    <span>Ghi chú</span>
                    <strong>{selectedOrder.note || 'Không có'}</strong>
                  </div>
                </div>

                <div className="barista-detail-items">{renderOrderItems(selectedOrder)}</div>

                <div className="barista-ticket-actions">
                  <button className="workstation-secondary" disabled={saving || selectedOrder.kitchenStatus !== 'Waiting'} onClick={() => acceptOrder(selectedOrder)} type="button">
                    Nhận đơn
                  </button>
                  <button className="workstation-primary" disabled={saving || selectedOrder.kitchenStatus !== 'InProgress'} onClick={() => completeOrder(selectedOrder)} type="button">
                    Xác nhận hoàn thành
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {selectedRecipe && (
          <div className="barista-detail-backdrop" role="presentation" onClick={() => setSelectedRecipe(null)}>
            <section className="barista-detail-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="barista-recipe-detail-title">
              <button className="barista-detail-close barista-recipe-floating-close" onClick={() => setSelectedRecipe(null)} type="button" aria-label="Đóng">
                ×
              </button>
              <div className="barista-detail">
                <article className="barista-recipe-card barista-recipe-detail-summary">
                  <header>
                    <div>
                      <span>{selectedRecipe.categoryName || 'Menu'}</span>
                      <h3>{selectedRecipe.name}</h3>
                    </div>
                    <small>{selectedRecipe.ingredients.length} nguyên liệu</small>
                  </header>
                  {selectedRecipe.description && <p>{selectedRecipe.description}</p>}
                  <div className="barista-detail-items barista-recipe-items">
                    {selectedRecipe.ingredients.length > 0 ? (
                      selectedRecipe.ingredients.map((item) => (
                        <div key={item.id}>
                          <strong>{item.ingredientName}</strong>
                          <span>
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div>
                        <strong>Chưa có công thức</strong>
                        <span>Liên hệ Admin để bổ sung định lượng.</span>
                      </div>
                    )}
                  </div>
                </article>
              </div>
            </section>
          </div>
        )}

        {renderProfileModal()}
      </section>
    </main>
  )
}

export default Barista
