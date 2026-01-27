import Link from "next/link";

export default function AppShell(props: { children: React.ReactNode; userEmail: string | null }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[#43a419]" />
            <Link href="/homeowner/dashboard" className="font-semibold text-slate-900">
              REI / LEAF Portal
            </Link>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="hidden sm:block text-slate-600">{props.userEmail}</div>
            <Link href="/logout" className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
              Logout
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">{props.children}</div>
    </div>
  );
}
