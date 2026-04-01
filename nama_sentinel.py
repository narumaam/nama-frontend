import requests
import os
import time
import json
from datetime import datetime

# Configuration
API_URL = os.getenv("NEXT_PUBLIC_API_URL", "https://intuitive-blessing-production-30de.up.railway.app")
MODULES = [
    {"id": "M1", "name": "Query Triage", "endpoint": "/api/v1/queries/health"},
    {"id": "M2", "name": "Itinerary Gen", "endpoint": "/api/v1/itineraries/health"},
    {"id": "M3", "name": "Bidding Engine", "endpoint": "/api/v1/bidding/health"},
    {"id": "M4", "name": "Global Sourcing", "endpoint": "/api/v1/sourcing/health"},
    {"id": "M5", "name": "Dynamic Pricing", "endpoint": "/api/v1/pricing/health"},
    {"id": "M6", "name": "Secure Payments", "endpoint": "/api/v1/payments/health"},
    {"id": "M7", "name": "Document OCR", "endpoint": "/api/v1/documents/health"},
    {"id": "M8", "name": "Real-time Analytics", "endpoint": "/api/v1/analytics/health"},
    {"id": "M9", "name": "Marketing OS", "endpoint": "/api/v1/marketing/health"},
    {"id": "M10", "name": "White-label Portals", "endpoint": "/api/v1/portals/health"},
    {"id": "M11", "name": "Corporate OS", "endpoint": "/api/v1/corporate/health"},
    {"id": "M12", "name": "Integration Vault", "endpoint": "/api/v1/integrations/health"},
    {"id": "M13", "name": "Finance Ledger", "endpoint": "/api/v1/financials/health"},
    {"id": "M14", "name": "Sentinel Auditor", "endpoint": "/api/v1/sentinel/health"},
    {"id": "M15", "name": "Evolution Engine (RSI)", "endpoint": "/api/v1/rsi/health"}
]

def check_modules():
    print(f"--- NAMA Sentinel Audit: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ---")
    print(f"Target API: {API_URL}")
    print("-" * 50)
    
    results = []
    all_healthy = True
    
    for module in MODULES:
        url = f"{API_URL}{module['endpoint']}"
        try:
            # Short timeout to avoid hanging
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                status = "✅ READY"
                latency = f"{response.elapsed.total_seconds():.3f}s"
            else:
                status = f"❌ DEGRADED ({response.status_code})"
                latency = "N/A"
                all_healthy = False
        except Exception as e:
            status = f"⚠️ UNREACHABLE"
            latency = "N/A"
            all_healthy = False
            
        print(f"[{module['id']}] {module['name']:<25} : {status} ({latency})")
        results.append({**module, "status": status, "latency": latency})
        
    print("-" * 50)
    overall = "SYSTEM OPERATIONAL" if all_healthy else "SYSTEM DEGRADED"
    print(f"OVERALL STATUS: {overall}")
    
    # Save report
    with open("nama_sentinel_report.txt", "w") as f:
        f.write(f"NAMA Sentinel Audit Report - {datetime.now().isoformat()}\n")
        f.write(f"Overall Status: {overall}\n\n")
        for res in results:
            f.write(f"[{res['id']}] {res['name']}: {res['status']} ({res['latency']})\n")
            
    return all_healthy

if __name__ == "__main__":
    check_modules()
