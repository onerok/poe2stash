import { Request, Response } from "express";
import { app, net } from "electron";

const hosts = [{ url: "pathofexile.com" }];

export const proxy = (req: Request, res: Response) => {
  const proxyTo = req.url.split("/")[1];
  console.log({ proxyTo });
  const host = hosts.find((host) => proxyTo.includes(host.url));

  if (!host) {
    res.writeHead(403);
    res.end(`Invalid host ${proxyTo}`);
    return;
  }

  if (host) {
    const remainder = req.url.split("/").slice(2).join("/");
    const url = `https://${host.url}/${remainder}`;
    console.log(`Proxying request to ${url}`);

    for (const key in req.headers) {
      if (
        key.startsWith("sec-") ||
        key === "host" ||
        key === "origin" ||
        key === "content-length"
      ) {
        delete req.headers[key];
      }
    }

    const params = {
      url,
      method: req.method,
      headers: {
        ...req.headers,
        "user-agent": app.userAgentFallback,
      },
      useSessionCookies: true,
      referrerPolicy: "no-referrer-when-downgrade",
    };
    console.log(params);
    const proxyReq = net.request(params);

    const proxyReqStream = proxyReq as unknown as NodeJS.WritableStream;

    proxyReq.on("response", (proxyRes) => {
      const resHeaders = { ...proxyRes.headers };
      delete resHeaders["content-encoding"];
      res.writeHead(proxyRes.statusCode, proxyRes.statusMessage, resHeaders);

      const proxyResStream = proxyRes as unknown as NodeJS.ReadableStream;
      proxyResStream.pipe(res);
    });

    proxyReq.on("error", (err) => {
      console.error(err);
      res.writeHead(500);
      res.end(err);
    });

    req.pipe(proxyReqStream);
  }
};
