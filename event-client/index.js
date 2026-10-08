const url = "wss://event-bridge.tgoolsby2.workers.dev/connect";

function connect() {
  console.log("connecting...");

  const ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    console.log("connected");
  });

  ws.addEventListener("message", event => {
    const message = JSON.parse(event.data);

    console.log("event:", message);

    ws.send(JSON.stringify({
      type: "response",
      id: message.id,
      data: {
        message: "Hello from Node!",
      },
    }));
  });

  ws.addEventListener("close", () => {
    console.log("disconnected — reconnecting...");
    setTimeout(connect, 1000);
  });

  ws.addEventListener("error", event => {
    console.log("error:", event.error);
  });
}

connect();