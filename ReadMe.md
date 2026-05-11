# Voice Chat API OPENAI Base

This project is a browser-based voice chat prototype built on the OpenAI Realtime API using WebRTC. It captures microphone audio from the browser, sends the SDP offer to the backend, and connects to OpenAI for real-time speech-to-speech interaction.

According to OpenAI’s current documentation, WebRTC is the recommended approach for browser-based realtime voice applications, and once the local audio track is attached, users can start speaking directly.

Purpose: is made to modify for Voice Chatbot or Customer_services.

Reference:
[https://developers.openai.com/api/docs/guides/realtime-webrtc](https://developers.openai.com/api/docs/guides/realtime-webrtc)

---

## Features

* Browser microphone input
* WebRTC-based realtime connection
* Backend session creation
* AI voice response playback
* Simple frontend test UI
* Node.js backend with Express

---

## Project Structure

```bash
.
├── server.js
├── index.html
├── package.json
└── README.md
```

---

## Setup

Install dependencies:

```bash
npm init -y
npm install express cors
```

---

## Environment Variable

Set your API key before starting the backend.

### macOS / Linux

```bash
export OPENAI_API_KEY="your_key_here"
```

### Windows PowerShell

```powershell
$env:OPENAI_API_KEY="your_key_here"
```

---

## Run the Backend

```bash
node server.js
```

If successful, you should see:

```bash
Server running on http://localhost:3000
```

---

## Run the Frontend

You can serve the HTML file locally with any static server.

Example:

```bash
npx serve .
```

Then open the local URL shown in your terminal and allow microphone access in the browser.

---

## Preview

![Image description](https://img.notionusercontent.com/s3/prod-files-secure%2F34ab939b-ebaa-4d46-97fa-223223309a58%2F38ac1d27-f94e-4f6c-aafb-f9fabc9f0d22%2Fimage.png/size/w=2000?exp=1778578374&sig=CriXhywsWexneF4iIxQM4QbfOyk-oL6D82tKv9o6Duw&id=35d8c017-1407-8023-9e48-e68d09540d6b&table=block&mtd=so)

---
## How It Works

This project follows the current OpenAI Realtime WebRTC flow:

1. The browser requests microphone access
2. A `RTCPeerConnection` is created
3. The microphone track is attached to the peer connection
4. The frontend creates an SDP offer
5. The backend sends the request to OpenAI Realtime
6. OpenAI returns the SDP answer
7. The frontend sets the remote description
8. The AI voice is received as a remote media track

OpenAI’s Realtime documentation notes that WebRTC is the preferred connection method for browser and mobile realtime applications, while SIP is intended for phone integration scenarios.

---

## Example Flow

```text
User Voice Input
   ↓
Browser Microphone
   ↓
WebRTC Peer Connection
   ↓
Node.js Backend
   ↓
OpenAI Realtime API
   ↓
AI Audio Response
   ↓
Browser Playback
```

---

## Notes

* This project is designed for browser-based voice chat, not direct phone-line calling.
* For actual telephony integration, OpenAI documents SIP as the relevant connection path.
* Do not expose your API key in frontend JavaScript.
* Always keep the OpenAI API key on the backend only.

---

## Troubleshooting

### 1. Microphone permission denied

Make sure your browser has permission to use the microphone.

### 2. Backend not starting

Check whether `OPENAI_API_KEY` is correctly set in your terminal.

### 3. No audio response

Verify:

* the backend is running
* the WebRTC connection is established
* the SDP exchange is successful
* browser autoplay/audio permissions are enabled

### 4. API mismatch errors

Make sure your frontend and backend are using the same Realtime API version and endpoint flow. OpenAI’s current WebRTC guide documents the active Realtime connection method.

---

## Reference

OpenAI Realtime WebRTC Guide:
[https://developers.openai.com/api/docs/guides/realtime-webrtc](https://developers.openai.com/api/docs/guides/realtime-webrtc)

---

## License

This project is for learning, prototyping, and internal testing purposes.
