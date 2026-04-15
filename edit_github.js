(async () => {
  const cmContent = document.querySelector('.cm-content');
  const textarea = document.querySelector('textarea[name="value"]');
  const roleTextbox = document.querySelector('[role="textbox"]');

  if (cmContent) {
    // For CodeMirror 6, the best way to change text while keeping the editor state
    // is often to use focus and execCommand, or just 'type'.
    // However, we can try to just replace all text if it allows it.
    // If it's a contenteditable, we can set innerText, but that often breaks the editor's internal model.
    // Let's see the current text.
    const originalText = cmContent.innerText;
    const newText = originalText.replace(/"next": "14.2.15"/g, '"next": "14.2.16"')
                                 .replace(/"eslint-config-next": "14.2.15"/g, '"eslint-config-next": "14.2.16"');
    if (originalText === newText) {
      return { msg: "No change needed or version not found", text: originalText.substring(0, 100) };
    }
    // Try to set it back? 
    // Actually, CodeMirror 6 is very picky. 
    // Let's just use the 'type' kind in 'act' with clearFirst: true. 
    // It's the most reliable way to interact with complex editors from this tool.
    return { kind: 'cm6', text: newText };
  } else if (textarea) {
    const originalText = textarea.value;
    const newText = originalText.replace(/"next": "14.2.15"/g, '"next": "14.2.16"')
                                 .replace(/"eslint-config-next": "14.2.15"/g, '"eslint-config-next": "14.2.16"');
    textarea.value = newText;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    return { kind: 'textarea', success: true };
  }
  return { error: "Editor not found", selectors: { cmContent: !!cmContent, textarea: !!textarea, roleTextbox: !!roleTextbox } };
})()