import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default function AdminResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xl font-bold">Reset password</div>
        <div className="mt-1 text-sm text-slate-600">
          Choose a new password for your admin account.
        </div>

        <div className="mt-5">
          <ResetPasswordForm />
        </div>

        <div className="mt-4 text-xs text-slate-500">
          If you didn’t request this, you can close this tab.
        </div>
      </div>
    </div>
  );
}
