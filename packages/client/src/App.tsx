function App() {
  return (
    <div className="min-h-screen bg-white">
      {/* Mobile-first responsive app shell */}
      <div className="container">
        <header className="py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-slate-900">
              Personal Finance Tracker
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Welcome!</span>
            </div>
          </div>
        </header>
        
        <main className="py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-slate-900 mb-4">
                Getting Started
              </h2>
              <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                Your foundation is set up with responsive design, 
                theme system, and folder structure ready for implementation.
              </p>
              
              {/* Responsive grid for next steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                <div className="p-6 border border-slate-200 rounded-lg bg-white shadow-sm">
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Authentication
                  </h3>
                  <p className="text-sm text-slate-600">
                    Login and registration system with JWT tokens
                  </p>
                </div>
                
                <div className="p-6 border border-slate-200 rounded-lg bg-white shadow-sm">
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Categories
                  </h3>
                  <p className="text-sm text-slate-600">
                    Manage income and expense categories
                  </p>
                </div>
                
                <div className="p-6 border border-slate-200 rounded-lg bg-white shadow-sm">
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Dashboard
                  </h3>
                  <p className="text-sm text-slate-600">
                    Financial overview with charts and insights
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
