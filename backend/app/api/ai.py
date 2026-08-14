"""AI endpoints: context-aware chat (SSE), paper summary, inbox classify,
experiment next-step, writing assist, learning assist, literature discovery,
paper comparison."""
from __future__ import annotations

import html as html_mod
import json
import re
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import Experiment, InboxItem, LearningConcept, Paper
from ..ai import client as ai
from ..ai.context import build_context

router = APIRouter(prefix="/api/ai", tags=["ai"])

OBJ_TYPES = ("project", "question", "experiment", "paper", "concept", "zotero")


class ChatIn(BaseModel):
    message: str
    object_type: str | None = None
    object_id: int | str | None = None


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
        "请用中文总结这篇文献：\n1. 研究问题（1-2 句）\n2. 方法概要（2-3 句）\n"
        "3. 主要发现（3-5 点）\n4. 与 LLPS / 异常凝聚体研究的关联（如有）\n"
        "5. 局限性（如有）。\n"
        "注意：若上下文中提供了 PDF 正文摘录，请直接基于正文总结；"
        "即使没有正式摘要也无需提及'摘要缺失'，除非上下文完全没有正文内容。\n"
        "不要编造上下文之外的信息。\n\n【上下文】\n" + context
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
        "flashcards": (
            "生成 5 张学习闪卡，只输出 JSON："
            '{"cards": [{"q": "问题", "a": "答案"}]}，不要输出其他文字。'
        ),
    }
    mode_prompt = modes.get(body.mode, modes["explain"])
    prompt = (
        f"概念：{concept.title}\n{concept.description or ''}\n\n{mode_prompt}\n"
        f"如涉及术语，用中文解释。不要编造事实。"
    )
    return {"answer": ai.complete(prompt)}


# ------------------------------------------------------------ discovery

class DiscoverIn(BaseModel):
    query: str
    limit: int = 8


def _scholar_search(query: str) -> list[dict[str, Any]]:
    """Best-effort Google Scholar results (no official API; scraping may be
    rate-limited — failures are silently skipped)."""
    out: list[dict[str, Any]] = []
    try:
        r = httpx.get(
            "https://scholar.google.com/scholar",
            params={"q": query, "hl": "en", "num": 10},
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
                )
            },
            timeout=12,
        )
        r.raise_for_status()
        page = r.text
    except Exception:
        return out

    for chunk in re.split(r'<div class="gs_ri">', page)[1:]:
        chunk = re.split(r'<div class="gs_li', chunk)[0]
        m_title = re.search(r"<h3[^>]*>\s*<a[^>]*>(.*?)</a>", chunk, re.S)
        m_href = re.search(r'<a[^>]*href="([^"]+)"', chunk)
        m_meta = re.search(r'<div class="gs_a">(.*?)</div>', chunk, re.S)
        if not m_title:
            continue
        title = html_mod.unescape(re.sub(r"<[^>]+>", "", m_title.group(1))).strip()
        if not title:
            continue
        url = m_href.group(1) if m_href else ""
        meta = ""
        if m_meta:
            meta = html_mod.unescape(re.sub(r"<[^>]+>", "", m_meta.group(1))).strip()
        year = ""
        ym = re.search(r"\b(19|20)\d{2}\b", meta)
        if ym:
            year = ym.group(0)
        parts = [p.strip() for p in meta.split(" - ")]
        authors = parts[0] if parts else ""
        journal = parts[-1] if len(parts) >= 3 else ""
        abstract = ""
        m_abs = re.search(r'<div class="gs_rs">(.*?)</div>', chunk, re.S)
        if m_abs:
            abstract = html_mod.unescape(re.sub(r"<[^>]+>", "", m_abs.group(1))).strip()
        out.append(
            {
                "title": title,
                "authors": authors[:150],
                "year": year,
                "journal": journal,
                "doi": "",
                "url": url,
                "abstract": abstract[:400],
                "source": "Google Scholar",
            }
        )
    return out


