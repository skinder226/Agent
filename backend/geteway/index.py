from fastapi import FastAPI, Response, Request
import os
from dotenv import load_dotenv
import httpx
import uvicorn
from route_middleware import route_middleware
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

port = int(os.getenv("port"))

app = FastAPI()

origins = [
    "http://localhost:3000",
    # Add your production frontend domain here later (e.g., "https://vercel.app")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Gateway running"}


route_middleware("auth", os.getenv("AUTH_SERVICE_URL"), app)
route_middleware("chat", os.getenv("CHAT_SERVICE_URL"), app, require_verfication=True)
route_middleware("agent", os.getenv("AGENT_SERVICE_URL"), app, require_verfication=True)


if __name__ == "__main__":
    print("gateway started")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
    )