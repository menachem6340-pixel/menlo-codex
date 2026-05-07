const http = require("http");
const next = require("next");

const port = Number(process.env.PORT || 3001);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const app = next({ dev: false, dir: __dirname, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.listen(port, hostname, () => {
      console.log(`Menlo ready on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
