"use client";

// Hand-curate the resource catalog without redeploys. Gated to admins via
// the email allow-list in lib/recommendations/admin.ts. This is intentionally
// minimal — quick CRUD over the Resource model, no rich text, no bulk import.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Plus, Trash2, Save, X } from "lucide-react";

const TYPE_OPTIONS = [
  "book",
  "article",
  "lecture",
  "podcast",
  "video",
  "audiobook",
] as const;

type Resource = {
  id: string;
  type: string;
  title: string;
  author: string | null;
  url: string;
  blurb: string;
  themes: string[];
  why: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type DraftResource = Omit<Resource, "id" | "createdAt" | "updatedAt">;

const EMPTY_DRAFT: DraftResource = {
  type: "book",
  title: "",
  author: "",
  url: "",
  blurb: "",
  themes: [],
  why: "",
  isActive: true,
};

export default function AdminResourcesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<DraftResource>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?next=/admin/resources");
    }
  }, [status, router]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/resources");
      if (res.status === 401) {
        router.replace("/auth/signin?next=/admin/resources");
        return;
      }
      if (res.status === 403) {
        setError("admin only.");
        return;
      }
      if (!res.ok) throw new Error(`load failed (${res.status})`);
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const startNew = () => {
    setEditingId("new");
    setDraft(EMPTY_DRAFT);
  };

  const startEdit = (r: Resource) => {
    setEditingId(r.id);
    setDraft({
      type: r.type,
      title: r.title,
      author: r.author,
      url: r.url,
      blurb: r.blurb,
      themes: r.themes,
      why: r.why,
      isActive: r.isActive,
    });
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const save = async () => {
    setSaving(true);
    try {
      const isNew = editingId === "new";
      const url = isNew
        ? "/api/admin/resources"
        : `/api/admin/resources?id=${editingId}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const { error: msg } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(msg ?? `save failed (${res.status})`);
        return;
      }
      cancel();
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("delete this resource?")) return;
    const res = await fetch(`/api/admin/resources?id=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert(`delete failed (${res.status})`);
      return;
    }
    load();
  };

  if (status !== "authenticated" || loading) {
    return (
      <div className="v2-screen bg-chamber-900 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="v2-screen bg-chamber-900 px-6 pt-8">
        <p className="text-sm text-red-400 lowercase">{error}</p>
      </div>
    );
  }

  return (
    <div className="v2-screen bg-chamber-900 px-0 lg:max-w-3xl lg:mx-auto lg:px-4 lg:pt-8">
      <div className="px-6 mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-tight lowercase">
          resources ({items.length})
        </h1>
        {!editingId && (
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1.5 rounded-full bg-ember-500 text-white px-3.5 py-1.5 text-xs lowercase"
          >
            <Plus className="h-3.5 w-3.5" />
            new
          </button>
        )}
      </div>

      {editingId && (
        <div className="px-6 mb-6">
          <div className="v2-card space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-ember-400">
                {editingId === "new" ? "new resource" : "edit resource"}
              </p>
              <button
                onClick={cancel}
                className="text-chamber-500 hover:text-chamber-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Field label="type">
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="bg-chamber-900/60 border border-chamber-800 rounded-md px-2.5 py-1.5 text-sm text-chamber-100 lowercase w-full"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="title">
              <Input
                value={draft.title}
                onChange={(v) => setDraft({ ...draft, title: v })}
              />
            </Field>
            <Field label="author">
              <Input
                value={draft.author ?? ""}
                onChange={(v) =>
                  setDraft({ ...draft, author: v.trim() ? v : null })
                }
              />
            </Field>
            <Field label="url">
              <Input
                value={draft.url}
                onChange={(v) => setDraft({ ...draft, url: v })}
              />
            </Field>
            <Field label="blurb">
              <Textarea
                value={draft.blurb}
                onChange={(v) => setDraft({ ...draft, blurb: v })}
              />
            </Field>
            <Field label="themes (comma separated)">
              <Input
                value={draft.themes.join(", ")}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    themes: v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <Field label="why sage would suggest this">
              <Textarea
                value={draft.why}
                onChange={(v) => setDraft({ ...draft, why: v })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-chamber-200 lowercase">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) =>
                  setDraft({ ...draft, isActive: e.target.checked })
                }
              />
              active
            </label>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-ember-500 text-white px-4 py-2 text-sm lowercase disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              save
            </button>
          </div>
        </div>
      )}

      <div className="px-6 pb-12 space-y-3">
        {items.map((r) => (
          <div
            key={r.id}
            className={`v2-card flex items-start gap-3 ${
              r.isActive ? "" : "opacity-60"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-chamber-500">
                {r.type}
                {r.author ? ` · ${r.author}` : ""}
              </p>
              <p className="text-sm text-chamber-100 truncate">{r.title}</p>
              <p className="text-xs text-chamber-400 truncate mt-1">
                {r.themes.join(", ")}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={() => startEdit(r)}
                className="text-xs text-ember-300 hover:text-ember-200 lowercase"
              >
                edit
              </button>
              <button
                onClick={() => remove(r.id)}
                className="text-xs text-chamber-500 hover:text-red-400 inline-flex items-center gap-1 lowercase"
              >
                <Trash2 className="h-3 w-3" /> delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-chamber-500 lowercase block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-chamber-900/60 border border-chamber-800 rounded-md px-2.5 py-1.5 text-sm text-chamber-100 w-full"
    />
  );
}

function Textarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="bg-chamber-900/60 border border-chamber-800 rounded-md px-2.5 py-1.5 text-sm text-chamber-100 w-full"
    />
  );
}
