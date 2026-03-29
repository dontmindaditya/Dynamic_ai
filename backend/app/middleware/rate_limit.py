import time
from collections import defaultdict
from fastapi import HTTPException

_build_timestamps: dict[str, list[float]] = defaultdict(list)

MAX_BUILDS_PER_MINUTE = 5
WINDOW_SECONDS        = 60


def check_build_rate_limit(user_id: str) -> None:
    now    = time.time()
    window = now - WINDOW_SECONDS

    _build_timestamps[user_id] = [
        t for t in _build_timestamps[user_id] if t > window
    ]

    if len(_build_timestamps[user_id]) >= MAX_BUILDS_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {MAX_BUILDS_PER_MINUTE} builds per minute.",
        )

    _build_timestamps[user_id].append(now)