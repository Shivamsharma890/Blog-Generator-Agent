import os
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()


def get_llm(model_name: str = "openai/gpt-oss-20b", temperature: float = 0.5):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is not set.")
    return ChatGroq(model=model_name, temperature=temperature, api_key=api_key)


RESEARCHER_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
            You are a research agent. Create a concise outline for the topic and audience.
            Include 5-7 key points, relevant facts or examples, and a suggested angle. Do not write the full blog.""",
        ),
        (
            "user",
            "Topic: {topic}\nAudience: {audience}\nFeedback: {revision_hints}\nCreate the research outline.",
        ),
    ]
)


def Research_Agent(llm, topic: str, audience: str, feedback: str = "") -> str:
    hints = (
        f"Apply this feedback to the previous research: {feedback}"
        if feedback
        else "This is the first attempt."
    )
    return llm.invoke(
        RESEARCHER_PROMPT.format_messages(
            topic=topic, audience=audience, revision_hints=hints
        )
    ).content


WRITER_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
            You are a blog writer. Produce a complete blog post using the supplied research.
            On revisions, use the previous draft as the base and return the ENTIRE revised blog,
            not only changed lines or a summary. Preserve relevant existing content and structure.
            Apply ALL accumulated feedback together while preserving the topic and audience.
            If feedback specifies a word limit, treat it as a strict maximum.
            Use clear Markdown. Do not add a word-count line unless requested.
            """,
        ),
        (
            "user",
            """
            Topic: {topic}
            Audience: {audience}
            Research outline: {Research}
            Previous draft: {previous_draft}
            All accumulated revision requirements: {revision_hints}

            If a previous draft is provided, revise that draft instead of starting over.
            Return the complete blog post with all requirements applied, not just one line.
            """,
        ),
    ]
)


def Writer_Agent(
    llm,
    topic: str,
    audience: str,
    Research: str = "",
    feedback: str = "",
    previous_draft: str = "",
) -> str:
    hints = (
        feedback.strip()
        if feedback.strip()
        else "This is the first draft; follow the normal blog-writing instructions."
    )
    return llm.invoke(
        WRITER_PROMPT.format_messages(
            topic=topic,
            audience=audience,
            Research=Research,
            revision_hints=hints,
            previous_draft=previous_draft,
        )
    ).content


EDITOR_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
            You are the final blog editor. Correct grammar and improve clarity and flow.
            Preserve the draft's requested length and meaning. Return only the final Markdown blog post.
            """,
        ),
        ("user", "Topic: {topic}\n Draft:\n {draft}\n Return the polished blog post."),
    ]
)


def editor_agent(llm, topic: str, draft: str = "") -> str:
    return llm.invoke(EDITOR_PROMPT.format_messages(topic=topic, draft=draft)).content
