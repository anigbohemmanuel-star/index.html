
const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "Gabriella backend is running" }));
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    if (!process.env.OPENAI_API_KEY) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: "API key is not configured." }));
    }

    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { message } = JSON.parse(body);

        if (typeof message !== "string" || !message.trim()) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: "Please enter a message." }));
        }

        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            instructions: "You are Gabriella, a helpful, thoughtful AI assistant. Be clear, warm, honest, and concise.",
            input: message.trim()
          })
        });

        const data = await response.json();

        if (!response.ok) {
          res.writeHead(response.status);
          return res.end(JSON.stringify({
            error: data.error?.message || "The AI request failed."
          }));
        }

        const reply = (data.output || [])
          .flatMap(item => item.content || [])
          .filter(item => item.type === "output_text")
          .map(item => item.text)
          .join("\n");

        res.writeHead(200);
        res.end(JSON.stringify({ reply }));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Could not process the request." }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Gabriella listening on port ${PORT}`);
});
Add Gabriella backend
