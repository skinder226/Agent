import React from 'react'
import { useState } from 'react'
import { Paperclip, Mic, Send, Zap, MessagesSquare, Code2, FileText, Presentation, ImageIcon } from "lucide-react"
import sendMessage from "@/features/sendMessage"
import { useSelector } from "react-redux"
import { useAuth } from "@clerk/nextjs"
import { useDispatch } from 'react-redux'
import { addMessage, appendToLastMessage, setLastMessageImages } from '@/redux/messageSlice'
import {setIsCreatingConversation} from '@/redux/conversationSlice'
import { create_conversation } from '@/features/create_conversation.js'
import { update_conversation } from '@/features/update_covnersation.js'
import { addConversation, setconversationTitle, setSelectedConversation, setIsStreaming } from '@/redux/conversationSlice'

const ChatInput = () => {
  const { getToken } = useAuth()
  const [selectedAgent, setSelectedAgent] = useState("auto")
  const [value, setValue] = useState("")
  const [error, setError] = useState(null)
  const { selectedConversation, isStreaming } = useSelector((state) => state.conversation)
  const dispatch = useDispatch()

  const handleSend = async () => {
    const trimmed = value.trim()
    setValue("")
    if (!trimmed) return

    setError(null)

    try {
      let conversation = selectedConversation
      if (!conversation) {
        dispatch(setIsCreatingConversation(true))
        const res = await create_conversation(await getToken())
        const conv = res.conversation
        conv["_id"] = res.conversation_id
        dispatch(setSelectedConversation(conv))
        dispatch(addConversation(conv))
        conversation = conv
        // NOTE: setIsCreatingConversation(false) is intentionally NOT
        // dispatched here. ChatArea's effect (watching selectedConversation)
        // needs to still see isCreatingConversation === true when it fires,
        // so it knows to skip fetching messages for this brand-new
        // conversation instead of racing the fetch against the optimistic
        // addMessage calls below. ChatArea resets the flag itself once it
        // has consumed it.
      }

      if (conversation.Title == "New Chat") {
        await update_conversation(conversation?._id, trimmed.slice(0,21), await getToken())
        dispatch(setconversationTitle({ conversation_id: conversation?._id, title: trimmed.slice(0,21)}))
      }

      dispatch(addMessage({ role: "user", content: trimmed,conversation_id: conversation?._id }))
      // placeholder assistant message that we'll stream tokens into
      dispatch(addMessage({ role: "assistant", content: "", images: [],conversation_id: conversation?._id }))

      dispatch(setIsStreaming(true))

      // Buffer incoming tokens and flush them to Redux on a fixed interval
      // instead of once per token. Every dispatch triggers a full
      // MarkdownRenderer re-parse of the whole accumulated message, so
      // dispatching per-token (which can be dozens of times/sec) makes that
      // cost scale with token rate AND with how long the message has grown
      // to. Flushing at a fixed ~40ms cadence caps the re-parse frequency
      // regardless of how fast tokens arrive, without visibly changing how
      // "live" the typing feels.
      let pendingChunk = ""
      let flushHandle = null
      const flush = () => {
        if (pendingChunk) {
          dispatch(appendToLastMessage(pendingChunk))
          pendingChunk = ""
        }
        flushHandle = null
      }

      const result = await sendMessage(
        conversation?._id,
        trimmed,
        await getToken(),
        selectedAgent.toLowerCase(),
        (chunk) => {
          pendingChunk += chunk
          if (!flushHandle) {
            flushHandle = setTimeout(flush, 40)
          }
        }
      )

      // Make sure the final partial buffer isn't lost if the stream ends
      // between two flush intervals.
      if (flushHandle) clearTimeout(flushHandle)
      flush()

      dispatch(setIsStreaming(false))

      if (result.error) {
        console.error(result.error)
        setError(result.error)
        dispatch(appendToLastMessage("Sorry, something went wrong. Please try again."))
        return
      }

      dispatch(setLastMessageImages(result.images || []))
    } catch (err) {
      console.error(err)
      dispatch(setIsStreaming(false))
      setError(err.message)
      dispatch(appendToLastMessage("Sorry, something went wrong. Please try again."))
    }
  }

  const agents = [
    { id: "auto",     icon: Zap,           label: "Auto" },
    { id: "chat",     icon: MessagesSquare, label: "Chat" },
    { id: "coding",   icon: Code2,         label: "Coding" },
    { id: "pdf",      icon: FileText,      label: "PDF" },
    { id: "ppt",      icon: Presentation,  label: "PPT" },
    { id: "image",    icon: ImageIcon,     label: "Image" },
  ]

  return (
    <div className='w-full overflow-hidden px-3 md:px-5 py-4 border-t border-white/[0.06] bg-[#0d0f14]'>
      <div className='flex flex-col gap-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 pt-3.5 pb-3'>
        {error && (
          <div className='text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2'>
            {error}
          </div>
        )}

        <div className='flex w-[80%] gap-2 pr-2 flex-wrap'>
          {agents.map((agent) => {
            const isActive = selectedAgent === agent.id
            const Icon = agent.icon
            return (
              <div
                key={agent.label}
                onClick={() => setSelectedAgent(agent.id)}
                className={`cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? "bg-linear-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-[0_1px_8px_rgba(99,102,241,.35)]"
                    : "bg-white/3 text-slate-400 border-white/6 hover:bg-white/[0.07]"
                }`}>
                <Icon size={14} className={isActive ? "text-white" : "text-slate-500"} />
                {agent.label}
              </div>
            )
          })}
        </div>

        <textarea
          placeholder='Ask Anything...'
          onChange={(e) => setValue(e.target.value)}
          value={value}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          className='w-full bg-transparent outline-none resize-none text-[14px] text-slate-200 placeholder:text-slate-600 leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden disabled:opacity-50'
          rows={3}
        />
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-1'>
            <button className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer'>
              <Paperclip size={16} />
            </button>
            <button className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer'>
              <Mic size={16} />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!value.trim() || isStreaming}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-150 ${
              value.trim() && !isStreaming
                ? "bg-linear-to-br from-indigo-500 to-violet-700 hover:opacity-90 text-white"
                : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
            }`}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInput