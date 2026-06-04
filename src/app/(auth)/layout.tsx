export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-apex-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-apex-red rounded-2xl mb-4 shadow-lg shadow-apex-red/30">
            <span className="text-white font-bold text-3xl tracking-tight">A</span>
          </div>
          <h1 className="text-3xl font-bold tracking-widest text-white">APEX</h1>
          <p className="text-apex-muted text-sm mt-1 tracking-wider uppercase">SimRacing Community</p>
        </div>
        {children}
      </div>
    </div>
  )
}
