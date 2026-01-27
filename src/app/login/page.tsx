import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xl font-bold">REI Portal Login</div>
        <div className="mt-1 text-sm text-slate-600">
          Sign in to access your dashboard.
        </div>

        <div className="mt-5">
          <LoginForm />
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Admin? Use <span className="font-mono">/admin/login</span>
        </div>
      </div>
    </div>
  );
}
