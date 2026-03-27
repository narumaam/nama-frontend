(async () => {
  const logLines = Array.from(document.querySelectorAll('[data-testid="log-line-message"]')).map(el => el.innerText);
  if (logLines.length === 0) {
    // Fallback if the data-testid is different
    const pre = document.querySelector('pre');
    if (pre) {
      return { __result: pre.innerText };
    }
    // Try another selector
    const logs = Array.from(document.querySelectorAll('.geist-log-line')).map(el => el.innerText);
    if (logs.length > 0) {
      return { __result: logs.join('\n') };
    }
  }
  return { __result: logLines.join('\n') };
})()