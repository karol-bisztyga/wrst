import express from "express";
import path from "path";

export function startHttpServer(
  bundlePath: string,
  bundleMinPath: string,
  getError: () => string | null,
  port: number,
  assetsDir?: string,
) {
  const app = express();

  // Project-local images/fonts: <Image src="logo.png"> resolves (in dev) to
  // GET /assets/logo.png, served straight from the project's assets folder so
  // adding/changing an asset needs no native rebuild.
  if (assetsDir) {
    app.use("/assets", express.static(assetsDir));
  }

  // When there's a current build error, the bundle endpoints return it (422)
  // instead of stale code - so every pull (including a manual reload) reflects
  // the live state. 503 means "no bundle built yet"; the device waits.
  app.get("/bundle.js", (req, res) => {
    const error = getError();
    if (error) {
      res.status(422).type("text/plain").send(error);
      return;
    }
    res.type("application/javascript");
    res.sendFile(path.resolve(bundlePath), (err) => {
      if (err) {
        res.status(503).end();
      }
    });
  });

  app.get("/bundle.min.js", (req, res) => {
    const error = getError();
    if (error) {
      res.status(422).type("text/plain").send(error);
      return;
    }
    res.type("application/javascript");
    res.sendFile(path.resolve(bundleMinPath), (err) => {
      if (err) {
        res.status(503).end();
      }
    });
  });

  app.use((req, res) => {
    res.status(404).end();
  });

  const server = app.listen(port, "0.0.0.0");

  return server;
}
