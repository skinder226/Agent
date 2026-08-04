from fastapi import APIRouter
from controllers.chat_controller import createConversation,getConversations,saveMessage,getMessages,UpdateConversation
router = APIRouter()

router.post("/create-conversation")(createConversation)
router.get("/get-conversations")(getConversations)
router.post("/update-conversation")(UpdateConversation)
router.post("/save-message")(saveMessage)
router.post("/get-messages")(getMessages)

