"""AI endpoints: context-aware chat (SSE), paper summary, inbox classify,
experiment next-step, writing assist, learning assist."""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import Experiment, InboxItem, LearningConcept, Paper
from ..ai import client as ai
from ..ai.context import build_context

router = APIRouter(prefix="/api/ai", tags=["ai"])

OBJ_TYPES = ("project", "question", "experiment", "paper", "concept")


class ChatIn(BaseModel):
    message: str
    object_type: str | None = None
    object_id: int | None = None


class PaperSummaryIn(BaseModel):
    paper_id: int


class InboxClassifyIn(BaseModel):
    item_id: int


class ExperimentNextIn(BaseModel):
    experiment_id: int


class WritingAssistIn(BaseModel):
    content: str
    selection: str = ""
    instruction: str = ""


class LearningAssistIn(BaseModel):
    concept_id: int
    mode: str = "explain"  # explain | simplify | examples | quiz


def _sse(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat")
def chat(body: ChatIn, session: Session = Depends(get_session)) -> StreamingResponse:
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="message must not be empty")
    # validate eagerly so a missing key returns a clean 400, not an SSE error
    if not ai.is_configured():
        raise HTTPException(
            status_code=400,
            detail="未配置 DeepSeek API Key。请到 设置 → DeepSeek API Key 填入。",
        )
    context = ""
    if body.object_type and body.object_id:
        if body.object_type not in OBJ_TYPES:
            raise HTTPException(status_code=422, detail="invalid object_type")
        context = build_context(session, body.object_type, body.object_id)

    system = ai.SYSTEM_PROMPT
    user = message
    if context:
        system = f"{ai.SYSTEM_PROMPT}\n\n## 当前上下文\n{context}"
        user = (
            f"以下是当前研究对象的上下文。请结合上下文回答用户问题。\n\n"
            f"【上下文】\n{context}\n\n【用户问题】\n{message}"
        )

    def gen():
        try:
            for delta in ai.stream(user, system=system):
                yield _sse("delta", {"text": delta})
            yield _sse("done", {"ok": True})
        except HTTPException as exc:
            yield _sse("error", {"detail": exc.detail})
        except Exception as exc:  # noqa: BLE001
            yield _sse("error", {"detail": f"AI 调用失败: {exc}"})

    return StreamingResponse(
        gen(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/summarize-paper")
def summarize_paper(
    body: PaperSummaryIn, session: Session = Depends(get_session)
) -> dict:
    paper = session.get(Paper, body.paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    context = build_context(session, "paper", paper.id)
    prompt = (
        f"请用中文总结这篇文献：\n1. 研究问题（1-2 句）\n2. 方法概要（2-3 句）\n"
        f"3. 主要发现（3-5 点）\n4. 与 LLPS / 异常凝聚体研究的关联（如有）\n"
        f"5. 局限性（如有）。\n不要编造上下文之外的信息。\n\n【上下文】\n{context}"
    )
    return {"summary": ai.complete(prompt)}


@router.post("/inbox-classify")
def inbox_classify(
    body: InboxClassifyIn, session: Session = Depends(get_session)
) -> dict:
    item = session.get(InboxItem, body.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")
    prompt = (
        f"以下是收件箱里的一条未整理内容。请输出 JSON（不要其他文字）：\n"
        f'{{"kind": "paper|idea|note|url|image|experiment|question|github|task|reference|other", '
        f'"project": 建议关联的项目标题或 null, "tags": ["标签1","标签2"], '
        f'"next_action": "一句话建议的下一步动作", "reason": "一句话理由"}}\n\n'
        f"内容：{item.text}"
    )
    system = (
        "你是科研收件箱整理助手。AI 建议仅供用户参考，不得自动改动用户内容。"
        + ai.SYSTEM_PROMPT
    )
    raw = ai.complete(prompt, system=system, temperature=0.2)
    try:
        parsed = json.loads(raw[raw.find("{") : raw.rfind("}") + 1])
    except Exception:
        parsed = {"kind": item.kind, "next_action": raw[:200]}
    return {"suggestion": parsed, "raw": raw}


@router.post("/experiment-next")
def experiment_next(
    body: ExperimentNextIn, session: Session = Depends(get_session)
) -> dict:
    exp = session.get(Experiment, body.experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    context = build_context(session, "experiment", exp.id)
    prompt = (
        "基于该实验记录，请给出：\n1. 结果要点小结（2-3 句）\n2. 可能的异常或值得注意的点\n"
        "3. 可能的解释（明确标注为推测）\n4. 建议的后续实验（2-3 个，含理由）\n"
        "请勿把 AI 推测表述为实验结论。\n\n【上下文】\n" + context
    )
    return {"suggestions": ai.complete(prompt)}


@router.post("/writing-assist")
def writing_assist(body: WritingAssistIn) -> dict:
    instruction = body.instruction.strip() or "改进这段文字"
    selection = body.selection.strip()
    if selection:
        prompt = (
            f"用户指令：{instruction}\n\n请只输出修改后的文字（保持原意，不添加原上下文没有的事实），"
            f"不要解释。\n\n【选中的文字】\n{selection}"
        )
    else:
        prompt = (
            f"用户指令：{instruction}\n\n请只输出修改后的全文（保持 Markdown 结构），不要解释。\n\n"
            f"【全文】\n{body.content[:6000]}"
        )
    return {"suggestion": ai.complete(prompt, temperature=0.3)}


@router.post("/learning-assist")
def learning_assist(
    body: LearningAssistIn, session: Session = Depends(get_session)
) -> dict:
    concept = session.get(LearningConcept, body.concept_id)
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")
    modes = {
        "explain": "用通俗语言解释这个概念，面向有分子生物学基础的科研者（中文）。",
        "simplify": "用最简单的语言（比喻）解释这个概念，像给大一学生讲。",
        "examples": "给出 2-3 个与液-液相分离研究相关的具体例子说明这个概念。",
        "quiz": "出 3 道选择题检验理解（含答案与解析，答案放在最后）。",
    }
    mode_prompt = modes.get(body.mode, modes["explain"])
    prompt = (
        f"概念：{concept.title}\n{concept.description or ''}\n\n{mode_prompt}\n"
        f"如涉及术语，用中文解释。不要编造事实。"
    )
    return {"answer": ai.complete(prompt)}
