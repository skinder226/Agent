import React from 'react'
import { useState } from 'react';
import { X } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

const MessageBubble = ({ role, content, images }) => {
  const [lightBox, setLightBox] = useState(null);
  const isUser = role == "user";

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
          <div className='flex flex-wrap gap-3 mt-4'>
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

        <div className='min-w-0'>
          <MarkdownRenderer content={content} />
        </div>
      </div>

      {lightBox && (
        <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6'>
          <button
            className='absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 rounded-full p-2'
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
  )
}

export default MessageBubble