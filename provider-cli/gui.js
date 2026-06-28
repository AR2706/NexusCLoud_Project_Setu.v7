const { app: electronApp, BrowserWindow, shell } = require("electron");
const express = require("express");
const axios = require("axios");
const chalk = require("chalk");
const os = require("os");
const path = require("path");
const WebSocket = require("ws");
const { spawn } = require("child_process");

// Import the new Engine Abstraction & Diagnostics
const EngineManager = require("./engine-manager");
const { runDiagnostics } = require("./health-check");
const {
  deployWorkload,
  teardownWorkload,
  getContainerStatus,
} = require("./docker-engine");

// ==========================================
// 1. URI Deep Linking Protocol (nexusedge://)
// ==========================================
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    electronApp.setAsDefaultProtocolClient("nexusedge", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  electronApp.setAsDefaultProtocolClient("nexusedge");
}

const gotTheLock = electronApp.requestSingleInstanceLock();
if (!gotTheLock) {
  electronApp.quit();
} else {
  electronApp.on("second-instance", (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // Handle the deep link URL here if needed in the future
  });
}

// ==========================================
// 2. SESSION & TUNNEL LOGIC
// ==========================================
let authToken = null;
let activeRegion = null;
let wsClient = null;
let currentContainerId = null;

function initializeEdgeNode(token, region) {
  console.log(
    chalk.cyan(`\n[EDGE-NODE] Initializing worker in main process...`),
  );

  if (wsClient && wsClient.readyState === WebSocket.OPEN) wsClient.close();

  const wsUrl = `wss://nexuscloud-project-setu-v7.onrender.com/ws/provider/${token}/${region}`;
  wsClient = new WebSocket(wsUrl);

  wsClient.on("open", () => {
    console.log(chalk.green("[WS] Tunnel Connected to Control Plane"));

    wsClient.send(
      JSON.stringify({
        action: "register_capacity",
        region: activeRegion,
        cores: os.cpus().length,
        ram: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
      }),
    );

    // 🔥 PHASE 3: THE HEARTBEAT TICK
    setInterval(async () => {
      try {
        let status = "idle";
        if (currentContainerId) {
          const containerStatus = await getContainerStatus(currentContainerId);
          status = containerStatus.status === "running" ? "active" : "failed";
        }

        await axios.post(
          "https://nexuscloud-project-setu-v7.onrender.com/api/v1/heartbeat",
          {
            token: token,
            region: region,
            container_id: currentContainerId,
            status: status,
          },
        );
      } catch (e) {
        console.log(
          chalk.gray("[Heartbeat] Sync failed, backend unreachable."),
        );
      }
    }, 15000); // 15-second intervals
  });

  wsClient.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const commandToRun = msg.command || msg.action || msg.type;

      const stream = (l) => {
        const logMsg = l.toString();
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
          wsClient.send(
            JSON.stringify({
              type: "BUILD_LOG",
              containerId: msg.containerId || "unknown",
              log: logMsg,
            }),
          );
        }
        if (mainWindow) {
          const safeHtml = logMsg
            .replace(/\\/g, "\\\\")
            .replace(/`/g, "\\`")
            .replace(/\n/g, "<br>");
          mainWindow.webContents
            .executeJavaScript(
              `
            var t = document.getElementById('local-terminal');
            if (t) { t.innerHTML += "> " + \`${safeHtml}\`; t.scrollTop = t.scrollHeight; }
          `,
            )
            .catch(() => {});
        }
      };

      if (commandToRun === "DEPLOY_WORKLOAD") {
        console.log(chalk.yellow(`[System] Executing: ${msg.github_url}`));
        currentContainerId = msg.containerId;
        const result = await deployWorkload(
          msg.github_url,
          msg.limits,
          msg.containerId,
          msg.targetPort,
          stream,
        );
        if (!result.success) stream(`\n❌ ERROR: ${result.error}\n`);
      } else if (commandToRun === "STOP_WORKLOAD") {
        console.log(chalk.red(`[System] Terminating: ${msg.containerId}`));
        await teardownWorkload(msg.containerId, stream);
        currentContainerId = null;
      }
    } catch (err) {
      console.error(chalk.red("⚠️ Execution Error:"), err);
    }
  });

  wsClient.on("close", () => console.log(chalk.yellow(`[WS] Tunnel Closed.`)));
}

// ==========================================
// 3. CORE EXPRESS ENGINE & FRONTEND
// ==========================================
const app = express();
app.use(express.json());

let controlPlaneUrl = "https://nexuscloud-project-setu-v7.onrender.com";

// 🔥 PHASE 2: HEALTH CHECK ENDPOINT
app.get("/api/health", async (req, res) => {
  const diagnostics = await runDiagnostics();
  res.json(diagnostics);
});

