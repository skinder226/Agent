from fastapi import FastAPI, Response,Request
import os
from dotenv import load_dotenv
import uvicorn
from routes.chat_routes import router
from config.db import connect_db, disconnect_db
from contextlib import asynccontextmanager
load_dotenv()
from fastapi.middleware.cors import CORSMiddleware


port = int(os.getenv("port"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        app.state.mongo_client = await connect_db()
        print("Connected to MongoDB")
        yield
        # Shutdown
        disconnect_db()
    except Exception as e:
        print(f"Error during startup: {e}")
        yield
app = FastAPI(lifespan=lifespan)



origins = [
    "http://localhost:3000",
    # Add your production frontend domain here later (e.g., "https://vercel.app")
]

# 2. Apply the CORS middleware to your FastAPI app instance
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # Allows requests from localhost:3000
    allow_credentials=True,         # Required if you send HTTP cookies or authorization headers
    allow_methods=["*"],            # Allows all HTTP methods (POST, GET, OPTIONS, etc.)
    allow_headers=["*"],            # Allows all custom or standardized headers
)


@app.get("/")
def home():
    return {"message": "Chat service running"}

app.include_router(
    router,
    prefix=""
)
if __name__ == "__main__":
    print("Chat service started")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )