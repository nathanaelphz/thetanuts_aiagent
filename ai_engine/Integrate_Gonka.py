import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["GONKA_API_KEY"],
    base_url="https://api.gonkarouter.io/v1",
)

response = client.chat.completions.create(
    model="deepseek-ai/DeepSeek-V4-Flash-0731",   # e.g. "MiniMaxAI/MiniMax-M2.7" — check what your router supports
    messages=[
        {"role": "user", "content": "Say hello in one sentence."}
    ],
)

print(response.choices[0].message.content)