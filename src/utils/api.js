export async function fetchJson(url, options) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    // If response is HTML (starts with <!doctype or <html), it's likely server not running or proxy miss
    if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html') || text.trim().startsWith('<HTML')) {
      throw new Error(`API returned HTML instead of JSON for ${url}. Is server running on http://localhost:4000? Run 'npm run dev' in server folder.`);
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error(`Failed to parse JSON from ${url}:`, text.slice(0,200));
      throw new Error(`Invalid JSON from ${url}: ${text.slice(0,100)}`);
    }
  } catch (e) {
    console.error(`fetchJson error for ${url}:`, e);
    throw e;
  }
}

export async function fetchJsonSafe(url, options, fallback = []) {
  try {
    return await fetchJson(url, options);
  } catch (e) {
    console.warn(`API call failed for ${url}, returning fallback`, e.message);
    return fallback;
  }
}
