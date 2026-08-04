from config.tavely import search
from langchain.tools import tool
import json
@tool
def search_tool(query: str):
    """
    Search tool for finding information online.geting the lastest information from the web. This tool is useful for answering questions that require up-to-date information or for finding specific details that may not be available.
    """
    result = search.invoke(query)
    return json.dumps(result)
