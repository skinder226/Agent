from aiohttp import request
from fastapi.encoders import jsonable_encoder

from models.conversation_model import ConversationSchema
from models.message_model import MessageSchema
import datetime
from bson import ObjectId
from pymongo import ReturnDocument
from config.db import get_db
from fastapi import Request
from fastapi.responses import JSONResponse


def get_collections():
    db = get_db()

    return (
        db["conversations"],
        db["messages"]
    )


async def createConversation(request: Request):
    try:
        user_id = request.headers.get("X-User-ID")
        print("User ID from header:", user_id)

        conversation_collection, _ = get_collections()

        if not user_id:
            return JSONResponse(
                status_code=400,
                content=jsonable_encoder({"error": "Missing X-User-ID header"})
            )

        # Create conversation object
        conversation = ConversationSchema(
            user_id=user_id,
            CreatedAt=datetime.datetime.now(),
        )

        # Save to MongoDB
        result = await conversation_collection.insert_one(
            conversation.model_dump()
        )

        return JSONResponse(
            status_code=200,
            content=jsonable_encoder({
                "message": "Conversation created",
                "conversation_id": str(result.inserted_id),
                "conversation": conversation.model_dump()
            })
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({"create conversation error": str(e)})
        )


async def getConversations(request: Request):
    try:
        user_id = request.headers.get("X-User-ID")
        print("User ID from header:", user_id)

        conversation_collection, _ = get_collections()

        if not user_id:
            return JSONResponse(
                status_code=400,
                content=jsonable_encoder({"error": "Missing X-User-ID header"})
            )

        # Find user's conversations

        page = request.query_params.get("page", 1)
        limit = 20


        
        raw = await conversation_collection.find(
            {"user_id": user_id}
        ).sort("CreatedAt", -1).skip((int(page) - 1) * limit).limit(limit or 30).to_list(length=limit or 30)

        has_more = len(raw) >= limit


        # Convert ObjectId to string
        for conversation in raw:
            conversation["_id"] = str(conversation["_id"])

        return JSONResponse(
            status_code=200,
            content=jsonable_encoder({"conversations": raw, "has_more": has_more})
        )

    except Exception as e:
        print(f"Error in getConversations: {e}")
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({"get conversation error": str(e)})
        )


async def UpdateConversation(request: Request):
    try:
        body = await request.json()

        conversation_id = body.get("conversation_id")
        title = body.get("title")
        if len(title.strip()) > 21:
            title = title.strip()[:21] + "..."
        print("Conversation ID:", conversation_id)
        print("Title:", title)

        conversation_collection, _ = get_collections()

        if not conversation_id or not title:
            return JSONResponse(
                status_code=400,
                content=jsonable_encoder({"error": "Missing required fields"})
            )

        conversation = await conversation_collection.find_one_and_update(
            {
                "_id": ObjectId(conversation_id)
            },
            {
                "$set": {
                    "Title": title
                }
            },
            return_document=ReturnDocument.AFTER
        )

        if not conversation:
            return JSONResponse(
                status_code=404,
                content=jsonable_encoder({"error": "Conversation not found"})
            )

        # Convert MongoDB ObjectId to string
        conversation["_id"] = str(conversation["_id"])

        return JSONResponse(
            status_code=200,
            content=jsonable_encoder({
                "conversation": conversation
            })
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({"update conversation error": str(e)})
        )


async def saveMessage(request: Request):
    try:
        body = await request.json()

        conversation_id = body.get("conversation_id")
        role = body.get("role")
        content = body.get("content")
        images = body.get("images", [])

        if not conversation_id or not role or not content:
            return JSONResponse(
                status_code=400,
                content=jsonable_encoder({"error": "Missing required fields"})
            )

        _, messages_collection = get_collections()

        message = MessageSchema(
            conversation_id=conversation_id,
            role=role,
            content=content,
            images=images,
            created_at=datetime.datetime.now()
        )

        result = await messages_collection.insert_one(
            message.model_dump()
        )

        return JSONResponse(
            status_code=200,
            content=jsonable_encoder({
                "message": "Message saved",
                "message_id": str(result.inserted_id),
                "message": message.model_dump()
            })
        )

    except Exception as e:
        return JSONResponse(
            status_code=400,
            content=jsonable_encoder({"save message error": str(e)})
        )


async def getMessages(request: Request):
    try:
        body = await request.json()

        conversation_id = body.get("conversation_id")

        if not conversation_id:
            return JSONResponse(
                status_code=400,
                content=jsonable_encoder({"error": "Missing required fields"})
            )

        _, messages_collection = get_collections()

        result = await messages_collection.find(
            {"conversation_id": conversation_id}
        ).to_list(length=None)

        for msg in result:
            msg["_id"] = str(msg["_id"])

        return JSONResponse(
            status_code=200,
            content=jsonable_encoder({
                "msg": "Messages retrieved",
                "conversation_id": conversation_id,
                "messages": result
            })
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({"getting messages error": str(e)})
        )