import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg-grey flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-border-blue px-8 py-10">
          <div className="text-center mb-8">
            <span className="text-3xl font-bold tracking-tight text-navy">
              Mediaforce
            </span>
            <p className="mt-1 text-sm text-gray-500 font-medium tracking-wide uppercase">
              Reporting Dashboard
            </p>
          </div>

          <div className="border-t border-border-blue mb-8" />

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Mediaforce. All rights reserved.
        </p>
      </div>
    </div>
  )
}
