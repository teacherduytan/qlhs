import { ResponsiveDemo } from './components/ResponsiveDemo'

function App() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:max-w-2xl lg:max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        QLHS — Lớp 11C5
      </h1>
      <p className="mt-2 text-slate-600">Ứng dụng quản lý học sinh đang được xây dựng.</p>
      <div className="mt-6">
        <ResponsiveDemo />
      </div>
    </main>
  )
}

export default App
