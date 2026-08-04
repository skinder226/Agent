from langgraph.graph import StateGraph, START, END
from agents.chat_agent import chat_agent
from agents.coding_agent import coding_agent
from agents.pdf_agent import pdf_agent
from agents.ppt_agent import ppt_agent
# Fixed typo: vision_agnet -> vision_agent
from agents.vision_agnet import vision_agent 
from .state import agnetState # Fixed typo: agnetState -> agentState
from .router import router_agent

def router_edge(state: agnetState):
    routed_to = state["routed_to"]
    
    if "coding" in routed_to:
        return "coding"
    elif "pdf" in routed_to:
        return "pdf"
    elif "ppt" in routed_to:
        return "ppt"
    elif "vision" in routed_to:
        return "vision"
    else:
        return "chat"

# Initialize Graph
workflow = StateGraph(agnetState)

# Add Nodes
workflow.add_node("router", router_agent)
workflow.add_node("chat", chat_agent)
workflow.add_node("coding", coding_agent)
workflow.add_node("pdf", pdf_agent)
workflow.add_node("ppt", ppt_agent)
workflow.add_node("vision", vision_agent)

# Add Edges
workflow.add_edge(START, "router")

workflow.add_conditional_edges(
    "router",
    router_edge,
    {
        "search": "chat",  # If router_edge returns "search", go to "chat" node
        "chat": "chat",    # If router_edge returns "chat", go to "chat" node
        "coding": "coding",
        "pdf": "pdf",
        "ppt": "ppt",
        "vision": "vision",
    },
)

# Define Endpoints
workflow.add_edge("chat", END)
workflow.add_edge("coding", END)
workflow.add_edge("pdf", END)
workflow.add_edge("ppt", END)
workflow.add_edge("vision", END)

# Compile
graph = workflow.compile()
