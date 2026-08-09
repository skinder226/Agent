from graph.state import agnetState
from langchain.messages import (
    SystemMessage,
    HumanMessage,
    AIMessage,
    ToolMessage,
)
from config.llmModels import get_model
from config.memory import getMemory
from langchain.agents import create_agent
from langgraph.config import get_stream_writer
import json

from tools.search_tool import search_tool


async def chat_agent(state: agnetState):
    user_query = state["user_query"]

    prompt = f"""
You are CortexAI, an intelligent AI assistant.

English is your primary language, but you can also communicate in other languages if the user prefers.

## Core Behavior
- For simple questions, greetings, and short queries, respond naturally in plain text — no headings, no bullet points.
- For technical, educational, coding, or detailed topics, use clean Markdown as described below.
- Match the depth of your answer to the depth of the question. Don't pad simple questions with unnecessary structure.

## Tool Usage
- You have access to a search_tool for retrieving real-time or up-to-date information.
- Use the search tool when the question involves current events, recent news, live data (prices, scores, weather), or anything that may have changed after your training data — do not rely on memory for these.
- Do NOT use the search tool for general knowledge, definitions, math, coding help, or anything you already know confidently and that does not change over time.
- If you call the search tool, base your final answer primarily on the search results returned. Only fall back to your own knowledge if the search results are empty, irrelevant, or insufficient to answer the question.
- Never say you "cannot access the internet" or "don't have real-time data" — you have a working search tool, so use it when needed instead of refusing.
- If search results conflict with each other, mention the discrepancy briefly rather than picking one arbitrarily.
- Do not call the search tool more than once for the same query unless the first attempt clearly failed or returned no useful results.

## Formatting Rules (for Markdown responses only)
- Use `#` for the main title and `##` for sections — only when the response is long/structured enough to need them.
- Always leave a blank line after any heading before the content starts.
- Never put a heading and its content on the same line.
- Use bullet points for unordered lists and numbered lists for sequential steps.
- Use fenced code blocks with a language tag for any code (e.g. ```python).
- Keep paragraphs short — 2-4 sentences max per paragraph.
- Never generate large, unbroken walls of text; break long answers into sections or lists.
- Do not add a heading/title for one-paragraph or short answers.

## File Naming for Code Blocks
- When you generate a COMPLETE, standalone file (a full script, component, config file, etc. — not a short inline snippet or a diff/excerpt), make the very first line of the code block a comment giving it a real, descriptive filename, using that language's native comment syntax:
  - Python/Bash/YAML/Ruby: `# FILE: tasks.py`
  - JavaScript/TypeScript/JSX/TSX/Java/Go/Rust/C/C++/PHP: `// FILE: TaskManager.jsx`
  - CSS: `/* FILE: styles.css */`
  - HTML: `<!-- FILE: index.html -->`
  - SQL: `-- FILE: schema.sql`
- Pick a filename that actually reflects what the code does (e.g. `task_manager.py`, `UserProfileCard.jsx`), never a generic placeholder like `file.py` or `code.js`.
- Do NOT add a `FILE:` comment for short inline snippets, single functions, or partial excerpts — only for complete files someone would plausibly save and run as-is.
- Do NOT add a `FILE:` comment for languages without a sensible comment syntax for this purpose (e.g. JSON, Markdown) — just omit it there.

""" 

    history = await getMemory(state["conversation_id"])

    messages = [SystemMessage(content=prompt)]

    for msg in history:
        content = msg.get("content")
        if not content:
            continue

        if msg["role"] == "user":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=user_query))

    llm = get_model("chat")

    agent = create_agent(
        model=llm,
        system_prompt=prompt,
        tools=[search_tool],
    )

    writer = get_stream_writer()

    full_text = ""
    tool_messages = []

    # Some reasoning-capable models (via NIM: DeepSeek-R1, QwQ, Nemotron
    # reasoning variants, etc.) emit their internal reasoning wrapped in
    # <think>...</think> before the real answer. We must never forward
    # that to the frontend. Buffer across chunks since the tags can be
    # split across multiple stream deltas.
    stream_buffer = ""
    in_think_block = False

    def _process_and_emit(chunk_text: str):
        """Strip <think>...</think> content from chunk_text, emit the
        rest via writer(), and append it to full_text."""
        nonlocal stream_buffer, in_think_block, full_text

        stream_buffer += chunk_text

        while True:
            if not in_think_block:
                start = stream_buffer.find("<think>")
                if start == -1:
                    # No opening tag pending — flush everything we have,
                    # but hold back a small tail in case "<think>" is
                    # split across this chunk and the next one.
                    hold_back = len("<think>") - 1
                    if len(stream_buffer) > hold_back:
                        emit = stream_buffer[: len(stream_buffer) - hold_back]
                        stream_buffer = stream_buffer[len(stream_buffer) - hold_back :]
                        if emit:
                            full_text += emit
                            writer(emit)
                    break
                else:
                    pre = stream_buffer[:start]
                    if pre:
                        full_text += pre
                        writer(pre)
                    stream_buffer = stream_buffer[start + len("<think>"):]
                    in_think_block = True
            else:
                end = stream_buffer.find("</think>")
                if end == -1:
                    # Still inside reasoning — discard, nothing to show.
                    stream_buffer = ""
                    break
                else:
                    stream_buffer = stream_buffer[end + len("</think>"):]
                    in_think_block = False

    async for mode, payload in agent.astream(
        {"messages": messages},
        stream_mode=["messages", "updates"],
    ):
        if mode == "messages":
            message_chunk, metadata = payload

            # Some providers expose reasoning separately instead of inline
            # <think> tags — skip those chunks entirely if present.
            reasoning_content = getattr(message_chunk, "additional_kwargs", {}).get(
                "reasoning_content"
            )
            if reasoning_content and not message_chunk.content:
                continue

            if message_chunk.content:
                _process_and_emit(message_chunk.content)

        elif mode == "updates":
            for node_output in payload.values():
                for msg in node_output.get("messages", []):
                    if isinstance(msg, ToolMessage):
                        tool_messages.append(msg)

    # Flush any trailing held-back text once streaming is done.
    if stream_buffer and not in_think_block:
        full_text += stream_buffer
        writer(stream_buffer)

    images = []

    for tool in tool_messages:
        if tool.name != "search_tool":
            continue

        print("=" * 60)
        print("Tool Name:", tool.name)
        print("Tool Content Type:", type(tool.content))
        print("Tool Content:", repr(tool.content))
        print("=" * 60)

        try:
            # Already a dict
            if isinstance(tool.content, dict):
                images = tool.content.get("images", [])

            # JSON string
            elif isinstance(tool.content, str):
                tool_content = tool.content.strip()

                if tool_content:
                    try:
                        data = json.loads(tool_content)

                        if isinstance(data, dict):
                            images = data.get("images", [])

                    except json.JSONDecodeError:
                        print("search_tool did not return JSON.")
                        print("Returned:", repr(tool_content))

        except Exception as e:
            print("Error parsing tool output:", e)

    return {
        "ai_response": full_text,
        "images": images,
    }