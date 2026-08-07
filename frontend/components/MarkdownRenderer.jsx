'use client';

import { Streamdown } from 'streamdown';
import remarkGfm from 'remark-gfm';
import { memo, useCallback, useMemo, useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// We are intentionally NOT using @streamdown/code here. Its default look
// depends on shadcn/ui's CSS variables (--background, --muted-foreground,
// --border, etc.) plus a Tailwind `@source` directive pointed at its dist
// folder — if either is missing, the buttons/box render broken. Instead we
// reuse the exact same hand-styled code block from the react-markdown
// version via Streamdown's `components` override, so styling is identical
// and doesn't depend on shadcn tokens at all.
//
// NOTE: rehypeRaw is intentionally dropped.
// - It's expensive to run on every streamed chunk (full re-parse of raw HTML)
// - It's an XSS risk (renders any raw <script>/<img onerror> the model outputs)
// If you truly need raw HTML passthrough, re-add it deliberately and sanitize.
//
// Required for the `animated` prop below: it injects word-level <span>s
// with data-sd-animate, and the actual @keyframes (fadeIn/blurIn/slideUp)
// live in this stylesheet. Without it, `animated` has no visible effect.
import 'streamdown/styles.css';

const CodeBlock = memo(function CodeBlock({ language, value, isStreaming }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-[#0d0e12] shadow-lg">
      <div className="flex items-center justify-between bg-[#1b1d24] border-b border-white/10 px-4 py-2">
        <span className="uppercase text-xs font-medium tracking-wide text-slate-400">
          {language}
        </span>
        <button
          className="flex items-center gap-1 text-xs text-slate-300 hover:text-white cursor-pointer transition-colors"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="code-scroll overflow-x-auto">
        {isStreaming ? (
          // Cheap fallback while tokens are still arriving — avoids
          // re-running Prism's tokenizer on every chunk.
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
      // Streamdown calls this the same way react-markdown does: once per
      // inline `code` span and once per fenced code block (with a
      // `language-xxx` className on the latter).
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

        return <CodeBlock language={language} value={value} isStreaming={isStreaming} />;
      },
    }),
    [isStreaming]
  );

  return (
    <Streamdown
      // Tells Streamdown whether this block is still actively streaming. It
      // uses this to render "unterminated" markdown gracefully (e.g. an
      // unclosed ** or an incomplete code fence) instead of showing broken
      // formatting mid-stream.
      isAnimating={isStreaming}
      // Without this, content just appears in whatever chunk size the
      // network/backend delivered it in — if your backend (or a proxy in
      // front of it) buffers and flushes in bursts, you get exactly the
      // "1 word then 50 words" jump you're seeing. `animated` decouples the
      // *visual* reveal from delivery chunking: it wraps each word in a
      // span and only newly-mounted spans animate, so a 50-word burst still
      // reveals word-by-word instead of popping in all at once.
      // blurIn masks batchy arrivals better than plain fadeIn.
      animated={{ animation: 'blurIn', duration: 250, easing: 'ease-out' }}
      remarkPlugins={[remarkGfm]}
      // No `plugins={{ code }}` here — we're overriding `code` directly in
      // `components` instead, so the default @streamdown/code UI never
      // renders and can't clash with your theme.
      components={components}
    >
      {content}
    </Streamdown>
  );
}

export default memo(MarkdownRenderer);