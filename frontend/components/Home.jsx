"use client";
import SignIn from "@/components/SignIn";
import SignUp from "@/components/SignUp";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import Sidebar from "./UI/Sidebar";
import ChatArea from "./UI/ChatArea";
import Artifact from "./UI/Artifact";
const Home = () => {
  return (
    <div className="flex justify-between w-screen h-screen bg-[#0d0f14]">
      <Sidebar/>
      <ChatArea/>
      <Artifact/>
    </div>
  )
}

export default Home

