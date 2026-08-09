import conversationReducer from "./conversationSlice";
import messageReducer from "./messageSlice";
import artifactReducer from "./ArtifactSlice";
import { configureStore } from "@reduxjs/toolkit";
export const store = configureStore({
  reducer: {
    conversation: conversationReducer,
    message: messageReducer,
    artifact: artifactReducer,
  },
});