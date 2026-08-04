from fastapi import FastAPI, Response,Request
import os
from dotenv import load_dotenv
import uvicorn

from verify import verify_clerk_token
from fastapi import Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
load_dotenv()


port = int(os.getenv("port"))

app = FastAPI()


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
    return {"message": "Auth running"}

@app.post("/verification")
def verification(request: Request):
    session = verify_clerk_token(request)
    user_id = session["sub"]
    return {
        "authenticated": True,
        "user id": user_id
    }

if __name__ == "__main__":
    print("Auth started")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )