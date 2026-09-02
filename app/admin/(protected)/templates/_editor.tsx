"use client";

import { useState } from "react";

type Template = {
  id: string;
  type: string;
  subject: string | null;
  bodyHtml: string;
  bodyText: string;
};

export default function TemplateEditor({ template }: { template: Template }) {
  const [subject, setSubject] = useState(template.subject || "");
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml);
  const [bodyText, setBodyText] = useState(template.bodyText);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, bodyHtml, bodyText }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const typeLabels: Record<string, string> = {
    "6week": "6 weeks before",
    "3week": "3 weeks before",
    duedate: "Due date",
    escalation: "Escalation (internal)",
    order_ack: "Order acknowledgement",
    delivery_summary: "Delivery summary",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">
          {typeLabels[template.type] || template.type}
        </span>
        <code className="text-xs text-gray-400">{template.type}</code>
      </div>
      <div className="p-5 space-y-4">
        {template.type !== "escalation" && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">HTML body</label>
          <textarea
            value={bodyHtml}
            onChange={e => setBodyHtml(e.target.value)}
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Plain text body</label>
          <textarea
            value={bodyText}
            onChange={e => setBodyText(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </div>
    </div>
  );
}
