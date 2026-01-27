"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type CustomerType = "homeowner" | "agent_broker" | "inspector" | "other";
type RequestedOutput = "leaf_snapshot" | "inspection" | "hes_report";

type FileKind =
  | "inspection"
  | "hes_report"
  | "system_photo"
  | "estimate"
  | "utility_bill"
  | "listing_packet"
  | "disclosure"
  | "other";

function upper2(v: string) {
  return v.trim().toUpperCase().slice(0, 2);
}

function labelCustomerType(t: CustomerType) {
  if (t === "homeowner") return "Homeowner";
  if (t === "agent_broker") return "Agent / Broker";
  if (t === "inspector") return "Inspector";
  return "Other";
}

function labelFileKind(k: FileKind) {
  if (k === "inspection") return "Inspection report";
  if (k === "hes_report") return "HES report";
  if (k === "system_photo") return "System photo(s)";
  if (k === "estimate") return "Estimate / proposal";
  if (k === "utility_bill") return "Utility bill";
  if (k === "listing_packet") return "Listing packet";
  if (k === "disclosure") return "Disclosure";
  return "Other (describe)";
}

const GREEN = "#43a419";

function chipStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 800,
    border: active ? `2px solid ${GREEN}` : "1px solid #e5e7eb",
    background: active ? "rgba(67,164,25,0.10)" : "#fff",
    cursor: "pointer",
    transition: "all 120ms ease",
    userSelect: "none",
  };
}

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 16,
};

const subcard: React.CSSProperties = {
  border: "1px solid #eef2f7",
  borderRadius: 14,
  background: "linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%)",
  padding: 14,
};

const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  opacity: 0.75,
  marginBottom: 6,
};

