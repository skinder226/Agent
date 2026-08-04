from urllib import response

from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
import httpx
import os


async def get_Messages(conversation_id):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                os.getenv("CHAT_SERVICE_URL") + "/get-messages",
                headers={
                    "Authorization": os.getenv("CHAT_SERVICE_AUTHORIZATION")
                },
                json={
                    "conversation_id": conversation_id
                }
            )
        data = response.json()
        return data.get("messages", data if isinstance(data, list) else [])
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content=jsonable_encoder({"get messages error": str(e)})
        )