/**
 * NEXUS CLOUD V7 - DOCKER ENGINE ORCHESTRATOR
 * Includes Pre-Flight Diagnostics, Auto-Downloading, and Live Log Streaming
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

    if (fs.existsSync(downloadPath)) return resolve(downloadPath);

    streamLog(`[System] 📥 Cloudflared missing. Auto-downloading...\n`);
    const url = isWin
      ? "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
      : "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";

    const file = fs.createWriteStream(downloadPath);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          if (!isWin) fs.chmodSync(downloadPath, 0o755);
          streamLog(`[System] ✅ Download complete.\n`);
          resolve(downloadPath);
        });
      })
      .on("error", (err) => {
        fs.unlink(downloadPath, () => {});
        reject(err);
      });
  });
}

async function runPreFlightChecks(streamLog) {
  streamLog(`[System] Running Edge Environment Diagnostics...\n`);
  const hasGit = await checkCommandExists("git");
  if (!hasGit) throw new Error("CRITICAL: Git is not installed.");
  const hasDocker = await checkCommandExists("docker");
  if (!hasDocker) throw new Error("CRITICAL: Docker is not installed.");
  try {
    await docker.ping();
  } catch (e) {
    throw new Error("CRITICAL: Docker Desktop is not running.");
  }
}

// ==========================================
// 🌐 TUNNEL ORCHESTRATOR
// ==========================================
function establishPublicTunnel(localPort, cloudflaredPath, streamLog) {
  return new Promise((resolve, reject) => {
    // Wrap path in quotes to handle spaces in usernames/directories
    const cmd = fs.existsSync(cloudflaredPath)
      ? `"${cloudflaredPath}"`
      : isWin
        ? "cloudflared.exe"
        : "cloudflared";

    // CRITICAL FIX: Added --no-autoupdate to prevent background hangs
    const args = [
      "tunnel",
      "--no-autoupdate",
      "--url",
      `http://127.0.0.1:${localPort}`,
    ];

    streamLog(
      `\n[System] Launching Cloudflare Tunnel on Port ${localPort}...\n`,
    );

    const tunnelProcess = spawn(`${cmd} ${args.join(" ")}`, { shell: true });

    let found = false;

    const parseOutput = (data) => {
      const output = data.toString();
      // Stream Cloudflare's internal thought process to the UI
      streamLog(`[Cloudflare] ${output}`);

      const urlMatch = output.match(
        /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/,
      );
      if (urlMatch && !found) {
        found = true;
        resolve({ publicUrl: urlMatch[0], processId: tunnelProcess.pid });
      }
    };

    tunnelProcess.stdout.on("data", parseOutput);
    tunnelProcess.stderr.on("data", parseOutput);

    tunnelProcess.on("error", (err) => {
      streamLog(`[Tunnel Error] ${err.message}\n`);
    });

    setTimeout(() => {
      if (!found) {
        tunnelProcess.kill();
        reject(new Error("Cloudflare timeout. See logs above for reason."));
      }
    }, 30000);
  });
}

// ==========================================
// 🚀 DEPLOYMENT PIPELINE
// ==========================================
async function deployWorkload(
  githubUrl,
  limits,
  containerId,
  targetPort,
  onLog,
) {
  const streamLog = (msg) => {
    console.log(chalk.gray(`[DEPLOY-LOG] ${msg}`));
    if (onLog) onLog(msg.toString());
  };
  const cloneDir = path.join(os.tmpdir(), containerId);
  const hostPort = Math.floor(Math.random() * (9000 - 3000 + 1)) + 3000;
  const containerPortString = `${targetPort}/tcp`;

  try {
    await sleep(1000);
    streamLog(`[System] Upstream multiplexer connection established.\n`);

    await runPreFlightChecks(streamLog);
    const cloudflaredPath = await downloadCloudflared(streamLog);

    streamLog(`Cloning repository: ${githubUrl}\n`);
    await simpleGit().clone(githubUrl, cloneDir);

    streamLog(`Compiling Docker image...\n`);
    await new Promise((resolve, reject) => {
      const build = spawn("docker", ["build", "-t", containerId, "."], {
        cwd: cloneDir,
        env: { ...process.env, DOCKER_BUILDKIT: "1" },
        shell: true,
      });
      build.stdout.on("data", streamLog);
      build.stderr.on("data", streamLog);
      build.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error("Docker build failed")),
      );
    });

    // Cleanup any zombie containers from previous failed runs
    try {
      await docker.getContainer(containerId).remove({ force: true });
    } catch (e) {}

    streamLog(`Provisioning sandbox container...\n`);
    const container = await docker.createContainer({
      Image: containerId,
      name: containerId,
      HostConfig: {
        PortBindings: {
          [containerPortString]: [{ HostPort: hostPort.toString() }],
        },
      },
    });
    await container.start();

    // Launch Tunnel & pass the log stream down
    const tunnel = await establishPublicTunnel(
      hostPort,
      cloudflaredPath,
      streamLog,
    );
    activeTunnels.set(containerId, tunnel.processId);

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
    await container.stop();
    await container.remove();

    if (activeTunnels.has(containerId)) {
      try {
        process.kill(activeTunnels.get(containerId));
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
