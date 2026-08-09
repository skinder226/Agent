from asyncio import timeout
import os
from fastapi import FastAPI, Response, Request
from fastapi.responses import StreamingResponse
import httpx

from verify import verify_clerk_token

# Headers that shouldn't be forwarded as-is from the upstream response
HOP_BY_HOP = {
    "content-length",
    "transfer-encoding",
    "connection",
    "keep-alive",
    "content-encoding",  # httpx already decodes gzip/br for us
}


def _clean_response_headers(raw_headers: dict) -> dict:
    return {k: v for k, v in raw_headers.items() if k.lower() not in HOP_BY_HOP}


async def _proxy(request: Request, path: str, host: str, headers: dict):
    method = request.method
    url = f"{host.rstrip('/')}/{path}"
    body = await request.body()
    params = request.query_params

    print(method, f"{host}/{path}")

    timeout = httpx.Timeout(
    connect=10.0,
    read=None,      # Disable read timeout for streaming
    write=30.0,
    pool=30.0,
)

    client = httpx.AsyncClient(timeout=timeout)

    req = client.build_request(
        method=method,
        url=url,
        headers=headers,
        content=body,
        params=params,
    )
    upstream = await client.send(req, stream=True)

    content_type = upstream.headers.get("content-type", "")

    if "text/event-stream" in content_type:
        # Stream chunks straight through as they arrive
        async def event_gen():
            try:
                async for chunk in upstream.aiter_bytes():
                    yield chunk
            except httpx.RemoteProtocolError:
                # Upstream closed the connection mid-stream (upstream crashed,
                # was restarted by --reload, network blip, etc). Nothing we
                # can do about the missing data at this point, but we can at
                # least tell the client the stream ended abnormally instead
                # of just silently dying, and avoid crashing this process
                # with an unhandled ASGI exception.
                print("Upstream closed connection mid-stream")
                yield f'data: {{"type": "error", "message": "Upstream connection lost"}}\n\n'
            except Exception as e:
                print(f"event_gen error: {e}")
                yield f'data: {{"type": "error", "message": "Stream failed"}}\n\n'
            finally:
                await upstream.aclose()
                await client.aclose()

        return StreamingResponse(
            event_gen(),
            status_code=upstream.status_code,
            headers=_clean_response_headers(dict(upstream.headers)),
            media_type="text/event-stream",
        )

    # Normal buffered path (unchanged behavior for auth/chat/etc.)
    content = await upstream.aread()
    await upstream.aclose()
    await client.aclose()
    return Response(
        content=content,
        status_code=upstream.status_code,
        headers=_clean_response_headers(dict(upstream.headers)),
    )


def route_middleware(prefix: str, host: str, app: FastAPI, require_verfication: bool = False):
    @app.api_route(
        f"/{prefix}/{{path:path}}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )
    async def auth_proxy(request: Request, path: str):
        headers = dict(request.headers)

        if require_verfication:
            if request.headers.get("Authorization") is None:
                return Response(
                    content="Authorization header missing",
                    status_code=401
                )

            if request.headers.get("Authorization") == os.getenv("CHAT_SERVICE_AUTHORIZATION"):
                return await _proxy(request, path, host, headers)

            session = verify_clerk_token(request)
            user_id = session["sub"]
            headers.pop("x-user-id", None)
            headers.pop("X-User-ID", None)
            headers["X-User-ID"] = user_id

        return await _proxy(request, path, host, headers)