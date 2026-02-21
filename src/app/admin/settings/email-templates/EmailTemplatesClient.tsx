// src/app/admin/settings/email-templates/EmailTemplatesClient.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { EmailTemplate, EmailTemplateVariable } from "./shared";
import {
  getTemplateMeta,
  getTemplateVariables,
  getTemplatekeysForCategory,
  ALL_TEMPLATE_KEYS,
  TEMPLATE_CATEGORIES,
} from "./shared";
import { upsertEmailTemplate, sendTestEmail } from "./actions";

// ─── Design tokens ──────────────────────────────────────────────────
const BORDER = "#334155";
const BG_SURFACE = "#1e293b";
const BG_DEEP = "#0f172a";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

// ─── Sidebar item ───────────────────────────────────────────────────

function SidebarItem({
  templateKey,
  isActive,
  onClick,
  infoOpen,
  onToggleInfo,
}: {
  templateKey: string;
  isActive: boolean;
  onClick: () => void;
  infoOpen: boolean;
  onToggleInfo: (e: React.MouseEvent) => void;
}) {
  const meta = getTemplateMeta(templateKey);
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderLeft: isActive ? `3px solid ${EMERALD}` : "3px solid transparent",
          background: isActive ? "rgba(16,185,129,0.06)" : "transparent",
          transition: "all 0.12s",
        }}
      >
        <button
          type="button"
          onClick={onClick}
          style={{
            flex: 1,
            textAlign: "left",
            padding: "9px 4px 9px 14px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: isActive ? 700 : 500,
            color: isActive ? TEXT : TEXT_SEC,
            lineHeight: 1.3,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {meta.name}
        </button>
        <button
          type="button"
          onClick={onToggleInfo}
          title="Template info"
          style={{
            flexShrink: 0,
            padding: "6px 12px 6px 4px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 14,
            color: infoOpen ? EMERALD : TEXT_DIM,
            lineHeight: 1,
            transition: "color 0.12s",
          }}
        >
          &#9432;
        </button>
      </div>

      {/* Info popover */}
      {infoOpen && (
        <div
          style={{
            margin: "0 8px 4px 16px",
            padding: "8px 12px",
            background: BG_SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            animation: "fadeSlideIn 0.12s ease-out",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
              color: TEXT_DIM,
              marginBottom: meta.description ? 4 : 0,
            }}
          >
            {templateKey}
          </div>
          {meta.description && (
            <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.4 }}>
              {meta.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Source editor with line numbers ─────────────────────────────────

function SourceEditor({
  value,
  onChange,
  textareaRef,
}: {
  value: string;
  onChange: (val: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split("\n");

  function syncScroll() {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minHeight: 500,
        background: BG_DEEP,
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        overflow: "hidden",
      }}
    >
      {/* Line number gutter */}
      <div
        ref={gutterRef}
        style={{
          width: 48,
          flexShrink: 0,
          padding: "12px 0",
          overflowY: "hidden",
          background: "rgba(15,23,42,0.6)",
          borderRight: `1px solid ${BORDER}`,
          userSelect: "none",
        }}
      >
        {lines.map((_, i) => (
          <div
            key={i}
            style={{
              height: 19.2, // matches line-height: 1.6 * 12px font
              fontSize: 12,
              fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
              color: "rgba(100,116,139,0.5)",
              textAlign: "right",
              paddingRight: 10,
              lineHeight: "19.2px",
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        style={{
          flex: 1,
          padding: 12,
          background: "transparent",
          color: "#a5f3fc",
          fontSize: 12,
          fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
          lineHeight: "19.2px",
          resize: "vertical",
          outline: "none",
          border: "none",
          minHeight: 500,
          tabSize: 2,
        }}
      />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────

export default function EmailTemplatesClient({
  templates,
}: {
  templates: EmailTemplate[];
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [activeKey, setActiveKey] = useState(templates[0]?.template_key ?? "");
  const [subject, setSubject] = useState(templates[0]?.subject ?? "");
  const [htmlBody, setHtmlBody] = useState(templates[0]?.html_body ?? "");
  const [variables, setVariables] = useState<EmailTemplateVariable[]>(
    templates[0] ? getTemplateVariables(templates[0].template_key) : []
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [showTestInput, setShowTestInput] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"source" | "preview">("source");
  const [openInfoKey, setOpenInfoKey] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close info popover on click outside sidebar
  useEffect(() => {
    if (!openInfoKey) return;
    function handleClick(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setOpenInfoKey(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openInfoKey]);

  // Debounced preview HTML
  const [previewHtml, setPreviewHtml] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      let rendered = htmlBody;
      for (const v of variables) {
        const pattern = new RegExp(`\\{\\{${v.key}\\}\\}`, "g");
        rendered = rendered.replace(pattern, v.sample);
      }
      setPreviewHtml(rendered);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [htmlBody, variables]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ─── Template selection ───────────────────────────────────────────

  function selectTemplate(templateKey: string) {
    const t = templates.find((t) => t.template_key === templateKey);
    if (!t) return;
    setActiveKey(t.template_key);
    setSubject(t.subject);
    setHtmlBody(t.html_body);
    setVariables(getTemplateVariables(t.template_key));
    setDirty(false);
    setShowTestInput(false);
    setEditorMode("source");
  }

  // ─── Insert variable at cursor ────────────────────────────────────

  function insertVariable(key: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    if (editorMode !== "source") setEditorMode("source");
    const tag = `{{${key}}}`;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = htmlBody.slice(0, start) + tag + htmlBody.slice(end);
    setHtmlBody(newVal);
    setDirty(true);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + tag.length;
    });
  }

  // ─── Save ─────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      await upsertEmailTemplate({
        template_key: activeKey,
        subject,
        html_body: htmlBody,
      });
      setDirty(false);
      showToast("Template saved");
      router.refresh();
    } catch (err: any) {
      showToast("Error: " + (err.message ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  // ─── Send test ────────────────────────────────────────────────────

  async function handleSendTest() {
    if (!testEmail.trim()) return;
    setSendingTest(true);
    try {
      await sendTestEmail(activeKey, testEmail.trim());
      showToast("Test email sent to " + testEmail.trim());
      setShowTestInput(false);
      setTestEmail("");
    } catch (err: any) {
      showToast("Error: " + (err.message ?? "Send failed"));
    } finally {
      setSendingTest(false);
    }
  }

  // ─── Reset to DB version ──────────────────────────────────────────

  function handleReset() {
    selectTemplate(activeKey);
  }

  // ─── Group templates by category ────────────────────────────────────

  const templateKeySet = new Set(templates.map((t) => t.template_key));

  const categoryGroups = TEMPLATE_CATEGORIES.map((cat) => ({
    ...cat,
    keys: getTemplatekeysForCategory(cat.key).filter((k) => templateKeySet.has(k)),
  }));

  // Any DB templates not in any category go into an "Other" group
  const uncategorized = templates
    .filter((t) => !ALL_TEMPLATE_KEYS.has(t.template_key))
    .map((t) => t.template_key);

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", gap: 0, minHeight: 700 }}>
      {/* Popover slide-in animation */}
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* ─── LEFT SIDEBAR ─── */}
      <div
        ref={sidebarRef}
        style={{
          width: 260,
          flexShrink: 0,
          background: BG_SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: "12px 0 0 12px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Category groups */}
        <div style={{ flex: 1 }}>
          {categoryGroups.map((cat, catIdx) =>
            cat.keys.length > 0 ? (
              <div key={cat.key}>
                <div
                  style={{
                    padding: "8px 16px",
                    fontSize: 9,
                    fontWeight: 700,
                    color: TEXT_DIM,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    borderTop: catIdx > 0 ? `1px solid ${BORDER}` : "none",
                    background: "rgba(51,65,85,0.15)",
                  }}
                >
                  {cat.label}
                </div>
                {cat.keys.map((key) => (
                  <SidebarItem
                    key={key}
                    templateKey={key}
                    isActive={key === activeKey}
                    onClick={() => selectTemplate(key)}
                    infoOpen={openInfoKey === key}
                    onToggleInfo={(e) => {
                      e.stopPropagation();
                      setOpenInfoKey(openInfoKey === key ? null : key);
                    }}
                  />
                ))}
              </div>
            ) : null
          )}

          {/* Uncategorized templates */}
          {uncategorized.length > 0 && (
            <div>
              <div
                style={{
                  padding: "8px 16px",
                  fontSize: 9,
                  fontWeight: 700,
                  color: TEXT_DIM,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  borderTop: `1px solid ${BORDER}`,
                  background: "rgba(51,65,85,0.15)",
                }}
              >
                Other
              </div>
              {uncategorized.map((key) => (
                <SidebarItem
                  key={key}
                  templateKey={key}
                  isActive={key === activeKey}
                  onClick={() => selectTemplate(key)}
                  infoOpen={openInfoKey === key}
                  onToggleInfo={(e) => {
                    e.stopPropagation();
                    setOpenInfoKey(openInfoKey === key ? null : key);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT EDITOR PANEL ─── */}
      <div
        style={{
          flex: 1,
          background: BG_SURFACE,
          borderTop: `1px solid ${BORDER}`,
          borderRight: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          borderLeft: "none",
          borderRadius: "0 12px 12px 0",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Subject field */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              color: TEXT,
              marginBottom: 8,
            }}
          >
            Subject
          </label>
          <input
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setDirty(true);
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: `1px solid ${BORDER}`,
              background: BG_DEEP,
              color: TEXT,
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Body section */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "16px 24px",
            gap: 0,
            minHeight: 0,
          }}
        >
          {/* Body header + Source / Preview tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
              Body
            </div>
            <div
              style={{
                display: "flex",
                borderRadius: 6,
                border: `1px solid ${BORDER}`,
                overflow: "hidden",
              }}
            >
              {(["source", "preview"] as const).map((mode) => {
                const isActive = editorMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEditorMode(mode)}
                    style={{
                      padding: "5px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      background: isActive ? "rgba(16,185,129,0.12)" : "transparent",
                      color: isActive ? EMERALD : TEXT_MUTED,
                      transition: "all 0.12s",
                    }}
                  >
                    {mode === "source" ? "Source" : "Preview"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor / Preview area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {editorMode === "source" ? (
              <SourceEditor
                value={htmlBody}
                onChange={(val) => {
                  setHtmlBody(val);
                  setDirty(true);
                }}
                textareaRef={textareaRef}
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  minHeight: 500,
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  overflow: "hidden",
                }}
              >
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;}</style></head><body>${previewHtml}</body></html>`}
                  sandbox="allow-same-origin"
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 500,
                    border: "none",
                    background: "#fff",
                  }}
                  title="Email Preview"
                />
              </div>
            )}
          </div>
        </div>

        {/* Variable chips */}
        {variables.length > 0 && (
          <div
            style={{
              padding: "12px 24px",
              borderTop: `1px solid ${BORDER}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: TEXT_DIM,
                marginBottom: 8,
              }}
            >
              Variables — click to insert at cursor
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {variables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  title={`${v.label} — sample: ${v.sample}`}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 9999,
                    border: `1px solid rgba(16,185,129,0.25)`,
                    background: "rgba(16,185,129,0.06)",
                    color: EMERALD,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
                    transition: "all 0.12s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div
          style={{
            padding: "12px 24px 16px",
            borderTop: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* Left: Reset link */}
          {dirty && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: 0,
                border: "none",
                background: "transparent",
                color: TEXT_MUTED,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              Reset to default
            </button>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Toast (inline) */}
          {toast && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: toast.startsWith("Error") ? "#f87171" : EMERALD,
                transition: "opacity 0.3s",
                whiteSpace: "nowrap",
              }}
            >
              {toast}
            </span>
          )}

          {/* Send Test */}
          {!showTestInput ? (
            <button
              type="button"
              onClick={() => setShowTestInput(true)}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: `1px solid ${BORDER}`,
                background: "transparent",
                color: TEXT_SEC,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              Send test email
            </button>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="email"
                placeholder="email@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendTest();
                  if (e.key === "Escape") {
                    setShowTestInput(false);
                    setTestEmail("");
                  }
                }}
                style={{
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: `1px solid ${BORDER}`,
                  background: BG_DEEP,
                  color: TEXT,
                  fontSize: 13,
                  width: 200,
                  outline: "none",
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={sendingTest || !testEmail.trim()}
                style={{
                  padding: "7px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: "#3b82f6",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: sendingTest ? 0.6 : 1,
                }}
              >
                {sendingTest ? "Sending\u2026" : "Send"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTestInput(false);
                  setTestEmail("");
                }}
                style={{
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: "rgba(51,65,85,0.4)",
                  color: TEXT_MUTED,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
              background: dirty ? EMERALD : "#334155",
              color: dirty ? "#fff" : TEXT_DIM,
              fontSize: 13,
              fontWeight: 700,
              cursor: dirty ? "pointer" : "default",
              opacity: saving ? 0.6 : 1,
              transition: "all 0.15s",
            }}
          >
            {saving ? "Saving\u2026" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
