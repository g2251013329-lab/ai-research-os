"""DeepSeek client wrapper: streaming completions, key from Keychain/file."""
from __future__ import annotations

from typing import Iterator

from fastapi import HTTPException

from ..api.settings import get_secret
from ..core.user_settings import get_user_setting

SYSTEM_PROMPT = """你是 AI Research OS 的科研助手，服务于一位生物学科研者（研究领域：液-液相分离 LLPS、神经发育中的异常凝聚体）。

必须遵守的规则：
1. 只基于提供的上下文回答；上下文没有的信息，明确说明不知道。
2. 绝不编造文献引用、实验数据或事实。提到文献时只引用上下文中出现的。
3. 区分「已知事实」与「推测/建议」：推测必须明确标注。
4. AI 的建议只是参考，永远不能替代实验结论或用户的科学判断。
5. 回答使用与用户提问相同的语言（中文问题用中文回答）。
6. 回答保持简洁、结构化，科研写作风格。
"""


def is_configured() -> bool:
    return bool(get_secret())


def _require_key() -> str:
    key = get_secret()
    if not key:
        raise HTTPException(
            status_code=400,
            detail="未配置 DeepSeek API Key。请到 设置 → DeepSeek API Key 填入。",
        )
    return key


def _model() -> str:
    return get_user_setting("deepseek_model", "deepseek-chat")


def _client():
    from openai import OpenAI

    return OpenAI(
        api_key=_require_key(),
        base_url=get_user_setting("deepseek_base_url", "https://api.deepseek.com"),
    )


def complete(
    user_message: str,
    system: str = SYSTEM_PROMPT,
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> str:
    client = _client()
    resp = client.chat.completions.create(
        model=_model(),
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content or ""


def stream(
    user_message: str,
    system: str = SYSTEM_PROMPT,
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> Iterator[str]:
    """Yield text deltas as they arrive."""
    client = _client()
    stream_resp = client.chat.completions.create(
        model=_model(),
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )
    for chunk in stream_resp:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            yield delta
