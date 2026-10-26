import React from "react";

export const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50";

export default function BlogForm({
  form,
  update,
  startBlog,
  loadBlog,
  loading,
}) {
  return (
    <div className="space-y-6">
      <form onSubmit={startBlog} className="space-y-5">
        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-300">
            Thread ID
          </label>
          <input
            className={inputClass}
            value={form.thread_id}
            onChange={(e) => update("thread_id", e.target.value)}
            placeholder="Enter a unique ID for this blog"
            required
          />
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Existing thread continue karne ke liye same ID use karo. New blog ke
            liye new, unique ID enter karo.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-300">
            Blog topic
          </label>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={form.topic}
            onChange={(e) => update("topic", e.target.value)}
            placeholder="e.g. How AI agents are changing software development"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-300">
            Target audience
          </label>
          <select
            className={inputClass}
            value={form.audience}
            onChange={(e) => update("audience", e.target.value)}
          >
            <option>General readers</option>
            <option>Beginners</option>
            <option>Students</option>
            <option>Software developers</option>
            <option>Technical professionals</option>
            <option>Business leaders</option>
            <option>Content creators</option>
            <option>Researchers</option>
          </select>
        </div>

        <button
          className={`${primaryButton} w-full`}
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Processing...
            </>
          ) : (
            <>
              ✦ Start blog workflow <span>→</span>
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Or continue
        </span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <button
        type="button"
        onClick={loadBlog}
        disabled={loading || !form.thread_id.trim()}
        className={`${secondaryButton} w-full`}
      >
        {loading ? "Loading..." : "↻ Load saved thread"}
      </button>
    </div>
  );
}
