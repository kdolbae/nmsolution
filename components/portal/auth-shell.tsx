import { Logo } from '@/components/brand'

/** 로그인·가입 화면 틀 */
export function AuthShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-background p-8 ring-1 ring-border">
        <Logo className="mb-8" />
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-kicker text-electric">Partner</p>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    </main>
  )
}
