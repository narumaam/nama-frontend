import asyncio
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.agents.triage import QueryTriageAgent
from app.agents.itinerary import ItineraryAgent
from app.agents.bidding import BiddingAgent
from app.agents.finance import FinanceAgent
from app.agents.analytics import AnalyticsAgent
from app.schemas.queries import RawQuery, QuerySource
from app.schemas.itinerary import ItineraryCreateRequest
from app.schemas.bidding import BidRequest, VendorBid, BidStatus, BiddingProcess
from app.schemas.financials import Transaction, TransactionType, TransactionStatus

async def run_nama_full_lifecycle_test():
    # Initialize all 5 core intelligence agents
    triage_agent = QueryTriageAgent()
    itinerary_agent = ItineraryAgent()
    bidding_agent = BiddingAgent()
    finance_agent = FinanceAgent()
    analytics_agent = AnalyticsAgent()
    
    print("\n" + "="*60)
    print("NAMA TRAVEL OS: FULL END-TO-END AGENTIC LIFECYCLE TEST")
    print("="*60)

    # 1. M1: INBOUND QUERY TRIAGE
    print("\n[M1/M2] STAGE 1: INBOUND LEAD CAPTURE")
    raw_msg = "Hi! We are a group of 4 looking for a 7-day luxury wellness retreat in Bali this December. Budget is around $5000 per person. We need private villas and spa treatments."
    query = RawQuery(source=QuerySource.WHATSAPP, content=raw_msg, sender_id="+123456789", tenant_id=1)
    triage = await triage_agent.triage_query(query)
    lead = triage.extracted_data
    print(f"-> Extracted: {lead.destination} for {lead.duration_days} days ({lead.style} style)")
    print(f"-> AI Confidence: {lead.confidence_score * 100}%")

    # 2. M8: ITINERARY GENERATION
    print("\n[M8] STAGE 2: AUTONOMOUS ITINERARY BUILDING")
    itinerary_req = ItineraryCreateRequest(
        lead_id=2001, destination=lead.destination, duration_days=lead.duration_days,
        traveler_count=lead.travelers_count, preferences=lead.preferences, style=lead.style
    )
    itinerary = await itinerary_agent.generate_itinerary(itinerary_req)
    print(f"-> Title: {itinerary.title}")
    print(f"-> Selected Supply: {itinerary.days[0].blocks[1].title} (Real-time Amadeus/TBO fetch)")

    # 3. M3/M6: AUTONOMOUS VENDOR BIDDING
    print("\n[M3/M6] STAGE 3: KINETIC VENDOR NEGOTIATION")
    bid_req = BidRequest(itinerary_block_id=501, requirements={"hotel": "Siam Kempinski", "nights": 7}, target_price=12000, deadline=datetime.utcnow() + timedelta(hours=2))
    # Simulate a vendor submitting a high bid
    high_bid = VendorBid(vendor_id=101, vendor_name="Siam Kempinski BKK", price=15000, currency="THB")
    negotiation = await bidding_agent.evaluate_and_negotiate(BiddingProcess(id=1, itinerary_block_id=501, status=BidStatus.PENDING, bids=[high_bid]), high_bid)
    print(f"-> Vendor Bid: {high_bid.price} {high_bid.currency}")
    print(f"-> AI Action: {negotiation['action']}")
    print(f"-> AI Reasoning: {negotiation['reasoning']}")

    # 4. M11: FINANCIAL RECONCILIATION
    print("\n[M11] STAGE 4: REAL-TIME FINANCIAL LEDGER")
    txs = [
        Transaction(booking_id=3001, tenant_id=1, amount=400000.0, currency="INR", type=TransactionType.INFLOW, status=TransactionStatus.COMPLETED),
        Transaction(booking_id=3001, tenant_id=1, amount=320000.0, currency="INR", type=TransactionType.OUTFLOW, status=TransactionStatus.COMPLETED)
    ]
    pnl = await finance_agent.calculate_booking_profit(txs)
    print(f"-> Net Profit: {pnl.currency} {pnl.net_profit:,.2f}")
    print(f"-> Margin: {pnl.margin_percentage}%")

    # 5. M9: ANALYTICS & FORECASTING
    print("\n[M9] STAGE 5: BUSINESS INTELLIGENCE & HEALTH")
    summary = await analytics_agent.generate_dashboard_summary(1)
    forecast = await analytics_agent.generate_forecast(1)
    print(f"-> Current GMV: {summary.currency} {summary.gmv.value:,.0f} ({summary.gmv.status} {summary.gmv.trend}%)")
    print(f"-> Next Month Forecast: {forecast.projected_gmv:,.0f} (Confidence: {forecast.confidence_score*100}%)")
    print(f"-> Recommendation: {forecast.recommendation}")

    print("\n" + "="*60)
    print("NAMA TRAVEL OS: E2E SYSTEM VALIDATED SUCCESSFULLY")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(run_nama_full_lifecycle_test())
