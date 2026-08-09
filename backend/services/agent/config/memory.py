from datetime import datetime
import redis.exceptions

from radis.radis import redis
from utils.getMessages import get_Messages
import json

async def getMemory(conversation_id):
    key = f"messages:{conversation_id}"

    # Redis is a cache, not the source of truth (Mongo is) — a Redis
    # outage/timeout should degrade to "slightly slower" (hit Mongo
    # directly), not take down the entire response.
    try:
        cached = await redis.get(key)
        if cached:
            return json.loads(cached)
    except redis.exceptions.RedisError as e:
        print(f"Redis read failed, falling back to DB: {e}")

    messages = await get_Messages(conversation_id)

    try:
        await redis.set(key, json.dumps(messages), ex=24 * 60 * 60)
    except redis.exceptions.RedisError as e:
        print(f"Redis write failed (non-fatal): {e}")

    return messages

async def addMessage(conversation_id, role, content):
    key = f"messages:{conversation_id}"

    try:
        rawMessages = await redis.get(key)
        messages = json.loads(rawMessages) if rawMessages else []
        messages.append({
            "role": role,
            "content": content,
            "created_at": datetime.now().isoformat()
        })

        if len(messages) > 20:
            messages.pop(0)

        await redis.set(key, json.dumps(messages), ex=24 * 60 * 60)
        return {"message": "Message added to memory successfully."}
    except redis.exceptions.RedisError as e:
        # This is just the short-term memory cache — the message itself is
        # still saved to Mongo separately via /save-message. Losing this
        # write means the next request's history comes from Mongo instead
        # of cache (a bit slower), not that the message is lost.
        print(f"Redis write failed (non-fatal): {e}")
        return {"message": "Memory cache unavailable, message not cached."}