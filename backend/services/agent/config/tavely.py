from langchain_tavily import TavilySearch
import os
from dotenv import load_dotenv
load_dotenv()

search = TavilySearch(
        api_key="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",
        max_results=5,
        topic="general",
        include_images=True,
        include_answer=True,

    )
