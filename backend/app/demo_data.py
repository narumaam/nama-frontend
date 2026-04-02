from typing import Any, Dict, List, Optional


DEMO_CASES: List[Dict[str, Any]] = [
    {
        "slug": "maldives-honeymoon",
        "lead_id": 1,
        "guest_name": "Meera Nair",
        "organization": "Nair Luxury Escapes",
        "priority": "CRITICAL",
        "query": "Hi NAMA! We want a honeymoon in Maldives — 6 nights, luxury overwater villa, private beach. Budget ₹5L for 2 people. Flexible on dates in April.",
        "triage": {
            "destination": "Maldives",
            "duration_days": 6,
            "travelers_count": 2,
            "travel_dates": "Flexible in April 2026",
            "budget_per_person": 250000.0,
            "currency": "INR",
            "preferences": ["Overwater villa", "Private beach dinner", "Spa", "Seaplane transfer"],
            "style": "Luxury",
            "confidence_score": 0.93,
            "suggested_reply": "Perfect choice for a honeymoon. I have curated a 6-night Maldives plan with a luxury overwater villa, seaplane transfer, sunset cruise, and a private beach dinner. Shall I send the itinerary now?",
            "reasoning": "Detected honeymoon intent, luxury preference, Maldives destination, and 2-traveler profile from the inbound request.",
        },
        "itinerary": {
            "title": "The Ultimate 6-Day Luxury Escape in Maldives",
            "currency": "INR",
            "total_price": 486000.0,
            "agent_reasoning": "Selected a premium overwater villa stay, high-romance experiences, and private transfers to maximize conversion for a honeymoon segment.",
            "social_post": {
                "caption": "6 nights in the Maldives, zero stress, pure luxury. Overwater villa, floating breakfast, private beach dinner, and a sunset cruise curated by NAMA. #Maldives #LuxuryTravel #TravelWithNAMA",
                "hooks": [
                    "Would you say yes to this Maldives honeymoon?",
                    "Your dream overwater villa is waiting.",
                    "Luxury travel, autonomously planned.",
                ],
                "image_suggestions": [
                    "Overwater villa at sunset",
                    "Floating breakfast on lagoon deck",
                    "Private beach dinner under lanterns",
                ],
            },
            "days": [
                {
                    "day_number": 1,
                    "title": "Arrival in Paradise",
                    "narrative": "Touch down in Malé and transition by seaplane to a luxury overwater villa for a slow first evening.",
                    "blocks": [
                        {"type": "TRANSFER", "title": "Seaplane Transfer", "description": "Shared luxury seaplane from Malé to the resort.", "cost_net": 38000, "price_gross": 45000, "currency": "INR", "meta": {"provider": "TBO", "mode": "demo"}},
                        {"type": "HOTEL", "title": "Soneva Jani Water Retreat", "description": "1-bedroom overwater villa with private pool and lagoon slide.", "cost_net": 182000, "price_gross": 214000, "currency": "INR", "meta": {"provider": "Amadeus", "mode": "demo"}},
                        {"type": "MEAL", "title": "Romantic Welcome Dinner", "description": "Chef-curated dinner by the lagoon deck.", "cost_net": 9500, "price_gross": 12500, "currency": "INR", "meta": {"provider": "Resort", "mode": "demo"}},
                    ],
                },
                {
                    "day_number": 2,
                    "title": "Spa and Sandbank",
                    "narrative": "Ease into island life with a private spa session and an exclusive sandbank brunch.",
                    "blocks": [
                        {"type": "ACTIVITY", "title": "Couples Spa Ritual", "description": "90-minute signature massage and aromatherapy ritual.", "cost_net": 16000, "price_gross": 21000, "currency": "INR", "meta": {"provider": "Bokun", "mode": "demo"}},
                        {"type": "ACTIVITY", "title": "Private Sandbank Brunch", "description": "Curated brunch setup on a secluded sandbank with butler service.", "cost_net": 12000, "price_gross": 16000, "currency": "INR", "meta": {"provider": "Bokun", "mode": "demo"}},
                    ],
                },
                {
                    "day_number": 3,
                    "title": "Lagoon Leisure",
                    "narrative": "A free-flow day with snorkeling, floating breakfast, and a golden-hour sunset cruise.",
                    "blocks": [
                        {"type": "MEAL", "title": "Floating Breakfast", "description": "Breakfast served in-villa pool with tropical fruit and champagne.", "cost_net": 6500, "price_gross": 9000, "currency": "INR", "meta": {"provider": "Resort", "mode": "demo"}},
                        {"type": "ACTIVITY", "title": "Sunset Dolphin Cruise", "description": "Shared luxury yacht cruise with champagne service.", "cost_net": 11000, "price_gross": 14500, "currency": "INR", "meta": {"provider": "Bokun", "mode": "demo"}},
                    ],
                },
            ],
        },
        "finance": {
            "quote_total": 486000.0,
            "cost_total": 391500.0,
            "gross_profit": 94500.0,
            "margin_percent": 19.44,
            "deposit_due": 180000.0,
            "status": "Deposit pending within 24 hours",
        },
        "communications": {
            "channel": "WHATSAPP",
            "latest_message": "Client opened itinerary 3 times in the last 90 minutes.",
            "suggested_follow_up": "Hi Meera, I’ve held the Maldives villa and private beach dinner window for the next 24 hours. Shall I lock it with the deposit link?",
        },
        "bidding": {
            "vendor": "Soneva Jani",
            "status": "Counter accepted",
            "note": "Negotiated honeymoon add-ons while protecting 19.4% margin.",
        },
    },
    {
        "slug": "dubai-bleisure",
        "lead_id": 3,
        "guest_name": "Arjun Mehta",
        "organization": "Velocity Corporate Travel",
        "priority": "ATTENTION",
        "query": "Need 4 nights in Dubai for one executive traveler. Mix of meetings and leisure. Downtown hotel, airport transfers, one desert experience. Budget around ₹2L all-in.",
        "triage": {
            "destination": "Dubai",
            "duration_days": 4,
            "travelers_count": 1,
            "travel_dates": "May 2026",
            "budget_per_person": 200000.0,
            "currency": "INR",
            "preferences": ["Downtown hotel", "Airport transfers", "Desert safari", "Executive comfort"],
            "style": "Premium",
            "confidence_score": 0.89,
            "suggested_reply": "I’ve prepared a 4-night Dubai business-leisure program with Downtown stay, seamless transfers, and one premium desert experience. Would you like the executive version or a softer leisure-heavy version?",
            "reasoning": "Detected a blended business-plus-leisure pattern with mid-premium positioning and solo traveler profile.",
        },
        "itinerary": {
            "title": "4-Day Premium Business + Leisure in Dubai",
            "currency": "INR",
            "total_price": 212000.0,
            "agent_reasoning": "Balanced executive convenience, central location, and one premium leisure block to support a high conversion corporate-bleisure pitch.",
            "social_post": {
                "caption": "Business in Dubai, but better. Meetings by day, skyline dining and a premium desert evening by night. #Dubai #Bleisure #TravelWithNAMA",
                "hooks": [
                    "Who said work trips can’t feel premium?",
                    "Dubai, reimagined for the modern executive.",
                    "Smart travel for high-performing teams.",
                ],
                "image_suggestions": [
                    "Downtown skyline evening view",
                    "Executive hotel suite workspace",
                    "Desert dinner setup at dusk",
                ],
            },
            "days": [
                {
                    "day_number": 1,
                    "title": "Arrival and Downtown Check-in",
                    "narrative": "Private transfer to a centrally located premium hotel with an evening free for client dinner.",
                    "blocks": [
                        {"type": "TRANSFER", "title": "Private DXB Transfer", "description": "Chauffeur-driven airport transfer to Downtown Dubai.", "cost_net": 2800, "price_gross": 4000, "currency": "INR", "meta": {"provider": "TBO", "mode": "demo"}},
                        {"type": "HOTEL", "title": "Address Boulevard", "description": "Executive room close to DIFC and Downtown meeting zones.", "cost_net": 62000, "price_gross": 76000, "currency": "INR", "meta": {"provider": "Amadeus", "mode": "demo"}},
                    ],
                },
                {
                    "day_number": 2,
                    "title": "Meetings and Skyline Dining",
                    "narrative": "Business through the day, capped with a skyline dinner and Burj views.",
                    "blocks": [
                        {"type": "MEAL", "title": "Executive Dinner at At.mosphere", "description": "Window table dinner with city skyline views.", "cost_net": 9000, "price_gross": 13000, "currency": "INR", "meta": {"provider": "Concierge", "mode": "demo"}},
                    ],
                },
                {
                    "day_number": 3,
                    "title": "Premium Desert Evening",
                    "narrative": "A curated premium desert experience with private transfer and gourmet setup.",
                    "blocks": [
                        {"type": "ACTIVITY", "title": "Premium Desert Safari", "description": "Private 4x4, sunset dune drive, and gourmet camp dinner.", "cost_net": 14000, "price_gross": 18500, "currency": "INR", "meta": {"provider": "Bokun", "mode": "demo"}},
                    ],
                },
            ],
        },
        "finance": {
            "quote_total": 212000.0,
            "cost_total": 169500.0,
            "gross_profit": 42500.0,
            "margin_percent": 20.05,
            "deposit_due": 85000.0,
            "status": "Quote approved and ready to send",
        },
        "communications": {
            "channel": "EMAIL",
            "latest_message": "Lead scoring has increased after response to premium options.",
            "suggested_follow_up": "Hi Arjun, your Dubai executive itinerary is ready. I’ve included Downtown stay, airport transfers, and one premium desert evening. Shall I send the final quote PDF?",
        },
        "bidding": {
            "vendor": "Address Boulevard",
            "status": "Rate held for 18 hours",
            "note": "Secured executive rate with breakfast inclusion and flexible cancellation.",
        },
    },
    {
        "slug": "kerala-family",
        "lead_id": 2,
        "guest_name": "Sharma Family",
        "organization": "BluePalm Holidays",
        "priority": "CRITICAL",
        "query": "Need a Kerala family trip for 5 days in June for 2 adults and 1 child. Want Munnar, Alleppey houseboat, and easy pacing. Budget about ₹1.2L total.",
        "triage": {
            "destination": "Kerala",
            "duration_days": 5,
            "travelers_count": 3,
            "travel_dates": "June 2026",
            "budget_per_person": 40000.0,
            "currency": "INR",
            "preferences": ["Munnar", "Houseboat", "Family-friendly", "Easy pacing"],
            "style": "Comfort",
            "confidence_score": 0.9,
            "suggested_reply": "I’ve prepared a relaxed 5-day Kerala family itinerary with Munnar hills, a private Alleppey houseboat, and child-friendly pacing. Would you like the standard or upgraded resort option?",
            "reasoning": "Detected a family segment, 5-day duration, and strong product anchors around Munnar and Alleppey.",
        },
        "itinerary": {
            "title": "5-Day Family Comfort Escape in Kerala",
            "currency": "INR",
            "total_price": 124000.0,
            "agent_reasoning": "Built a low-friction family journey with comfortable transit times and one standout product moment on the houseboat.",
            "social_post": {
                "caption": "Tea gardens, misty mornings, and a private houseboat in Kerala. A soft-paced family trip built to feel effortless. #Kerala #FamilyTravel #TravelWithNAMA",
                "hooks": [
                    "What if family travel actually felt calm?",
                    "Kerala, slowed down beautifully.",
                    "A houseboat stay your child will remember forever.",
                ],
                "image_suggestions": [
                    "Munnar tea gardens at sunrise",
                    "Private houseboat on Alleppey backwaters",
                    "Family breakfast with hill view",
                ],
            },
            "days": [
                {
                    "day_number": 1,
                    "title": "Cochin to Munnar",
                    "narrative": "Private transfer into the hills and check-in at a family-friendly tea valley resort.",
                    "blocks": [
                        {"type": "TRANSFER", "title": "Private SUV Transfer", "description": "Cochin to Munnar with one scenic tea stop.", "cost_net": 4200, "price_gross": 6000, "currency": "INR", "meta": {"provider": "TBO", "mode": "demo"}},
                        {"type": "HOTEL", "title": "Fragrant Nature Munnar", "description": "Valley-view family suite with breakfast.", "cost_net": 18000, "price_gross": 23500, "currency": "INR", "meta": {"provider": "Amadeus", "mode": "demo"}},
                    ],
                },
                {
                    "day_number": 3,
                    "title": "Houseboat Highlight",
                    "narrative": "Transition to Alleppey for a private overnight houseboat experience with all meals.",
                    "blocks": [
                        {"type": "ACTIVITY", "title": "Private Alleppey Houseboat", "description": "Family-exclusive houseboat with meals and sunset cruise.", "cost_net": 14000, "price_gross": 18500, "currency": "INR", "meta": {"provider": "Bokun", "mode": "demo"}},
                    ],
                },
            ],
        },
        "finance": {
            "quote_total": 124000.0,
            "cost_total": 98750.0,
            "gross_profit": 25250.0,
            "margin_percent": 20.36,
            "deposit_due": 45000.0,
            "status": "Payment reminder queued",
        },
        "communications": {
            "channel": "WHATSAPP",
            "latest_message": "Deposit reminder pending for 26 hours.",
            "suggested_follow_up": "Hi Mr. Sharma, your Kerala family itinerary is still on hold. I can keep the Munnar suite and private houseboat for a few more hours if you’d like me to secure them now.",
        },
        "bidding": {
            "vendor": "Private Houseboat Operator",
            "status": "Pending confirmation",
            "note": "Alternate operator already staged in case primary vendor doesn’t respond.",
        },
    },
]


def list_demo_cases() -> List[Dict[str, Any]]:
    return DEMO_CASES


def get_demo_case(slug: Optional[str] = None, lead_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    for case in DEMO_CASES:
        if slug and case["slug"] == slug:
            return case
        if lead_id is not None and case["lead_id"] == lead_id:
            return case
    return None
