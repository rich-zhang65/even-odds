import { createServer } from "node:http";
import { attachSocketServer } from "./server";

const PORT = Number(process.env.PORT ?? 4000);

const http = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("even-odds server\n");
});

attachSocketServer(http);

http.listen(PORT, () => {
  console.log(`even-odds server listening on :${PORT}`);
});
