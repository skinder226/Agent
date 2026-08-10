# FILE: config/llmModels.py

import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from memori import Memori


load_dotenv()

router_llm = ChatOpenAI(
    model="mistralai/mistral-nemotron",
    api_key=os.getenv("NVIDIA_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1",
    max_completion_tokens=200,
)


Nvidia = ChatOpenAI(
    model="nvidia/nemotron-3-ultra-550b-a55b",
    api_key=os.getenv("NVIDIA_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1",
)


# ============================================================
# GROQ MODEL
# ============================================================

groq = ChatGroq(
    model="openai/gpt-oss-120b",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0,
)


memori_nvidia = Memori().llm.register(
    chatopenai=Nvidia
)


# Register router too if you want router conversations
# to be included in Memori.
# memori_router = Memori().llm.register(
#     chatopenai=router_llm
# )

# ============================================================
# MODEL SELECTION
# ============================================================

def get_model(agent: str):

    if agent == "coding":
        return Nvidia

    elif agent == "vision":
        return Nvidia

    elif agent == "router":
        return groq

    else:
        return Nvidia