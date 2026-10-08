const ws = new WebSocket(
  "wss://event-bridge.tgoolsby2.workers.dev/connect"
);

ws.addEventListener("open", () => {
  console.log("connected");
});

ws.addEventListener("message", event => {
  console.log("event:", event.data);
});

ws.addEventListener("close", () => {
  console.log("disconnected");
});

ws.addEventListener("error", event => {
  console.log("error:", event.error);
});