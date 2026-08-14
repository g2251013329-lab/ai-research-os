"""Research knowledge graph (P1): projects, questions, hypotheses,
experiments, papers, learning concepts as nodes + typed edges."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import (
    Experiment,
    Hypothesis,
    LearningConcept,
    Paper,
    Project,
    ResearchQuestion,
)

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("")
def graph(session: Session = Depends(get_session)) -> dict:
    nodes: list[dict] = []
    edges: list[dict] = []

    def node(nid: str, ntype: str, label: str) -> None:
        nodes.append({"id": nid, "type": ntype, "label": label})

    def edge(src: str, dst: str, etype: str) -> None:
        edges.append({"source": src, "target": dst, "type": etype})

    for p in session.exec(select(Project)).all():
        node(f"p{p.id}", "project", p.title)
    for rq in session.exec(select(ResearchQuestion)).all():
        node(f"q{rq.id}", "question", rq.title)
        edge(f"p{rq.project_id}", f"q{rq.id}", "has_question")
    for h in session.exec(select(Hypothesis)).all():
        node(f"h{h.id}", "hypothesis", h.description[:60])
        edge(f"q{h.question_id}", f"h{h.id}", "has_hypothesis")
    for e in session.exec(select(Experiment)).all():
        node(f"e{e.id}", "experiment", e.title)
        edge(f"p{e.project_id}", f"e{e.id}", "has_experiment")
        if e.question_id:
            edge(f"q{e.question_id}", f"e{e.id}", "tests")
        if e.hypothesis_id:
            edge(f"h{e.hypothesis_id}", f"e{e.id}", "tests")
    for a in session.exec(select(Paper)).all():
        node(f"a{a.id}", "paper", a.title)
        if a.project_id:
            edge(f"p{a.project_id}", f"a{a.id}", "has_paper")
    for c in session.exec(select(LearningConcept)).all():
        node(f"c{c.id}", "concept", c.title)
        if c.parent_id:
            edge(f"c{c.parent_id}", f"c{c.id}", "part_of")

    return {"nodes": nodes, "edges": edges}