export default function AdminIntakePage() {
  const [customerType, setCustomerType] = useState<CustomerType>("homeowner");
  const [requestedOutputs, setRequestedOutputs] = useState<RequestedOutput[]>([
    "leaf_snapshot",
  ]);
  const [hasInspection, setHasInspection] = useState(false);

  // "Other" customer description
  const [otherCustomerDesc, setOtherCustomerDesc] = useState("");

  // Primary (legacy) single file that keeps /create working
  const [primaryFileKind, setPrimaryFileKind] = useState<FileKind>("inspection");
  const [primaryFileOtherLabel, setPrimaryFileOtherLabel] = useState("");

  // Extra attachments (metadata only; file inputs are rendered)
  type ExtraAttachment = { id: string; kind: FileKind; otherLabel?: string };
  const [extraFiles, setExtraFiles] = useState<ExtraAttachment[]>([
    { id: "a1", kind: "system_photo" },
  ]);

  // Section-specific quick upload kinds (pure UI, still posted)
  const [brokerFileKind, setBrokerFileKind] = useState<FileKind>("listing_packet");
  const [brokerFileOther, setBrokerFileOther] = useState("");

  const [clientFileKind, setClientFileKind] = useState<FileKind>("utility_bill");
  const [clientFileOther, setClientFileOther] = useState("");

  const [inspectorFileKind, setInspectorFileKind] = useState<FileKind>("inspection");
  const [inspectorFileOther, setInspectorFileOther] = useState("");

  const [otherFileKind, setOtherFileKind] = useState<FileKind>("other");
  const [otherFileOther, setOtherFileOther] = useState("");

  const [clientError, setClientError] = useState<string | null>(null);

 const sp = useSearchParams();
const errorParam = sp.get("error");

const serverError = useMemo(() => {
  return errorParam === "unknown"
    ? "Something went wrong creating the job."
    : null;
}, [errorParam]);


  const isInspector = customerType === "inspector";
  const isBroker = customerType === "agent_broker";
  const isHomeowner = customerType === "homeowner";
  const isOther = customerType === "other";

  function toggleOutput(v: RequestedOutput) {
    setRequestedOutputs((prev) => {
      if (prev.includes(v)) {
        const next = prev.filter((x) => x !== v);
        return next.length ? next : ["leaf_snapshot"];
      }
      return [...prev, v];
    });
  }

  function addExtraFileRow() {
    setExtraFiles((prev) => [
      ...prev,
      { id: `a${prev.length + 1}-${Date.now()}`, kind: "system_photo" },
    ]);
  }

  function removeExtraFileRow(id: string) {
    setExtraFiles((prev) => prev.filter((x) => x.id !== id));
  }

  function updateExtraKind(id: string, kind: FileKind) {
    setExtraFiles((prev) =>
      prev.map((x) => (x.id === id ? { ...x, kind, otherLabel: "" } : x))
    );
  }

  function updateExtraOther(id: string, otherLabel: string) {
    setExtraFiles((prev) =>
      prev.map((x) => (x.id === id ? { ...x, otherLabel } : x))
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    setClientError(null);

    const fd = new FormData(e.currentTarget);

    const address1 = String(fd.get("address1") || "").trim();
    const state = upper2(String(fd.get("state") || ""));
    const zip = String(fd.get("zip") || "").trim();

    // Required parties differ by type
    const brokerName = String(fd.get("broker_name") || "").trim();
    const brokerContact = String(fd.get("broker_contact") || "").trim();
    const inspectorName = String(fd.get("inspector_name") || "").trim();
    const inspectorContact = String(fd.get("inspector_contact") || "").trim();
    const clientName = String(fd.get("customer_name") || "").trim();

    if (isBroker) {
      if (!brokerName) {
        e.preventDefault();
        setClientError("Broker name is required for Agent/Broker jobs.");
        return;
      }
      if (!brokerContact) {
        e.preventDefault();
        setClientError("Broker phone/email is required for Agent/Broker jobs.");
        return;
      }
      if (!clientName) {
        e.preventDefault();
        setClientError("Client / homeowner name is required for Agent/Broker jobs.");
        return;
      }
    }

    if (isHomeowner) {
      if (!clientName) {
        e.preventDefault();
        setClientError("Homeowner name is required.");
        return;
      }
    }

    if (isInspector) {
      if (!inspectorName) {
        e.preventDefault();
        setClientError("Inspector or company name is required for Inspector jobs.");
        return;
      }
      if (!inspectorContact) {
        e.preventDefault();
        setClientError("Inspector phone/email is required for Inspector jobs.");
        return;
      }
    }

    if (isOther && !otherCustomerDesc.trim()) {
      e.preventDefault();
      setClientError('Please describe what "Other" means for this job.');
      return;
    }

    if (!address1) {
      e.preventDefault();
      setClientError("Street address is required.");
      return;
    }
    if (!state || state.length !== 2) {
      e.preventDefault();
      setClientError("State must be a 2-letter code.");
      return;
    }
    if (!zip || zip.length < 5) {
      e.preventDefault();
      setClientError("ZIP is required.");
      return;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="admin-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>Create New Job</h1>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
              Internal admin intake — capture who/what/property + any docs. Finish the rest in the worksheet.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/admin/jobs" className="admin-btn" style={{ textDecoration: "none" }}>
              Back to Jobs
            </Link>
          </div>
        </div>
      </div>

      {(clientError || serverError) && (
        <div className="admin-card" style={{ borderColor: "#fecaca", background: "#fff1f2" }}>
          <div style={{ fontWeight: 900, color: "#991b1b" }}>Fix this</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#7f1d1d" }}>
            {clientError || serverError}
          </div>
        </div>
      )}

      <form
        action="/admin/intake/create"
        method="post"
        encType="multipart/form-data"
        className="space-y-6"
        onSubmit={onSubmit}
      >
        {/* Routing fields */}
        <input type="hidden" name="customer_type" value={customerType} />
        <input
          type="hidden"
          name="inspection_status"
          value={hasInspection ? "has_report" : "none"}
        />
        {requestedOutputs.map((o) => (
          <input key={o} type="hidden" name="requested_outputs" value={o} />
        ))}
        {/* Other customer descriptor */}
        <input type="hidden" name="other_customer_desc" value={otherCustomerDesc} />

        {/* TOP ROW: Type + Intent */}
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
          {/* Customer type */}
          <div style={{ ...card, gridColumn: "span 6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 950, fontSize: 14 }}>Who is submitting?</div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>Customer type</div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              {(["homeowner", "agent_broker", "inspector", "other"] as CustomerType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCustomerType(t)}
                  style={chipStyle(customerType === t)}
                >
                  {labelCustomerType(t)}
                </button>
              ))}
            </div>

            {isOther && (
              <div style={{ marginTop: 12 }}>
                <div style={label}>Describe “Other” *</div>
                <input
                  className="admin-input"
                  value={otherCustomerDesc}
                  onChange={(e) => setOtherCustomerDesc(e.target.value)}
                  placeholder="e.g., Contractor, Tenant, Property Manager, Utility Rep…"
                />
              </div>
            )}
          </div>

          {/* Job intent */}
          <div style={{ ...card, gridColumn: "span 6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 950, fontSize: 14 }}>What are we producing?</div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>Job intent</div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                style={chipStyle(requestedOutputs.includes("leaf_snapshot"))}
                onClick={() => toggleOutput("leaf_snapshot")}
              >
                LEAF Snapshot
              </button>

              {!isInspector && (
                <button
                  type="button"
                  style={chipStyle(requestedOutputs.includes("inspection"))}
                  onClick={() => toggleOutput("inspection")}
                >
                  Inspection
                </button>
              )}

              <button
                type="button"
                style={chipStyle(requestedOutputs.includes("hes_report"))}
                onClick={() => toggleOutput("hes_report")}
              >
                HES Report
              </button>
            </div>

            <div style={{ marginTop: 12, ...subcard }}>
              <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={hasInspection}
                  onChange={(e) => setHasInspection(e.target.checked)}
                />
                <span style={{ fontWeight: 800 }}>Inspection report already exists</span>
                <span style={{ opacity: 0.65 }}>(optional)</span>
              </label>
            </div>
          </div>
        </div>

        {/* PEOPLE: broker / client / inspector */}
        <div style={{ ...card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>People</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>
              Capture the right contacts for this customer type
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            }}
          >
            {isBroker && (
              <div style={{ ...subcard, gridColumn: "span 6" }}>
                <div style={{ fontWeight: 900, fontSize: 13 }}>Broker (submitter) *</div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div>
                    <div style={label}>Broker name *</div>
                    <input name="broker_name" className="admin-input" placeholder="Broker name" />
                  </div>
                  <div>
                    <div style={label}>Broker phone/email *</div>
                    <input name="broker_contact" className="admin-input" placeholder="(555) 555-5555 or email" />
                  </div>

                  {/* Broker file upload */}
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 6 }}>
                      Broker docs (optional)
                    </div>

                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
                      <div style={{ gridColumn: "span 5" }}>
                        <select
                          className="admin-input"
                          name="broker_file_kind"
                          value={brokerFileKind}
                          onChange={(e) => setBrokerFileKind(e.target.value as FileKind)}
                        >
                          {(
                            ["listing_packet", "disclosure", "estimate remember", "other"] as any
                          )}
                          <option value="listing_packet">{labelFileKind("listing_packet")}</option>
                          <option value="disclosure">{labelFileKind("disclosure")}</option>
                          <option value="estimate">{labelFileKind("estimate")}</option>
                          <option value="other">{labelFileKind("other")}</option>
                        </select>
                      </div>

                      <div style={{ gridColumn: "span 7" }}>
                        <input
                          type="file"
                          name="broker_file"
                          className="admin-input"
                          accept=".pdf,.png,.jpg,.jpeg,.heic,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                        />
                      </div>

                      {brokerFileKind === "other" && (
                        <div style={{ gridColumn: "span 12" }}>
                          <input
                            className="admin-input"
                            name="broker_file_other_label"
                            placeholder="Describe this file (e.g., HOA docs, floor plan, permits)"
                            value={brokerFileOther}
                            onChange={(e) => setBrokerFileOther(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Client/Homeowner block for homeowner+broker (and optional for inspector) */}
            {(isHomeowner || isBroker || isInspector || isOther) && (
              <div style={{ ...subcard, gridColumn: isBroker ? "span 6" : "span 12" }}>
                <div style={{ fontWeight: 900, fontSize: 13 }}>
                  {isInspector ? "Client (optional)" : isOther ? "Primary contact (optional)" : "Client / Homeowner"}
                  {isBroker ? " *" : ""}
                  {isHomeowner ? " *" : ""}
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
                    <div style={{ gridColumn: "span 6" }}>
                      <div style={label}>{isOther ? "Name" : "Name"}{isBroker || isHomeowner ? " *" : ""}</div>
                      <input
                        name="customer_name"
                        className="admin-input"
                        placeholder="Homeowner / tenant / client name"
                      />
                    </div>
                    <div style={{ gridColumn: "span 6" }}>
                      <div style={label}>Phone</div>
                      <input name="customer_phone" className="admin-input" placeholder="(555) 555-5555" />
                    </div>
                    <div style={{ gridColumn: "span 12" }}>
                      <div style={label}>Email</div>
                      <input name="customer_email" className="admin-input" placeholder="name@email.com" />
                    </div>
                  </div>

                  {/* Client file upload */}
                  <div style={{ marginTop: 2 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 6 }}>
                      Client docs (optional)
                    </div>

                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
                      <div style={{ gridColumn: "span 5" }}>
                        <select
                          className="admin-input"
                          name="client_file_kind"
                          value={clientFileKind}
                          onChange={(e) => setClientFileKind(e.target.value as FileKind)}
                        >
                          <option value="utility_bill">{labelFileKind("utility_bill")}</option>
                          <option value="inspection">{labelFileKind("inspection")}</option>
                          <option value="system_photo">{labelFileKind("system_photo")}</option>
                          <option value="estimate">{labelFileKind("estimate")}</option>
                          <option value="other">{labelFileKind("other")}</option>
                        </select>
                      </div>

                      <div style={{ gridColumn: "span 7" }}>
                        <input
                          type="file"
                          name="client_files"
                          className="admin-input"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.heic,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                        />
                      </div>

                      {clientFileKind === "other" && (
                        <div style={{ gridColumn: "span 12" }}>
                          <input
                            className="admin-input"
                            name="client_file_other_label"
                            placeholder="Describe this file"
                            value={clientFileOther}
                            onChange={(e) => setClientFileOther(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
                      Tip: hold ⌘/Ctrl to select multiple photos.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isInspector && (
              <div style={{ ...subcard, gridColumn: "span 12" }}>
                <div style={{ fontWeight: 900, fontSize: 13 }}>Inspector *</div>

                <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
                  <div style={{ gridColumn: "span 6" }}>
                    <div style={label}>Inspector / company name *</div>
                    <input name="inspector_name" className="admin-input" placeholder="Inspector name or company" />
                  </div>
                  <div style={{ gridColumn: "span 6" }}>
                    <div style={label}>Phone/email *</div>
                    <input name="inspector_contact" className="admin-input" placeholder="(555) 555-5555 or email" />
                  </div>

                  {/* Inspector file upload */}
                  <div style={{ gridColumn: "span 12" }}>
                    <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 6 }}>
                      Inspector docs (optional)
                    </div>

                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
                      <div style={{ gridColumn: "span 5" }}>
                        <select
                          className="admin-input"
                          name="inspector_file_kind"
                          value={inspectorFileKind}
                          onChange={(e) => setInspectorFileKind(e.target.value as FileKind)}
                        >
                          <option value="inspection">{labelFileKind("inspection")}</option>
                          <option value="system_photo">{labelFileKind("system_photo")}</option>
                          <option value="other">{labelFileKind("other")}</option>
                        </select>
                      </div>

                      <div style={{ gridColumn: "span 7" }}>
                        <input
                          type="file"
                          name="inspector_files"
                          className="admin-input"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.heic,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                        />
                      </div>

                      {inspectorFileKind === "other" && (
                        <div style={{ gridColumn: "span 12" }}>
                          <input
                            className="admin-input"
                            name="inspector_file_other_label"
                            placeholder="Describe this file"
                            value={inspectorFileOther}
                            onChange={(e) => setInspectorFileOther(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isOther && (
              <div style={{ ...subcard, gridColumn: "span 12" }}>
                <div style={{ fontWeight: 900, fontSize: 13 }}>Other docs (optional)</div>

                <div style={{ marginTop: 10, display: "grid", gap: 8, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
                  <div style={{ gridColumn: "span 5" }}>
                    <select
                      className="admin-input"
                      name="other_file_kind"
                      value={otherFileKind}
                      onChange={(e) => setOtherFileKind(e.target.value as FileKind)}
                    >
                      <option value="inspection">{labelFileKind("inspection")}</option>
                      <option value="hes_report">{labelFileKind("hes_report")}</option>
                      <option value="system_photo">{labelFileKind("system_photo")}</option>
                      <option value="estimate">{labelFileKind("estimate")}</option>
                      <option value="other">{labelFileKind("other")}</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: "span 7" }}>
                    <input
                      type="file"
                      name="other_files"
                      className="admin-input"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.heic,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    />
                  </div>

                  {otherFileKind === "other" && (
                    <div style={{ gridColumn: "span 12" }}>
                      <input
                        className="admin-input"
                        name="other_file_other_label"
                        placeholder="Describe this file"
                        value={otherFileOther}
                        onChange={(e) => setOtherFileOther(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PROPERTY */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>Property</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Required</div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <div>
              <div style={label}>Street address *</div>
              <input name="address1" className="admin-input" placeholder="123 Main St" />
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
              <div style={{ gridColumn: "span 6" }}>
                <div style={label}>City</div>
                <input name="city" className="admin-input" placeholder="Portland" />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <div style={label}>State *</div>
                <input
                  name="state"
                  className="admin-input"
                  placeholder="OR"
                  maxLength={2}
                  onBlur={(e) => (e.currentTarget.value = upper2(e.currentTarget.value))}
                />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div style={label}>ZIP *</div>
                <input name="zip" className="admin-input" placeholder="97214" />
              </div>
            </div>
          </div>
        </div>

        {/* ATTACHMENTS (GLOBAL) */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>Attachments</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Optional</div>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
            Add any documents/photos that help us start the job. (You can add more later on the worksheet.)
          </div>

          {/* PRIMARY legacy upload (keeps /create working) */}
          <div style={{ marginTop: 12, ...subcard }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>Primary file (stored to job)</div>

            <div style={{ marginTop: 10, display: "grid", gap: 8, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
              <div style={{ gridColumn: "span 4" }}>
                <select
                  className="admin-input"
                  name="file_kind"
                  value={primaryFileKind}
                  onChange={(e) => setPrimaryFileKind(e.target.value as FileKind)}
                >
                  <option value="inspection">{labelFileKind("inspection")}</option>
                  <option value="hes_report">{labelFileKind("hes_report")}</option>
                  <option value="system_photo">{labelFileKind("system_photo")}</option>
                  <option value="estimate">{labelFileKind("estimate")}</option>
                  <option value="utility_bill">{labelFileKind("utility_bill")}</option>
                  <option value="other">{labelFileKind("other")}</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 8" }}>
                <input
                  type="file"
                  name="file"
                  className="admin-input"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.heic,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                />
              </div>

              {primaryFileKind === "other" && (
                <div style={{ gridColumn: "span 12" }}>
                  <input
                    className="admin-input"
                    name="file_other_label"
                    placeholder="Describe this file"
                    value={primaryFileOtherLabel}
                    onChange={(e) => setPrimaryFileOtherLabel(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
              This preserves your current `/admin/intake/create` upload behavior.
            </div>
          </div>

          {/* EXTRA uploads (future-proof; backend can ignore for now) */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900, fontSize: 13 }}>Additional files (optional)</div>
              <button type="button" className="admin-btn" onClick={addExtraFileRow}>
                + Add another file
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {extraFiles.map((row, idx) => (
                <div key={row.id} style={{ ...subcard }}>
                  {/* metadata fields */}
                  <input type="hidden" name="extra_files_idx" value={String(idx)} />
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(12, minmax(0, 1fr))", alignItems: "center" }}>
                    <div style={{ gridColumn: "span 4" }}>
                      <select
                        className="admin-input"
                        name="extra_file_kind"
                        value={row.kind}
                        onChange={(e) => updateExtraKind(row.id, e.target.value as FileKind)}
                      >
                        <option value="inspection">{labelFileKind("inspection")}</option>
                        <option value="hes_report">{labelFileKind("hes_report")}</option>
                        <option value="system_photo">{labelFileKind("system_photo")}</option>
                        <option value="estimate">{labelFileKind("estimate")}</option>
                        <option value="utility_bill">{labelFileKind("utility_bill")}</option>
                        <option value="other">{labelFileKind("other")}</option>
                      </select>
                    </div>

                    <div style={{ gridColumn: "span 7" }}>
                      <input
                        type="file"
                        name="extra_files"
                        className="admin-input"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.heic,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      />
                    </div>

                    <div style={{ gridColumn: "span 1", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => removeExtraFileRow(row.id)}
                        style={{ padding: "8px 10px" }}
                        aria-label="Remove file row"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>

                    {row.kind === "other" && (
                      <div style={{ gridColumn: "span 12" }}>
                        <input
                          className="admin-input"
                          name="extra_file_other_label"
                          placeholder="Describe this file"
                          value={row.otherLabel || ""}
                          onChange={(e) => updateExtraOther(row.id, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
              These extra uploads are posted to the server now; we’ll persist them when we add the Phase 4 file tables.
            </div>
          </div>
        </div>

        {/* NOTES */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>Notes</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Optional</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <textarea
              name="notes"
              className="admin-input"
              rows={4}
              placeholder="Anything we should know before starting the worksheet?"
            />
          </div>
        </div>

        {/* SUBMIT */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Creates a draft job and sends you to the worksheet.
          </div>
          <button type="submit" className="admin-btn">
            Create Job →
          </button>
        </div>
      </form>
    </div>
  );
}