app.post("/api/register", async (req, res) => {
  try {
    const response = await axios.post(
      `${controlPlaneUrl}/api/v1/auth/register`,
      req.body,
    );
    if (response.data.success) {
      authToken = response.data.token;
      activeRegion = req.body.region || "global";
      initializeEdgeNode(authToken, activeRegion);
      res.json({ success: true, region: activeRegion });
    } else {
      res.status(400).json({ success: false, error: response.data.error });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Control Plane unreachable." });
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
      initializeEdgeNode(authToken, activeRegion);
      res.json({ success: true, region: activeRegion });
    } else {
      res.status(401).json({ success: false, error: response.data.error });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Control Plane unreachable." });
  }
});

app.get("/api/status", (req, res) => {
  res.json({
    authenticated: authToken !== null,
    region: activeRegion,
    cores: os.cpus().length,
    ram: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
    status: "alive",
  });
});

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Nexus Provider Engine</title>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#050505] text-white h-screen flex items-center justify-center font-sans antialiased">

<div id="wizard-view" class="bg-[#0e0e12] p-8 rounded-2xl shadow-2xl w-[500px] border border-gray-800">
  <div class="flex items-center gap-3 mb-6">
    <div class="animate-pulse bg-blue-500/20 p-2 rounded-full"><div class="w-3 h-3 bg-blue-500 rounded-full"></div></div>
    <h1 class="text-2xl font-bold tracking-tight">System Initialization</h1>
  </div>
  <p class="text-gray-400 text-sm mb-6">Nexus Edge is verifying your local infrastructure capabilities.</p>
  
  <div class="space-y-4 mb-8">
    <div class="flex justify-between items-center p-4 bg-black rounded-xl border border-gray-800">
      <div class="flex items-center gap-3">
        <span id="icon-git" class="text-gray-500">⏳</span>
        <span class="font-medium text-sm">Git CLI Installed</span>
      </div>
      <span id="status-git" class="text-xs font-mono text-gray-500">Checking...</span>
    </div>
    
    <div class="flex justify-between items-center p-4 bg-black rounded-xl border border-gray-800">
      <div class="flex items-center gap-3">
        <span id="icon-docker-install" class="text-gray-500">⏳</span>
        <span class="font-medium text-sm">Docker Engine Installed</span>
      </div>
      <span id="status-docker-install" class="text-xs font-mono text-gray-500">Checking...</span>
    </div>

    <div class="flex justify-between items-center p-4 bg-black rounded-xl border border-gray-800">
      <div class="flex items-center gap-3">
        <span id="icon-docker-run" class="text-gray-500">⏳</span>
        <span class="font-medium text-sm">Docker Daemon Active</span>
      </div>
      <span id="status-docker-run" class="text-xs font-mono text-gray-500">Checking...</span>
    </div>
  </div>

  <div id="wizard-actions" class="hidden">
    <div class="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl text-sm mb-4">
      ⚠️ Infrastructure dependencies are missing or inactive. Please resolve them to continue.
    </div>
    <button onclick="runHealthCheck()" class="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-3 rounded-xl transition-colors">
      Retry Diagnostics
    </button>
  </div>
</div>

<div id="login-view" class="hidden bg-[#0e0e12] p-8 rounded-2xl shadow-2xl w-96 border border-gray-800">
  <h1 id="form-title" class="text-2xl font-bold mb-2 flex items-center"><span class="text-blue-500 mr-2">⚡</span> Nexus Desktop</h1>
  <p id="form-subtitle" class="text-gray-400 text-sm mb-6">Authenticate your Edge Node</p>
  <input type="email" id="email" placeholder="Email" class="w-full bg-black border border-gray-800 rounded-xl p-3 mb-4 text-white outline-none focus:border-blue-500 transition-colors">
  <input type="password" id="password" placeholder="Password" class="w-full bg-black border border-gray-800 rounded-xl p-3 mb-4 text-white outline-none focus:border-blue-500 transition-colors">
  <select id="region" class="w-full bg-black border border-gray-800 rounded-xl p-3 mb-6 text-white outline-none focus:border-blue-500 appearance-none transition-colors">
    <option value="in-mum">📍 Asia South (Mumbai)</option>
    <option value="us-east">📍 US East (N. Virginia)</option>
    <option value="eu-west">📍 Europe West (Frankfurt)</option>
    <option value="global">🌐 Global Edge Anycast</option>
  </select>
  <button id="submit-btn" onclick="authenticate('login')" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors mb-4">
    Connect to Grid
  </button>
  <div class="text-center text-sm">
    <span id="toggle-text" class="text-gray-400">Don't have an account?</span>
    <button onclick="toggleMode()" id="toggle-btn" class="text-blue-400 font-bold hover:underline ml-1">Register</button>
  </div>
  <p id="error-msg" class="text-red-400 text-sm mt-4 text-center hidden"></p>
</div>

<div id="dashboard-view" class="hidden bg-[#0e0e12] p-8 rounded-2xl shadow-2xl w-[650px] border border-gray-800">
  <div class="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
    <h1 class="text-2xl font-bold text-white flex items-center"><span class="text-green-500 mr-2">●</span> Engine Active</h1>
    <span class="bg-blue-500/10 text-blue-400 text-xs px-3 py-1 rounded-full border border-blue-500/20">Authenticated</span>
  </div>
  <div class="grid grid-cols-3 gap-4 mb-6">
    <div class="bg-black p-4 rounded-xl border border-gray-800">
      <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Territory</p>
      <p class="text-xl font-mono text-blue-400" id="stat-region">--</p>
    </div>
    <div class="bg-black p-4 rounded-xl border border-gray-800">
      <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Compute Cores</p>
      <p class="text-xl font-mono" id="stat-cores">--</p>
    </div>
    <div class="bg-black p-4 rounded-xl border border-gray-800">
      <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">System Memory</p>
      <p class="text-xl font-mono" id="stat-ram">-- GB</p>
    </div>
  </div>
  <div id="local-terminal" class="bg-[#050505] p-5 rounded-xl border border-gray-800 font-mono text-sm text-gray-400 h-40 overflow-y-auto leading-relaxed">
    > Initializing secure tunnel...<br>
    > Heartbeat protocol established...<br>
    > Awaiting centralized orchestration commands...<br>
  </div>
</div>

<script>
// --- PHASE 2: Guided Wizard Logic ---
async function runHealthCheck() {
  document.getElementById('wizard-actions').classList.add('hidden');
  document.getElementById('icon-git').textContent = '⏳';
  document.getElementById('icon-docker-install').textContent = '⏳';
  document.getElementById('icon-docker-run').textContent = '⏳';

  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    const setStatus = (id, passed, errorMsg) => {
      document.getElementById('icon-' + id).textContent = passed ? '✅' : '❌';
      const statusEl = document.getElementById('status-' + id);
      statusEl.textContent = passed ? 'Ready' : errorMsg;
      statusEl.className = passed ? 'text-xs font-mono text-green-500' : 'text-xs font-mono text-red-500';
    };

    setStatus('git', data.gitInstalled, 'Missing');
    setStatus('docker-install', data.dockerInstalled, 'Missing');
    setStatus('docker-run', data.dockerRunning, 'Offline');

    if (data.isReady) {
      setTimeout(() => {
        document.getElementById('wizard-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
      }, 1000);
    } else {
      document.getElementById('wizard-actions').classList.remove('hidden');
    }
  } catch (e) {
    console.error("Health check failed:", e);
  }
}

// Start checks immediately on load
runHealthCheck();

// --- Auth & Dashboard Logic ---
let currentMode = 'login';
function toggleMode() {
  currentMode = currentMode === 'login' ? 'register' : 'login';
  document.getElementById('form-subtitle').textContent = currentMode === 'login' ? 'Authenticate your Edge Node' : 'Register your Edge Node';
  document.getElementById('submit-btn').textContent = currentMode === 'login' ? 'Connect to Grid' : 'Create Account';
  document.getElementById('toggle-text').textContent = currentMode === 'login' ? "Don't have an account?" : "Already registered?";
  document.getElementById('toggle-btn').textContent = currentMode === 'login' ? "Register" : "Log In";
  document.getElementById('error-msg').classList.add('hidden');
}

async function authenticate(mode) {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const region = document.getElementById('region').value;
  const errorMsg = document.getElementById('error-msg');
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  try {
    const res = await fetch(mode === 'register' ? '/api/register' : '/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, region })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('login-view').classList.add('hidden');
      document.getElementById('dashboard-view').classList.remove('hidden');
      loadStats();
    } else {
      errorMsg.textContent = data.error;
      errorMsg.classList.remove('hidden');
    }
  } catch(e) {
    errorMsg.textContent = "Network Error.";
    errorMsg.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = mode === 'login' ? 'Connect to Grid' : 'Create Account';
  }
}

async function loadStats() {
  const res = await fetch('/api/status');
  const data = await res.json();
  document.getElementById('stat-cores').textContent = data.cores;
  document.getElementById('stat-ram').textContent = data.ram + " GB";
  document.getElementById('stat-region').textContent = data.region.toUpperCase();
}
</script>
</body>
</html>
  `);
});

// ==========================================
// 4. NATIVE ELECTRON APP LIFECYCLE
// ==========================================
const GUI_PORT = 9000;
let server;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: "Nexus Edge Protocol",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadURL(`http://localhost:${GUI_PORT}`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

electronApp.whenReady().then(() => {
  server = app
    .listen(GUI_PORT, () => {
      console.log(chalk.bgBlue.white.bold(`\n 🖥️ Nexus Desktop UI Active `));
      createWindow();
    })
    .on("error", (err) => {
      console.error(
        chalk.red(`Server failed to start on port ${GUI_PORT}.`),
        err.message,
      );
    });
});

electronApp.on("window-all-closed", () => {
  console.log(chalk.yellow("Initiating shutdown sequence..."));
  if (process.platform !== "darwin") electronApp.quit();
});

electronApp.on("before-quit", () => {
  if (server) server.close();
  if (wsClient && wsClient.readyState === WebSocket.OPEN) wsClient.close();
});
