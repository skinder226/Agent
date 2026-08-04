import { createSlice } from "@reduxjs/toolkit";



const conversationSlice = createSlice({
  name: "conversation",
  initialState: {
    conversations: [],
    selectedConversation: null,
  },
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action) => {
      state.conversations.unshift(action.payload);
    },
    setSelectedConversation: (state, action) => {
      state.selectedConversation = null
      state.selectedConversation = action.payload;
    },
    deleteSelectedConversation: (state) => {
      state.selectedConversation = null;
    },
    setconversationTitle: (state, action) => {
      const { conversation_id, title } = action.payload;
      state.conversations = state.conversations.map((conversation) => {
        if (conversation._id === conversation_id) {
          return { ...conversation, Title: title };
        }
        return conversation;
      });

      if (state.selectedConversation._id === conversation_id) {
        state.selectedConversation.Title = title;
      }

  },
}});


export const { setConversations, addConversation, setSelectedConversation, deleteSelectedConversation, setconversationTitle } = conversationSlice.actions;
export default conversationSlice.reducer;