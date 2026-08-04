from graph.state import agnetState
from langchain.messages import SystemMessage, HumanMessage, AIMessage
from config.llmModels import get_model
from config.memory import getMemory
from langgraph.config import get_stream_writer

async def coding_agent(state: agnetState):
    user_query = state['user_query']
    writer = get_stream_writer()
    prompt = """You are CortexAI, an expert coding assistant.
Rules:
- First Anlayze you code and check for any errors or issues. If there are any, provide a detailed explanation of the problem and suggest a solution.
- If the code is correct, provide a detailed explanation of how the code works, including any relevant concepts or techniques used.
- If the user asks for improvements or optimizations, provide specific suggestions and explain how they would improve the code's performance, readability, or maintainability.
- Give clear, correct, working code.
- Use fenced code blocks with the correct language tag.
- Briefly explain non-obvious parts, but don't pad with filler.
- Prefer showing complete, runnable examples over fragments when practical.
- Keep explanations concise; the code should do most of the talking.
"""
    history = await getMemory(state['conversation_id'])
    messages = [SystemMessage(content=prompt)]
    for msg in history:
        content = msg.get('content')
        if not content:
            continue  # skip corrupted/empty history entries defensively
        if msg['role'] == 'user':
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=user_query))

    llm = get_model("coding")
    full_response = ""
    async for chunk in llm.astream(messages):
        if chunk.content:
            full_response += chunk.content
            writer(chunk.content)  # pushes this token into stream_mode="custom"
    return {"ai_response": full_response.strip()}