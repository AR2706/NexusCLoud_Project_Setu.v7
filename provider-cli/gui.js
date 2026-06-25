const { app: electronApp, BrowserWindow } = require("electron");
const express = require("express");
const axios = require("axios");
const chalk = require("chalk");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { WebSocket } = require("ws");
const { deployWorkload, teardownWorkload } = require("./docker-engine");

const app = express();
app.use(express.json());

let authToken = null;
let activeRegion = null;
let edgeSocket = null;

// Production Control Plane URL
const controlPlaneUrl = "https://nexuscloud-project-setu-v7.onrender.com";
const sessionPath = path.join(os.homedir(), ".nexus_session.json");

// 🔥 NATIVE EDGE TUNNEL CONTROLLER
// Merged directly into GUI process to avoid .asar file-system crashes
function startEdgeTunnel(token, region) {
  const wsUrl =
    controlPlaneUrl.replace(/^http/, "ws") + `/ws/provider/${token}/${region}`;
  console.log(
    chalk.magenta(`\n🔌 Initializing live workload tunnel to Control Plane...`),
  );

  edgeSocket = new WebSocket(wsUrl);

  edgeSocket.on("open", () =>
    console.log(chalk.green("⚡ Secure Edge Tunnel established!")),
  );

  edgeSocket.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(chalk.blue(`📦 Orchestration Event:`), message.command);

      const streamLogToCloud = (msg) => {
        if (edgeSocket?.readyState === WebSocket.OPEN) {
          edgeSocket.send(
            JSON.stringify({
              type: "BUILD_LOG",
              containerId: message.containerId,
              log: msg,
            }),
          );
        }
      };

      if (message.command === "DEPLOY_WORKLOAD") {
        await deployWorkload(
          message.github_url,
          message.limits,
          message.containerId,
          message.targetPort,
          streamLogToCloud,
        );
      } else if (message.command === "STOP_WORKLOAD") {
        await teardownWorkload(message.containerId, streamLogToCloud);
      }
    } catch (err) {
      console.error(chalk.red("⚠️ Parse error:"), err.message);
    }
  });

  edgeSocket.on("close", () => {
    console.warn(chalk.yellow(`⚠️ Tunnel disconnected. Retrying in 5s...`));
    setTimeout(() => {
      if (authToken) startEdgeTunnel(token, region);
    }, 5000);
  });
}

// --- API ROUTES ---
app.post("/api/login", async (req, res) => {
  try {
    const response = await axios.post(
      `${controlPlaneUrl}/api/v1/auth/provider`,
      req.body,
    );
    if (response.data.success) {
      authToken = response.data.token;
      activeRegion = req.body.region || "global";
      fs.writeFileSync(
        sessionPath,
        JSON.stringify({ token: authToken, region: activeRegion }),
      );
      startEdgeTunnel(authToken, activeRegion);
      res.json({ success: true });
    } else res.status(401).json({ success: false, error: response.data.error });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.get("/api/status", (req, res) => {
  res.json({
    authenticated: authToken !== null,
    region: activeRegion,
    cores: os.cpus().length,
    ram: Math.round(os.totalmem() / 1e9),
    status: "alive",
  });
});

// --- DESKTOP UI FRONTEND ---
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-gray-900 text-white h-screen flex items-center justify-center">
        <div id="login-view" class="bg-gray-800 p-8 rounded-xl w-96 border border-gray-700">
            <h1 class="text-2xl font-bold mb-6">⚡ Nexus Desktop</h1>
            <input type="email" id="email" placeholder="Email" class="w-full bg-gray-900 border border-gray-700 rounded p-3 mb-4">
            <input type="password" id="password" placeholder="Password" class="w-full bg-gray-900 border border-gray-700 rounded p-3 mb-4">
            <button onclick="auth()" class="w-full bg-blue-600 py-3 rounded">Connect to Grid</button>
        </div>
        <script>
            async function auth() {
                const res = await fetch('/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: document.getElementById('email').value, password: document.getElementById('password').value, region: 'in-mum'}) });
                if((await res.json()).success) location.reload();
            }
        </script>
    </body>
    </html>
  `);
});

// --- ELECTRON LIFECYCLE ---
const GUI_PORT = 9000;
let server;

electronApp.whenReady().then(() => {
  server = app.listen(GUI_PORT, () => {
    // Auto-reconnect session on boot
    if (fs.existsSync(sessionPath)) {
      const session = JSON.parse(fs.readFileSync(sessionPath));
      startEdgeTunnel(session.token, session.region);
    }
    const win = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });
    win.loadURL(`http://localhost:${GUI_PORT}`);
  });
});

electronApp.on("window-all-closed", () => {
  if (edgeSocket) edgeSocket.close();
  if (server) server.close();
  if (process.platform !== "darwin") electronApp.quit();
});
