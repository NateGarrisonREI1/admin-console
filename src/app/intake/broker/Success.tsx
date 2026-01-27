export default function Success({ code }: { code?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-xl">
      <h1 className="text-2xl font-semibold text-zinc-900">Request received</h1>
      <p className="mt-2 text-zinc-600">
        Thanks — we’ve received your request and will follow up shortly.
      </p>

      {code ? (
        <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-xs font-semibold text-emerald-900">Confirmation code</div>
          <div className="mt-1 text-lg font-mono text-emerald-900">{code}</div>
          <div className="mt-2 text-xs text-emerald-800">
            Save this code in case you need to reference your request.
          </div>
        </div>
      ) : null}

      <div className="mt-6 text-sm text-zinc-600">
        If you need to add documents, just reply to our follow-up email and we’ll attach them to your job.
      </div>
    </div>
  );
}
