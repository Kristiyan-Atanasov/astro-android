export async function debugFetchJson(url: string, options: RequestInit) {
  const res = await fetch(url, options);

  const status = res.status;
  const ok = res.ok;

  // Headers (not always fully enumerable in RN, but .get works). [web:365]
  const contentType = res.headers?.get?.("content-type");

  // Read body ONCE as text, log it, then try to parse. [web:367]
  const rawText = await res.text();

  console.log("🌐 HTTP", {
    url,
    status,
    ok,
    contentType,
    responseTextPreview: rawText.slice(0, 500),
  });

  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  return { res, status, ok, contentType, rawText, data };
}
