import uvicorn
import os
import sys

# Ensure the root directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.main import app

if __name__ == "__main__":
    # Get port from environment variable
    port_env = os.environ.get("PORT", "8080")
    
    # Handle the literal string interpolation error common in Railway settings
    if port_env == "$PORT":
        print("🚨 Deployment Error: Literal '$PORT' string detected. Defaulting to 8080.")
        port = 8080
    else:
        try:
            port = int(port_env)
        except ValueError:
            print(f"⚠️ Warning: Invalid PORT '{port_env}'. Falling back to 8080.")
            port = 8080
            
    print(f"🚀 NAMA OS Backend starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
