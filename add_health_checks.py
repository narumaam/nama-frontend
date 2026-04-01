import os
import glob

files = glob.glob("/Users/radhika/.accio/accounts/7082939334/agents/DID-2799F4-428BC9/project/backend/app/api/v1/*.py")

for file_path in files:
    if "__init__.py" in file_path or "deps.py" in file_path:
        continue
        
    with open(file_path, "r") as f:
        content = f.read()
        
    if "@router.get(\"/health\")" in content:
        continue
        
    # Add health check at the end
    with open(file_path, "a") as f:
        f.write("\n\n@router.get(\"/health\")\ndef health_check():\n    return {\"status\": \"ready\", \"module\": \"" + os.path.basename(file_path).replace(".py", "").upper() + "\"}\n")
        
    print(f"Added health check to {file_path}")
