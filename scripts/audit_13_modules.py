import asyncio
import httpx
from datetime import datetime

BACKEND_URL = "https://stunning-joy-production-87bb.up.railway.app"

async def audit_modules():
    print("\n" + "="*60)
    print("NAMA TRAVEL OS: 13-MODULE SYSTEM AUDIT")
    print("="*60)

    async with httpx.AsyncClient() as client:
        # 1. Base API Check
        try:
            resp = await client.get(f"{BACKEND_URL}/")
            print(f"[SYSTEM] Base API: {'✅' if resp.status_code == 200 else '❌'} ({resp.status_code})")
        except: print("[SYSTEM] Base API: ❌ (Connection Failed)")

        # 2. Module Verification (Endpoints)
        modules = [
            ("M1/M2: Queries/Leads", "/api/v1/queries/ingest"),
            ("M3/M6: Bidding", "/api/v1/bidding/broadcast"),
            ("M4: Documents", "/api/v1/documents/visa-checklist?nationality=Indian&destination=UAE"),
            ("M5: Comms", "/api/v1/communications/threads"),
            ("M7: Bookings", "/api/v1/bookings/"),
            ("M8: Itinerary", "/api/v1/itineraries/generate"),
            ("M9: Analytics", "/api/v1/analytics/dashboard"),
            ("M10: White-Label", "/api/v1/portals/lookup?domain=nama.travel"),
            ("M11: Financials", "/api/v1/financials/summary"),
            ("M12: Content", "/api/v1/content/destinations"),
            ("M13: Corporate", "/api/v1/corporate/pos")
        ]

        for name, path in modules:
            method = "POST" if "ingest" in path or "broadcast" in path or "generate" in path else "GET"
            try:
                if method == "POST":
                    # For POST, we just check if it's reachable (might return 422 if payload empty, which is fine for audit)
                    resp = await client.post(f"{BACKEND_URL}{path}", json={})
                else:
                    resp = await client.get(f"{BACKEND_URL}{path}")
                
                # 200, 401 (Auth required), 422 (Validation error) are all proof the module logic is live
                is_live = resp.status_code in [200, 401, 422, 405]
                print(f"[{name}] Endpoint: {'✅' if is_live else '❌'} (Status: {resp.status_code})")
            except Exception as e:
                print(f"[{name}] Endpoint: ❌ (Error: {str(e)})")

    print("\n" + "="*60)
    print("AUDIT COMPLETE")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(audit_modules())
