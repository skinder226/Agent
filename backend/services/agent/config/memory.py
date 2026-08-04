from datetime import datetime


from radis.radis import redis
from utils.getMessages import get_Messages
import json
async def getMemory(conversation_id):
    key = f"messages:{conversation_id}"
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)
    messages = await get_Messages(conversation_id)
    await redis.set(key, json.dumps(messages), ex=24*60*60)

    return messages

async def addMessage(conversation_id, role, content):
    key = f"messages:{conversation_id}"
    rawMessages = await redis.get(key)
    messages = json.loads(rawMessages) if rawMessages else []
    messages.append({
        "role": role,
        "content": content,
        "created_at": datetime.now().isoformat()
    })

    if len(messages) > 20:
        messages.pop(0)

    await redis.set(key, json.dumps(messages), ex=24*60*60)

    return {"message": "Message added to memory successfully."}