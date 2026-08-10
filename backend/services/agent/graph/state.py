from typing import TypedDict
from typing import Annotated
from langgraph.graph.message import add_messages

class agnetState(TypedDict):
    user_query: str
    user_id : str
    ai_response: str
    routed_to: str
    conversation_id: str
    images: list[dict]