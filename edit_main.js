(async () => {
  const editor = document.querySelector('.cm-content');
  if (editor) {
    editor.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, `import uvicorn
import os
import sys

# Ensure root is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app

if __name__ == "__main__":
    # Get port from environment variable
    port_env = os.environ.get("PORT", "8080")
    
    # Critical Fix for literal string interpolation error
    if port_env == "$PORT":
        port = 8080
    else:
        try:
            port = int(port_env)
        except ValueError:
            port = 8080
            
    print(f"🚀 NAMA OS Backend starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
`);
    return "Inserted via execCommand";
  } else {
    const textarea = document.querySelector('textarea[name="value"]');
    if (textarea) {
      textarea.value = `import uvicorn
import os
import sys

# Ensure root is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app

if __name__ == "__main__":
    # Get port from environment variable
    port_env = os.environ.get("PORT", "8080")
    
    # Critical Fix for literal string interpolation error
    if port_env == "$PORT":
        port = 8080
    else:
        try:
            port = int(port_env)
        except ValueError:
            port = 8080
            
    print(f"🚀 NAMA OS Backend starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
`;
      return "Inserted via textarea";
    }
  }
  return "Editor not found";
})()