def _discover_sources(query: str) -> list[dict[str, Any]]:
    """Aggregate candidates from Europe PMC, Semantic Scholar, Google Scholar."""
    out: list[dict[str, Any]] = []
    try:
        r = httpx.get(
            "https://www.ebi.ac.uk/europepmc/webservices/rest/search",
            params={"query": query, "format": "json", "pageSize": 15, "sort": "CITED desc"},
            timeout=12,
        )
        r.raise_for_status()
        for hit in r.json().get("resultList", {}).get("result", [])[:15]:
            out.append(
                {
                    "title": hit.get("title") or "",
                    "authors": (hit.get("authorString") or "")[:150],
                    "year": str(hit.get("pubYear") or ""),
                    "journal": hit.get("journalTitle") or "",
                    "doi": hit.get("doi") or "",
                    "url": f"https://europepmc.org/article/{hit.get('source', 'MED')}/{hit.get('id', '')}",
                    "abstract": (hit.get("abstractText") or "")[:400],
                    "source": "Europe PMC",
                }
            )
    except Exception:
        pass
    try:
        r = httpx.get(
            "https://api.semanticscholar.org/graph/v1/paper/search",
            params={
                "query": query,
                "limit": 15,
                "fields": "title,authors,year,externalIds,journal,abstract",
            },
            timeout=12,
        )
        if r.status_code == 429:  # rate limited — retry once after a pause
            import time

            time.sleep(1)
            r = httpx.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={
                    "query": query,
                    "limit": 15,
                    "fields": "title,authors,year,externalIds,journal,abstract",
                },
                timeout=12,
            )
        r.raise_for_status()
        for hit in r.json().get("data", [])[:15]:
            doi = (hit.get("externalIds") or {}).get("DOI") or ""
            out.append(
                {
                    "title": hit.get("title") or "",
                    "authors": "; ".join(
                        a.get("name", "") for a in hit.get("authors", [])[:6]
                    ),
                    "year": str(hit.get("year") or ""),
                    "journal": ((hit.get("journal") or {}).get("name") or ""),
                    "doi": doi,
                    "url": f"https://doi.org/{doi}" if doi else "",
                    "abstract": (hit.get("abstract") or "")[:400],
                    "source": "Semantic Scholar",
                }
            )
    except Exception:
        pass
    out.extend(_scholar_search(query))
    return out


def _ai_rank(query: str, items: list[dict]) -> list[dict] | None:
    """AI selects the most relevant items with one-line reasons (best effort)."""
    if not items or not ai.is_configured():
        return None
    compact = [
        {
            "i": idx,
            "title": item.get("title", ""),
            "year": item.get("year", ""),
            "journal": item.get("journal", ""),
            "abstract": (item.get("abstract") or "")[:200],
        }
        for idx, item in enumerate(items)
    ]
    prompt = (
        f"用户研究主题：{query}\n候选文献 JSON：{json.dumps(compact, ensure_ascii=False)}\n"
        f"请依据标题与摘要判断相关性，选出最相关的 {min(8, len(items))} 篇并按相关性排序，只输出 JSON："
        '{"picks": [{"i": 索引, "reason": "一句话理由（中文）"}]}'
    )
    try:
        raw = ai.complete(prompt, temperature=0.2, max_tokens=1200)
        picks = json.loads(raw[raw.find("{") : raw.rfind("}") + 1])["picks"]
        ranked = []
        for pick in picks:
            item = items[pick["i"]]
            ranked.append({**item, "reason": pick.get("reason", "")})
        return ranked[:8]
    except Exception:
        return None


@router.post("/discover")
def discover(body: DiscoverIn) -> dict:
    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=422, detail="query must not be empty")
    merged: dict[str, dict] = {}
    for item in _discover_sources(query):
        key = (item.get("doi") or "").lower() or item["title"].lower()
        if key and key not in merged:
            merged[key] = item
    items = list(merged.values())[:30]
    ranked = _ai_rank(query, items)
    return {
        "query": query,
        "results": ranked if ranked else items[: body.limit],
        "ai_ranked": bool(ranked),
    }


# ------------------------------------------------------------ comparison

class CompareIn(BaseModel):
    paper_ids: list[int]


@router.post("/compare-papers")
def compare_papers(body: CompareIn, session: Session = Depends(get_session)) -> dict:
    if len(body.paper_ids) < 2:
        raise HTTPException(status_code=422, detail="至少选择两篇文献")
    papers = []
    for pid in body.paper_ids[:3]:
        p = session.get(Paper, pid)
        if p:
            papers.append(p)
    if len(papers) < 2:
        raise HTTPException(status_code=404, detail="Paper not found")
    parts = []
    for i, p in enumerate(papers, 1):
        context = build_context(session, "paper", p.id)
        if len(context) > 10_000:
            context = context[:10_000] + "\n…（正文过长，已截断）"
        parts.append(f"【文献{i}】\n{context}")
    prompt = (
        "请对比以下文献：\n1. 研究问题异同\n2. 方法异同\n3. 主要发现异同\n"
        "4. 结论/立场差异\n5. 对 LLPS / 异常凝聚体研究方向的启示\n"
        "用表格 + 要点，中文回答，不要编造上下文之外的信息。\n\n"
        + "\n\n".join(parts)
    )
    return {"comparison": ai.complete(prompt, max_tokens=3000)}
