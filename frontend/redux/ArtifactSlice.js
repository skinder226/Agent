import { createSlice } from "@reduxjs/toolkit";

const artifactSlice = createSlice({
  name: "artifact",
  initialState: {
    isOpen: false,
    isFullscreen: false,
    fileName: "",
    language: "text",
    content: "",
  },
  reducers: {
    openArtifact: (state, action) => {
      const { fileName, language, content } = action.payload;
      state.isOpen = true;
      state.fileName = fileName;
      state.language = language;
      state.content = content;
    },
    updateArtifactContent: (state, action) => {
      // Called while a file is still streaming in, so the panel updates
      // live instead of only showing a snapshot from when it was opened.
      state.content = action.payload;
    },
    closeArtifact: (state) => {
      state.isOpen = false;
      state.isFullscreen = false;
    },
    toggleArtifactFullscreen: (state) => {
      state.isFullscreen = !state.isFullscreen;
    },
  },
});

export const { openArtifact, updateArtifactContent, closeArtifact, toggleArtifactFullscreen } =
  artifactSlice.actions;
export default artifactSlice.reducer;