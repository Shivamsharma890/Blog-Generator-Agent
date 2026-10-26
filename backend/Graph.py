from typing import Literal
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt
from Agents import get_llm, Research_Agent, Writer_Agent, editor_agent
from State import BlogState
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3

conn = sqlite3.connect(
    "Blog.sqlite",
    check_same_thread=False
)

MAX_REVISION = 4


def researcher_node(state: BlogState) -> BlogState:
    state.Research = Research_Agent(
        llm=get_llm(),
        topic=state.topic,
        audience=state.audience,
        feedback=state.Research_Feedback,
    )
    state.Research_Feedback = ""
    return state


def human_review_research_node(state: BlogState) -> BlogState:
    decision = interrupt(
        {
            "stage": "researcher_review",
            "research": state.Research,
            "instructions": "Approve to continue, or choose revise and provide feedback.",
        }
    )
    if isinstance(decision, dict):
        action = str(decision.get("action", "approve")).lower()
        feedback = str(decision.get("feedback", "")).strip()
    else:
        text = str(decision).strip()
        action = (
            "approve"
            if text.lower() in {"approve", "approved", "ok", "yes", "done"}
            else "revise"
        )
        feedback = "" if action == "approve" else text

    state.Research_Feedback = feedback if action == "revise" else ""
    return state


def writer_node(state: BlogState) -> BlogState:
    state.Draft = Writer_Agent(
        llm=get_llm(),
        topic=state.topic,
        audience=state.audience,
        Research=state.Research,
        feedback=state.Draft_Feedback,
        previous_draft=state.Draft,
    )
    if state.Draft_Feedback:
        state.revision_count += 1
    return state


def human_review_writer_node(state: BlogState) -> BlogState:
    decision = interrupt(
        {
            "stage": "draft_review",
            "draft": state.Draft,
            "instructions": "Approve to send the draft to the editor, or choose revise and provide feedback.",
        }
    )
    if isinstance(decision, dict):
        action = str(decision.get("action", "approve")).lower()
        feedback = str(decision.get("feedback", "")).strip()
    else:
        text = str(decision).strip()
        action = (
            "approve"
            if text.lower() in {"approve", "approved", "ok", "yes"}
            else "revise"
        )
        feedback = "" if action == "approve" else text

    if action == "revise" and feedback:
        previous_feedback = state.Draft_Feedback.strip()
        state.Draft_Feedback = (
            f"{previous_feedback}\n- {feedback}" if previous_feedback
            else feedback
        )
    elif action == "approve":
        state.Draft_Feedback = ""
    return state


def editor_node(state: BlogState) -> BlogState:
    state.Final_Blog = editor_agent(
        llm=get_llm(), 
        topic=state.topic, 
        draft=state.Draft
    )
    return state


def route_after_research_review(state: BlogState) -> Literal["Research", "Writer"]:
    return "Research" if state.Research_Feedback else "Writer"


def route_after_writer_review(state: BlogState) -> Literal["Writer", "Editor"]:
    if state.Draft_Feedback and state.revision_count < MAX_REVISION:
        return "Writer"
    return "Editor"


def Build_Graph():
    workflow = StateGraph(BlogState)
    workflow.add_node("Research", researcher_node)
    workflow.add_node("Review_Research", human_review_research_node)
    workflow.add_node("Writer", writer_node)
    workflow.add_node("Review_Write", human_review_writer_node)
    workflow.add_node("Editor", editor_node)

    workflow.add_edge(START, "Research")
    workflow.add_edge("Research", "Review_Research")
    workflow.add_conditional_edges(
        "Review_Research",
        route_after_research_review,
        {"Research": "Research", "Writer": "Writer"},
    )
    workflow.add_edge("Writer", "Review_Write")
    workflow.add_conditional_edges(
        "Review_Write",
        route_after_writer_review,
        {"Writer": "Writer", "Editor": "Editor"},
    )
    workflow.add_edge("Editor", END)
    return workflow.compile(checkpointer = SqliteSaver(conn))


graph = Build_Graph()