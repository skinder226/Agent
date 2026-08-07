"use client";
import React, { useEffect } from 'react'
import { PanelLeftIcon, PenSquare, Plus, MessageSquare, PanelRight,ChevronDown } from 'lucide-react'
import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getConversations } from '@/features/get_converation.js';
import { create_conversation } from '@/features/create_conversation.js';
import { useDispatch, useSelector } from 'react-redux';
import { addConversation, deleteConversation, deleteSelectedConversation, setConversations, setSelectedConversation,setIsCreatingConversation } from '@/redux/conversationSlice';
import { useUser } from '@clerk/nextjs'
import { useRef } from 'react';
import { User, Coins } from 'lucide-react';
import SignIn from '@/components/SignIn.jsx'
import SignOut from "@/components/SignOut.jsx"
const Sidebar = () => {
    const { getToken } = useAuth();
    const { user, isSignedIn } = useUser();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [has_more, setHasMore] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [page, setPage] = useState(1);

    const dispatch = useDispatch();
    const { conversations, selectedConversation } = useSelector((state) => state.conversation);
    const getConv = async () => {
        let token = await getToken();;
        let converations = await getConversations(token, page);
        dispatch(setConversations(converations.conversations));
        setHasMore(converations.has_more);
        setPage(page + 1);
        //  I want to do like that the api could return the converation in the objects and the setconveration will be replaced the arry with the object i want to solve it
    }

    const HandelShowMore = async () => {
        let token = await getToken();;
        let converations = await getConversations(token, page);
        dispatch(setConversations([...conversations, ...converations.conversations]));
        setHasMore(converations.has_more);
        setPage(page + 1);
    }



    // console.log("Conversation:", conversations);
    // console.log("ID:", conversations?._id);

    console.log("Selected Conversation:", selectedConversation);
    const Createconv = async () => {
        dispatch(setIsCreatingConversation(true));
        let token = await getToken();
        let created_conversation = await create_conversation(token);
        created_conversation["conversation"]["_id"] = created_conversation["conversation_id"]
        console.log("Created Conversation:", created_conversation);
        dispatch(addConversation(created_conversation["conversation"]));
        dispatch(setIsCreatingConversation(false));
        

    }
    useEffect(() => {
        if (isSignedIn) {
            getConv();
        }
    }, [isSignedIn]);

    if (isCollapsed) {
        return (
            <div className='flex flex-col items-center w-[56px] h-screen bg-[#0d0f14] border-r border-white/[0.06] py-4 
            gap-1 shrink-0'>
                <button
                    onClick={() => {
                        setIsCollapsed(!isCollapsed)
                    }} className='flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 
                hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1'>
                    <PanelRight />
                </button>
                <button
                    className='flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 
                    hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer'
                    onClick={Createconv}>
                    <Plus size={17} />
                </button>
                <div className="flex-1 overflow-y-auto px-2.5 pb-2 scrollbar-none [&:-webkit-scrollbar]:hidden pt-5">

                    {conversations?.map((conversation, i) => {
                        let isActive = selectedConversation?._id === conversation?._id;
                        return (
                            <div
                                onClick={() =>
                                    dispatch(setSelectedConversation(conversation)) && dispatch(setIsCreatingConversation(false))
                                    
                                }
                                className={`flex items-center gap-2.5 cursor-pointer mb-0.5 px-2 py-2 rounded-[10px] border transition-colors duration-150 ${isActive ? "bg-indigo-500/10 border-indigo-500/[0.18]" : "bg-transparent border-transparent hover:bg-white/5"}`} key={conversation?._id || i}>
                                <div className={`flex items-center justify-center shrink-0 w-[26px] h-[26px] rounded-lg transition-colors duration-150 ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-white/[0.05] text-slate-500"}`}>
                                    <MessageSquare size={13} />
                                </div>
                            </div>
                        )

                    })}
                    {has_more && (
                        <div className="flex justify-center mt-2">
                            <button
                                onClick={() => HandelShowMore()}
                                className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer
                       bg-white/[0.05] text-slate-400
                       hover:bg-white/[0.08] hover:text-slate-200
                       transition-all duration-200"
                                title="Show More"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    )}
                </div>

                <div className='relative shrink-0'>
                    {
                        (user?.imageUrl && !imageError)
                            ?
                            <img
                                className='w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25'
                                src={user?.imageUrl}
                                alt={"image"}
                                onError={() => setImageError(true)} />
                            :
                            <div className='w-9 h-9 rounded-[10px] bg-white/10 flex items-center justify-center'>
                                <User size={15} className="text-slate-400" />
                            </div>
                    }
                </div>


            </div>
        )
    }

    return (
        <div className="static inset-y-0 left-0 z-50 h-screen shrink-0 bg-[#0d0f14] w-67.5 border-r border-white/6">
            <div className='flex flex-col h-full'>

                {/* Header */}
                <div className='flex items-center gap-2.5 px-4 py-4 border-b border-white/6'>
                    <div className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors duration-150 bg-transparent border-none cursor-pointer'
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        <PanelLeftIcon />
                    </div>
                    <span className="text-[16px] font-semibold text-slate-100 tracking-tight flex-1">
                        CortexAI
                    </span>
                    <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide">
                        free
                    </span>

                    <button className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors duration-150 bg-transparent border-none cursor-pointer" onClick={Createconv}>
                        <PenSquare size={14} />
                    </button>


                </div>

                {/* New Chat Button */}
                <div className='px-4 pt-4 pb-1' onClick={Createconv}>
                    <button className="w-full flex items-center justify-center gap-2 text-sm  text-white bg-linear-to-br from-indigo-500 to-violet-700 rounded-xl py-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity duration-150 font-bold">
                        <Plus size={15} />
                        New Chat
                    </button>

                </div>

                {/* Chat List */}

                {conversations?.length == 0
                    ?
                    <div className='px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600'>
                        No Recent Conversations
                    </div>
                    :
                    (
                        <div className='px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600'>
                            Recents {conversations?.length > 0 && `(${conversations?.length})`}
                        </div>
                    )
                }

                <div className="flex-1 overflow-y-auto px-2.5 pb-2 scrollbar-none [&:-webkit-scrollbar]:hidden">

                    {conversations?.map((conversation, i) => {
                        let isActive = selectedConversation?._id === conversation?._id;
                        return (
                            <div
                                onClick={() => dispatch(setSelectedConversation(conversation))}
                                className={`flex items-center gap-2.5 cursor-pointer mb-0.5 px-3 py-2.5 rounded-[10px] border transition-colors duration-150 ${isActive ? "bg-indigo-500/10 border-indigo-500/[0.18]" : "bg-transparent border-transparent hover:bg-white/5"}`} key={conversation?._id || i}>
                                <div className={`flex items-center justify-center shrink-0 w-[28px] h-[28px] rounded-lg transition-colors duration-150 ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-white/[0.05] text-slate-500"}`}>
                                    <MessageSquare size={13} />
                                </div>
                                <span className={`text-[13px] font-semibold truncate ${isActive ? "text-slate-100" : "text-slate-300"}`}>
                                    {conversation?.Title || "New Chat"}
                                </span>
                            </div>
                        )

                    })}
                    {has_more && (
                        <div className="flex justify-center py-4">
                            <button
                                onClick={HandelShowMore}
                                className="w-full mx-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 text-sm font-medium hover:bg-white/[0.06] hover:text-slate-200 transition-all duration-200 cursor-pointer">
                                Show More
                            </button>
                        </div>
                    )
                    }
                </div>

                <div className='mx-2.5 h-px bg-white/[0.06]' />
                <div className='px-3.5 py-3.5'>
                    {isSignedIn ? (
                        <div className='flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 hover:bg-white/[0.05] transition-colors duration-150'>
                            <div className='relative shrink-0'>
                                {
                                    (user?.imageUrl && !imageError)
                                        ?
                                        <img
                                            className='w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25'
                                            src={user?.imageUrl}
                                            alt={"image"}
                                            onError={() => setImageError(true)} />
                                        :
                                        <div className='w-9 h-9 rounded-[10px] bg-white/10 flex items-center justify-center'>
                                            <User size={15} className="text-slate-400" />
                                        </div>
                                }
                            </div>
                            <div className='flex-1 min-w-0'>
                                <p className='text-[13.5px] font-semibold text-slate-100 truncate'>{user?.fullName || "user"}</p>
                                <p className='text-[11px] text-slate-600 mt-px'>{"Free Plan"}</p>
                            </div>
                            <div className='flex gap-1'>
                                <button className='flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-yellow-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150'>
                                    <Coins size={16} />
                                </button>
                                <SignOut />
                            </div>



                        </div>
                    ) : (
                        <SignIn />
                    )}


                </div>


            </div>

        </div >
    )


}

export default Sidebar
