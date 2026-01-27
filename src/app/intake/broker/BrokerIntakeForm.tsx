"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitBrokerIntake } from "./actions";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type ServiceKey = "leaf_snapshot" | "inspection" | "hes_report";

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={cx(
        "mt-2 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white",
        "bg-emerald-600 hover:bg-emerald-700",
        "shadow-[0_12px_28px_rgba(67,164,25,0.28)]",
        "disabled:cursor-not-allowed disabled:opacity-60"
      )}
    >
      {pending ? "Submitting…" : "Submit request"}
    </button>
  );
}

export default function BrokerIntakeForm() {
  const [services, setServices] = useState<Record<ServiceKey, boolean>>({
    leaf_snapshot: false,
    inspection: false,
    hes_report: false,
  });

  const selectedCount = useMemo(
    () => Object.values(services).filter(Boolean).length,
    [services]
  );

  function toggle(k: ServiceKey) {
    setServices((s) => ({ ...s, [k]: !s[k] }));
  }

  const pillBase =
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition select-none";
  const pillOn =
    "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-[0_10px_24px_rgba(67,164,25,0.12)]";
  const pillOff = "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50";

  const input =
    "rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200";

  return (
    <form
      action={submitBrokerIntake}
      encType="multipart/form-data"
      className="space-y-6"
    >
      {/* honeypot */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
      />

      {/* Services */}
      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <div className="text-sm font-semibold text-zinc-900">What do you need?</div>
        <p className="mt-1 text-xs text-zinc-600">
          Select one or more services. We’ll follow up with scheduling or next steps.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggle("leaf_snapshot")}
            className={cx(pillBase, services.leaf_snapshot ? pillOn : pillOff)}
          >
            <span
              className={cx(
                "h-2.5 w-2.5 rounded-full",
                services.leaf_snapshot ? "bg-emerald-600" : "bg-zinc-300"
              )}
            />
            LEAF Snapshot
          </button>

          <button
            type="button"
            onClick={() => toggle("inspection")}
            className={cx(pillBase, services.inspection ? pillOn : pillOff)}
          >
            <span
              className={cx(
                "h-2.5 w-2.5 rounded-full",
                services.inspection ? "bg-emerald-600" : "bg-zinc-300"
              )}
            />
            Inspection
          </button>

          <button
            type="button"
            onClick={() => toggle("hes_report")}
            className={cx(pillBase, services.hes_report ? pillOn : pillOff)}
          >
            <span
              className={cx(
                "h-2.5 w-2.5 rounded-full",
                services.hes_report ? "bg-emerald-600" : "bg-zinc-300"
              )}
            />
            HES Report
          </button>
        </div>

        {/* hidden inputs for server action */}
        <input
          type="hidden"
          name="want_snapshot"
          value={services.leaf_snapshot ? "1" : "0"}
        />
        <input
          type="hidden"
          name="want_inspection"
          value={services.inspection ? "1" : "0"}
        />
        <input
          type="hidden"
          name="want_hes"
          value={services.hes_report ? "1" : "0"}
        />

        {selectedCount === 0 && (
          <div className="mt-3 text-xs font-medium text-zinc-900">
            Select at least one service to continue.
          </div>
        )}
      </section>

      {/* Property */}
      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <div className="text-sm font-semibold text-zinc-900">Property address</div>

        <div className="mt-4 space-y-3">
          <input name="address1" placeholder="Street address" className={cx("w-full", input)} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input name="city" placeholder="City" className={input} />
            <input name="state" placeholder="State" className={input} />
            <input name="zip" placeholder="ZIP" className={input} />
          </div>
        </div>
      </section>

      {/* Files */}
      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <div className="text-sm font-semibold text-zinc-900">
          Upload documents (optional)
        </div>
        <p className="mt-1 text-xs text-zinc-600">
          Listing packet, disclosures, inspection report, floor plan—anything helpful.
        </p>

        <input
          type="file"
          name="files"
          multiple
          className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm"
        />

        <p className="mt-2 text-xs text-zinc-500">
          Tip: PDFs work best. If upload fails, submit anyway and email the docs later.
        </p>
      </section>

      {/* Broker */}
      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <div className="text-sm font-semibold text-zinc-900">Broker information</div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input name="broker_name" placeholder="Your full name" className={input} />
          <input name="broker_email" placeholder="Email" className={input} />
          <input name="broker_phone" placeholder="Phone" className={input} />
          <input name="brokerage" placeholder="Brokerage (optional)" className={input} />
        </div>
      </section>

      {/* Client */}
      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <div className="text-sm font-semibold text-zinc-900">Client / homeowner</div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input name="client_name" placeholder="Client name" className={input} />
          <input name="client_email" placeholder="Client email (optional)" className={input} />
          <input name="client_phone" placeholder="Client phone (optional)" className={input} />
        </div>
      </section>

      {/* Timeline + notes */}
      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <div className="text-sm font-semibold text-zinc-900">Timeline + notes</div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="needed_by"
            placeholder="Needed by (optional) — e.g., Jan 15"
            className={input}
          />
          <select name="listing_status" className={input} defaultValue="">
            <option value="" disabled>
              Listing status (optional)
            </option>
            <option value="pre_listing">Pre-listing</option>
            <option value="active">Active listing</option>
            <option value="pending">Pending</option>
            <option value="other">Other</option>
          </select>
        </div>

        <textarea
          name="notes"
          placeholder="Anything we should know? Access notes, timing, goals, etc."
          className={cx("mt-3 h-28 w-full resize-none", input)}
        />
      </section>

      <SubmitBtn disabled={selectedCount === 0} />

      <p className="text-center text-xs text-zinc-500">
        We’ll confirm next steps by email/text.
      </p>
    </form>
  );
}
