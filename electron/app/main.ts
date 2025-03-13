import express from "express";
import cors from "cors";
import http from "http";
import { WebSocket } from "ws";
import { setupWebSocketServer } from "./routes/chat";
import { chatRouter } from "./routes/chat";
import { itemRouter } from "./routes/items";
import { settingsRouter } from "./routes/settings";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/chat", chatRouter);
app.use("/items", itemRouter);
app.use("/settings", settingsRouter);

export const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

setupWebSocketServer(wss);

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});