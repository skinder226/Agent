'use client';

import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import remarkGfm from 'remark-gfm';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from "rehype-raw";
export default function MarkdownRenderer({ content }) {
  const [copiedCode, setCopiedCode] = useState("");

  const handleCopy = async (code) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  return (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw]}
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className='text-2xl font-bold mt-6 mb-3 text-white'>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className='text-xl font-semibold mt-5 mb-2 text-white'>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className='text-lg font-semibold mt-4 mb-2 text-white'>{children}</h3>
        ),
        p: ({ children }) => (
          <p className='mb-3 leading-relaxed whitespace-pre-wrap break-words text-slate-200'>
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className='font-semibold text-white'>{children}</strong>
        ),
        em: ({ children }) => (
          <em className='italic text-slate-300'>{children}</em>
        ),
        ul: ({ children }) => (
          <ul className='list-disc pl-5 space-y-1 my-2 text-slate-200'>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className='list-decimal pl-5 space-y-1 my-2 text-slate-200'>{children}</ol>
        ),
        li: ({ children }) => (
          <li className='marker:text-indigo-400'>{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className='border-l-4 border-indigo-500/50 bg-white/5 pl-4 py-2 my-4 italic text-slate-300 rounded-r-md'>
            {children}
          </blockquote>
        ),
        hr: () => <hr className='my-6 border-white/10' />,
        table: ({ children }) => (
          <div className='table-scroll overflow-x-auto my-4 rounded-xl border border-white/10'>
            <table className='min-w-full border-separate border-spacing-0 text-sm'>
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className='bg-white/5'>{children}</thead>
        ),
        tr: ({ children }) => (
          <tr className='[&>td]:border-b [&>td]:border-white/10 last:[&>td]:border-b-0'>
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className='border-b border-white/10 px-3 py-2 text-left font-semibold text-white first:rounded-tl-xl last:rounded-tr-xl'>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className='px-3 py-2 text-slate-200'>
            {children}
          </td>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target='_blank'
            rel='noreferrer'
            className='text-indigo-400 hover:text-indigo-300 underline underline-offset-2 inline-flex items-center gap-1 transition-colors'
          >
            {children}
            <ExternalLink size={14} />
          </a>
        ),
        code: ({ className, children }) => {
          const value = String(children).trim();

          if (!className) {
            return (
              <code className='px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 text-[0.9em] font-mono'>
                {value}
              </code>
            );
          }

          const language = className?.replace('language-', '') || 'text';

          return (
            <div className='my-4 overflow-hidden rounded-xl border border-white/10 bg-[#0d0e12] shadow-lg'>
              <div className='flex items-center justify-between bg-[#1b1d24] border-b border-white/10 px-4 py-2'>
                <span className='uppercase text-xs font-medium tracking-wide text-slate-400'>
                  {language}
                </span>
                <button
                  className='flex items-center gap-1 text-xs text-slate-300 hover:text-white cursor-pointer transition-colors'
                  onClick={() => handleCopy(value)}
                >
                  {copiedCode === value ? (
                    <>
                      <Check size={14} className='text-emerald-400' />
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
              <div className='code-scroll overflow-x-auto'>
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
              </div>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}