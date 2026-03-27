(async () => {
  const logLines = Array.from(document.querySelectorAll('code')).map(el => el.innerText);
  return { __result: logLines };
})()