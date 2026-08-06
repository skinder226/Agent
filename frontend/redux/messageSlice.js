import { createSlice } from "@reduxjs/toolkit";



const messageSlice = createSlice({
  name: "message",
  initialState: {
    messages: [],
  },
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      // If it's an assistant placeholder being added while streaming,
      // make sure it's flagged so the UI knows to show the cursor/dots.
      state.messages.push(action.payload);
    },
    // in your messageSlice.js, alongside addMessage and setMessages
    appendToLastMessage: (state, action) => {
      const last = state.messages[state.messages.length - 1]
      if (last && last.role === "assistant") {
        last.content += action.payload
        last.isStreaming = true
      }
    },
    setLastMessageImages: (state, action) => {
      const last = state.messages[state.messages.length - 1]
      if (last && last.role === "assistant") {
        last.images = action.payload
      }
    },
    // Call this once the backend stream closes (onComplete / done event)
    finishLastMessage: (state) => {
      const last = state.messages[state.messages.length - 1]
      if (last && last.role === "assistant") {
        last.isStreaming = false
      }
    },
  },
});


export const {
  setMessages,
  addMessage,
  appendToLastMessage,
  setLastMessageImages,
  finishLastMessage,
} = messageSlice.actions;
export default messageSlice.reducer;