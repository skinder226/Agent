import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { ChevronUp, ChevronDown } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

const ThinkingDots = () => (
  <div className="flex items-center gap-1.5 py-1">
    <span
      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
      style={{ animationDelay: "0ms", animationDuration: "900ms" }}
    />
    <span
      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
      style={{ animationDelay: "150ms", animationDuration: "900ms" }}
    />
    <span
      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
      style={{ animationDelay: "300ms", animationDuration: "900ms" }}
    />
  </div>
);

// How long (ms) content can go without changing before we assume the
// stream is finished. Used as a fallback when no explicit `isStreaming`
// prop is passed from Redux. If you wire up `finishLastMessage()` on
// your backend's stream-end event, pass `isStreaming={message.isStreaming}`
// instead and this fallback simply won't matter.
const SETTLE_TIMEOUT_MS = 700;

// Base reveal pace, expressed the same way as before (one char per this
// many ms) when the reveal is caught up with the incoming content. The
// rAF loop below uses this as its baseline and accelerates smoothly when
// a backlog builds up, instead of ticking at a fixed rate or snapping to
// 100% the moment the stream settles.
const TYPE_INTERVAL_MS = 4;

// A markdown table only becomes a real table once BOTH its header row
// and its separator row (e.g. `|---|---|`) are present — until then a
// parser renders the header row as plain text with visible `|`
// characters, which is what causes the "shows text, then converts"
// flash. This scans the (already fully-arrived) content for
// header+separator pairs so the typewriter can jump straight past both
// lines atomically instead of typing the header row raw.
function findTableHeaderBlocks(text) {
  const blocks = [];
  const rowPattern = /^\s*\|.*\|\s*$/;
  const separatorPattern = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

  const lines = text.split("\n");
  let offset = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    if (rowPattern.test(line) && separatorPattern.test(next)) {
      blocks.push({
        start: offset,
        end: offset + line.length + 1 + next.length,
      });
    }
    offset += line.length + 1; // +1 for the newline
  }
  return blocks;
}

