import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const PORT = 3000;

// Store rooms and connected clients
interface Client {
  id: string;
  roomId: string;
  ws: WebSocket;
}

const clients = new Map<string, Client>();

wss.on("connection", (ws: WebSocket) => {
  let clientId = "";
  let currentRoomId = "";

  ws.on("message", (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type, roomId, senderId, targetId, payload } = data;

      switch (type) {
        case "join_room": {
          clientId = senderId || Math.random().toString(36).substring(2, 9);
          currentRoomId = roomId || "default-room";

          clients.set(clientId, { id: clientId, roomId: currentRoomId, ws });

          // Find existing clients in the room
          const roomClients = Array.from(clients.values())
            .filter((c) => c.roomId === currentRoomId && c.id !== clientId)
            .map((c) => c.id);

          // Acknowledge join & notify peer
          ws.send(
            JSON.stringify({
              type: "room_joined",
              clientId,
              roomId: currentRoomId,
              peersInRoom: roomClients,
            })
          );

          // Broadcast user_joined to other clients in room
          broadcastToRoom(currentRoomId, clientId, {
            type: "peer_joined",
            peerId: clientId,
          });

          console.log(`[Signaling] Client ${clientId} joined room ${currentRoomId}`);
          break;
        }

        case "offer":
        case "answer":
        case "ice_candidate": {
          // Route to specific target peer or broadcast to room
          if (targetId && clients.has(targetId)) {
            clients.get(targetId)?.ws.send(
              JSON.stringify({
                type,
                senderId: clientId,
                payload,
              })
            );
          } else if (currentRoomId) {
            broadcastToRoom(currentRoomId, clientId, {
              type,
              senderId: clientId,
              payload,
            });
          }
          break;
        }

        case "leave_room": {
          if (clientId) {
            handleLeave(clientId, currentRoomId);
          }
          break;
        }

        default:
          console.log(`[Signaling] Unknown event: ${type}`);
      }
    } catch (err) {
      console.error("[Signaling] Error processing message:", err);
    }
  });

  ws.on("close", () => {
    if (clientId) {
      handleLeave(clientId, currentRoomId);
    }
  });

  ws.on("error", (err) => {
    console.error(`[Signaling] WebSocket error for client ${clientId}:`, err);
  });
});

function broadcastToRoom(roomId: string, senderId: string, message: object) {
  const payloadStr = JSON.stringify(message);
  for (const client of clients.values()) {
    if (client.roomId === roomId && client.id !== senderId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payloadStr);
    }
  }
}

function handleLeave(clientId: string, roomId: string) {
  clients.delete(clientId);
  if (roomId) {
    broadcastToRoom(roomId, clientId, {
      type: "peer_left",
      peerId: clientId,
    });
    console.log(`[Signaling] Client ${clientId} left room ${roomId}`);
  }
}

// Handle HTTP upgrade for WebSockets
server.on("upgrade", (request, socket, head) => {
  const pathname = request.url;
  if (pathname === "/ws/signaling" || pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    // Also handle default websocket connection
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", activeClients: clients.size });
});

// Gemini AI Chat Route
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { prompt, history } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in environment variables. Please set it in AI Studio secrets.",
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are the WebRTC Master Architect & Senior Real-Time Networking Specialist.
Your goal is to provide deep, accurate, practical engineering advice on WebRTC, NAT traversal (STUN/TURN/ICE), Signaling protocols, SFU/MCU/Mesh topologies, Media Codecs (VP8/VP9/AV1/Opus), RTCDataChannel chunking, and troubleshooting.
Format your responses with clear markdown headers, clean code snippets, and structured bullet points.`;

    const contents = [
      { role: "user", parts: [{ text: systemInstruction }] },
      ...(history || []).map((h: { role: string; content: string }) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
      { role: "user", parts: [{ text: prompt }] },
    ];

    console.log("[Gemini API] Requesting gemini-3.1-pro-preview with thinkingLevel HIGH");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: contents,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    // Extract thinking steps if present in candidates/parts or reasoning
    const text = response.text || "No response received.";
    const candidate = response.candidates?.[0];
    let thinkingText = "";

    if (candidate && candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if ("thought" in part && part.thought) {
          thinkingText += part.thought + "\n";
        }
      }
    }

    res.json({
      reply: text,
      thinking: thinkingText.trim() || null,
    });
  } catch (error: any) {
    console.error("[Gemini API Error]:", error);
    res.status(500).json({
      error: error.message || "Failed to generate AI response",
    });
  }
});

// Setup Vite or Static File Serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[WebRTC Server] Running on http://0.0.0.0:${PORT}`);
  });
}

start();
