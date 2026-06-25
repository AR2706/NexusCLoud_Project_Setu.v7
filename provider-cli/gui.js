const { app: electronApp, BrowserWindow } = require("electron");
const express = require("express");
const axios = require("axios");
const chalk = require("chalk");
const os = require("os");
const { exec } = require("child_process");
const path = require("path");
const { WebSocket } = require("ws");

// 🔥 FIX: Import the Docker Engine logic you wrote!
const { deployWorkload, teardownWorkload } = require("./docker-engine");

// ==========================================
// 🛡️ HIGH AVAILABILITY (HA) FAILOVER MODULE
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
    console.log(
      chalk.gray(
        `[HA-WATCHER] Monitoring Primary Node at ${this.primaryIp}...`,
      ),
    );
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
      console.log(
        chalk.yellow(
          `[HA-WATCHER] ⚠️ Primary Node missed heartbeat (${this.failCount}/${this.maxFails})`,
        ),
      );
      if (this.failCount >= this.maxFails) this.triggerFailover();
    }
  }

  triggerFailover() {
    this.hasTakenOver = true;
    console.log(
      chalk.bgRed.white.bold(
        `\n[HA-WATCHER] 🚨 PRIMARY NODE OFFLINE! INITIATING NGROK FAILOVER...`,
      ),
    );
    const ngrokCommand = `ngrok http ${this.targetPort} --domain=${this.staticNgrokDomain}`;
    exec(ngrokCommand, (error) => {
      if (error) {
        console.error(
          chalk.red(
            `[HA-WATCHER] Failed to hijack Ngrok tunnel: ${error.message}`,
          ),
        );
        this.hasTakenOver = false;
      }
    });
    console.log(
      chalk.green(
        `[HA-WATCHER] ✅ Secondary Node successfully took control of ${this.staticNgrokDomain}!`,
      ),
    );
  }
}

// ==========================================
// 🚀 CORE EXPRESS ENGINE & EDGE TUNNEL
// ==========================================
const app = express();
app.use(express.json());

let authToken = null;
let activeRegion = null;
let edgeSocket = null;

// Point this to your Render URL for production!
let controlPlaneUrl = "https://nexuscloud-project-setu-v7.onrender.com";

// 🔥 FIX: Native Edge Tunnel directly inside Electron
function startEdgeTunnel(token, region) {
  // Fix 1: Use the correct backend URL for providers!
  const wsUrl =
    controlPlaneUrl.replace(/^http/, "ws") + `/ws/provider/${token}/${region}`;
  console.log(
    chalk.magenta(`\n🔌 Initializing live workload tunnel to Control Plane...`),
  );

  edgeSocket = new WebSocket(wsUrl);

  edgeSocket.on("open", () => {
    console.log(
      chalk.green(
        "⚡ Secure Edge Tunnel established! Node is active on the grid.",
      ),
    );
  });

  edgeSocket.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(
        chalk.blue(`📦 Deployment Command Received:`),
        message.command,
      );

      // Fix 3: Execute the Docker engine natively when commands come in
      if (message.command === "DEPLOY_WORKLOAD") {
        console.log(
          chalk.cyan(
            `🚀 Provisioning target repo: ${message.github_url} on port ${message.targetPort}`,
          ),
        );

        // Callback function to stream logs back to the Cloud
        const streamToCloud = (logText) => {
          if (edgeSocket && edgeSocket.readyState === WebSocket.OPEN) {
            edgeSocket.send(
              JSON.stringify({
                type: "BUILD_LOG",
                containerId: message.containerId,
                log: logText,
              }),
            );
          }
        };

        // Fire the actual Docker engine!
        await deployWorkload(
          message.github_url,
          message.limits,
          message.containerId,
          message.targetPort,
          streamToCloud,
        );
      } else if (message.command === "STOP_WORKLOAD") {
        console.log(
          chalk.yellow(`🛑 Terminating workload: ${message.containerId}`),
        );

        const streamToCloud = (logText) => {
          if (edgeSocket && edgeSocket.readyState === WebSocket.OPEN) {
            edgeSocket.send(
              JSON.stringify({
                type: "BUILD_LOG",
                containerId: message.containerId,
                log: logText,
              }),
            );
          }
        };

        // Fire the actual Teardown engine!
        await teardownWorkload(message.containerId, streamToCloud);
      }
    } catch (err) {
      console.error(
        chalk.red(
          "⚠️ Failed to parse inbound orchestration frame:",
          err.message,
        ),
      );
    }
  });

  edgeSocket.on("close", (code) => {
    console.warn(
      chalk.yellow(
        `⚠️ Tunnel disconnected (Code: ${code}). Reconnecting in 5 seconds...`,
      ),
    );
    setTimeout(() => {
      if (authToken) startEdgeTunnel(token, region);
    }, 5000);
  });

  edgeSocket.on("error", (error) => {
    console.error(
      chalk.red("❌ Tunnel socket exception error:", error.message),
    );
  });
}

// --- API ROUTES FOR THE DESKTOP UI ---

