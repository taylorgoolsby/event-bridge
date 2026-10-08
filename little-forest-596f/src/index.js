const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const id = env.EVENT_BRIDGE.idFromName("main");
    const stub = env.EVENT_BRIDGE.get(id);

    const response = await stub.fetch(request);

    if (url.pathname === "/event") {
      const headers = new Headers(response.headers);

      for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    }

    return response;
  },
};

export class EventBridge {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.pending = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", {
          status: 426,
        });
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      this.ctx.acceptWebSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    if (url.pathname === "/event" && request.method === "POST") {
      const event = await request.json();

      const sockets = this.ctx.getWebSockets();

      if (sockets.length === 0) {
        return Response.json(
          { error: "No Node client connected" },
          { status: 503 }
        );
      }

      const id = crypto.randomUUID();

      const message = JSON.stringify({
        type: "event",
        id,
        data: event,
      });

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error("Node client timed out"));
        }, 30000);

        this.pending.set(id, {
          resolve,
          reject,
          timeout,
        });

        for (const socket of sockets) {
          try {
            socket.send(message);
          } catch {
            // Ignore closed connections.
          }
        }
      });

      return Response.json(response);
    }

    return new Response("Not found", {
      status: 404,
    });
  }

  webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);

      if (data.type !== "response") {
        return;
      }

      const pending = this.pending.get(data.id);

      if (!pending) {
        return;
      }

      clearTimeout(pending.timeout);
      this.pending.delete(data.id);

      pending.resolve(data.data);
    } catch (error) {
      console.error("Invalid WebSocket message:", error);
    }
  }

  webSocketClose(ws, code, reason, wasClean) {
    console.log("closed:", code, reason);
  }

  webSocketError(ws, error) {
    console.log("websocket error:", error);
  }
}