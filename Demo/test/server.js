import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import EZUCPhoneAPI from "./EZUCPhoneAPI.js";

const phone = new EZUCPhoneAPI({ port: 8780 });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use("/DIALOGUE", express.static(path.join(__dirname, "DIALOGUE")));

// Editable workflow, prompt, and customer configuration.
const WORKFLOW_CONFIG_PATH = path.join(__dirname, "Public", "workflow-data.json");

function readWorkflowConfig() {
  return JSON.parse(fs.readFileSync(WORKFLOW_CONFIG_PATH, "utf-8"));
}

function writeWorkflowConfig(config) {
  fs.writeFileSync(WORKFLOW_CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

function getAssistantConfig() {
  return readWorkflowConfig().assistant || {};
}

function getCustomerConfig() {
  return getAssistantConfig().customer || {};
}

function valueFromPath(source, keyPath) {
  return keyPath.split(".").reduce((value, key) => {
    return value && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : "";
  }, source);
}

function renderPromptLine(line, variables) {
  return String(line).replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, keyPath) => {
    return valueFromPath(variables, keyPath.trim()) || "";
  });
}

function buildPromptFromConfig(mode = "default") {
  const config = readWorkflowConfig();
  const assistant = config.assistant || {};
  const prompts = assistant.prompts || {};
  const customer = assistant.customer || {};
  const timezone = assistant.timezone || "Asia/Kuala_Lumpur";
  const localNow = new Date().toLocaleString("en-MY", { timeZone: timezone });
  const promptLines = prompts[mode] || prompts.default || [];

  return promptLines
    .map((line) => renderPromptLine(line, { customer, localNow }))
    .filter((line) => line.trim())
    .join("\n");
}

// Prompt, workflow, and customer data are loaded from workflow-data.json.

function getMode(req) {
  const assistant = getAssistantConfig();
  const validModes = new Set(["default", ...(assistant.textOnlyModes || [])]);
  return validModes.has(req.query.mode) ? req.query.mode : assistant.defaultMode || "default";
}

function buildInstructionPrompt(mode = "default") {
  const historyText = conversationHistory
    .map((message) => {
      const roleLabel = message.role === "assistant"
        ? "Assistant"
        : message.role === "system"
          ? "System"
          : "User";
      return `${roleLabel}: ${message.text}`;
    })
    .join("\n");

  const modePrompt = buildPromptFromConfig(mode);

  return [
    modePrompt,
    historyText ? `Conversation history:\n${historyText}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

app.get("/workflow-config", (_req, res) => {
  try {
    return res.json(readWorkflowConfig());
  } catch (err) {
    console.error("Workflow config read failed:", err);
    return res.status(500).json({ error: "Failed to read workflow config" });
  }
});

app.put("/workflow-config", (req, res) => {
  try {
    const nextConfig = req.body;
    if (!nextConfig || typeof nextConfig !== "object" || Array.isArray(nextConfig)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    if (!nextConfig.assistant || !nextConfig.nodes || !Array.isArray(nextConfig.edges)) {
      return res.status(400).json({ error: "Config must include assistant, nodes, and edges" });
    }

    writeWorkflowConfig(nextConfig);
    return res.json({ ok: true, config: nextConfig });
  } catch (err) {
    console.error("Workflow config save failed:", err);
    return res.status(500).json({ error: "Failed to save workflow config" });
  }
});

app.use(express.static(path.join(__dirname, "Public")));

console.log("Instruction: Simple Chat Mode");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

app.get("/session", async (req, res) => {
  try {
    const mode = getMode(req);
    const assistant = getAssistantConfig();
    const customer = assistant.customer || {};
    const textOnlyModes = new Set(assistant.textOnlyModes || []);
    const outputModalities = textOnlyModes.has(mode) ? ["text"] : ["audio"];
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: assistant.model || "gpt-realtime",
          instructions: buildInstructionPrompt(mode),
          output_modalities: outputModalities,
          audio: {
            input: {
              noise_reduction: { type: "near_field" },
              transcription: {
                model: assistant.transcriptionModel || "gpt-4o-mini-transcribe"
              },
              turn_detection: {
                type: "server_vad"
              }
            },
            output: {
              voice: customer.Voice || "marin",
            }
          }
        }
      }),
    });

    const text = await response.text();
    console.log("Ã°Å¸â€œÂ¨ Session created - Response:", text);

    let data;
    try {
      data = JSON.parse(text);
      console.log("Ã¢Å“â€¦ Chat session initialized successfully");
      
      // Optional: Attempt to dial phone
      try {
        if (customer.Phone) {
          await phone.dial(customer.Phone, "lead_001");
          console.log("Outbound call initiated to:", customer.Phone);
        }
      } catch (dialErr) {
        console.log("Ã¢Å¡Â Ã¯Â¸Â Phone dial skipped or failed:", dialErr.message);
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
    const customer = getCustomerConfig();
    if (!customer.Phone) {
      return res.status(400).json({ error: "Missing assistant.customer.Phone in workflow-data.json" });
    }

    const dialResult = await phone.dial(customer.Phone, "lead_001");
    console.log("Dial result:", customer.Phone, dialResult);
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
  const mode = getMode(req);
  res.send(buildInstructionPrompt(mode));
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
  console.log(`Ã°Å¸â€™Â¬ [${role.toUpperCase()}]: ${text}`);
  res.json({ ok: true, message });
});

// Clear conversation
app.delete("/conversation", (req, res) => {
  conversationHistory = [];
  latestAssistantReply = "";
  console.log("Ã°Å¸â€”â€˜Ã¯Â¸Â Conversation cleared");
  res.json({ ok: true });
});

// Ã¥â€¢Å¸Ã¥â€¹â€¢Ã¤Â¼ÂºÃ¦Å“ÂÃ¥â„¢Â¨
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
