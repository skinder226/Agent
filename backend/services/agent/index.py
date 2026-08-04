from fastapi import FastAPI, Response, Request
import os
from dotenv import load_dotenv
import uvicorn
from routes.agent_route import router
from config.db import connect_db, disconnect_db
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

port = int(os.getenv("port"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.mongo_client = connect_db()

    yield
    # Shutdown
    disconnect_db()


app = FastAPI(lifespan=lifespan)


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


app.include_router(
    router,
    prefix=""
)


@app.get("/")
def home():
    return {"message": "Agent service running"}


if __name__ == "__main__":
    print("Agent service started")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
    )