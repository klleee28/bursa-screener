import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.72fr)]">
      <section className="relative hidden overflow-hidden border-r border-border bg-primary px-16 py-14 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="brand-lockup brand-lockup-inverse"><span className="brand-mark">B</span><span>Bursa Filter</span></div>
        <div className="max-w-xl">
          <h1 className="font-display text-6xl font-semibold leading-[0.95] tracking-[-0.035em]">Policy first.<br />Every session.</h1>
          <p className="mt-7 max-w-md text-base leading-7 text-primary-foreground/70">A private execution layer for a systematic Bursa Malaysia investment process.</p>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary-foreground/50">Private investment operations</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="brand-lockup mb-16 lg:hidden"><span className="brand-mark">B</span><span>Bursa Filter</span></div>
          <h2 className="font-display text-5xl font-semibold tracking-[-0.035em]">Welcome back</h2>
          <p className="mt-3 mb-10 text-sm leading-6 text-muted-foreground">Sign in to review today&apos;s policy-compliant universe.</p>
          <LoginForm />
          <p className="mt-8 text-xs leading-5 text-muted-foreground">Access is limited to the account configured in Supabase Auth.</p>
        </div>
      </section>
    </main>
  )
}