const MessageBubble = ({
  role,
  content,
  images = [],
  isLatest = false,     // true only for the newest assistant message
  isStreaming,          // optional explicit flag from Redux (message.isStreaming)
}) => {
  const [lightBox, setLightBox] = useState(null);
  const [showMore, setShowMore] = useState(false);

  const isUser = role === "user";
  const isActiveAssistantMessage = !isUser && isLatest;
  const hasContent = !!content && content.length > 0;

  const limit = 250;

  /* ---------------- settle-based "is the stream done?" fallback ---------------- */
  const [settled, setSettled] = useState(!isActiveAssistantMessage);
  const settleTimerRef = useRef(null);

  useEffect(() => {
    if (!isActiveAssistantMessage) {
      setSettled(true);
      return;
    }
    // Explicit signal from Redux takes priority over the heuristic.
    if (isStreaming === false) {
      setSettled(true);
      return;
    }
    if (isStreaming === true) {
      setSettled(false);
    }

    // Fallback: content changed -> not settled yet, restart the timer.
    setSettled(false);
    clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      setSettled(true);
    }, SETTLE_TIMEOUT_MS);

    return () => clearTimeout(settleTimerRef.current);
  }, [content, isStreaming, isActiveAssistantMessage]);

  /* ---------------- character-reveal typewriter (plain text only) ---------------- */
  const [revealedCount, setRevealedCount] = useState(hasContent ? content.length : 0);
  const rafRef = useRef(null);
  const prevContentRef = useRef(content);

  const isTypingPhase = isActiveAssistantMessage && !settled;

  // Header+separator row pairs detected in the current content, so the
  // reveal loop can jump straight past a table's header before typing
  // it raw. Recomputed only when content changes.
  const tableBlocks = useMemo(() => findTableHeaderBlocks(content), [content]);

  useEffect(() => {
    if (!isTypingPhase) {
      // Not actively typing (finished, or not the live message) — show
      // everything immediately.
      setRevealedCount(content.length);
      prevContentRef.current = content;
      return;
    }

    // If content isn't a continuation of what we had (i.e. a new message
    // took over this slot), restart the reveal from scratch.
    const prev = prevContentRef.current;
    const isContinuation = content.length >= prev.length && content.startsWith(prev);
    if (!isContinuation) {
      setRevealedCount(0);
    }
    prevContentRef.current = content;

    let lastTime = performance.now();
    // Tracks a per-loop "next allowed reveal time" so we can insert tiny
    // organic pauses (e.g. after punctuation) without fighting rAF's
    // per-frame cadence.
    let nextRevealAt = lastTime;

    const tick = (now) => {
      const dt = now - lastTime;
      lastTime = now;

      setRevealedCount((count) => {
        if (count >= content.length) {
          return count;
        }

        // Sitting exactly at the start of a table's header row — jump
        // straight past the header + separator lines in one atomic
        // step so raw "| foo | bar |" text never renders. Data rows
        // after this still type in normally as real table rows, since
        // the header+separator are already present for the parser.
        const enteringTable = tableBlocks.find((b) => b.start === count);
        if (enteringTable) {
          nextRevealAt = now + 40; // tiny pause so the pop-in reads intentionally, not glitchy
          return enteringTable.end;
        }

        // Never overshoot INTO a table's header row mid-line — stop
        // exactly at its start so the jump above can trigger cleanly
        // on the next tick instead of exposing a partial raw row.
        const upcomingBlock = tableBlocks.find((b) => b.start > count);
        const hardCap = upcomingBlock ? upcomingBlock.start : content.length;

        const backlog = content.length - count;

        // When we're behind (a chunk of tokens just landed), catch up
        // fast and skip the organic pacing — this is what makes big
        // pastes-in of text snap into a smooth "fast forward" instead
        // of a slow crawl.
        if (backlog > 15) {
          const baseCharsPerSec = 1000 / TYPE_INTERVAL_MS;
          const speedMultiplier = backlog > 200 ? 14 : backlog > 80 ? 8 : 4;
          const charsToReveal = Math.max(
            1,
            Math.round((baseCharsPerSec * speedMultiplier * dt) / 1000)
          );
          return Math.min(hardCap, count + charsToReveal);
        }

        // Caught up: reveal like a real typist — small variable-size
        // chunks (1-3 chars), gated by a randomized delay so it isn't
        // perfectly metronomic, with a brief extra pause after
        // sentence-ending punctuation and a smaller one after commas —
        // this is the bit that makes it read as "organic" rather than
        // a fixed-rate typewriter.
        if (now < nextRevealAt) {
          return count;
        }

        const chunk = 2 + Math.floor(Math.random() * 4); // 2-5 chars
        const nextCount = Math.min(hardCap, count + chunk);
        const lastChar = content[nextCount - 1];

        let delay = TYPE_INTERVAL_MS * (0.5 + Math.random() * 0.5); // jitter
        if (/[.!?]/.test(lastChar)) {
          delay += 60 + Math.random() * 40; // sentence pause
        } else if (/[,;:]/.test(lastChar)) {
          delay += 20 + Math.random() * 15; // clause pause
        } else if (lastChar === "\n") {
          delay += 30 + Math.random() * 25; // line/paragraph pause
        }

        nextRevealAt = now + delay;
        return nextCount;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [content, isTypingPhase, tableBlocks]);

  const isThinking = isActiveAssistantMessage && !hasContent;
  const displayedText = isTypingPhase ? content.slice(0, revealedCount) : content;
  const showCursor = isTypingPhase; // disappears the moment `settled` flips true

  // Splits already-revealed text into a "safe" chunk (everything up to
  // the last completed line) and a "pending" chunk (the line currently
  // being typed). The safe chunk is a valid, self-contained markdown
  // document as far as line-based constructs go (headers, table rows,
  // list items, closed code fences), so it can go straight through the
  // real markdown renderer every frame. Only the pending line — which
  // may contain half-typed syntax like `| **Contin` or `## Wha` — stays
  // as raw text until it completes and rolls into the safe chunk.
  //
  // This is why tables/headers/bold "snap" into place line-by-line
  // while streaming instead of showing raw `#`/`|`/`**` characters, and
  // why nothing ever gets fed a broken partial token.
  const splitSafeMarkdown = (text) => {
    const lastNewline = text.lastIndexOf("\n");
    if (lastNewline === -1) {
      return { safe: "", pending: text };
    }
    return {
      safe: text.slice(0, lastNewline + 1),
      pending: text.slice(lastNewline + 1),
    };
  };

  const renderText = () => {
    if (isThinking) {
      return <ThinkingDots />;
    }

    if (isTypingPhase) {
      const { safe, pending } = splitSafeMarkdown(displayedText);
      return (
        <>
          {safe && <MarkdownRenderer content={safe} />}
          <span className="whitespace-pre-wrap leading-relaxed">
            {pending}
            {showCursor && (
              <span className="inline-block w-[2px] h-[1em] align-middle ml-0.5 bg-slate-400 animate-pulse" />
            )}
          </span>
        </>
      );
    }

    // Finished / non-latest message
    if (content.length > limit && isUser) {
      return (
        <>
          <MarkdownRenderer
            content={showMore ? content : content.slice(0, limit) + "..."}
          />
          <button
            onClick={() => setShowMore(!showMore)}
            className="mt-3 flex items-center gap-2 rounded-full px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200"
          >
            <span>{showMore ? "Show Less" : "Show More"}</span>
            {showMore ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </>
      );
    }

    return <MarkdownRenderer content={content} />;
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`min-w-0 w-fit max-w-[92vw] md:max-w-[72%] px-4 py-2.5 rounded-2xl break-words overflow-auto table-scroll leading-relaxed ${
          isUser
            ? "bg-[#111622] text-white rounded-tr-sm text-wrap break-words"
            : "text-slate-200 rounded-tl-sm"
        }`}
      >
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                loading="lazy"
                onError={(e) => e.currentTarget.remove()}
                onClick={() => setLightBox(img)}
                className="w-44 h-28 mb-5 rounded-xl object-cover border border-white/10 cursor-zoom-in hover:opacity-90 transition"
              />
            ))}
          </div>
        )}

        <div className="min-w-0">{renderText()}</div>
      </div>

      {lightBox && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <button
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 rounded-full p-2"
            onClick={() => setLightBox(null)}
          >
            <X />
          </button>
          <img
            src={lightBox}
            className="max-w-[90vw] max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;