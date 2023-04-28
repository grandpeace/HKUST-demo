const ws = new WebSocket("ws://localhost:8080/");

ws.onopen = () => {
  ws.send("Here is client");
};

ws.onmessage = (data) => {
  console.log(data);
};
