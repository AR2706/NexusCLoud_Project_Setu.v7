/**
 * NEXUS CLOUD V7 - DOCKER ENGINE ORCHESTRATOR
 * Includes Pre-Flight Diagnostics & Binary Auto-Downloading
 */

const Docker = require("dockerode");
const simpleGit = require("simple-git");
const { spawn, exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const chalk = require("chalk");

const isWin = process.platform === "win32";
const docker = new Docker(
  isWin
    ? { socketPath: "//./pipe/docker_engine" }
    : { socketPath: "/var/run/docker.sock" },
);

const activeTunnels = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// 🛠️ PRE-FLIGHT & AUTO-DOWNLOADER
// ==========================================
function checkCommandExists(command) {
  return new Promise((resolve) => {
    exec(`${command} --version`, { shell: true }, (err) => resolve(!err));
  });
}

function downloadCloudflared(streamLog) {
  return new Promise((resolve, reject) => {
    const binName = isWin ? "cloudflared.exe" : "cloudflared";
    const downloadPath = path.join(os.homedir(), binName);

    // Check if we already downloaded it previously
    if (fs.existsSync(downloadPath)) return resolve(downloadPath);

    streamLog(
      `[System] 📥 Cloudflared missing. Auto-downloading binary for ${os.platform()}...\n`,
    );

    const url = isWin
      ? "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
      : "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";

    const file = fs.createWriteStream(downloadPath);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          if (!isWin) fs.chmodSync(downloadPath, 0o755); // Make executable on Linux/Mac
          streamLog(`[System] ✅ Download complete.\n`);
          resolve(downloadPath);
        });
      })
      .on("error", (err) => {
        fs.unlink(downloadPath, () => {});
        reject(new Error(`Download failed: ${err.message}`));
      });
  });
}

async function runPreFlightChecks(streamLog) {
  streamLog(`[System] Running Edge Environment Diagnostics...\n`);

  const hasGit = await checkCommandExists("git");
  if (!hasGit)
    throw new Error(
      "CRITICAL: Git is not installed on this host machine. Please install Git.",
    );

  const hasDocker = await checkCommandExists("docker");
  if (!hasDocker)
    throw new Error("CRITICAL: Docker is not installed or not in PATH.");

  try {
    await docker.ping();
    streamLog(`[System] Docker Engine is awake and responsive.\n`);
  } catch (e) {
    throw new Error(
      "CRITICAL: Docker Desktop is installed but not running. Please start Docker.",
    );
  }
}

// ==========================================
// 🌐 TUNNEL ORCHESTRATOR
// ==========================================
function establishPublicTunnel(localPort, cloudflaredPath) {
  return new Promise((resolve, reject) => {
    // Use the auto-downloaded path if it exists, otherwise assume global
    const cmd = fs.existsSync(cloudflaredPath)
      ? cloudflaredPath
      : isWin
        ? "cloudflared.exe"
        : "cloudflared";

    const tunnelProcess = spawn(
      cmd,
      ["tunnel", "--url", `http://127.0.0.1:${localPort}`],
      { shell: true },
    );

    tunnelProcess.stderr.on("data", (data) => {
      const output = data.toString();
      const urlMatch = output.match(
        /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/,
      );
      if (urlMatch) {
        resolve({ publicUrl: urlMatch[0], processId: tunnelProcess.pid });
      }
    });

    setTimeout(
      () => reject(new Error("Cloudflare tunnel handshake timed out.")),
      15000,
    );
  });
}

// ==========================================
// 🚀 PIPELINE EXECUTION
// ==========================================
async function deployWorkload(
  githubUrl,
  limits,
  containerId,
  targetPort,
  onLog,
) {
  const deploymentId = containerId;
  const cloneDir = path.join(os.tmpdir(), deploymentId);
  const hostPort = Math.floor(Math.random() * (9000 - 3000 + 1)) + 3000;
  const containerPortString = `${targetPort}/tcp`;

  const streamLog = (msg) => {
    if (onLog) onLog(msg.toString());
  };

  try {
    await sleep(1000); // Brief buffer for Vercel UI to connect
    streamLog(`[System] Upstream multiplexer connection established.\n`);

    // 1. Run Diagnostics & Auto-Download
    await runPreFlightChecks(streamLog);
    const cloudflaredPath = await downloadCloudflared(streamLog);

    // 2. Clone Code
    streamLog(
      `\nInitiating pipeline for ${deploymentId}...\nCloning repository: ${githubUrl}\n`,
    );
    await simpleGit().clone(githubUrl, cloneDir);
    if (!fs.existsSync(path.join(cloneDir, "Dockerfile")))
      throw new Error("No Dockerfile detected in repository.");

    // 3. Build Image
    streamLog(`Compiling Docker image natively...\n`);
    await new Promise((resolve, reject) => {
      const buildProcess = spawn("docker", ["build", "-t", deploymentId, "."], {
        cwd: cloneDir,
        env: { ...process.env, DOCKER_BUILDKIT: "1" },
        shell: true,
      });
      buildProcess.stdout.on("data", streamLog);
      buildProcess.stderr.on("data", streamLog);
      buildProcess.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`Docker build failed.`)),
      );
    });

    // 4. Provision Container
    streamLog(
      `Provisioning sandbox: ${limits.maxCpu} vCPU, ${limits.maxRamMb}MB RAM\n`,
    );
    const container = await docker.createContainer({
      Image: deploymentId,
      name: deploymentId,
      ExposedPorts: { [containerPortString]: {} },
      HostConfig: {
        PortBindings: {
          [containerPortString]: [{ HostPort: hostPort.toString() }],
        },
        Memory: limits.maxRamMb * 1024 * 1024,
        NanoCpus: limits.maxCpu * 1e9,
      },
    });
    await container.start();

    // 5. Expose Tunnel
    streamLog(`Waiting for container services (3s)...\n`);
    await sleep(3000);
    streamLog(`Negotiating secure HTTPS tunnel...\n`);
    const tunnel = await establishPublicTunnel(hostPort, cloudflaredPath);
    activeTunnels.set(deploymentId, tunnel.processId);

    streamLog(`\n✅ WORKLOAD LIVE!\nPUBLIC URL: ${tunnel.publicUrl}\n`);
    fs.rmSync(cloneDir, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    streamLog(`\n❌ Pipeline Failure: ${error.message}\n`);
    if (fs.existsSync(cloneDir))
      fs.rmSync(cloneDir, { recursive: true, force: true });
    return { success: false, error: error.message };
  }
}

async function teardownWorkload(containerId, onLog) {
  const streamLog = (msg) => {
    if (onLog) onLog(msg.toString());
  };
  try {
    const container = docker.getContainer(containerId);
    streamLog(`Stopping sandbox...\n`);
    await container.stop();
    streamLog(`Removing container...\n`);
    await container.remove();

    const tunnelPid = activeTunnels.get(containerId);
    if (tunnelPid) {
      streamLog(`Severing tunnel...\n`);
      try {
        process.kill(tunnelPid);
      } catch (e) {}
      activeTunnels.delete(containerId);
    }
    streamLog(`✅ Workload Eradicated.\n`);
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

module.exports = { deployWorkload, teardownWorkload };
