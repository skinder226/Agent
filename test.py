
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

model = ChatOpenAI(
    model_name="z-ai/glm-5.2",
    api_key="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",
    base_url="https://integrate.api.nvidia.com/v1",
    streaming=True,
)

for chunk in model.astream([{"role": "user", "content": "Hello, how are you?"}]):
    if chunk.content:
        print(chunk.content, end="", flush=True)