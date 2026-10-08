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
  constructor(state) {
    this.state = state;

    state.acceptWebSocket(
      // WebSockets are accepted later in fetch().
    );
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

      this.state.acceptWebSocket(pair[1]);

      return new Response(null, {
        status: 101,
        webSocket: pair[0],
      });
    }

    if (url.pathname === "/event" && request.method === "POST") {
      const event = await request.json();

      const id = crypto.randomUUID();

      const message = JSON.stringify({
        type: "event",
        id,
        data: event,
      });

      const sockets = this.state.getWebSockets();

      for (const socket of sockets) {
        try {
          socket.send(message);
        } catch {
          // Connection is already closed.
        }
      }

      return Response.json({
        ok: true,
        id,
      });
    }

    return new Response("Not found", {
      status: 404,
    });
  }

  webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);

      if (data.type === "response") {
        console.log("response:", data);
      }
    } catch {
      // Ignore malformed messages.
    }
  }

  webSocketClose(ws) {
    // Cloudflare removes the WebSocket automatically.
  }

  webSocketError(ws) {
    // Cloudflare removes the WebSocket automatically.
  }
}