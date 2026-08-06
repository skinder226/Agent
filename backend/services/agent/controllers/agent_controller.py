from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv
from fastapi import Request
import httpx
import os
import json
from graph.graph import graph
from config.memory import addMessage
import traceback
import os
import asyncio

load_dotenv()


async def _save_message(url, headers, payload):
    """Fire-and-forget POST that owns its own client lifecycle and
    logs (instead of silently swallowing) any failure."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            await client.post(url, headers=headers, json=payload)
    except Exception as e:
        print(f"Background save-message failed: {e}")
 


async def agent(request: Request):
    body = await request.json()
    conversation_id, prompt, agent_type = (
        body.get("conversation_id"),
        body.get("prompt"),
        body.get("agent"),
    )
    auth_header = request.headers.get("Authorization")

    async def event_stream():
        full_text = ""
        images = []

        try:
            # save user message first
            asyncio.create_task(_save_message(
                os.getenv("CHAT_SERVICE_URL") + "/save-message",
                {"Authorization": auth_header},
                {
                    "conversation_id": conversation_id,
                    "role": "user",
                    "content": prompt.strip(),
                },
            ))
            asyncio.create_task(
            addMessage(conversation_id, "user", prompt.strip())
            )
            async for mode, payload in graph.astream(
                {
                    "user_query": prompt,
                    "conversation_id": conversation_id,
                    "routed_to": agent_type,
                },
                stream_mode=["custom", "updates"],
            ):
                
                if mode == "custom":
                    # payload is whatever you passed to writer() in chat_agent
                    full_text += payload
                    print("from agnet_controller: full_text =", full_text)
                    yield f"data: {json.dumps({'type': 'token', 'content': payload})}\n\n"

                elif mode == "updates":
                    # payload = {node_name: node_return_value}
                    for node_output in payload.values():
                        if not isinstance(node_output, dict):
                            continue
                        if "images" in node_output:
                            images = node_output.get("images", []) or images
                        # fallback: if chat_agent doesn't stream custom tokens,
                        # you'd still get the final text here
                        if "ai_response" in node_output and not full_text:
                            full_text = node_output["ai_response"]

            # stream finished — persist everything
            asyncio.create_task(
            addMessage(conversation_id, "assistant", full_text)
            )

            asyncio.create_task(_save_message(
                os.getenv("CHAT_SERVICE_URL") + "/save-message",
                {"Authorization": os.getenv("CHAT_SERVICE_AUTHORIZATION")},
                {
                    "conversation_id": conversation_id,
                        "role": "assistant",
                        "content": full_text,
                        "images": images,
                    },
                )
            )

            yield f"data: {json.dumps({'type': 'done', 'images': images})}\n\n"


        except Exception as e:
            
            print(f"Error in event_stream: {traceback.print_exc()}")
            yield f"data: {json.dumps({"type": "error","message": str(e)})}\n\n"

            raise

    return StreamingResponse(event_stream(), media_type="text/event-stream")