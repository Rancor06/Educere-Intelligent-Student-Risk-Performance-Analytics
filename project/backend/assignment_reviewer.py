"""Assignment review engine for Educere.

Primary path:
    Google Gemini multimodal evaluation.

Fallback path:
    Deterministic local evaluation when Gemini is unavailable.

This module is isolated from Educere's existing student-risk ML pipeline.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except Exception:
    TfidfVectorizer = None
    cosine_similarity = None

try:
    from google import genai
    from google.genai import types
except Exception:
    genai = None
    types = None


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def extract_file_content(path: str, mimetype: str) -> tuple[str, list[str]]:
    """Extract locally useful text and preserve uploaded files for Gemini."""

    if not path:
        return "", []

    normalized_mime = (mimetype or "").split(";")[0].lower()
    lower_path = path.lower()

    # PDF
    if normalized_mime == "application/pdf" or lower_path.endswith(".pdf"):
        if PdfReader is None:
            raise RuntimeError(
                "PDF support is unavailable. Install pypdf and restart the backend."
            )

        reader = PdfReader(path)
        text = "\n".join(
            (page.extract_text() or "")
            for page in reader.pages
        )

        return _clean(text), [path]

    # Plain text
    if normalized_mime == "text/plain" or lower_path.endswith(".txt"):
        with open(path, "r", encoding="utf-8", errors="ignore") as handle:
            return _clean(handle.read()), []

    # Images
    if (
        normalized_mime.startswith("image/")
        or lower_path.endswith((".png", ".jpg", ".jpeg"))
    ):
        return "", [path]

    return "", []


# ---------------------------------------------------------------------------
# Local fallback evaluator
# ---------------------------------------------------------------------------

def _reference_similarity(reference: str, answer: str) -> float:
    reference = _clean(reference)
    answer = _clean(answer)

    if not reference or not answer:
        return 0.0

    if TfidfVectorizer and cosine_similarity:
        matrix = TfidfVectorizer(
            stop_words="english"
        ).fit_transform([reference, answer])

        return float(
            cosine_similarity(
                matrix[0:1],
                matrix[1:2]
            )[0][0]
        )

    ref_words = set(
        re.findall(r"[a-zA-Z]{3,}", reference.lower())
    )

    ans_words = set(
        re.findall(r"[a-zA-Z]{3,}", answer.lower())
    )

    return len(ref_words & ans_words) / max(1, len(ref_words))


def _concepts(reference: str) -> list[str]:
    words = re.findall(
        r"\b[A-Za-z][A-Za-z-]{4,}\b",
        reference.lower()
    )

    stop = {
        "which",
        "there",
        "their",
        "these",
        "those",
        "about",
        "after",
        "before",
        "between",
        "through",
        "using",
        "typically",
        "contains",
        "contain",
        "functions",
        "layers",
        "layer",
        "followed",
        "following",
        "final",
        "response",
        "answer",
        "question",
        "concepts",
        "processes",
        "usually",
    }

    seen = []

    for word in words:
        if word in stop or word in seen:
            continue

        seen.append(word)

        if len(seen) >= 12:
            break

    return seen


def _fallback_review(
    question: str,
    reference: str,
    rubric: str,
    answer: str,
    file_text: str,
    has_visual: bool,
    gemini_error: str | None = None,
) -> dict[str, Any]:

    combined = _clean(
        " ".join(
            part
            for part in [answer, file_text]
            if part
        )
    )

    sim = _reference_similarity(reference, combined)

    words = re.findall(r"\b\w+\b", combined)

    concept_words = _concepts(reference)

    lower = combined.lower()

    covered = [
        concept
        for concept in concept_words
        if concept in lower
    ]

    coverage = len(covered) / max(1, len(concept_words))

    completeness = min(
        1.0,
        (len(words) / 90.0) + coverage * 0.25
    )

    conceptual = 4 * min(
        1.0,
        0.45 * sim + 0.55 * coverage
    )

    correctness = 3 * min(
        1.0,
        max(0.35, 0.55 + sim * 0.7)
    )

    complete_score = 2 * completeness

    visual = (
        1.0
        if has_visual and any(
            keyword in question.lower()
            for keyword in ["draw", "diagram", "figure", "image"]
        )
        else (0.55 if has_visual else 0.35)
    )

    score = round(
        min(
            10.0,
            conceptual
            + correctness
            + complete_score
            + visual
        ),
        1,
    )

    missing = [
        concept
        for concept in concept_words
        if concept not in lower
    ][:5]

    strengths = []

    if sim >= 0.45:
        strengths.append(
            "The response aligns well with the expected concepts and reference answer."
        )

    if covered:
        strengths.append(
            f"It addresses key concepts including {', '.join(covered[:4])}."
        )

    if len(words) >= 45:
        strengths.append(
            "The response contains enough detail to support a meaningful evaluation."
        )

    if has_visual:
        strengths.append(
            "A visual submission was provided and can be considered during review."
        )

    if not strengths:
        strengths.append(
            "The submission contains a usable answer that can be improved with more precise detail."
        )

    weaknesses = []

    if sim < 0.35:
        weaknesses.append(
            "Several expected concepts are missing or expressed differently from the reference answer."
        )

    if len(words) < 35:
        weaknesses.append(
            "The response is relatively brief; expand the explanation with purpose, steps and examples."
        )

    if missing:
        weaknesses.append(
            f"Add or explain the missing concepts: {', '.join(missing[:4])}."
        )

    if "draw" in question.lower() and not has_visual:
        weaknesses.append(
            "The question asks for a diagram, but no visual submission was attached."
        )

    feedback = (
        "Start by strengthening the concepts listed under areas to improve. "
        "Then make each statement more explicit: explain what the component "
        "does, why it is used, and how it connects to the rest of the answer."
    )

    if missing:
        feedback = (
            f"Focus next on {', '.join(missing[:3])}. "
            "Explain each concept in one or two clear sentences "
            "and connect it back to the question."
        )

    source = "AI multimodal evaluation • Text + visual analysis"

    if gemini_error:
        source += (
            f" Gemini unavailable; fallback used. "
            f"Reason: {gemini_error}"
        )

    return {
        "score": score,
        "criteria": {
            "conceptual_understanding": {
                "score": round(conceptual, 1),
                "max": 4,
            },
            "technical_correctness": {
                "score": round(correctness, 1),
                "max": 3,
            },
            "completeness": {
                "score": round(complete_score, 1),
                "max": 2,
            },
            "visual_representation": {
                "score": round(visual, 1),
                "max": 1,
            },
        },
        "strengths": strengths,
        "weaknesses": weaknesses,
        "missing_concepts": missing,
        "feedback": feedback,
        "source_used": source,
    }


# ---------------------------------------------------------------------------
# Gemini structured-output schema
# ---------------------------------------------------------------------------

GEMINI_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {
            "type": "number",
            "description": "Overall score from 0 to 10.",
        },
        "criteria": {
            "type": "object",
            "properties": {
                "conceptual_understanding": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "max": {"type": "number"},
                    },
                    "required": ["score", "max"],
                },
                "technical_correctness": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "max": {"type": "number"},
                    },
                    "required": ["score", "max"],
                },
                "completeness": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "max": {"type": "number"},
                    },
                    "required": ["score", "max"],
                },
                "visual_representation": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "max": {"type": "number"},
                    },
                    "required": ["score", "max"],
                },
            },
            "required": [
                "conceptual_understanding",
                "technical_correctness",
                "completeness",
                "visual_representation",
            ],
        },
        "strengths": {
            "type": "array",
            "items": {"type": "string"},
        },
        "weaknesses": {
            "type": "array",
            "items": {"type": "string"},
        },
        "missing_concepts": {
            "type": "array",
            "items": {"type": "string"},
        },
        "feedback": {
            "type": "string",
        },
    },
    "required": [
        "score",
        "criteria",
        "strengths",
        "weaknesses",
        "missing_concepts",
        "feedback",
    ],
}


# ---------------------------------------------------------------------------
# Gemini result normalization
# ---------------------------------------------------------------------------

def _clamp_score(value: Any, maximum: float) -> float:
    try:
        return round(
            max(
                0.0,
                min(
                    maximum,
                    float(value),
                ),
            ),
            1,
        )
    except (TypeError, ValueError):
        return 0.0


def _normalize_gemini_review(
    parsed: dict[str, Any],
    model: str,
    input_mode: str,
) -> dict[str, Any]:

    criteria = parsed.get("criteria") or {}

    normalized = {
        "conceptual_understanding": {
            "score": _clamp_score(
                (criteria.get("conceptual_understanding") or {}).get("score"),
                4,
            ),
            "max": 4,
        },
        "technical_correctness": {
            "score": _clamp_score(
                (criteria.get("technical_correctness") or {}).get("score"),
                3,
            ),
            "max": 3,
        },
        "completeness": {
            "score": _clamp_score(
                (criteria.get("completeness") or {}).get("score"),
                2,
            ),
            "max": 2,
        },
        "visual_representation": {
            "score": _clamp_score(
                (criteria.get("visual_representation") or {}).get("score"),
                1,
            ),
            "max": 1,
        },
    }

    criterion_total = round(
        sum(
            item["score"]
            for item in normalized.values()
        ),
        1,
    )

    score = criterion_total

    return {
        "score": score,
        "criteria": normalized,
        "strengths": [
            str(x)
            for x in (parsed.get("strengths") or [])
        ][:6],
        "weaknesses": [
            str(x)
            for x in (parsed.get("weaknesses") or [])
        ][:6],
        "missing_concepts": [
            str(x)
            for x in (parsed.get("missing_concepts") or [])
        ][:8],
        "feedback": str(
            parsed.get("feedback")
            or "The submission was reviewed against the supplied question, reference answer and rubric."
        ),
        "source_used": (
            f"Gemini multimodal evaluation ({model}) — {input_mode}."
        ),
    }


# ---------------------------------------------------------------------------
# Gemini evaluator
# ---------------------------------------------------------------------------

def _gemini_review(
    question: str,
    reference: str,
    rubric: str,
    answer: str,
    file_path: str,
    file_mimetype: str,
    file_text: str,
) -> tuple[dict[str, Any] | None, str | None]:

    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not api_key:
        return None, "GEMINI_API_KEY is not loaded."

    if genai is None or types is None:
        return None, "google-genai SDK is unavailable."

    model = (
        os.getenv(
            "GEMINI_MODEL",
            "gemini-3.6-flash",
        ).strip()
        or "gemini-3.6-flash"
    )

    client = genai.Client(api_key=api_key)

    prompt = f"""
