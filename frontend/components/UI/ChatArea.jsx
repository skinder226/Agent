"use client"
import React from 'react'
import Nav from './Nav'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { useEffect, useRef } from 'react'
import getmessages from '@/features/get_messages'
import { useDispatch, useSelector } from 'react-redux'
import { setMessages } from '@/redux/messageSlice'
import { setIsCreatingConversation } from '@/redux/conversationSlice'
import { useAuth } from "@clerk/nextjs"
import 'streamdown/styles.css';
const ChatArea = () => {
  const { selectedConversation } = useSelector((state) => state.conversation)
  const { messages } = useSelector((state) => state.message)
  const { isCreatingConversation } = useSelector((state) => state.conversation)
  const { getToken } = useAuth()
  const dispatch = useDispatch();
  const get_msg = async (conversationId) => {
    try {
      const token = await getToken();

      const response = await getmessages(conversationId, token);

      if (response.error) {
        console.error(response.error);
        return;
      }

      // Ignore stale responses if the user switched conversations
      if (selectedConversation?._id !== conversationId) {
        return;
      }
      if (response.messages.length !== 0) {
        dispatch(setMessages(response.messages));
      }

    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    if (!selectedConversation) return;

    if (isCreatingConversation) {
      dispatch(setIsCreatingConversation(false));
      return;
    }

    if (messages.length > 0 && messages[0].conversation_id !== selectedConversation._id) {
        dispatch(setMessages([]));
      }
    get_msg(selectedConversation._id);
  }, [selectedConversation, isCreatingConversation]);
  return (
    <div className="min-w-0 flex-1 flex flex-col">
      <Nav />
      <MessageList />
      <ChatInput />
    </div>
  )
}

export default ChatArea
