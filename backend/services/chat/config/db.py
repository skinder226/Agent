from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

client = None
db = None


def connect_db():
    global client, db

    client = AsyncIOMotorClient(
        os.getenv("MONGO_URI")
    )

    db = client["chat"]

    return db


def get_db():
    return db


def disconnect_db():
    global client

    if client:
        client.close()