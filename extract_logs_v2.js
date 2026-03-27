(() => {
  const logContainer = Array.from(document.querySelectorAll('div')).find(div => div.innerText.includes('Command "npm run build" exited with 1'))?.parentElement?.parentElement;
  // Actually, Vercel logs use a different structure. Let's find the one with 'Build Logs'
  const logDiv = document.querySelector('pre') || document.querySelector('[role="log"]') || document.querySelector('div[class*="log"]');
  if (logDiv) {
    logDiv.scrollTop = logDiv.scrollHeight;
    return logDiv.innerText;
  }
  // Try finding by text
  const allText = document.body.innerText;
  if (allText.includes('Error:')) {
      const parts = allText.split('Error:');
      return "Error:" + parts[parts.length-1].substring(0, 500);
  }
  return "Could not find specific log container, returning page summary: " + allText.substring(allText.indexOf('Build Failed'), allText.indexOf('Build Failed') + 500);
})()