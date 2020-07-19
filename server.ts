import { serve } from "./deps.ts"
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  WebSocket,
} from "./deps.ts"

import { logger } from './deps.ts'

let log = logger.getLogger()
let sockets: WebSocket[] = []

async function handleWs(sock: WebSocket) {
  log.info("socket connected!");
  sockets.push(sock)
  try {
    for await (const ev of sock) {
      if (typeof ev === "string") {
        // text message
        log.info("ws:Text", ev);
        for await(let s of sockets) {
          log.info("Sending the message: ", ev)
          await s.send(ev);
        }
      } else if (isWebSocketCloseEvent(ev)) {
        // close
        const { code, reason } = ev;
        log.info("ws:Close", code, reason);
      }
    }
  } catch (err) {
    log.error(`failed to receive frame: ${err}`);

    if (!sock.isClosed) {
      await sock.close(1000).catch(console.error);
    }
  }
}

if (import.meta.main) {
  /** websocket echo server */
  const port = Deno.args[0] || "8080";
  log.info(`websocket server is running on :${port}`);
  for await (const req of serve(`:${port}`)) {
    const { conn, r: bufReader, w: bufWriter, headers } = req;
    acceptWebSocket({
      conn,
      bufReader,
      bufWriter,
      headers,
    })
      .then(handleWs)
      .catch(async (err:string) => {
        log.error(`failed to accept websocket: ${err}`);
        await req.respond({ status: 400 });
      });
  }
}