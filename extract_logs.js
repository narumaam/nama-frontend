(() => {
  const logContainer = document.querySelector('[role="region"][aria-label="Build Logs 35s"]');
  if (!logContainer) return { error: 'Log container not found' };
  
  // Try to find the actual log lines. Usually they are in a code or pre tag or div.
  const lines = Array.from(logContainer.querySelectorAll('div, span, code, pre'))
    .map(el => el.innerText.trim())
    .filter(text => text.length > 0);
    
  return { __result: lines.join('\n') };
})()