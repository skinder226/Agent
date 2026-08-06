import { createSlice } from "@reduxjs/toolkit";



const conversationSlice = createSlice({
  name: "conversation",
  initialState: {
    conversations: [],
    selectedConversation: null,
    isCreatingConversation: false,
  },
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    setEndConversations: (state, action) => {
      state.conversations = [...state.conversations, ...action.payload];
    },
    addConversation: (state, action) => {
      state.conversations.unshift(action.payload);
    },
    deleteConversation: (state, action) => {
      const conversation_id = action.payload;
      state.conversations = state.conversations.filter(
        (conversation) => conversation._id !== conversation_id
      );
      // if the deleted one was currently selected, clear the selection
      if (state.selectedConversation?._id === conversation_id) {
        state.selectedConversation = null;
      }
    },
    setSelectedConversation: (state, action) => {
      state.selectedConversation = null
      state.selectedConversation = action.payload;
    },
    deleteSelectedConversation: (state) => {
      state.selectedConversation = null;
    },
    setIsCreatingConversation: (state, action) => {
      state.isCreatingConversation = action.payload;
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


export const { setIsCreatingConversation, setConversations, setEndConversations, addConversation, deleteConversation, setSelectedConversation, deleteSelectedConversation, setconversationTitle } = conversationSlice.actions;
export default conversationSlice.reducer;