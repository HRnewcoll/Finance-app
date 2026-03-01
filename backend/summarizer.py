"""Extractive journal entry summariser.

Uses TF-IDF-style sentence scoring to extract the most informative
sentences from a journal entry — no external API or large model required.
An optional OpenAI integration is supported when an API key is available.
"""

from __future__ import annotations

import math
import os
import re
from collections import Counter


# ---------------------------------------------------------------------------
# Simple extractive summariser
# ---------------------------------------------------------------------------

_STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "is", "was", "are", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "shall", "can",
    "to", "of", "in", "for", "on", "with", "as", "at", "by", "from",
    "up", "out", "it", "its", "this", "that", "these", "those", "then",
    "so", "i", "me", "my", "we", "our", "you", "your", "he", "she",
    "they", "their", "them", "what", "which", "who", "whom", "not",
    "very", "just", "also", "more", "over", "about",
}


def _tokenize(text: str) -> list[str]:
    return [
        w.lower()
        for w in re.findall(r"\b[a-zA-Z']+\b", text)
        if w.lower() not in _STOP_WORDS and len(w) > 2
    ]


def _sentence_split(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in sentences if s.strip()]


def extractive_summary(text: str, max_sentences: int = 3) -> str:
    """Return an extractive summary of *text* using TF-IDF sentence scoring."""
    sentences = _sentence_split(text)
    if len(sentences) <= max_sentences:
        return text.strip()

    # Term frequencies across entire document
    all_tokens = _tokenize(text)
    tf = Counter(all_tokens)
    n_docs = len(sentences)

    # IDF: log((n+1) / (df+1))
    doc_freq: Counter = Counter()
    sentence_tokens: list[list[str]] = []
    for sent in sentences:
        tokens = set(_tokenize(sent))
        sentence_tokens.append(list(tokens))
        for tok in tokens:
            doc_freq[tok] += 1

    idf = {tok: math.log((n_docs + 1) / (doc_freq[tok] + 1)) for tok in tf}

    # Score each sentence
    scores: list[float] = []
    for i, tokens in enumerate(sentence_tokens):
        score = sum(tf[tok] * idf.get(tok, 0.0) for tok in tokens)
        # Slight positional bias – first and last sentences are often important
        if i == 0 or i == len(sentences) - 1:
            score *= 1.2
        scores.append(score)

    # Pick top sentences, preserving original order
    ranked = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    selected = sorted(ranked[:max_sentences])
    return " ".join(sentences[i] for i in selected)


# ---------------------------------------------------------------------------
# OpenAI-backed summariser (optional)
# ---------------------------------------------------------------------------

def _openai_summary(text: str, max_sentences: int = 3) -> str:
    """Summarise using the OpenAI Chat API (requires OPENAI_API_KEY env var)."""
    try:
        from openai import OpenAI  # type: ignore[import]
    except ImportError as exc:
        raise RuntimeError("openai package not installed") from exc

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    prompt = (
        f"Summarise the following personal journal entry in at most {max_sentences} "
        "sentences, focusing on key emotions, events, and insights:\n\n"
        f"{text}"
    )
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def summarize(
    text: str,
    max_sentences: int = 3,
    use_openai: bool = False,
) -> dict:
    """Summarise *text* and return metadata.

    Args:
        text:          The journal entry to summarise.
        max_sentences: Maximum sentences in the summary.
        use_openai:    If True and OPENAI_API_KEY is set, use the OpenAI API.

    Returns a dict with ``summary``, ``method``, and ``word_count``.
    """
    if not text or not text.strip():
        return {"summary": "", "method": "none", "word_count": 0}

    word_count = len(text.split())

    if use_openai and os.environ.get("OPENAI_API_KEY"):
        try:
            summary = _openai_summary(text, max_sentences)
            return {"summary": summary, "method": "openai", "word_count": word_count}
        except Exception:  # noqa: BLE001
            pass  # fall through to extractive

    summary = extractive_summary(text, max_sentences)
    return {"summary": summary, "method": "extractive", "word_count": word_count}
