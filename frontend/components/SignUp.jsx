"use client";

import { SignUpButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";

export default function SignUp() {
  const { isSignedIn, isLoaded } = useAuth();

  // Stops the button from flashing on the screen while Clerk is loading the session status
  if (!isLoaded) {
    return null; 
  }

  // If the user is logged in, return nothing (render nothing)
  if (isSignedIn) {
    return null;
  }

  // Render the button only if they are fully logged out
  return (
    <SignUpButton mode="modal">
      <button className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition">
        Sign Up
      </button>
    </SignUpButton>
  );
}
