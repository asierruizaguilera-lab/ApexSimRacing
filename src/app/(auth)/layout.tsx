export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-apex-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <img
            src="/logo-apex-completo.jpg"
            alt="APEX SimRacing"
            className="w-52 mx-auto rounded-xl block"
          />
        </div>
        {children}
      </div>
    </div>
  )
}
