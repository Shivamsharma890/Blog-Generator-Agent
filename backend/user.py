from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from langgraph.types import Command
from uuid import uuid4
from Graph import graph
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BlogRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    audience: str = "general reader"
    thread_id: str = Field(default_factory=lambda: str(uuid4()))



@app.post("/graph")
def run_graph(request: BlogRequest):
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")

    config = {"configurable": {"thread_id": request.thread_id}}
    try:
        result = graph.invoke(
            {"topic": request.topic.strip(), "audience": request.audience},
            config=config,
        )
        return {"thread_id": request.thread_id, **result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/graph/resume")
def resume_graph(thread_id: str, action: str = "approve", feedback: str = ""):
    if action not in {"approve", "revise"}:
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'revise'.")
    if action == "revise" and not feedback.strip():
        raise HTTPException(status_code=400, detail="Feedback is required for revisions.")

    config = {"configurable": {"thread_id": thread_id}}
    try:
        result = graph.invoke(
            Command(resume={"action": action, "feedback": feedback.strip()}),
            config=config,
        )
        return {"thread_id": thread_id, **result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/graph/{thread_id}")
def get_blog(thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}

    try:
        state = graph.get_state(config)

        if not state.values:
            raise HTTPException(
                status_code=404,
                detail="No graph state found for this thread_id."
            )

        return {
            "thread_id": thread_id,
            "next": list(state.next),
            "topic": state.values.get("topic", ""),
            "audience": state.values.get("audience", ""),
            "research": state.values.get("Research", ""),
            "draft": state.values.get("Draft", ""),
            "final_blog": state.values.get("Final_Blog", "")
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("user:app", host="127.0.0.1", port=8000, reload=True)
