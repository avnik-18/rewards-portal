import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PrimaryNav from '@/components/organisms/primary-nav'
import HeaderActions from '@/components/organisms/header-actions'
import { MobileChipNav, MobileBottomBar } from '@/components/organisms/mobile-nav'
// globals.css is imported once in src/main.tsx — no duplicate here.

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-page-art">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="sticky top-2 z-20 mx-2.5 mt-2 rounded-[20px] border border-line bg-white/88 shadow-[0_4px_18px_rgba(10,31,68,0.07)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1560px] items-stretch gap-2 px-5 lg:px-10">
          <div className="mr-5 flex items-center gap-2.5">
            <Link
              to="/"
              aria-label="Go to dashboard"
              title="Go to dashboard"
              className="flex items-center gap-2.5 rounded-lg transition hover:opacity-80"
            >
              <img src="/emids-icon.png" alt="emids" width={36} height={36} className="h-9 w-9 object-contain" />
              <span className="text-[16px] font-extrabold tracking-tight text-navy">
                EMIDS <span className="hidden font-bold text-muted sm:inline">· Rewards and Recognition</span>
              </span>
            </Link>
          </div>

          <PrimaryNav />

          <HeaderActions />
        </div>

        {/* Mobile secondary nav row — chips, ditto old (hidden on lg+) */}
        <MobileChipNav />
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto mt-2 max-w-[1560px] px-5 pb-28 pt-3 lg:px-10 lg:pb-16">
        {children}
      </main>

      <footer className="bg-[#0d0d12] pb-20 pt-8 text-white/85 lg:pb-0">
        <div className="mx-auto flex max-w-[1560px] flex-col items-center justify-center gap-3 px-5 py-5 text-center sm:px-10">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              aria-label="Go to dashboard"
              title="Go to dashboard"
              className="flex items-center gap-2 rounded-lg transition hover:opacity-80"
            >
              <img src="/emids-icon.png" alt="emids" width={24} height={24} className="h-6 w-6 object-contain" />
              <span className="text-[13px] font-extrabold tracking-tight text-white">
                EMIDS <span className="font-bold text-white/60">· Rewards and Recognition</span>
              </span>
            </Link>
          </div>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] font-semibold"
            aria-label="Brand"
          >
            <a
              href="https://www.emids.com/code-of-conduct/"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-white"
            >
              Code of Conduct
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <a
              href="https://www.emids.com/privacy-policy/"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-white"
            >
              Privacy Policy
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <a
              href="https://www.emids.com/cookie-policy/"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-white"
            >
              Cookie Policy
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <a
              href="https://www.emids.com/accessibility-statement/"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-white"
            >
              Accessibility Statement
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </nav>
        </div>
      </footer>

      {/* Mobile bottom bar: Home · gold Praise FAB · Rewards · My Team */}
      <MobileBottomBar />
    </div>
  )
}
