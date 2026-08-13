import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider } from './context/StoreContext'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { CartDrawer } from './components/CartDrawer'
import { ToastContainer } from './components/ui/ToastContainer'
import { HomePage } from './pages/HomePage'
import { CheckoutPage } from './pages/CheckoutPage'
import { PaymentPage } from './pages/PaymentPage'
import { TrackOrderPage } from './pages/TrackOrderPage'
import { InvoicePage } from './pages/InvoicePage'
import { PaymentMethodsPage } from './pages/PaymentMethodsPage'
import { AdminPage } from './pages/AdminPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <ScrollToTop />
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/pay/:orderId" element={<PaymentPage />} />
              <Route path="/track" element={<TrackOrderPage />} />
              <Route path="/track/:orderId" element={<TrackOrderPage />} />
              <Route path="/invoice/:orderId" element={<InvoicePage />} />
              <Route path="/payment-methods" element={<PaymentMethodsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <CartDrawer />
        <ToastContainer />
      </HashRouter>
    </StoreProvider>
  )
}