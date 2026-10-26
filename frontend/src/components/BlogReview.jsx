
import { inputClass, primaryButton, secondaryButton } from "./BlogForm";

function markdownToHtml(markdown) {
  if (!markdown) return "";

  let html = String(markdown)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html
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

export default function BlogReview({
  stage,
  contentTitle,
  content,
  finalBlog,
  feedback,
  setFeedback,
  review,
  loading,
  newBlog,
  setNotice,
}) {
  if (stage === "setup") {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalBlog);
      setNotice({
        type: "success",
        text: "Final blog clipboard mein copy ho gaya.",
      });
    } catch {
      setNotice({
        type: "error",
        text: "Copy nahi hua. Blog text manually select karo.",
      });
    }
  };

  return (
    <div className="border-t border-white/[0.08]">
      <div className="pt-6">
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
              onChange={(event) => setFeedback(event.target.value)}
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
              onClick={handleCopy}
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
    </div>
  );
}
