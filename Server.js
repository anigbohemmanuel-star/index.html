const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const dashboard = path.join(__dirname, "index.html");

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && req.url === "/") {
    if (!fs.existsSync(dashboard)) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end("index.html was not found in the repository.");
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return fs.createReadStream(dashboard).pipe(res);
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "Gabriella is running" }));
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    if (!process.env.OPENAI_API_KEY) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "API key is not configured." }));
    }

    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 100000) req.destroy();
    });

    req.on("end", async () => {
      try {
        const { message } = JSON.parse(body);

        if (typeof message !== "string" || !message.trim()) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Enter a message first." }));
        }

        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            instructions: "You are Gabriella, a helpful, thoughtful AI. Be warm, clear, honest, and concise.",
            input: message.trim()
          })
        });

        const data = await response.json();

        if (!response.ok) {
          res.writeHead(502, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            error: data.error?.message || "The AI request failed."
          }));
        }

        const reply = (data.output || [])
          .flatMap(item => item.content || [])
          .filter(item => item.type === "output_text")
          .map(item => item.text)
          .join("\n");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply }));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Gabriella could not process that request." }));
      }
    });

    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Gabriella listening on port ${PORT}`);
});
