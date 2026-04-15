import uvicorn
import os
import sys

# Ensure 'backend' is in path so 'app' module can be imported
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from app.main import app

if __name__ == "__main__":
    port_env = os.environ.get("PORT", "8080")
    if port_env == "$PORT":
        port = 8080
    else:
        try:
            port = int(port_env)
        except ValueError:
            port = 8080
            
    print(f"🚀 NAMA OS Backend starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
