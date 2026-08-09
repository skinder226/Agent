'use client';

import React, {
  useCallback, useMemo, useState, useRef, useEffect,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PrismAsyncLight from 'react-syntax-highlighter/dist/esm/prism-async-light';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import jsLang from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsxLang from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import tsLang from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import tsxLang from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import cssLang from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import jsonLang from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import pythonLang from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bashLang from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import yamlLang from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import markdownLang from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import markupLang from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import sqlLang from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import goLang from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import rustLang from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import {
  Eye, Code2, Copy, Check, ChevronDown, Download, Maximize2, Minimize2, X,
  ExternalLink, FileText, Zap,
} from 'lucide-react';
import { closeArtifact } from '@/redux/ArtifactSlice';

// ---------------------------------------------------------------------------
// PrismAsyncLight instead of the full Prism bundle: only the languages
// registered below ever get loaded (as separate async chunks, on demand),
// instead of shipping/parsing every language Prism knows about up front.
// Register once, at module scope, so re-renders don't redo this.
// ---------------------------------------------------------------------------
const SyntaxHighlighter = PrismAsyncLight;
SyntaxHighlighter.registerLanguage('javascript', jsLang);
SyntaxHighlighter.registerLanguage('jsx', jsxLang);
SyntaxHighlighter.registerLanguage('typescript', tsLang);
SyntaxHighlighter.registerLanguage('tsx', tsxLang);
SyntaxHighlighter.registerLanguage('css', cssLang);
SyntaxHighlighter.registerLanguage('json', jsonLang);
SyntaxHighlighter.registerLanguage('python', pythonLang);
SyntaxHighlighter.registerLanguage('bash', bashLang);
SyntaxHighlighter.registerLanguage('yaml', yamlLang);
SyntaxHighlighter.registerLanguage('markdown', markdownLang);
SyntaxHighlighter.registerLanguage('markup', markupLang);
SyntaxHighlighter.registerLanguage('sql', sqlLang);
SyntaxHighlighter.registerLanguage('go', goLang);
SyntaxHighlighter.registerLanguage('rust', rustLang);

// Above this size, highlighting a block synchronously can visibly stall the
// main thread — render it as plain text instead, with an opt-in to force it.
const CODE_BLOCK_HIGHLIGHT_LIMIT = 6000; // chars, per fenced block
const SOURCE_HIGHLIGHT_LIMIT = 30000; // chars, whole document in code view

// ---------------------------------------------------------------------------
// Throttles a fast-changing value (e.g. streaming text growing every few ms)
// down to at most one update per `delay` ms, with a trailing update so the
// final value always lands. This is what keeps ReactMarkdown / Prism from
// re-running on every single incoming character.
// ---------------------------------------------------------------------------
function useThrottledValue(value, delay = 120) {
  const [throttled, setThrottled] = useState(value);
  const lastRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastRef.current;
    if (elapsed >= delay) {
      lastRef.current = now;
      setThrottled(value);
    } else {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        lastRef.current = Date.now();
        setThrottled(value);
      }, delay - elapsed);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [value, delay]);

  return throttled;
}

// If your slice uses different action names, swap this dispatch for the
// real one, e.g. import { closeArtifact } from '@/store/artifactSlice'
const closeArtifactAction = () => ({ type: 'artifact/close' });

const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 320;
const MAX_WIDTH = 900;
const WIDTH_STORAGE_KEY = 'artifact-panel-width';

function guessFilename(title) {
  const base = title
  return `${base || 'artifact'}.md`;
}

const EXT_TO_LANG = {
  js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  css: 'css', scss: 'scss', html: 'markup', xml: 'markup',
  json: 'json', py: 'python', sh: 'bash', bash: 'bash',
  yml: 'yaml', yaml: 'yaml', md: 'markdown', sql: 'sql', go: 'go', rs: 'rust',
};

