"use client";
import { LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { useDispatch} from 'react-redux';
import { setConversations } from "@/redux/conversationSlice";
export default function SignOut() {
  const dispatch = useDispatch();
  return (
    <div className="flex gap-4">
      <SignOutButton mode="modal">
        <button className='flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-slate-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150' onClick={() => {
            dispatch(setConversations([]));

        }}>
          <LogOut size={16} />
        </button>
      </SignOutButton>
    </div>
  );
}