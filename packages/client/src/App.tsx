import AppRoutes from './app/routes'
import Header from './components/Header'

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <AppRoutes />
      </main>
    </div>
  )
}

export default App
