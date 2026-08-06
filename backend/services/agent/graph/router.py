from .state import agnetState
from langchain_core.messages import SystemMessage, HumanMessage
from config.llmModels import get_model

# "search" removed from valid routes
VALID_ROUTES = {"chat", "coding", "pdf", "ppt", "vision"}

ROUTER_PROMPT = """You are a routing AI for an AI agent.

Your ONLY job is to classify the user's request into EXACTLY ONE of the following categories:

chat
coding
pdf
ppt
vision

Category definitions:

- chat
  General conversation, greetings, opinions, brainstorming, explanations, writing, summaries, translation, storytelling, casual questions, factual questions, current events, news, weather, stock prices, or any request that does not require programming, PDF handling, PowerPoint creation, or image generation.

- coding
  Programming, debugging, writing code, explaining code, software engineering, algorithms, APIs, frameworks, databases, terminal commands, DevOps, or any software development task.

- pdf
  Requests to create, edit, analyse, summarize, extract information from, convert, merge, split, or otherwise work with PDF documents.

- ppt
  Requests to create, edit, improve, convert to, or work with PowerPoint presentations, slide decks, or presentation content.

- vision
  Requests to generate, create, draw, design, render, illustrate, edit, enhance, or transform images, artwork, logos, icons, wallpapers, avatars, posters, concept art, or any other visual content.

Rules:
- Return ONLY one word.
- The returned word MUST be exactly one of:
  chat
  coding
  pdf
  ppt
  vision
- Never explain your decision.
- Never output punctuation.
- Never output multiple words.
- Never output markdown.
- Never output quotes.
- If a request could belong to multiple categories, choose the single best match.
- If the request is to generate or edit an image, always return "vision".
- If the request requires writing or understanding code, always return "coding".
- If uncertain, return "chat".

Examples:

User: Hi
Output:
chat

User: Tell me a joke.
Output:
chat

User: Translate this paragraph into French.
Output:
chat

User: Explain recursion in simple words.
Output:
chat

User: What is the latest version of Next.js?
Output:
chat

User: Who won the FIFA World Cup?
Output:
chat

User: What is the weather in Lahore today?
Output:
chat

User: Find the official FastAPI documentation.
Output:
chat

User: Latest AI news.
Output:
chat

User: Write a Python function to reverse a linked list.
Output:
coding

User: Debug this JavaScript error.
Output:
coding

User: Create a FastAPI authentication API.
Output:
coding

User: Summarize this PDF.
Output:
pdf

User: Merge these PDF files.
Output:
pdf

User: Extract text from this PDF.
Output:
pdf

User: Create a presentation about Machine Learning.
Output:
ppt

User: Make a 10-slide presentation on Climate Change.
Output:
ppt

User: Improve my PowerPoint slides.
Output:
ppt

User: Generate an image of a futuristic city at sunset.
Output:
vision

User: Create a logo for my startup.
Output:
vision

User: Draw an anime-style dragon.
Output:
vision

User: Design a YouTube thumbnail.
Output:
vision

User: Remove the background from this image.
Output:
vision

User: Turn this photo into a Pixar-style illustration.
Output:
vision
"""

async def router_agent(state: agnetState):
    if state["routed_to"] and state["routed_to"] != "auto":
        return {"routed_to": state["routed_to"]}

    user_query = state["user_query"]
    llm = get_model("router")
    messages = [SystemMessage(content=ROUTER_PROMPT), HumanMessage(content=user_query)]

    routed_to = None
    last_error = None
    retries = 0
    for attempt in range(2):
        try:
            retries += 1
            print(f"router_agent: attempt {retries} to route user query: {user_query!r}")
            llm_response = await llm.ainvoke(messages)
            candidate = llm_response.content.strip().lower()
            if candidate in VALID_ROUTES:
                routed_to = candidate
                break
            last_error = f"invalid route returned: {candidate!r}"
        except Exception as e:
            last_error = str(e)

    if routed_to is None:
        print(f"router_agent: falling back to 'chat' after {last_error}")
        routed_to = "chat"
    print(f"router_agent: routed to {routed_to}")
    return {"routed_to": routed_to}