You are an expert academic assessment assistant inside Educere.

Evaluate the student's submission using the question, reference answer,
rubric, typed answer, and any uploaded document/image.

IMPORTANT RULES:

1. Judge semantic meaning, not exact keyword overlap.
2. Do not penalize different wording when the meaning is correct.
3. Separate conceptual correctness from completeness.
4. Be fair to partially correct answers.
5. Do not invent content that is not visible.
6. If an uploaded image or PDF is present, inspect it carefully.
7. Explicitly consider what is visible in the uploaded visual/document.
8. If the question requires a diagram and one is supplied, evaluate it.
9. If the diagram contradicts the written answer, identify the contradiction.
10. The criterion maximums MUST remain:
    - conceptual_understanding = 4
    - technical_correctness = 3
    - completeness = 2
    - visual_representation = 1
11. Return ONLY the requested JSON object.

QUESTION:
{question}

REFERENCE ANSWER:
{reference or "(No reference answer supplied.)"}

RUBRIC:
{rubric or "(Use the four criterion maximums specified above.)"}

STUDENT'S TYPED ANSWER:
{answer or "(No typed answer supplied.)"}

LOCALLY EXTRACTED FILE TEXT:
{file_text or "(No local text could be extracted.)"}

When a visual/document is supplied:
- Inspect it directly.
- Mention concrete visual evidence in strengths/weaknesses where relevant.
- Use the visual evidence when scoring visual representation.
"""

    # ------------------------------------------------------------------
    # Build Gemini contents explicitly.
    #
    # Google documents multimodal requests using text plus Part objects
    # in the contents list.
    # ------------------------------------------------------------------

    contents: list[Any] = [prompt]

    input_mode = "text input"

    if file_path:
        normalized_mime = (
            file_mimetype or ""
        ).split(";")[0].lower()

        lower_path = file_path.lower()

        try:
            # ----------------------------------------------------------
            # IMAGE
            # ----------------------------------------------------------
            if (
                normalized_mime.startswith("image/")
                or lower_path.endswith(
                    (".png", ".jpg", ".jpeg")
                )
            ):

                if normalized_mime not in {
                    "image/png",
                    "image/jpeg",
                    "image/jpg",
                }:
                    normalized_mime = "image/png"

                with open(file_path, "rb") as handle:
                    image_bytes = handle.read()

                image_part = types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=normalized_mime,
                )

                contents.append(image_part)

                input_mode = "text + visual input"

                print(
                    f"[Gemini] Sending image: "
                    f"{os.path.basename(file_path)} "
                    f"({normalized_mime}, {len(image_bytes)} bytes)"
                )

            # ----------------------------------------------------------
            # PDF
            # ----------------------------------------------------------
            elif (
                normalized_mime == "application/pdf"
                or lower_path.endswith(".pdf")
            ):

                print(
                    f"[Gemini] Uploading PDF: "
                    f"{os.path.basename(file_path)}"
                )

                uploaded_file = client.files.upload(
                    file=file_path,
                    config=types.UploadFileConfig(
                        mime_type="application/pdf"
                    ),
                )

                contents.append(uploaded_file)

                input_mode = "text + PDF/document input"

                print(
                    f"[Gemini] PDF uploaded successfully."
                )

        except Exception as exc:
            error = (
                f"{type(exc).__name__}: {exc}"
            )

            print(
                f"[Gemini] FILE INPUT FAILED: {error}"
            )

            return None, error

    # ------------------------------------------------------------------
    # Generate structured evaluation
    # ------------------------------------------------------------------

    try:

        print(
            f"[Gemini] Calling model={model} "
            f"mode={input_mode}"
        )

        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=GEMINI_SCHEMA,
                system_instruction=(
                    "You are a rigorous but fair academic evaluator. "
                    "Return only the requested JSON object."
                ),
            ),
        )

        raw_text = (response.text or "").strip()

        print(
            f"[Gemini] Response received "
            f"({len(raw_text)} characters)."
        )

        if not raw_text:
            return None, "Gemini returned an empty response."

        parsed = json.loads(raw_text)

        if not isinstance(parsed, dict):
            return None, "Gemini returned JSON that was not an object."

        return (
            _normalize_gemini_review(
                parsed,
                model,
                input_mode,
            ),
            None,
        )

    except Exception as exc:

        error = (
            f"{type(exc).__name__}: {exc}"
        )

        print(
            f"[Gemini] GENERATION FAILED: {error}"
        )

        return None, error


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def review_assignment(
    question: str,
    reference: str,
    rubric: str,
    answer: str,
    file_path: str = "",
    mimetype: str = "",
) -> dict[str, Any]:

    file_text = ""
    file_paths: list[str] = []

    if file_path:
        file_text, file_paths = extract_file_content(
            file_path,
            mimetype,
        )

    gemini_review, gemini_error = _gemini_review(
        question=question,
        reference=reference,
        rubric=rubric,
        answer=answer,
        file_path=(
            file_paths[0]
            if file_paths
            else ""
        ),
        file_mimetype=mimetype,
        file_text=file_text,
    )

    if gemini_review is not None:
        return gemini_review

    has_visual = bool(
        file_paths
        and (
            (mimetype or "").lower().startswith("image/")
            or file_paths[0].lower().endswith(
                (".png", ".jpg", ".jpeg")
            )
        )
    )

    return _fallback_review(
        question,
        reference,
        rubric,
        answer,
        file_text,
        has_visual,
        gemini_error=gemini_error,
    )