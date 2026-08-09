'use client';

import { Streamdown } from 'streamdown';
import remarkGfm from 'remark-gfm';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Copy, Check, Download, Code2, Loader2 } from 'lucide-react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ---------------------------------------------------------------------------
// Why Streamdown instead of plain react-markdown:
//
// react-markdown re-parses the ENTIRE accumulated string into a brand new
// AST and rebuilds a brand new element tree on every single content change.
// For a live-streaming chat message that's dispatched dozens of times/sec,
// that cost scales with both update frequency AND how long the message has
// grown to (effectively O(n^2) over the life of one streamed response) —
// this is what caused the visible lag.
//
// Streamdown is built specifically for this case: it does incremental
// parsing, only re-processing the "unterminated" tail of the document
// instead of the whole thing, and its `animated` prop gives a smooth
// per-word reveal even when tokens arrive in bursts (batched by the
// network) rather than one at a time.
//
// rehypeRaw is intentionally NOT used:
// - it forces a full raw-HTML re-parse on every streamed chunk (expensive)
// - it's an XSS surface (renders any raw <script>/<img onerror> the model
//   outputs). Re-add deliberately + sanitize if raw HTML passthrough is
//   ever actually needed.
// ---------------------------------------------------------------------------

import 'streamdown/styles.css';

const EXTENSIONS = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  jsx: 'jsx',
  tsx: 'tsx',
  bash: 'sh',
  shell: 'sh',
  json: 'json',
  html: 'html',
  css: 'css',
  java: 'java',
  go: 'go',
  rust: 'rs',
  ruby: 'rb',
  php: 'php',
  sql: 'sql',
  yaml: 'yaml',
  markdown: 'md',
};

// Above this many lines, a code block collapses into a compact file card
// (name + type + download) instead of rendering the full code inline —
// same idea as Claude's own "big generated file" card. Keeps very large
// generated files from turning the chat into an unreadable wall of code.
const LARGE_FILE_LINE_THRESHOLD = 40;

const LANGUAGE_LABELS = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  bash: 'Bash',
  shell: 'Shell',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  java: 'Java',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  php: 'PHP',
  sql: 'SQL',
  yaml: 'YAML',
  markdown: 'Markdown',
};

/**
 * FileCard — collapsed representation of a large generated file.
 *
 * While `isGenerating` is true (this code block belongs to the message
 * that's still actively streaming), the right-hand side shows a spinner
 * instead of a Download button — there's nothing complete to download
 * yet, and offering a button that would download a half-written file is
 * worse than just being honest that it's still in progress. Once
 * streaming finishes, it swaps to a real Download button.
 */
function FileCard({ fileName, language, value, isGenerating }) {
  const handleDownload = useCallback(() => {
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [value, fileName]);

  const label = LANGUAGE_LABELS[language] || language;

  return (
    <div className="my-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#14161c] px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-slate-300">
          <Code2 size={18} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{fileName}</div>
          <div className="text-xs text-slate-500">Code &middot; {label}</div>
        </div>
      </div>

      {isGenerating ? (
        <div className="flex shrink-0 items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          Generating
        </div>
      ) : (
        <button
          onClick={handleDownload}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.1] cursor-pointer transition-colors"
        >
          <Download size={14} />
          Download
        </button>
      )}
    </div>
  );
}

/**
 * CodeBlock — ChatGPT-style code block: language label, copy + download
 * icon buttons, syntax highlighting, line numbers.
 *
 * Memoized on its own so that when the parent markdown tree re-renders
 * (streaming tokens), unchanged code blocks don't get re-tokenized by
 * Prism — only the block whose `value` actually changed re-highlights.
 *
 * While `isStreaming` is true, renders a plain <pre> instead of running
 * Prism, since the block's content is still changing every update and
 * highlighting it on every partial line is wasted work. Once streaming
 * settles, it re-renders once, fully highlighted.
 */
