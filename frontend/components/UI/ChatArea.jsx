"use client"
import React from 'react'
import Nav from './Nav'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { useEffect } from 'react'
import getmessages from '@/features/get_messages'
import { useDispatch, useSelector } from 'react-redux'
import { setMessages } from '@/redux/messageSlice'
import { useAuth } from "@clerk/nextjs"
  const ChatArea = () => {
    const { selectedConversation } = useSelector((state) => state.conversation)
    const { messages } = useSelector((state) => state.message)
    const { getToken } = useAuth()
    const dispatch = useDispatch();
    const get_msg = async () => {
      if (selectedConversation) {
        const response = await getmessages(selectedConversation?._id, await getToken());
        console.log("response" , response);
        if (response.error) {
          console.error(response.error);
        } else {
            console.log("Messages for conversation", response.messages);
            if (response.messages.length === 0) {
                console.log("No messages found for this conversation.");
            }
            else {
            dispatch(setMessages(response.messages));
            }
        }
      }
    }
    useEffect(() => {
      get_msg();
    }, [selectedConversation]);
    return (
      <div className="min-w-0 flex-1 flex flex-col">
        <Nav />
        <MessageList />
        <ChatInput />
      </div>
    )
  }

  export default ChatArea
