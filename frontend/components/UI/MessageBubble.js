import React, { useState } from "react";
import { X } from "lucide-react";
import { ChevronUp, ChevronDown } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

const ThinkingDots = () => (
  <div className="flex items-center gap-1.5 py-1">
    <span className="w-1 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "900ms" }} />
    <span className="w-1 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "900ms" }} />
    <span className="w-1 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "900ms" }} />
  </div>
);

const MessageBubble = ({
  role,
  content,
  images = [],
  isLatest = false,
}) => {
  const [lightBox, setLightBox] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const isUser = role === "user";
  const isActiveAssistantMessage = !isUser && isLatest;
  const limit = 250;
  const hasContent = !!content && content.length > 0;

  const isThinking = isActiveAssistantMessage && !hasContent;
  const isStreamingText = isActiveAssistantMessage && hasContent;

  const renderText = () => {
    if (isThinking) {
      return <ThinkingDots />;
    }
if (isStreamingText) {
  return (
    <span className="inline leading-relaxed custom-markdown-stream">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .custom-markdown-stream > div { display: inline; }
            .custom-markdown-stream > div > p { display: inline; }
          `,
        }}
      />

      <MarkdownRenderer content={content} isStreaming={isActiveAssistantMessage} />
    </span>
  );
}

    if (content.length > limit && isUser) {
      return (
        <>
          <MarkdownRenderer content={showMore ? content : content.slice(0, limit) + "..."} />
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
      <div className={`min-w-0 w-fit max-w-[92vw] md:max-w-[72%] px-4 py-2.5 rounded-2xl break-words overflow-auto table-scroll leading-relaxed ${
        isUser ? "bg-[#111622] text-white rounded-tr-sm text-wrap break-words" : "text-slate-200 rounded-tl-sm"
      }`} >
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
          <img src={lightBox} className="max-w-[90vw] max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
