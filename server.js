import express from "express";
import cors from "cors";
import fs from "fs";
import EZUCPhoneAPI from "./EZUCPhoneAPI.js";

const phone = new EZUCPhoneAPI({ port: 8780 });

// Conversation history
let conversationHistory = [];
let latestAssistantReply = "";

// phone call
// async function startOutboundCall(number, linkId = "lead_001") {
//   return phone.dial(number, linkId);
// }


const app = express();
app.use(cors());
app.use(express.json());

// read JSON 檔案
const rawData = fs.readFileSync("./instruct.json", "utf-8");
const instructData = JSON.parse(rawData);

// 放進變數
const instruct = instructData[0];
const instructionPrompt = [
  "You are a helpful and friendly voice assistant.",
  "Have a normal, natural conversation with the user.",
  "Reply clearly and conversationally. Keep replies concise unless the user asks for detail.",
  "Your spoken reply will also be shown as text in the web UI.",
  "If the user confirms they are the intended customer, include this natural phrase in your reply: I'll give you a quick overview.",
  "If the user says they are not the intended customer or clearly rejects the call, include this natural phrase in your reply: Sorry to bother you.",
  "If the conversation reaches a clear ending or handoff, include this natural phrase in your reply: Thank you for your time.",
  instruct.Company ? `Company: ${instruct.Company}` : "",
  instruct.Role ? `Role: ${instruct.Role}` : "",
  instruct.Tone ? `Tone: ${instruct.Tone}` : "",
  instruct.Style ? `Style: ${instruct.Style}` : "",
  instruct.language ? `Language preference: ${instruct.language}` : "",
  instruct.Customer_name ? `Customer name: ${instruct.Customer_name}` : "",
  instruct.Activity ? `Activity: ${instruct.Activity}` : "",
  instruct.Terminate_condition ? `End condition: ${instruct.Terminate_condition}` : "",
  instruct.Ending ? `Closing line: ${instruct.Ending}` : ""
].filter(Boolean).join("\n");

console.log("Instruction: Simple Chat Mode");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

app.get("/session", async (_req, res) => {
  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
          instructions: instructionPrompt,
          output_modalities: ["audio"],
          audio: {
            input: {
              noise_reduction: { type: "near_field" },
              transcription: {
                model: "gpt-4o-mini-transcribe"
              },
              turn_detection: {
                type: "server_vad"
              }
            },
            output: {
              voice: instruct.Voice || "marin",
            }
          }
        }
      }),
    });

    const text = await response.text();
    console.log("📨 Session created - Response:", text);

    let data;
    try {
      data = JSON.parse(text);
      console.log("✅ Chat session initialized successfully");
      
      // Optional: Attempt to dial phone
      try {
        if (instruct.Phone) {
          await phone.dial(instruct.Phone, "lead_001");
          console.log("📞 Outbound call initiated to:", instruct.Phone);
        }
      } catch (dialErr) {
        console.log("⚠️ Phone dial skipped or failed:", dialErr.message);
      }

    } catch {
      return res.status(500).json({
        error: "OpenAI did not return JSON",
        raw: text
      });
    }

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (err) {
    console.error("Session creation failed:", err);
    return res.status(500).json({ error: "Failed to create realtime session" });
  }
});

app.post("/call", async (_req, res) => {
  try {
    if (!instruct.Phone) {
      return res.status(400).json({ error: "Missing instruct.Phone in instruct.json" });
    }

    const dialResult = await phone.dial(instruct.Phone, "lead_001");
    console.log("Dial result:", instruct.Phone, dialResult);
    return res.json({ ok: true, dialResult });
  } catch (err) {
    console.error("Dial failed:", err);
    return res.status(500).json({ error: "Dial failed" });
  }
});


app.post("/hangup", async (_req, res) => {
  try {
    const hangupResult = await phone.hangup();
    console.log("Hangup result:", hangupResult);
    return res.json({ ok: true, hangupResult });
  } catch (err) {
    console.error("Hangup failed:", err);
    return res.status(500).json({ error: "Hangup failed" });
  } 
});



// send instruction
app.get("/instruction", (req, res) => {
  //res.send("Send instruction list");
  res.send(instructionPrompt);
});

// Get conversation history
app.get("/conversation", (req, res) => {
  res.json({
    conversation: conversationHistory,
    latestAssistantReply
  });
});

// Add message to conversation
app.post("/conversation", express.json(), (req, res) => {
  const { role, text } = req.body;
  if (!role || !text) {
    return res.status(400).json({ error: "Missing role or text" });
  }
  
  const message = {
    role: role, // "user" or "assistant"
    text: text,
    timestamp: new Date().toISOString()
  };
  
  conversationHistory.push(message);
  if (role === "assistant") {
    latestAssistantReply = text;
  }
  console.log(`💬 [${role.toUpperCase()}]: ${text}`);
  res.json({ ok: true, message });
});

// Clear conversation
app.delete("/conversation", (req, res) => {
  conversationHistory = [];
  latestAssistantReply = "";
  console.log("🗑️ Conversation cleared");
  res.json({ ok: true });
});

// 啟動伺服器
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
