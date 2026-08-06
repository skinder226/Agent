from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
load_dotenv()

groq = ChatGroq(
    model="openai/gpt-oss-120b",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0,
)

# Small, fast, stable model dedicated to routing — avoids the gpt-oss-120b
# Harmony-parsing failures (output_parse_failed) seen on the heavier model.
router_llm = ChatOpenAI(
    model_name="mistralai/mistral-nemotron",
    api_key=os.getenv("NVIDIA_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1",
    max_completion_tokens=200
)

Nvidia = ChatOpenAI(
    model_name="nvidia/nemotron-3-ultra-550b-a55b",
    api_key=os.getenv("NVIDIA_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1"
)


def get_model(agent: str):
    if agent == "coding":
        return Nvidia
    elif agent == "vision":
        return Nvidia
    elif agent == "router":
        return  groq
    else:
        return Nvidia