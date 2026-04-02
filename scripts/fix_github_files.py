import os
import subprocess
import base64
import json

def update_github_file(path, local_content_path):
    print(f"Updating {path}...")
    try:
        with open(local_content_path, "rb") as f:
            content = base64.b64encode(f.read()).decode("utf-8")
        
        # Get current file SHA if it exists
        cmd_get = ["gh", "api", f"repos/narumaam/nama-frontend/contents/{path}"]
        result = subprocess.run(cmd_get, capture_output=True, text=True)
        sha = ""
        if result.returncode == 0:
            sha = json.loads(result.stdout).get("sha", "")
        
        # Update or Create
        cmd_put = [
            "gh", "api", "--method", "PUT", 
            f"repos/narumaam/nama-frontend/contents/{path}",
            "-f", f"message=Production Fix: {os.path.basename(path)}",
            "-f", f"content={content}",
            "-f", f"branch=main"
        ]
        if sha:
            cmd_put.extend(["-f", f"sha={sha}"])
            
        subprocess.run(cmd_put, check=True)
        print(f"✅ Successfully updated {path}")
    except Exception as e:
        print(f"❌ Failed to update {path}: {str(e)}")

# Define files to fix
files_to_fix = {
    "vercel.json": "vercel.json",
    "backend/Procfile": "backend/Procfile",
    "backend/requirements.txt": "backend/requirements.txt",
    "backend/nixpacks.toml": "backend/nixpacks.toml",
    "backend/main.py": "backend/main.py",
    "backend/railway.json": "backend/railway.json",
    "src/app/layout.tsx": "src/app/layout.tsx",
    "src/app/page.tsx": "src/app/page.tsx",
    "src/app/register/page.tsx": "src/app/register/page.tsx",
    "src/lib/api.ts": "src/lib/api.ts"
}

if __name__ == "__main__":
    for remote_path, local_path in files_to_fix.items():
        update_github_file(remote_path, local_path)
