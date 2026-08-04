"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { toast } from "react-toastify";

export default function VerifyUser() {
  const { getToken, isSignedIn, isLoaded,signOut } = useAuth();

  useEffect(() => {
    // Wait until Clerk has fully loaded auth state before doing anything
    if (!isLoaded) return;

    if (!isSignedIn) {
      console.log("User is not logged in");
      return;
    }

    async function verifyUser() {
      try {
        const token = await getToken();


        if (!token) {
          console.error("No token returned from getToken()");
          return;
        }

        console.log("JWT Token:", token);

        const response = await fetch("http://localhost:8000/auth/verification", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token} `,
          },
        });

        // Guard against non-JSON responses (HTML error pages, network issues, etc.)
        if (!response.ok) {
          const text = await response.text();
          console.error(
            "Verification failed:",
            response.status,
            text.slice(0, 300) // avoid dumping a huge HTML page into console
          );
          toast.error("Verification failed");
          signOut(); // Sign out the user if verification fails
          return;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Expected JSON but got:", contentType, text.slice(0, 300));
          return;
        }

        const data = await response.json();
        console.log("Verification success:", data);
      } catch (err) {
        console.error("verifyUser threw an error:", err);
      }
    }

    verifyUser();
  }, [isLoaded, isSignedIn, getToken]);

  return null; // no visible UI, runs silently in the background
}