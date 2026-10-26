import { useCallback, useState } from "react";

const API = "http://127.0.0.1:8000";

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50";

function getInterrupt(data) {
  const interrupts = data?.__interrupt__;
  if (!Array.isArray(interrupts) || interrupts.length === 0) return null;
  return interrupts[0]?.value ?? interrupts[0];
}

function getStage(data) {
  const interrupt = getInterrupt(data);

  if (interrupt?.stage === "researcher_review") return "research";
  if (interrupt?.stage === "draft_review") return "draft";

  const next = data?.next ?? [];

  if (next.includes("Review_Research")) return "research";
  if (next.includes("Review_Write")) return "draft";

  if (data?.final_blog || data?.Final_Blog) return "complete";

  return "setup";
}

function markdownToHtml(markdown) {
  if (!markdown) return "";

  let html = String(markdown)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^\s*[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(?:<li>.*<\/li>\s*)+/g, (items) => `<ul>${items}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  return `<p>${html}</p>`;
}

export default function App() {
  const [form, setForm] = useState({
    thread_id: "",
    topic: "",
    audience: "General readers",
  });

  const [stage, setStage] = useState("setup");
  const [research, setResearch] = useState("");
  const [draft, setDraft] = useState("");
  const [finalBlog, setFinalBlog] = useState("");
  const [feedback, setFeedback] = useState("");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const request = async (url, options = {}) => {
    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: text };
    }

    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail || `HTTP ${response.status}`),
      );
    }

    return data;
  };

  const applyData = useCallback((data, threadId) => {
    setForm((previous) => ({
      ...previous,
      thread_id: data.thread_id || threadId || previous.thread_id,
      topic: data.topic || previous.topic,
      audience: data.audience || previous.audience,
    }));

    setResearch(data.research ?? data.Research ?? "");
    setDraft(data.draft ?? data.Draft ?? "");
    setFinalBlog(data.final_blog ?? data.Final_Blog ?? "");
    setStage(getStage(data));
    setFeedback("");
  }, []);

  const startBlog = async (event) => {
    event.preventDefault();

    const threadId = form.thread_id.trim();
    const topic = form.topic.trim();
    const audience = form.audience.trim();

    if (!threadId || !topic || !audience) {
      setNotice({
        type: "error",
        text: "Thread ID, topic aur audience teeno enter karo.",
      });
      return;
    }

    setLoading(true);
    setNotice(null);
    setResearch("");
    setDraft("");
    setFinalBlog("");
    setFeedback("");
    setStage("setup");

    try {
      const data = await request("/graph", {
        method: "POST",
        body: JSON.stringify({
          thread_id: threadId,
          topic,
          audience,
        }),
      });

      applyData(data, threadId);
      setNotice({
        type: "success",
        text: "Workflow started. Research review karke approve ya revise karo.",
      });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadBlog = async (event) => {
    event?.preventDefault();

    const threadId = form.thread_id.trim();

    if (!threadId) {
      setNotice({ type: "error", text: "Pehle Thread ID enter karo." });
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      const data = await request(`/graph/${encodeURIComponent(threadId)}`);

      applyData(data, threadId);
      setNotice({
        type: "success",
        text: "Saved thread load ho gaya. Workflow isi point se continue kar sakte ho.",
      });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const review = async (action) => {
    const threadId = form.thread_id.trim();

    if (!threadId) {
      setNotice({ type: "error", text: "Thread ID missing hai." });
      return;
    }

    if (action === "revise" && !feedback.trim()) {
      setNotice({
        type: "error",
        text: "Revise karne ke liye feedback likhna zaroori hai.",
      });
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      const params = new URLSearchParams({
        thread_id: threadId,
        action,
        feedback: action === "revise" ? feedback.trim() : "",
      });

      const data = await request(`/graph/resume?${params.toString()}`, {
        method: "POST",
      });

      applyData(data, threadId);

      const nextStage = getStage(data);

      setNotice({
        type: "success",
        text:
          nextStage === "complete"
            ? "Final blog ready hai aur is thread ID ke saath saved hai."
            : action === "revise"
              ? "Feedback submit ho gaya. Updated content review karo."
              : "Approved. Agla workflow step ready hai.",
      });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const newBlog = () => {
    setForm({
      thread_id: "",
      topic: "",
      audience: "General readers",
    });
    setStage("setup");
    setResearch("");
    setDraft("");
    setFinalBlog("");
    setFeedback("");
    setNotice(null);
  };

  const steps = [
    {
      id: "research",
      number: "01",
      title: "Research",
      subtitle: "Review insights",
    },
    { id: "draft", number: "02", title: "Writing", subtitle: "Review draft" },
    {
      id: "complete",
      number: "03",
      title: "Final blog",
      subtitle: "Ready to publish",
    },
  ];

  const currentIndex = steps.findIndex((item) => item.id === stage);

  const content =
    stage === "research" ? research : stage === "draft" ? draft : finalBlog;

  const contentTitle =
    stage === "research"
      ? "Research outline"
      : stage === "draft"
        ? "Blog draft"
        : "Your final blog";

  return (
    <div className="min-h-screen bg-[#090b12] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#090b12]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 text-xl font-bold shadow-lg shadow-violet-500/20">
              B
            </div>
            <div>
              <div className="font-bold tracking-tight">BlogCraft AI</div>
              <div className="text-[11px] text-slate-500">
                Agentic writing workspace
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Human-in-the-loop
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
        <section className="mb-8">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-violet-300">
            AI content studio
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Turn your ideas into{" "}
            <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
              exceptional blogs.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Research, review, refine, and publish-ready content — with you in
            control at every step.
          </p>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {steps.map((item, index) => {
            const done =
              stage === "complete" || (stage === "draft" && index === 0);
            const active = item.id === stage;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                  active
                    ? "border-violet-400/50 bg-violet-500/[0.09]"
                    : done
                      ? "border-emerald-400/20 bg-emerald-400/[0.035]"
                      : "border-white/[0.08] bg-white/[0.02]"
                }`}
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                    active
                      ? "bg-violet-500 text-white"
                      : done
                        ? "bg-emerald-400/15 text-emerald-300"
                        : "bg-white/[0.06] text-slate-500"
                  }`}
                >
                  {done ? "✓" : item.number}
                </div>
                <div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {notice && (
          <div
            role="status"
            className={`mb-6 rounded-xl border px-4 py-3 text-sm leading-6 ${
              notice.type === "error"
                ? "border-rose-400/25 bg-rose-400/[0.07] text-rose-200"
                : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200"
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
          <section className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#11141e]">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-7">
              <div>
                <h2 className="font-bold tracking-tight">Workspace</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Configure a blog or resume an existing thread.
                </p>
              </div>
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {stage === "complete" ? "Completed" : stage}
              </span>
            </div>

            <div className="space-y-6 p-5 sm:p-7">
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
                    Existing thread continue karne ke liye same ID use karo. New
                    blog ke liye new, unique ID enter karo.
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

              {stage !== "setup" && (
                <>
                  <div className="border-t border-white/[0.08]" />

                  <div>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{contentTitle}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {stage === "research"
                            ? "Check the research before allowing the writer to continue."
                            : stage === "draft"
                              ? "Review the generated draft and request changes if needed."
                              : "Your reviewed blog is ready to read and copy."}
                        </p>
                      </div>

                      {stage === "complete" && (
                        <span className="shrink-0 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                          ✓ Final
                        </span>
                      )}
                    </div>

                    {content ? (
                      <article
                        className="prose prose-invert prose-sm max-w-none break-words rounded-xl border border-white/[0.08] bg-[#0b0e16] p-5 leading-7 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-100 prose-p:text-slate-300 prose-strong:text-slate-100 prose-li:text-slate-300 prose-blockquote:border-violet-400 prose-blockquote:text-slate-400"
                        dangerouslySetInnerHTML={{
                          __html: markdownToHtml(content),
                        }}
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
                        Content abhi available nahi hai.
                      </div>
                    )}

                    {(stage === "research" || stage === "draft") && (
                      <div className="mt-6">
                        <label className="mb-2 block text-xs font-semibold text-slate-300">
                          Human feedback
                        </label>
                        <textarea
                          className={`${inputClass} min-h-28 resize-y`}
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder={
                            stage === "research"
                              ? "Add missing points, request better sources or change the angle..."
                              : "Describe the changes you want in this blog draft..."
                          }
                        />
                        <p className="mt-2 text-[11px] leading-5 text-slate-500">
                          {stage === "research"
                            ? "Approve research to generate the first draft, or revise it with feedback."
                            : "Approve to send the draft to the final editor, or request a revision."}
                        </p>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            className={`${primaryButton} flex-1`}
                            disabled={loading}
                            onClick={() => review("approve")}
                          >
                            {loading ? "Processing..." : "✓ Approve & continue"}
                          </button>
                          <button
                            type="button"
                            className={`${secondaryButton} flex-1`}
                            disabled={loading || !feedback.trim()}
                            onClick={() => review("revise")}
                          >
                            ↻ Submit feedback
                          </button>
                        </div>
                      </div>
                    )}

                    {stage === "complete" && finalBlog && (
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className={primaryButton}
                          onClick={() =>
                            navigator.clipboard.writeText(finalBlog).then(
                              () =>
                                setNotice({
                                  type: "success",
                                  text: "Final blog clipboard mein copy ho gaya.",
                                }),
                              () =>
                                setNotice({
                                  type: "error",
                                  text: "Copy nahi hua. Blog text manually select karo.",
                                }),
                            )
                          }
                        >
                          Copy final blog
                        </button>
                        <button
                          type="button"
                          className={secondaryButton}
                          onClick={newBlog}
                        >
                          + New blog
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#11141e]">
              <div className="border-b border-white/[0.08] px-5 py-5">
                <h2 className="text-sm font-bold">Workflow overview</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Your blog, one checkpoint at a time.
                </p>
              </div>

              <div className="p-5">
                {[
                  {
                    number: "01",
                    title: "Research agent",
                    description: "Creates a research outline for your topic.",
                    active: stage === "research",
                    done: ["draft", "complete"].includes(stage),
                  },
                  {
                    number: "02",
                    title: "Human review",
                    description: "You approve the research or request changes.",
                    active: stage === "research",
                    done: ["draft", "complete"].includes(stage),
                  },
                  {
                    number: "03",
                    title: "Writer agent",
                    description: "Writes and revises the full blog draft.",
                    active: stage === "draft",
                    done: stage === "complete",
                  },
                  {
                    number: "04",
                    title: "Final editor",
                    description:
                      "Polishes the approved draft into a final blog.",
                    active: false,
                    done: stage === "complete",
                  },
                ].map((item) => (
                  <div
                    key={item.number}
                    className="relative flex gap-3 pb-6 last:pb-0"
                  >
                    <div
                      className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${
                        item.done
                          ? "bg-emerald-400/15 text-emerald-300"
                          : item.active
                            ? "bg-violet-500 text-white"
                            : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {item.done ? "✓" : item.number}
                    </div>
                    <div className="pt-0.5">
                      <div className="text-xs font-semibold">{item.title}</div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-500">
                        {item.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#11141e]">
              <div className="border-b border-white/[0.08] px-5 py-5">
                <h2 className="text-sm font-bold">Current session</h2>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Thread ID
                  </div>
                  <div className="break-all rounded-lg border border-white/[0.07] bg-slate-950/70 p-3 font-mono text-xs leading-5 text-violet-200">
                    {form.thread_id || "No thread selected"}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Topic
                  </div>
                  <div className="text-sm leading-6 text-slate-300">
                    {form.topic || "Your blog topic will appear here."}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Audience
                  </div>
                  <div className="text-sm text-slate-300">
                    {form.audience || "Not selected"}
                  </div>
                </div>

                <div className="border-t border-white/[0.08] pt-4">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Workflow status
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-400/[0.07] px-3 py-2 text-xs font-semibold text-violet-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    {stage === "setup"
                      ? "Ready to start"
                      : stage === "research"
                        ? "Awaiting research review"
                        : stage === "draft"
                          ? "Awaiting draft review"
                          : "Final blog ready"}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.10] to-indigo-500/[0.04] p-5">
              <div className="mb-3 text-lg">✦</div>
              <h3 className="text-sm font-bold">Your work stays organized</h3>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Use the same thread ID to revisit a saved workflow. Start each
                separate blog with a different ID.
              </p>
            </section>
          </aside>
        </div>

        <footer className="mt-10 border-t border-white/[0.06] pt-6 text-center text-[11px] text-slate-600">
          BlogCraft AI · Powered by your LangGraph workflow
        </footer>
      </main>
    </div>
  );
}
