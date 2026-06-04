import AppRoutes from './routes/AppRoutes'
import { ConfirmProvider } from './components/common/ConfirmProvider'

function App() {
  return (
    <ConfirmProvider>
      <AppRoutes />
    </ConfirmProvider>
  )
}

export default App