app.post("/api/register", async (req, res) => {
  try {
    const response = await axios.post(
      `${controlPlaneUrl}/api/v1/auth/register`,
      {
        email: req.body.email,
        password: req.body.password,
        region: req.body.region,
      },
    );

    if (response.data.success) {
      authToken = response.data.token;
      activeRegion = req.body.region || "global";
      console.log(chalk.green(`\n✅ Account Created! Token acquired.`));

      // 🔥 FIX 4: Just start the tunnel natively instead of forking
      startEdgeTunnel(authToken, activeRegion);

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
      {
        email: req.body.email,
        password: req.body.password,
        region: req.body.region,
      },
    );

    if (response.data.success) {
      authToken = response.data.token;
      activeRegion = req.body.region || "global";
      console.log(
        chalk.green(`\n🔐 Authentication Successful! Token acquired.`),
      );

      // 🔥 FIX 4: Just start the tunnel natively instead of forking
      startEdgeTunnel(authToken, activeRegion);

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

// --- THE DESKTOP FRONTEND (Served from Memory) ---
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Nexus Provider Engine</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-900 text-white h-screen flex items-center justify-center font-sans">
        
        <div id="login-view" class="bg-gray-800 p-8 rounded-xl shadow-2xl w-96 border border-gray-700">
            <h1 id="form-title" class="text-2xl font-bold mb-2 flex items-center"><span class="text-blue-500 mr-2">⚡</span> Nexus Desktop</h1>
            <p id="form-subtitle" class="text-gray-400 text-sm mb-6">Authenticate your Edge Node</p>
            
            <input type="email" id="email" placeholder="Email" class="w-full bg-gray-900 border border-gray-700 rounded p-3 mb-4 text-white outline-none focus:border-blue-500">
            <input type="password" id="password" placeholder="Password" class="w-full bg-gray-900 border border-gray-700 rounded p-3 mb-4 text-white outline-none focus:border-blue-500">
            
            <select id="region" class="w-full bg-gray-900 border border-gray-700 rounded p-3 mb-6 text-white outline-none focus:border-blue-500 appearance-none">
                <option value="in-mum">📍 Asia South (Mumbai)</option>
                <option value="us-east">📍 US East (N. Virginia)</option>
                <option value="eu-west">📍 Europe West (Frankfurt)</option>
                <option value="global">🌐 Global Edge Anycast</option>
            </select>
            
            <button id="submit-btn" onclick="authenticate('login')" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-colors mb-4">
                Connect to Grid
            </button>

            <div class="text-center text-sm">
                <span id="toggle-text" class="text-gray-400">Don't have an account?</span>
                <button onclick="toggleMode()" id="toggle-btn" class="text-blue-400 font-bold hover:underline ml-1">Register</button>
            </div>

            <p id="error-msg" class="text-red-400 text-sm mt-4 text-center hidden"></p>
        </div>

        <div id="dashboard-view" class="hidden bg-gray-800 p-8 rounded-xl shadow-2xl w-[650px] border border-gray-700">
            <div class="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <h1 class="text-2xl font-bold text-white flex items-center"><span class="text-green-500 mr-2">●</span> Engine Active</h1>
                <span class="bg-blue-900 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-700">Authenticated</span>
            </div>
            
            <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="bg-gray-900 p-4 rounded border border-gray-700">
                    <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Territory</p>
                    <p class="text-xl font-mono text-blue-400" id="stat-region">--</p>
                </div>
                <div class="bg-gray-900 p-4 rounded border border-gray-700">
                    <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Compute Cores</p>
                    <p class="text-xl font-mono" id="stat-cores">--</p>
                </div>
                <div class="bg-gray-900 p-4 rounded border border-gray-700">
                    <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">System Memory</p>
                    <p class="text-xl font-mono" id="stat-ram">-- GB</p>
                </div>
            </div>

            <div class="bg-black p-4 rounded border border-gray-700 font-mono text-sm text-green-400 h-32 overflow-y-auto">
                > Initializing secure connection...<br>
                > Synchronizing regional ledger...<br>
                > Awaiting central brain instructions...<br>
            </div>
        </div>

        <script>
            let currentMode = 'login';

            function toggleMode() {
                currentMode = currentMode === 'login' ? 'register' : 'login';
                document.getElementById('form-subtitle').textContent = currentMode === 'login' ? 'Authenticate your Edge Node' : 'Register your Edge Node';
                document.getElementById('submit-btn').textContent = currentMode === 'login' ? 'Connect to Grid' : 'Create Account';
                document.getElementById('submit-btn').setAttribute('onclick', \`authenticate('\${currentMode}')\`);
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
                    const endpoint = mode === 'register' ? '/api/register' : '/api/login';
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, region })
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
// 🪟 NATIVE ELECTRON APP LIFECYCLE
// ==========================================
const GUI_PORT = 9000;
let server;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: "Nexus Provider Engine",
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
  server = app.listen(GUI_PORT, () => {
    console.log(chalk.bgBlue.white.bold(`\n 🖥️  Nexus Desktop UI Active `));

    const args = process.argv;
    const backupIndex = args.indexOf("--backup");

    if (backupIndex !== -1 && args[backupIndex + 1] && args[backupIndex + 2]) {
      const primaryIp = args[backupIndex + 1];
      const ngrokDomain = args[backupIndex + 2];
      const watcher = new HighAvailabilityWatcher(primaryIp, ngrokDomain, 80);
      watcher.start();
    } else {
      console.log(
        chalk.gray(`   └─ Running as Primary Node (HA Watcher Disabled)`),
      );
    }

    console.log(chalk.cyan(`   └─ Launching Native Desktop Interface...\n`));
    createWindow();
  });

  electronApp.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 🛑 GRACEFUL SHUTDOWN
electronApp.on("window-all-closed", () => {
  console.log(chalk.yellow("Initiating shutdown sequence..."));

  if (edgeSocket) edgeSocket.close();
  if (server) {
    server.close(() => {
      console.log(chalk.green("✅ Port 9000 released successfully."));
    });
  }
  if (process.platform !== "darwin") electronApp.quit();
});

electronApp.on("before-quit", () => {
  if (edgeSocket) edgeSocket.close();
  if (server) server.close();
});
