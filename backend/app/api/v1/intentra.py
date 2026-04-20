"""
M20 — Intentra: Intent Intelligence Feed
-----------------------------------------
Social listening endpoint. Returns intent signals from monitored sources.
For the MVP, signals are seeded from realistic travel intent data.
In production, these would be sourced from Reddit/Twitter/Quora scrapers
running as background jobs and stored in the DB.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.v1.deps import require_tenant

logger = logging.getLogger(__name__)
router = APIRouter()


class IntentSignal(BaseModel):
    id: int
    source: str
    post: str
    username: str
    subreddit: Optional[str] = None
    time: str
    destinations: List[str]
    intent: int          # 0–100
    intent_level: str    # HIGH | MID | LOW
    is_hot: bool
    upvotes: Optional[int] = None


_SIGNALS: List[IntentSignal] = [
    IntentSignal(id=1, source="REDDIT",      username="u/rahul_weds_priya",  subreddit="r/IndiaTravel",  time="4 min ago",  destinations=["Maldives","Bali"],       intent=92, intent_level="HIGH", is_hot=True,  upvotes=14,
        post="Planning a honeymoon for March — torn between Maldives and Bali. We want an overwater villa, sunset dinners, spa. Budget around ₹3.5L for 7 nights. Any DMC recs?"),
    IntentSignal(id=2, source="TWITTER",     username="@travel_with_mehta",                              time="11 min ago", destinations=["Rajasthan"],             intent=88, intent_level="HIGH", is_hot=True,
        post="Seriously need a Rajasthan trip this winter. Heritage forts, desert camp, Jaipur & Jodhpur. Group of 6. Anyone used a travel DMC? Looking for ₹60-80K per person all inclusive."),
    IntentSignal(id=3, source="QUORA",       username="Aditya Verma",                                    time="18 min ago", destinations=["Kenya","Tanzania"],       intent=85, intent_level="HIGH", is_hot=True,  upvotes=8,
        post="What is the best way to book a 10-day Kenya safari for a family of 4? We want luxury lodges, private game drives, and a bush dinner. Flexible budget, preferably mid-October."),
    IntentSignal(id=4, source="FACEBOOK",    username="Sneha Kapoor",        subreddit="Travel Lovers India", time="31 min ago", destinations=["Europe"],          intent=78, intent_level="HIGH", is_hot=False,
        post="We are 3 couples planning a 15-day Europe trip next summer. Paris, Rome, Santorini. Budget roughly ₹2.5L per person. Looking for a reliable package. Please suggest!"),
    IntentSignal(id=5, source="TRIPADVISOR", username="PriyankaMumbai",                                  time="47 min ago", destinations=["Ladakh","Spiti"],        intent=74, intent_level="HIGH", is_hot=False, upvotes=22,
        post="Planning a solo bike trip on Manali-Leh highway in July. Want to extend to Spiti Valley. 16 days total. Need suggestions for a reliable bike rental and route guide."),
    IntentSignal(id=6, source="REDDIT",      username="u/bengaluru_traveller", subreddit="r/TravelIndia", time="1 hr ago",   destinations=["Coorg","Ooty","Kodaikanal"], intent=68, intent_level="MID", is_hot=False, upvotes=5,
        post="Best weekend getaway from Bangalore for a family with a 5-year-old? We prefer hill stations and nature. Budget ₹20K for 2 nights. Open to suggestions."),
    IntentSignal(id=7, source="INSTAGRAM",   username="@wanderlust_sinha",                               time="1.5 hr ago", destinations=["Bali","Thailand"],       intent=65, intent_level="MID", is_hot=False,
        post="Anyone done Bali + Thailand back to back? Thinking of a 12-day trip in April. What worked for you? Looking for a mix of beaches and culture. Budget flexible!"),
    IntentSignal(id=8, source="TWITTER",     username="@delhiite_diaries",                               time="2 hr ago",   destinations=["Bhutan"],               intent=60, intent_level="MID", is_hot=False,
        post="Bhutan trip for a couple in March — is it worth it? How much does it cost? Seeing a lot of posts about it lately and getting tempted."),
    IntentSignal(id=9, source="QUORA",       username="Meera Nambiar",                                   time="3 hr ago",   destinations=["Dubai","Abu Dhabi"],     intent=55, intent_level="MID", is_hot=False, upvotes=3,
        post="Is a 5-night Dubai + Abu Dhabi trip feasible for ₹80K for 2 people from Chennai including flights? What should I not miss?"),
    IntentSignal(id=10, source="FACEBOOK",   username="Karan Malhotra",      subreddit="Budget Travel India", time="4 hr ago", destinations=["Vietnam","Cambodia"], intent=45, intent_level="LOW", is_hot=False,
        post="Has anyone done Vietnam + Cambodia on a backpacker budget? Planning for October. Two weeks, roughly USD 1500 including flights. Any tips?"),
]


@router.get(
    "/signals",
    response_model=List[IntentSignal],
    summary="Get intent signals feed (M20)",
)
async def get_signals(
    limit: int = Query(default=20, le=50),
    intent_level: Optional[str] = Query(default=None, description="Filter by HIGH | MID | LOW"),
    source: Optional[str] = Query(default=None, description="Filter by REDDIT | TWITTER | QUORA etc."),
    _tenant_id: int = Depends(require_tenant),
) -> List[IntentSignal]:
    """Return intent signals. Filters by level and source if provided."""
    signals = _SIGNALS
    if intent_level:
        signals = [s for s in signals if s.intent_level == intent_level.upper()]
    if source:
        signals = [s for s in signals if s.source == source.upper()]
    return signals[:limit]


@router.get(
    "/signals/stats",
    summary="Intent signal summary stats",
)
async def get_signal_stats(
    _tenant_id: int = Depends(require_tenant),
) -> dict:
    """Return summary stats for the signals feed."""
    high = sum(1 for s in _SIGNALS if s.intent_level == "HIGH")
    mid  = sum(1 for s in _SIGNALS if s.intent_level == "MID")
    low  = sum(1 for s in _SIGNALS if s.intent_level == "LOW")
    hot  = sum(1 for s in _SIGNALS if s.is_hot)
    return {
        "total": len(_SIGNALS),
        "high_intent": high,
        "mid_intent": mid,
        "low_intent": low,
        "hot_signals": hot,
        "avg_intent_score": round(sum(s.intent for s in _SIGNALS) / len(_SIGNALS), 1),
    }
