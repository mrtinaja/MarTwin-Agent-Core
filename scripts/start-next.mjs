import http from "node:http";
import next from "next";

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || "localhost";
const dev = process.env.NODE_ENV !== "production";

const app = next({
  dev,
  dir: process.cwd(),
  hostname,
  port,
});

const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http
      .createServer((req, res) => {
        handle(req, res);
      })
      .listen(port, hostname, () => {
        console.log(`MarTwin Agent ready on http://${hostname}:${port}`);
      });
  })
  .catch((error) => {
    console.error("Failed to start MarTwin Agent:", error);
    process.exit(1);
  });
