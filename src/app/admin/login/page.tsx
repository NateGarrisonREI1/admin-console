import LoginForm from "./LoginForm";


export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xl font-bold">REI Admin Login</div>
        <div className="mt-1 text-sm text-slate-600">
          Sign in to access the admin console.
        </div>

        <div className="mt-5">
          <LoginForm />
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Dev allowlist: <span className="font-mono">admin_users</span>
        </div>
      </div>
    </div>
  );
}