// Figures out a Prism language id from a filename/title, e.g. "main.css" -> "css".
// Falls back to an explicit `state.artifact.language` if you set one, then to markdown.
function detectLanguage(title, explicitLang) {
  if (explicitLang) return explicitLang;
  const ext = (title || '').split('.').pop()?.toLowerCase();
  return EXT_TO_LANG[ext] || 'markdown';
}

// ---------------------------------------------------------------------------
// Fenced code block: language label + its own copy button, syntax highlighted
// ---------------------------------------------------------------------------
const CodeBlock = React.memo(function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const [forceHighlight, setForceHighlight] = useState(false);
  const isHuge = code.length > CODE_BLOCK_HIGHLIGHT_LIMIT;
  const shouldHighlight = !isHuge || forceHighlight;

  const handleCopy = useCallback(() => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }, [code]);

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/8 bg-[#0a1120]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/8">
        <span className="text-[11px] font-mono text-white/40 flex items-center gap-1.5">
          {lang || 'text'}
          {isHuge && !forceHighlight && <span className="text-white/25">· plain (large block)</span>}
        </span>
        <div className="flex items-center gap-2">
          {isHuge && !forceHighlight && (
            <button
              type="button"
              onClick={() => setForceHighlight(true)}
              className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/80 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Highlight
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/80 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      {shouldHighlight ? (
        <SyntaxHighlighter
          language={lang || 'text'}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '12px 14px',
            background: 'transparent',
            fontSize: '12.5px',
            lineHeight: 1.6,
          }}
          codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }}
        >
          {code}
        </SyntaxHighlighter>
      ) : (
        <pre className="m-0 p-3 text-[12.5px] leading-relaxed text-white/70 font-mono overflow-x-auto whitespace-pre">
          {code}
        </pre>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// react-markdown component overrides — dark-blue Claude-artifact typography
// ---------------------------------------------------------------------------
const markdownComponents = {
  h1: ({ children }) => <h1 className="text-xl font-semibold text-white mt-6 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold text-white mt-5 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-white mt-4 mb-1.5">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-white/90 mt-3 mb-1">{children}</h4>,
  p: ({ children }) => <p className="text-[13.5px] leading-relaxed text-white/75 my-2.5">{children}</p>,
  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
  em: ({ children }) => <em className="text-white/85">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-300"
    >
      {children}
      <ExternalLink className="w-3 h-3 shrink-0" />
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc pl-5 my-2.5 space-y-1 text-[13.5px] text-white/75">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-2.5 space-y-1 text-[13.5px] text-white/75">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-sky-400/40 pl-3 my-3 text-white/55 italic text-[13.5px]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-white/10 my-5" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-white/8">
      <table className="w-full text-[13px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/[0.04]">{children}</thead>,
  th: ({ children }) => <th className="text-left px-3 py-2 border-b border-white/10 text-white/80 font-medium">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 border-b border-white/5 text-white/70">{children}</td>,
  code({ inline, className, children }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');
    if (inline) {
      return <code className="text-sky-300 bg-white/8 rounded px-1 py-0.5 text-[0.85em] font-mono">{codeString}</code>;
    }
    return <CodeBlock lang={match?.[1]} code={codeString} />;
  },
};

// ---------------------------------------------------------------------------
// Raw "code view" — the source content, syntax highlighted by detected
// language, with a line-number gutter. Skips highlighting for very large
// documents by default (still shows line numbers) since Prism tokenizing a
// huge string synchronously is the single biggest source of jank here.
// ---------------------------------------------------------------------------
const SourceView = React.memo(function SourceView({ content, language }) {
  const [forceHighlight, setForceHighlight] = useState(false);
  const isHuge = content.length > SOURCE_HIGHLIGHT_LIMIT;
  const shouldHighlight = !isHuge || forceHighlight;

  if (!shouldHighlight) {
    const lines = content.split('\n');
    return (
      <div>
        <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] text-white/40 border-b border-white/8">
          <Zap className="w-3 h-3" />
          Large file — showing plain text for speed.
          <button
            type="button"
            onClick={() => setForceHighlight(true)}
            className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
          >
            Highlight anyway
          </button>
        </div>
        <div className="flex text-[12.5px] font-mono leading-relaxed">
          <div className="select-none text-right pr-3 pl-4 py-4 text-white/20 border-r border-white/8 shrink-0">
            {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <div className="flex-1 overflow-x-auto py-4 pl-4 pr-4 text-white/70 whitespace-pre">
            {lines.map((line, i) => <div key={i}>{line || '\u00A0'}</div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      showLineNumbers
      wrapLongLines={false}
      customStyle={{
        margin: 0,
        padding: '16px 0',
        background: 'transparent',
        fontSize: '12.5px',
        lineHeight: 1.6,
      }}
      lineNumberStyle={{
        minWidth: '3em',
        paddingRight: '1em',
        color: 'rgba(255,255,255,0.2)',
        userSelect: 'none',
      }}
      codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }}
    >
      {content}
    </SyntaxHighlighter>
  );
});


function ArtifactPreview({ content, language }) {
  const lang = (language || '').toLowerCase();

  const previewDocument = useMemo(() => {
    if (!content) return '';

    // HTML
    if (lang === 'html' || lang === 'htm' || lang === 'markup') {
      if (/<html[\s>]/i.test(content) || /<!doctype html>/i.test(content)) {
        return content;
      }

      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
${content}
</body>
</html>
`;
    }

    // CSS
    if (lang === 'css') {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <style>
${content}
  </style>
</head>

<body>
  <div class="preview-content">
    <h1>CSS Preview</h1>
    <p>This page is using your generated CSS.</p>
    <button>Example Button</button>
  </div>
</body>
</html>
`;
    }

    // JavaScript
    if (lang === 'javascript' || lang === 'js') {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 24px;
      background: white;
      color: #111;
    }

    pre {
      background: #111;
      color: #fff;
      padding: 12px;
      border-radius: 8px;
      white-space: pre-wrap;
    }
  </style>
</head>

<body>
  <div id="app"></div>

  <script>
    try {
${content}
    } catch (error) {
      document.getElementById('app').innerHTML =
        '<pre>' + error.stack + '</pre>';
    }
  </script>
</body>
</html>
`;
    }

    return '';
  }, [content, lang]);

  if (!previewDocument) {
    return (
      <div className="h-full flex items-center justify-center text-white/40 text-sm">
        Preview is not available for {language || 'this file'}.
      </div>
    );
  }

  return (
    <iframe
      title="Artifact Preview"
      srcDoc={previewDocument}
      sandbox="allow-scripts"
      className="w-full h-full min-h-[600px] border-0 bg-white"
    />
  );
}

const Artifact = () => {
  const isOpen = useSelector((state) => state.artifact.isOpen);
  const content = useSelector((state) => state.artifact.content);
  const explicitLanguage = useSelector((state) => state.artifact.language);
  const title = useSelector((state) => state.artifact.fileName) || 'Artifact';
  const language = useSelector((state) => state.artifact.language) || detectLanguage(title, explicitLanguage);
  const isStreaming = useSelector((state) => state.artifact.isStreaming) || false;
  // Optional explicit override, e.g. state.artifact.language = 'css'

  // While actively streaming, feed the (expensive) renderers a throttled copy
  // of content instead of re-rendering on every incoming character/chunk.
  // Once streaming stops, render the real value immediately.
  const throttledContent = useThrottledValue(content, 150);
  const renderContent = isStreaming ? throttledContent : content;

  const dispatch = useDispatch();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('code'); // 'preview' | 'code'
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const menuRef = useRef(null);

  // ---- resizable width ----
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const dragStateRef = useRef({ startX: 0, startWidth: DEFAULT_WIDTH });

  // Restore a saved width on mount.
  useEffect(() => {
    const saved = Number(window.localStorage.getItem(WIDTH_STORAGE_KEY));
    if (saved && saved >= MIN_WIDTH && saved <= MAX_WIDTH) setWidth(saved);
  }, []);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    dragStateRef.current = { startX: e.clientX, startWidth: width };
    setIsResizing(true);
  }, [width]);

  useEffect(() => {
    if (!isResizing) return undefined;

    const handleMouseMove = (e) => {
      // Panel is on the right edge and its border-l is the drag handle, so
      // dragging left (negative delta) should grow the panel.
      const delta = dragStateRef.current.startX - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStateRef.current.startWidth + delta));
      setWidth(next);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setWidth((current) => {
        window.localStorage.setItem(WIDTH_STORAGE_KEY, String(current));
        return current;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleClose = useCallback(() => {
    dispatch(closeArtifact());
  }, [dispatch]);

  const handleCopy = useCallback(() => {
    if (!content || !navigator?.clipboard) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      setMenuOpen(false);
    });
  }, [content]);

  const handleDownload = useCallback(() => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title ? guessFilename(title) : 'artifact.md';
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  }, [content, title]);

  if (!isOpen) return null;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-[#0a0f1e]'
          : 'hidden lg:flex relative h-full border-l border-white/8 flex-col overflow-hidden shrink-0 bg-[#0a0f1e]'
      }
      style={isFullscreen ? undefined : { width: `${width}px` }}
    >
      {/* Drag handle — grabbing the left edge resizes the panel */}
      {!isFullscreen && (
        <div
          onMouseDown={handleResizeStart}
          className={`absolute left-0 top-0 h-full w-1.5 -translate-x-1/2 cursor-col-resize z-20 group ${isResizing ? 'bg-sky-400/60' : 'bg-transparent hover:bg-sky-400/40'} transition-colors`}
        >
          <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full ${isResizing ? 'bg-sky-400' : 'bg-white/15 group-hover:bg-sky-400/70'} transition-colors`} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/8 bg-[#0d1428] shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            title="Preview"
            className={`cursor-pointer p-1.5 rounded-md transition-colors ${viewMode === 'preview' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('code')}
            title="Source"
            className={`cursor-pointer p-1.5 rounded-md transition-colors ${viewMode === 'code' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
          >
            <Code2 className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1.5 shrink-0" />

          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-sm text-white/85 truncate ml-1">{title}</span>
          <span className="text-sm text-white/30 shrink-0">· {language.toUpperCase()}</span>

          {isStreaming && (
            <span className="flex items-center gap-1 text-[11px] text-sky-300/80 shrink-0 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              writing…
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="relative" ref={menuRef}>
            <div className="flex items-center rounded-md border border-white/10 bg-white/5 overflow-hidden">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!content}
                className="flex items-center gap-1.5 pl-2.5 pr-2 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                disabled={!content}
                className="px-1 py-1 border-l border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80 disabled:opacity-30 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-40 rounded-md border border-white/10 bg-[#141d33] shadow-xl py-1 z-10">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/75 hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy contents
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/75 hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download as .{language}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            title={isFullscreen ? 'Exit fullscreen' : 'Expand'}
            className="p-1.5 rounded-md text-white/50 hover:text-white/90 hover:bg-white/8 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleClose}
            title="Close"
            className="p-1.5 rounded-md text-white/50 hover:text-white/90 hover:bg-white/8 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {renderContent ? (
          viewMode === 'preview' ? (
            <div className="w-full h-full min-h-[600px]">
              <ArtifactPreview
                content={renderContent}
                language={language}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <SourceView
                content={renderContent}
                language={language}
              />
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-white/25 text-sm text-center px-6">
            {isStreaming ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                Waiting for the first token…
              </span>
            ) : (
              <span>Nothing here yet</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Artifact;