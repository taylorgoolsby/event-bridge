export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const id = env.EVENT_BRIDGE.idFromName("main");
    const stub = env.EVENT_BRIDGE.get(id);

    if (url.pathname === "/connect") {
      return stub.fetch(request);
    }

    if (url.pathname === "/event" && request.method === "POST") {
      return stub.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};


export class EventBridge {
  constructor(state) {
    this.state = state;
    this.clients = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      const upgrade = request.headers.get("Upgrade");

      if (upgrade !== "websocket") {
        return new Response("Expected WebSocket", {
          status: 426
        });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      server.accept();

      this.clients.add(server);

      server.addEventListener("close", () => {
        this.clients.delete(server);
      });

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    if (url.pathname === "/event") {
      const event = await request.json();

      for (const client of this.clients) {
        try {
          client.send(JSON.stringify(event));
        } catch {
          this.clients.delete(client);
        }
      }

      return Response.json({ ok: true });
    }

    return new Response("Not found", {
      status: 404
    });
  }
}