const CodeBlock = memo(function CodeBlock({ language, value, isStreaming }) {
  const [copied, setCopied] = useState(false);

  // Defer the expensive Prism highlight pass until *after* the browser has
  // had a chance to paint the plain-text version. Without this, opening a
  // conversation with N code blocks runs Prism synchronously for all N of
  // them in the same render/commit — that's what blocks the main thread
  // and produces the lag you're feeling right when a conversation with
  // code in it mounts. requestAnimationFrame here lets the initial paint
  // (plain <pre>) land first, then the highlighted version swaps in a
  // frame later — imperceptible per-block, but it turns "N blocks' worth
  // of blocking work in one frame" into "N blocks' worth of work spread
  // across N frames", which is what actually removes the jank.
  const [highlightReady, setHighlightReady] = useState(false);

  useEffect(() => {
    if (isStreaming) return;
    const id = requestAnimationFrame(() => setHighlightReady(true));
    return () => cancelAnimationFrame(id);
  }, [isStreaming]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  const handleDownload = useCallback(() => {
    const ext = EXTENSIONS[language] || 'txt';
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snippet.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [language, value]);

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-[#0b0c0f] p-3">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-xs font-medium text-slate-400">{language}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            title="Download"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
          >
            <Download size={15} />
          </button>
          <button
            onClick={handleCopy}
            title="Copy"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
          >
            {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          </button>
        </div>
      </div>
      <div className="code-scroll overflow-x-auto rounded-lg border border-white/10 bg-[#0d0e12]">
        {isStreaming || !highlightReady ? (
          <pre className="m-0 p-4 text-sm font-mono text-slate-200 whitespace-pre-wrap break-words">
            {value}
          </pre>
        ) : (
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            showLineNumbers
            wrapLines={false}
            lineNumberStyle={{
              minWidth: '2.5em',
              paddingRight: '1em',
              color: '#4b5563',
              userSelect: 'none',
            }}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              fontSize: '0.85rem',
              lineHeight: '1.6',
            }}
            codeTagProps={{
              style: { fontFamily: "'JetBrains Mono', monospace" },
            }}
          >
            {value}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
});

function MarkdownRenderer({ content, isStreaming = false }) {
  // Gives each code block in this message a stable index (Codeblock1,
  // Codeblock2, ...) for the collapsed file card's display name, without
  // needing the markdown source to carry an explicit filename.
  const codeBlockIndexRef = useRef(0);
  codeBlockIndexRef.current = 0;

  // Stable identity across renders (only changes when isStreaming flips) so
  // Streamdown doesn't treat every render as a brand-new component set.
  const components = useMemo(
    () => ({
      h1: ({ children }) => (
        <h1 className="text-2xl font-bold mt-6 mb-3 text-white">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-xl font-semibold mt-5 mb-2 text-white">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-lg font-semibold mt-4 mb-2 text-white">{children}</h3>
      ),
      p: ({ children }) => (
        <p className="mb-3 leading-relaxed whitespace-pre-wrap break-words text-slate-200">
          {children}
        </p>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-white">{children}</strong>
      ),
      em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
      ul: ({ children }) => (
        <ul className="list-disc pl-5 space-y-1 my-2 text-slate-200">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal pl-5 space-y-1 my-2 text-slate-200">{children}</ol>
      ),
      li: ({ children }) => <li className="marker:text-indigo-400">{children}</li>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-indigo-500/50 bg-white/5 pl-4 py-2 my-4 italic text-slate-300 rounded-r-md">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-6 border-white/10" />,
      table: ({ children }) => (
        <div className="table-scroll overflow-x-auto my-4 rounded-xl overflow-hidden">
          <table className="min-w-full my-5 border-separate border-spacing-0 text-sm border border-white/10 rounded-2xl">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
      tr: ({ children }) => (
        <tr className="[&>td]:border-b [&>td]:border-white/10 last:[&>td]:border-b-0">
          {children}
        </tr>
      ),
      th: ({ children }) => (
        <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white first:rounded-tl-xl last:rounded-tr-xl">
          {children}
        </th>
      ),
      td: ({ children }) => <td className="px-3 py-2 text-slate-200">{children}</td>,
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 inline-flex items-center gap-1 transition-colors"
        >
          {children}
          <ExternalLink size={14} />
        </a>
      ),
      code: ({ className, children }) => {
        const value = String(children).trim();

        if (!className) {
          return (
            <code className="px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 text-[0.9em] font-mono">
              {value}
            </code>
          );
        }

        const language = className?.replace('language-', '') || 'text';
        const lineCount = value.split('\n').length;

        if (lineCount > LARGE_FILE_LINE_THRESHOLD) {
          codeBlockIndexRef.current += 1;
          const ext = EXTENSIONS[language] || 'txt';
          const fileName = `Codeblock${codeBlockIndexRef.current}.${ext}`;
          return (
            <FileCard
              fileName={fileName}
              language={language}
              value={value}
              isGenerating={isStreaming}
            />
          );
        }

        return <CodeBlock language={language} value={value} isStreaming={isStreaming} />;
      },
    }),
    [isStreaming]
  );

  return (
    <Streamdown
      // Tells Streamdown this block is still actively streaming — it skips
      // committing to "finished" markdown structures (e.g. won't close an
      // unterminated ** or code fence early) and enables the smooth reveal
      // animation below.
      isAnimating={isStreaming}
      // Per-word fade/blur reveal. Decouples the *visual* reveal from
      // delivery chunking — even if the network/backend delivers 40 words
      // in one burst, each word individually animates in, so it reads as
      // continuous typing instead of a pop. blurIn masks bursty arrivals
      // better than plain opacity fades.
      animated={{ animation: 'blurIn', duration: 200, easing: 'ease-out' }}
      remarkPlugins={[remarkGfm]}
      components={components}
    >
      {content}
    </Streamdown>
  );
}

// A parent re-render (sibling message updating, unrelated Redux slice
// changing, etc.) shouldn't re-parse this message's markdown unless its
// own content or streaming state actually changed.
export default memo(MarkdownRenderer);