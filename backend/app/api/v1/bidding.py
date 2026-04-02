from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.bidding import BidRequest, VendorBid, BiddingProcess, BidStatus
from app.agents.bidding import BiddingAgent
from app.api.v1.deps import get_current_user, RoleChecker
from app.models.auth import UserRole
from app.demo_data import get_demo_case_by_process_id, get_demo_case_by_booking_id
from typing import List, Dict, Any
from datetime import datetime, timedelta

router = APIRouter()
bidding_agent = BiddingAgent()

@router.post("/broadcast", response_model=List[Dict[str, Any]])
async def start_bidding_broadcast(
    request: BidRequest,
    vendor_ids: List[int],
    current_user = Depends(RoleChecker([UserRole.R2_ORG_ADMIN, UserRole.R4_OPS_EXECUTIVE])),
    db: Session = Depends(get_db)
):
    """
    Starts an autonomous bidding broadcast (M6).
    Broadcasts requirements to multiple vendors for an itinerary block.
    """
    try:
        demo_case = get_demo_case_by_booking_id(request.itinerary_block_id)
        if demo_case:
            vendor_names = {
                1: "Soneva Jani",
                2: "Address Boulevard",
                3: "Private Houseboat Operator",
            }
            return [
                {
                    "vendor_id": v_id,
                    "channel": "WhatsApp",
                    "message": (
                        f"Demo broadcast for {demo_case['guest_name']} ({demo_case['triage']['destination']}): "
                        f"{request.requirements} | Target: {request.target_price or 'Market rate'} | "
                        f"Deadline: {request.deadline.strftime('%Y-%m-%d %H:%M')}"
                    ),
                    "status": "SENT",
                    "timestamp": datetime.utcnow(),
                    "vendor_name": vendor_names.get(v_id, f"Vendor {v_id}")
                }
                for v_id in vendor_ids
            ]

        dispatches = await bidding_agent.broadcast_request(request, vendor_ids)
        # In a real app, record the bidding process in DB
        return dispatches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate-bid", response_model=Dict[str, Any])
async def evaluate_vendor_bid(
    process_id: int,
    vendor_bid: VendorBid,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluates an incoming bid using AI-driven negotiation logic (M3).
    """
    # Mocking the current process for evaluation
    demo_case = get_demo_case_by_process_id(process_id)
    mock_process = BiddingProcess(
        id=process_id,
        itinerary_block_id=1,
        status=BidStatus.PENDING,
        bids=[vendor_bid]
    )
    
    try:
        decision = await bidding_agent.evaluate_and_negotiate(mock_process, vendor_bid)
        if demo_case:
            decision["demo_case"] = demo_case["slug"]
            decision["client_name"] = demo_case["guest_name"]
            decision["lead_summary"] = demo_case["triage"]["destination"]
        return decision
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/process/{process_id}", response_model=BiddingProcess)
def get_bidding_status(
    process_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the status and history of an ongoing bidding process.
    """
    demo_case = get_demo_case_by_process_id(process_id)
    if demo_case:
        return BiddingProcess(
            id=process_id,
            itinerary_block_id=process_id,
            status=BidStatus.NEGOTIATING,
            bids=[
                VendorBid(
                    vendor_id=101,
                    vendor_name=demo_case["bidding"]["vendor"],
                    price=demo_case["finance"]["cost_total"] * 1.03,
                    status=BidStatus.NEGOTIATING,
                    notes=demo_case["bidding"]["note"],
                )
            ],
            best_bid_id=101,
            negotiation_history=[
                {
                    "agent_message": f"Can you hold this rate for {demo_case['guest_name']}?",
                    "vendor_response": "We can hold the rate for 18 hours with add-on breakfast included.",
                    "current_price": demo_case["finance"]["cost_total"] * 1.03,
                    "timestamp": datetime.utcnow() - timedelta(hours=1)
                }
            ]
        )

    # Mocking for prototype
    return BiddingProcess(
        id=process_id,
        itinerary_block_id=1,
        status=BidStatus.NEGOTIATING,
        bids=[
            VendorBid(vendor_id=101, vendor_name="Grand Hyatt Dubai", price=12500, status=BidStatus.NEGOTIATING)
        ],
        negotiation_history=[
            {
                "agent_message": "Can you offer a 10% volume discount?",
                "vendor_response": "We can offer 5% for now.",
                "current_price": 12500,
                "timestamp": datetime.utcnow() - timedelta(hours=1)
            }
        ]
    )


@router.get("/health")
def health_check():
    return {"status": "ready", "module": "BIDDING"}
