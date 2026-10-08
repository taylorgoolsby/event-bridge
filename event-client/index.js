const ws = new WebSocket(
  "wss://event-bridge.tgoolsby2.workers.dev/connect"
);

ws.addEventListener("open", () => {
  console.log("connected");
});

ws.addEventListener("message", event => {
  const message = JSON.parse(event.data);

  if (message.type === "event") {
    console.log("received:", message.data);

    ws.send(JSON.stringify({
      type: "response",
      id: message.id,
      data: {
        message: "Hello from Node!"
      }
    }));
  }
});

ws.addEventListener("close", () => {
  console.log("disconnected");
});

ws.addEventListener("error", event => {
  console.log("error:", event.error);
});