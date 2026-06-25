const { app: electronApp, BrowserWindow } = require("electron");
const express = require("express");
const axios = require("axios");
const chalk = require("chalk");
const os = require("os");
const path = require("path");
const fs = require("fs");
const Docker = require("dockerode");
const WebSocket = require("ws");
const { exec, spawn } = require("child_process");

// ==========================================
// 1. CROSS-PLATFORM DOCKER SETUP
// ==========================================
const dockerSocket =
  process.platform === "win32"
    ? "//./pipe/docker_engine"
    : "/var/run/docker.sock";
const docker = new Docker({ socketPath: dockerSocket });

// ==========================================
// 2. SESSION & TUNNEL LOGIC
// ==========================================
let authToken = null;
let activeRegion = null;
let wsClient = null;
const sessionFilePath = path.join(os.homedir(), ".nexus_session.json");

function initializeEdgeNode(token, region) {
  console.log(chalk.cyan(`\n[EDGE-NODE] Initializing worker...`));

  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.close();
  }

  const wsUrl = `wss://nexuscloud-project-setu-v7.onrender.com/ws/provider/${token}/${region}`;
  wsClient = new WebSocket(wsUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "Nexus-Edge-Engine-Client",
    },
  });

  wsClient.on("open", () => {
    console.log(chalk.green("[WS] Tunnel Connected to Control Plane"));
    const capacityPayload = {
      action: "register_capacity",
      region: activeRegion,
      cores: os.cpus().length,
      ram: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
    };
    wsClient.send(JSON.stringify(capacityPayload));
  });

  wsClient.on("close", (code, reason) =>
    console.log(chalk.yellow(`[WS] Tunnel Closed.`)),
  );
  wsClient.on("error", (err) =>
    console.error(chalk.red(`[WS] CRITICAL ERROR:`), err.message),
  );
}

// ==========================================
// 3. HIGH AVAILABILITY (HA) FAILOVER MODULE
// ==========================================
class HighAvailabilityWatcher {
  constructor(primaryIp, staticNgrokDomain, targetPort) {
    this.primaryIp = primaryIp;
    this.staticNgrokDomain = staticNgrokDomain;
    this.targetPort = targetPort;
    this.failCount = 0;
    this.maxFails = 3;
    this.checkInterval = 5000;
    this.hasTakenOver = false;
  }
  start() {
    console.log(chalk.cyan(`\n[HA-WATCHER] 🛡️ Active-Passive Failover Armed.`));
    setInterval(() => this.pingPrimary(), this.checkInterval);
  }
  async pingPrimary() {
    if (this.hasTakenOver) return;
    try {
      await axios.get(`http://${this.primaryIp}:9000/api/status`, {
        timeout: 3000,
      });
      this.failCount = 0;
    } catch (error) {
      this.failCount++;
      if (this.failCount >= this.maxFails) this.triggerFailover();
    }
  }
  triggerFailover() {
    this.hasTakenOver = true;
    exec(`ngrok http ${this.targetPort} --domain=${this.staticNgrokDomain}`);
  }
}

// ==========================================
// 4. CORE EXPRESS ENGINE
// ==========================================
const app = express();
app.use(express.json());
let controlPlaneUrl = "https://nexuscloud-project-setu-v7.onrender.com";

app.post("/api/register", async (req, res) => {
  try {
    const response = await axios.post(
      `${controlPlaneUrl}/api/v1/auth/register`,
      req.body,
    );
    if (response.data.success) {
      authToken = response.data.token;
      activeRegion = req.body.region || "global";
      fs.writeFileSync(
        sessionFilePath,
        JSON.stringify({ token: authToken, region: activeRegion }),
      );
      initializeEdgeNode(authToken, activeRegion);
      res.json({ success: true, region: activeRegion });
    } else res.status(400).json({ success: false, error: response.data.error });
  } catch (err) {
    res.status(500).json({ success: false, error: "Unreachable." });
  }
});

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
        sessionFilePath,
        JSON.stringify({ token: authToken, region: activeRegion }),
      );
      initializeEdgeNode(authToken, activeRegion);
      res.json({ success: true, region: activeRegion });
    } else res.status(401).json({ success: false, error: response.data.error });
  } catch (err) {
    res.status(500).json({ success: false, error: "Unreachable." });
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

app.get("/", (req, res) => {
  res.send(
    `<!DOCTYPE html><html lang="en"><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-900 text-white h-screen flex items-center justify-center font-sans"><div id="login-view" class="bg-gray-800 p-8 rounded-xl shadow-2xl w-96 border border-gray-700"><h1 class="text-2xl font-bold mb-6 flex items-center"><span class="text-blue-500 mr-2">⚡</span> Nexus Desktop</h1><input type="email" id="email" placeholder="Email" class="w-full bg-gray-900 border border-gray-700 rounded p-3 mb-4"><input type="password" id="password" placeholder="Password" class="w-full bg-gray-900 border border-gray-700 rounded p-3 mb-4"><select id="region" class="w-full bg-gray-900 border border-gray-700 rounded p-3 mb-6 text-white outline-none focus:border-blue-500 appearance-none"><option value="in-mum">📍 Asia South (Mumbai)</option><option value="us-east">📍 US East (N. Virginia)</option><option value="eu-west">📍 Europe West (Frankfurt)</option><option value="global">🌐 Global Edge Anycast</option></select><button id="submit-btn" onclick="authenticate('login')" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-colors mb-4">Connect to Grid</button><p id="error-msg" class="text-red-400 text-sm mt-4 text-center hidden"></p></div><div id="dashboard-view" class="hidden bg-gray-800 p-8 rounded-xl shadow-2xl w-[650px] border border-gray-700"><div class="flex justify-between items-center mb-6 border-b border-gray-700 pb-4"><h1 class="text-2xl font-bold text-white flex items-center"><span class="text-green-500 mr-2">●</span> Engine Active</h1></div><div class="grid grid-cols-3 gap-4 mb-6"><div class="bg-gray-900 p-4 rounded border border-gray-700"><p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Territory</p><p class="text-xl font-mono text-blue-400" id="stat-region">--</p></div></div><div class="bg-black p-4 rounded border border-gray-700 font-mono text-sm text-green-400 h-32 overflow-y-auto">> Initializing secure connection...<br>> Synchronizing regional ledger...<br></div></div><script>async function authenticate(mode) { const email = document.getElementById('email').value; const password = document.getElementById('password').value; const region = document.getElementById('region').value; const res = await fetch(mode === 'register' ? '/api/register' : '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, region }) }); const data = await res.json(); if (data.success) { document.getElementById('login-view').classList.add('hidden'); document.getElementById('dashboard-view').classList.remove('hidden'); const statusRes = await fetch('/api/status'); const sData = await statusRes.json(); document.getElementById('stat-region').textContent = sData.region.toUpperCase(); } }</script></body></html>`,
  );
});

// ==========================================
// 5. NATIVE ELECTRON APP LIFECYCLE
// ==========================================
const GUI_PORT = 9000;
let server;

electronApp.whenReady().then(() => {
  server = app.listen(GUI_PORT, () => {
    // 🔥 AUTO-RECONNECT LOGIC
    if (fs.existsSync(sessionFilePath)) {
      const session = JSON.parse(fs.readFileSync(sessionFilePath));
      authToken = session.token;
      activeRegion = session.region;
      initializeEdgeNode(authToken, activeRegion);
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
  if (wsClient) wsClient.close();
  if (server) server.close();
  if (process.platform !== "darwin") electronApp.quit();
});

electronApp.on("before-quit", () => {
  if (server) server.close();
  if (wsClient) wsClient.close();
});
