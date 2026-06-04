import {
  ChevronDown,
  Clock,
  Coffee,
  Contact,
  Heart,
  Leaf,
  Mail,
  MapPin,
  Menu,
  Phone,
  Star,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import './Home.css'

const links = [
  { label: 'Trang chủ', href: '#hero' },
  { label: 'Về chúng tôi', href: '#about' },
  { label: 'Thực đơn', href: '#menu' },
  { label: 'Không gian', href: '#gallery' },
  { label: 'Đánh giá', href: '#testimonials' },
  { label: 'Liên hệ', href: '#contact' },
]

const features = [
  {
    icon: Heart,
    title: 'Đam Mê',
    text: 'Mỗi tách cà phê được pha chế với tình yêu và sự tận tâm.',
  },
  {
    icon: Leaf,
    title: 'Nguyên Liệu Sạch',
    text: 'Hạt cà phê được chọn lọc từ những vùng trồng tốt nhất Việt Nam.',
  },
  {
    icon: Clock,
    title: 'Không Gian Thư Giãn',
    text: 'Nơi bạn có thể dừng lại, hít thở và tận hưởng khoảnh khắc.',
  },
]

const menuItems = [
  {
    name: 'Caramel Macchiato',
    price: '30.000đ',
    text: 'Espresso đậm đà hòa quyện cùng sữa tươi và caramel thơm ngọt.',
    image:
      'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Cà Phê Sữa Đá',
    price: '25.000đ',
    text: 'Cà phê phin truyền thống Việt Nam với sữa đặc béo ngậy.',
    image:
      'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Matcha Latte',
    price: '35.000đ',
    text: 'Matcha Nhật Bản cao cấp kết hợp sữa tươi mềm mịn.',
    image:
      'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
]

const gallery = [
  {
    title: 'Không Gian Ấm Cúng',
    alt: 'Không gian bên trong quán',
    image:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1300&q=85',
  },
  {
    title: 'Sân Vườn Xanh Mát',
    alt: 'Sân vườn ngoài trời',
    image:
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1300&q=85',
  },
]

const testimonials = [
  {
    name: 'Nguyễn Minh Anh',
    role: 'Freelancer',
    initials: 'MA',
    quote:
      'Không gian yên tĩnh, cà phê ngon, wifi mạnh - nơi hoàn hảo để làm việc. Mình đến đây gần như mỗi ngày!',
  },
  {
    name: 'Trần Đức Huy',
    role: 'Nhiếp ảnh gia',
    initials: 'DH',
    quote:
      'Ánh sáng tự nhiên tuyệt đẹp, mỗi góc đều có thể chụp ảnh. Cà phê sữa đá ở đây là số một!',
  },
  {
    name: 'Lê Thị Hồng Nhung',
    role: 'Sinh viên',
    initials: 'HN',
    quote:
      'Giá cả hợp lý, nhân viên thân thiện. Matcha Latte ở đây mình chưa thấy quán nào ngon hơn.',
  },
]

const contactItems = [
  {
    icon: MapPin,
    label: 'Địa chỉ',
    value: '238 Hoàng Thị Loan, Phường Kon Tum',
  },
  {
    icon: Phone,
    label: 'Điện thoại',
    value: '038 3642 945',
  },
  {
    icon: Clock,
    label: 'Giờ mở cửa',
    value: '7:00 - 22:00 (Thứ 2 - Chủ nhật)',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@mo.cafe',
  },
]

function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll)

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const revealItems = Array.from(
      document.querySelectorAll(
        [
          '.mo-section-heading',
          '.mo-feature-card',
          '.mo-menu-card',
          '.mo-gallery-card',
          '.mo-testimonial-card',
          '.mo-contact-item',
          '.mo-map-card',
          '.mo-footer-brand',
          '.mo-footer-col',
          '.mo-footer-bottom',
        ].join(', ')
      )
    )

    revealItems.forEach((item, index) => {
      item.classList.add('mo-reveal')
      item.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 90}ms`)
    })

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('mo-reveal-visible'))
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('mo-reveal-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.16 }
    )

    revealItems.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [])

  const handleNavClick = (href) => {
    setMobileOpen(false)
    if (href === '#hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const element = document.querySelector(href)
    if (element) {
      const navbar = document.querySelector('.mo-navbar')
      const offset = navbar ? navbar.offsetHeight : 0
      const targetTop = element.getBoundingClientRect().top + window.scrollY - offset

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: 'smooth',
      })
    }
  }

  return (
    <main className="mo-home">
      <nav className={`mo-navbar ${scrolled || mobileOpen ? 'mo-navbar-solid' : ''}`}>
        <div className="mo-navbar-inner">
          <button className="mo-brand" onClick={() => handleNavClick('#hero')} type="button">
            <Coffee aria-hidden="true" />
            <span>Mơ Coffee</span>
          </button>

          <div className="mo-nav-links">
            {links.map((link) => (
              <button key={link.href} onClick={() => handleNavClick(link.href)} type="button">
                {link.label}
              </button>
            ))}
          </div>

          <a className="mo-login-button" href="#login">
            <Contact aria-hidden="true" />
            <span>Đăng nhập</span>
          </a>

          <button
            className="mo-menu-button"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setMobileOpen((open) => !open)}
            type="button"
          >
            {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="mo-mobile-menu">
            {links.map((link) => (
              <button key={link.href} onClick={() => handleNavClick(link.href)} type="button">
                {link.label}
              </button>
            ))}
            <a className="mo-mobile-login" href="#login" onClick={() => setMobileOpen(false)}>
              <Contact aria-hidden="true" />
              <span>Đăng nhập</span>
            </a>
          </div>
        )}
      </nav>

      <section className="mo-hero" id="hero">
        <div className="mo-hero-bg" />
        <div className="mo-hero-overlay" />
        <div className="mo-hero-content">
          <p className="mo-eyebrow">Est. 2026 · Kon Tum</p>
          <h1>
            Cà Phê & Tea
            <span>Mơ Coffee</span>
          </h1>
          <p className="mo-hero-subtitle">
            Nơi mỗi tách cà phê là một câu chuyện, mỗi góc nhỏ là một khoảng lặng.
          </p>
          <button className="mo-primary-button" onClick={() => handleNavClick('#menu')} type="button">
            Khám Phá Thực Đơn
          </button>
        </div>
        <button className="mo-scroll-button" onClick={() => handleNavClick('#about')} type="button">
          <ChevronDown aria-hidden="true" />
        </button>
      </section>

      <section className="mo-section mo-about" id="about">
        <div className="mo-container">
          <div className="mo-section-heading">
            <p>Câu chuyện của chúng tôi</p>
            <h2>Về Mơ Coffee</h2>
            <span>
              Mơ Coffee ra đời từ tình yêu dành cho cà phê Việt Nam. Chúng tôi tin rằng một tách
              cà phê ngon không chỉ nằm ở hương vị, mà còn ở không gian, ở cảm xúc và ở những
              khoảnh khắc bình yên mà nó mang lại.
            </span>
          </div>

          <div className="mo-feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <article className="mo-feature-card" key={feature.title}>
                  <div className="mo-icon-badge">
                    <Icon aria-hidden="true" />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mo-section mo-menu" id="menu">
        <div className="mo-container">
          <div className="mo-section-heading mo-heading-light">
            <p>Đặc biệt</p>
            <h2>Thực Đơn Nổi Bật</h2>
            <span>Những thức uống signature được yêu thích nhất tại Mơ Coffee.</span>
          </div>

          <div className="mo-menu-grid">
            {menuItems.map((item) => (
              <article className="mo-menu-card" key={item.name}>
                <div className="mo-menu-image">
                  <img alt={item.name} src={item.image} />
                </div>
                <div className="mo-menu-body">
                  <div className="mo-menu-title">
                    <h3>{item.name}</h3>
                    <strong>{item.price}</strong>
                  </div>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mo-section mo-gallery" id="gallery">
        <div className="mo-container">
          <div className="mo-section-heading">
            <p>Khám phá</p>
            <h2>Không Gian Của Chúng Tôi</h2>
            <span>Mỗi góc nhỏ đều được thiết kế để bạn cảm thấy như đang ở nhà.</span>
          </div>

          <div className="mo-gallery-grid">
            {gallery.map((image) => (
              <article className="mo-gallery-card" key={image.title}>
                <img alt={image.alt} src={image.image} />
                <div className="mo-gallery-caption">
                  <h3>{image.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mo-section mo-testimonials" id="testimonials">
        <div className="mo-container">
          <div className="mo-section-heading mo-heading-light">
            <p>Khách hàng nói gì</p>
            <h2>Đánh Giá</h2>
          </div>

          <div className="mo-testimonial-grid">
            {testimonials.map((testimonial) => (
              <article className="mo-testimonial-card" key={testimonial.name}>
                <div className="mo-stars" aria-label="5 sao">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star aria-hidden="true" key={index} />
                  ))}
                </div>
                <p>“{testimonial.quote}”</p>
                <div className="mo-customer">
                  <span>{testimonial.initials}</span>
                  <div>
                    <strong>{testimonial.name}</strong>
                    <small>{testimonial.role}</small>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mo-section mo-contact" id="contact">
        <div className="mo-container">
          <div className="mo-section-heading">
            <p>Ghé thăm chúng tôi</p>
            <h2>Liên Hệ</h2>
            <span>Chúng tôi luôn sẵn sàng chào đón bạn.</span>
          </div>

          <div className="mo-contact-grid">
            <div className="mo-contact-info">
              {contactItems.map((item) => {
                const Icon = item.icon

                return (
                  <div className="mo-contact-item" key={item.label}>
                    <div className="mo-contact-icon">
                      <Icon aria-hidden="true" />
                    </div>
                    <div>
                      <small>{item.label}</small>
                      <p>{item.value}</p>
                    </div>
                  </div>
                )
              })}

            </div>

            <div className="mo-map-card">
              
              <img alt="Vị trí cửa hàng" src="/images/bando.png" />
            </div>
          </div>
        </div>

      </section>

      <footer className="mo-footer">
        <div className="mo-container">
          <div className="mo-footer-main">
            <div className="mo-footer-brand">
              <div>
                <Coffee aria-hidden="true" />
                <span>Mơ Coffee</span>
              </div>
              <p>
                Không gian cà phê ấm cúng giữa Sài Gòn, nơi mỗi tách cà phê giữ lại một
                khoảng lặng dễ chịu.
              </p>
            </div>

            <div className="mo-footer-col">
              <h3>Điều hướng</h3>
              {links.map((link) => (
                <button key={link.href} onClick={() => handleNavClick(link.href)} type="button">
                  {link.label}
                </button>
              ))}
            </div>

            <div className="mo-footer-col">
              <h3>Liên hệ</h3>
              <p>238 Hoàng Thị Loan, Phường Kon Tum</p>
              <p>038 3642 945</p>
              <p>hello@mo.cafe</p>
            </div>

            <div className="mo-footer-col">
              <h3>Giờ mở cửa</h3>
              <p>Thứ 2 - Chủ nhật</p>
              <p>7:00 - 22:00</p>
              
            </div>
          </div>

          <div className="mo-footer-bottom">
            <p>© 2026 Cà Phê Mơ. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default Home
