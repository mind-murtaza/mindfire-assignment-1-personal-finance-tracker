import AppRoutes from './app/routes'

function App() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="container py-4">
          <h1 className="text-2xl font-semibold text-slate-900">Personal Finance Tracker</h1>
        </div>
      </header>
      <main>
        <AppRoutes />
      </main>
    </div>
  )
}

export default App
