from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

client = None
db = None

def connect_db():
    global client, db

    MONGO_URL = os.getenv("MONGO_URI")

    client = AsyncIOMotorClient(MONGO_URL)

    db = client["agent"]


    print("Connected to MongoDB")

    return db
    

def disconnect_db():
    global client

    if client:
        client.close()