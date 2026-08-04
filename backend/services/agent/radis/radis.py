import asyncio
import os
import redis.asyncio as redis_lib
from dotenv import load_dotenv

load_dotenv()

redis = redis_lib.Redis.from_url(
    os.getenv("REDIS_URL"),
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5,
    retry_on_timeout=True,
    health_check_interval=30,
)