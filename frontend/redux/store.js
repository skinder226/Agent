import conversationReducer from "./conversationSlice";
import messageReducer from "./messageSlice";
import { configureStore } from "@reduxjs/toolkit";
export const store = configureStore({
  reducer: {
    conversation: conversationReducer,
    message: messageReducer,
  },
});