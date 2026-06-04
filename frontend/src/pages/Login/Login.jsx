import { Coffee, Eye, EyeOff, Lock, User } from 'lucide-react'
import { useState } from 'react'
import { login as loginRequest } from '../../services/authService'
import { setAuthSession } from '../../utils/storage'
import './Login.css'

const getLoginErrorMessage = (loginError) => {
  const message = loginError?.message || ''

  if (message === 'Failed to fetch' || message === 'NetworkError when attempting to fetch resource.') {
    return 'Không thể kết nối đến server. Vui lòng thử lại sau.'
  }

  return message || 'Đăng nhập thất bại. Vui lòng thử lại.'
}

const getRoleRoute = (role = '') => {
  const normalizedRole = String(role).toLowerCase()

  if (normalizedRole === 'admin') return 'admin'
  if (normalizedRole.includes('pha')) return 'barista'
  return 'staff'
}

function Login() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const formData = new FormData(event.currentTarget)
    const username = formData.get('username')?.trim()
    const password = formData.get('password')

    if (!username) {
      setError('Vui lòng nhập username hoặc email')
      return
    }

    if (!password) {
      setError('Vui lòng nhập mật khẩu')
      return
    }

    setLoading(true)

    try {
      const data = await loginRequest({ password, username })

      setAuthSession({ token: data.token, user: data.user })
      window.location.hash = data.redirectTo || getRoleRoute(data.user.role)
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-background" aria-hidden="true">
        <div className="login-background-image" />
        <div className="login-background-overlay" />
      </div>

      <section className="login-shell" aria-label="Form đăng nhập">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-logo-mark" aria-label="Mơ Coffee">
              <Coffee aria-hidden="true" />
              <span>Mơ</span>
            </div>
            <h1>Chào mừng trở lại!</h1>
            <p>Đăng nhập để hệ thống tự ghi nhận giờ bắt đầu ca.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="username">Username hoặc email</label>
              <div className="login-input-wrap">
                <User aria-hidden="true" />
                <input id="username" name="username" placeholder="Username hoặc email" type="text" />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Mật khẩu</label>
              <div className="login-input-wrap">
                <Lock aria-hidden="true" />
                <input id="password" name="password" placeholder="Nhập mật khẩu" type={showPassword ? 'text' : 'password'} />
                <button
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="login-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && <p className="login-error">{error}</p>}

            <div className="login-actions login-actions-end">
              <a className="login-home-link" href="#home">
                Về trang chủ
              </a>
            </div>

            <button className="login-submit" disabled={loading} type="submit">
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="login-quote">Mỗi vai trò sẽ được chuyển đến giao diện làm việc riêng.</p>
        </div>
      </section>

      <div className="login-paper-texture" aria-hidden="true" />
    </main>
  )
}

export default Login
