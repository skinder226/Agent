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
      state.messages.push(action.payload);
    },
    // in your messageSlice.js, alongside addMessage and setMessages
    appendToLastMessage: (state, action) => {
      const last = state.messages[state.messages.length - 1]
      if (last && last.role === "assistant") {
        last.content += action.payload
      }
    },
    setLastMessageImages: (state, action) => {
      const last = state.messages[state.messages.length - 1]
      if (last && last.role === "assistant") {
        last.images = action.payload
      }
    },
  },
});


export const { setMessages, addMessage, appendToLastMessage, setLastMessageImages } = messageSlice.actions;
export default messageSlice.reducer;