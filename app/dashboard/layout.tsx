import { signOut } from './actions'
import { MEDIAFORCE_LOGO_BASE64 } from '@/lib/logo'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-grey flex flex-col">
      {/* Navbar */}
      <header className="bg-navy shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MEDIAFORCE_LOGO_BASE64} alt="Mediaforce" style={{ height: '32px', width: 'auto' }} className="shrink-0" />

          {/* Centre title */}
          <span className="text-[#bdd5f0] text-sm font-medium tracking-wide uppercase hidden sm:block">
            Reporting Dashboard
          </span>

          {/* Logout */}
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-[#bdd5f0] hover:text-white border border-[#4a82c4] hover:border-white px-4 py-1.5 rounded-lg transition shrink-0"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
