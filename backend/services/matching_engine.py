from __future__ import annotations

import numpy as np


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two vectors."""
    va = np.asarray(a, dtype=np.float64)
    vb = np.asarray(b, dtype=np.float64)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))


def calculate_match_scores(
    skill_embeddings: list[list[float]],
    skill_names: list[str],
    jobs: list[dict],
) -> list[dict]:
    """Score each job against the user's skill embeddings.

    Returns a list of result dicts sorted by score descending.
    """
    results: list[dict] = []

    for job in jobs:
        job_embedding = job.get("embedding")
        if not job_embedding:
            continue

        similarities = [
            cosine_similarity(se, job_embedding) for se in skill_embeddings
        ]
        avg_score = sum(similarities) / len(similarities) if similarities else 0.0

        requirements: list[str] = job.get("requirements", [])
        req_lower = {r.lower() for r in requirements}
        skill_lower = {s.lower() for s in skill_names}

        matched = [s for s in skill_names if s.lower() in req_lower]
        gaps = [r for r in requirements if r.lower() not in skill_lower]

        results.append(
            {
                "job_id": job["id"],
                "company": job.get("company", ""),
                "position": job.get("position", ""),
                "score": round(avg_score * 100, 1),
                "matched_skills": matched,
                "gap_skills": gaps,
                "tags": requirements[:5],
            }
        )

    results.sort(key=lambda x: x["score"], reverse=True)
    return results
