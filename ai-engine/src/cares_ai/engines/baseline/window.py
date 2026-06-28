"""Time-based rolling window for baseline statistics."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
import math
from datetime import datetime, timedelta, timezone
import math


@dataclass
class TimedSample:
    timestamp: datetime
    value: float


@dataclass
class RollingWindow:
    """Maintains samples within a sliding time window."""

    window_minutes: int = 30
    min_std: float = 0.5
    _samples: deque[TimedSample] = field(default_factory=deque)

    def add(self, timestamp: datetime, value: float) -> None:
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        self._samples.append(TimedSample(timestamp=timestamp, value=value))
        self._evict(timestamp)

    def _evict(self, now: datetime) -> None:
        cutoff = now - timedelta(minutes=self.window_minutes)
        while self._samples and self._samples[0].timestamp < cutoff:
            self._samples.popleft()

    @property
    def sample_count(self) -> int:
        return len(self._samples)

    def mean(self) -> float | None:
        if not self._samples:
            return None
        return sum(s.value for s in self._samples) / len(self._samples)

    def std_dev(self) -> float | None:
        if len(self._samples) < 2:
            m = self.mean()
            return self.min_std if m is not None else None
        m = self.mean()
        if m is None:
            return None
        variance = sum((s.value - m) ** 2 for s in self._samples) / (len(self._samples) - 1)
        return max(self.min_std, math.sqrt(variance))

    def stats(self) -> tuple[float | None, float | None]:
        return self.mean(), self.std_dev()
