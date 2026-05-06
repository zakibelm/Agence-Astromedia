async function testOpenRouterVideo() {
  const apiKey = process.env.OPENROUTER_API_KEY || "sk-or-v1-dummy";
  const BASE_URL = 'https://openrouter.ai/api/v1';
  
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'Test',
    },
    body: JSON.stringify({
      model: "kwaivgi/kling-v3.0-pro",
      messages: [{role: "user", content: "A beautiful sunset"}],
      // modalities: ["video"] // let's see if this works
    }),
  });
  
  console.log("Video Status:", res.status);
  const json = await res.json();
  console.log("Response:", JSON.stringify(json, null, 2));
}

testOpenRouterVideo();
