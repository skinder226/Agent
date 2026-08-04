"use client";

import { SignInButton, SignOutButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import SignUp from '@/components/SignUp.jsx'

export default function SignIn() {
  const {  isLoaded } = useAuth();

  // Prevent UI flashing/flickering while Clerk loads the authentication state
  if (!isLoaded) {
    return <div className="text-gray-500">Loading...</div>; 
  }

  return (
    <div>   
        <div className="gap-4 flex items-center">
        <SignInButton mode="modal">
          <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition">
            Sign In
          </button>
        </SignInButton>
        <SignUp />
        </div>
    </div>
  );
}
