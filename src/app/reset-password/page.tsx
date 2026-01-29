import Image from "next/image";
import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#04070a]">
      {/* Background glow (match login) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-72 left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/14 blur-[140px]" />
        <div className="absolute -bottom-72 right-1/4 h-[800px] w-[800px] rounded-full bg-cyan-600/14 blur-[140px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
        {/* Logo (exact match to login) */}
        <div className="mb-14 flex justify-center animate-fade-in-hero">
          <div className="-translate-x-[10px]">
            <Image
              src="/brand/Full colored logo. Black. PNG.png"
              alt="Renewable Energy Incentives"
              width={680}
              height={240}
              priority
              className="h-auto max-w-[94vw]"
            />
          </div>
        </div>

        {/* Minimal prompt (changed text) */}
        <div className="mb-6 text-center text-sm tracking-wide text-white/70 animate-fade-in-hero delay-1">
          Reset password
        </div>

        {/* Reset card (same shell as login card) */}
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-fade-in-hero delay-2">
          <ResetPasswordForm />

          <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
            <span>© {new Date().getFullYear()} REI</span>
            <a href="/login" className="font-semibold text-emerald-700 hover:underline">
              Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
