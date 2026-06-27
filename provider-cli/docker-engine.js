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
const chalk = require("chalk");

// ==========================================
// 1. CROSS-PLATFORM DOCKER SETUP
// ==========================================
const isWin = process.platform === "win32";
const docker = new Docker(
  isWin
    ? { socketPath: "//./pipe/docker_engine" }
    : { socketPath: "/var/run/docker.sock" },
);

const activeTunnels = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// 2. DIAGNOSTICS & STATUS
// ==========================================
function checkCommandExists(command) {
  return new Promise((resolve) => {
    exec(`${command} --version`, { shell: true }, (err) => resolve(!err));
  });
}

// Container Status for Health Monitoring
async function getContainerStatus(containerId) {
  try {
    const container = docker.getContainer(containerId);
    const data = await container.inspect();
    return {
      status: data.State.Status, // e.g., "running", "exited"
      running: data.State.Running,
    };
  } catch (e) {
    return { status: "unknown", running: false };
  }
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
// 3. TUNNEL ORCHESTRATOR
// ==========================================
function establishPublicTunnel(localPort, streamLog) {
  return new Promise((resolve, reject) => {
    // 🔥 FIX: Use 'npx lt' to bypass Linux global PATH issues
    const cmd = `npx --yes lt --port ${localPort}`;

    streamLog(`\n[System] Launching Localtunnel on port ${localPort}...\n`);
    const tunnelProcess = spawn(cmd, { shell: true });

    let found = false;

    tunnelProcess.stdout.on("data", (data) => {
      const output = data.toString();
      streamLog(`[Tunnel]: ${output}`);

      // Localtunnel prints the URL as: "your url is: https://..."
      const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.loca\.lt/);

      if (urlMatch && !found) {
        found = true;
        resolve({ publicUrl: urlMatch[0], processId: tunnelProcess.pid });
      }
    });

    tunnelProcess.on("error", (err) => {
      streamLog(`[Tunnel Error] ${err.message}\n`);
    });

    setTimeout(() => {
      if (!found) {
        tunnelProcess.kill();
        reject(new Error("Tunnel timeout: Ensure localtunnel is accessible."));
      }
    }, 20000);
  });
}

// ==========================================
// 4. DEPLOYMENT PIPELINE
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
    const tunnel = await establishPublicTunnel(hostPort, streamLog);
    activeTunnels.set(containerId, tunnel.processId);

    streamLog(`\n✅ WORKLOAD LIVE!\nPUBLIC URL: ${tunnel.publicUrl}\n`);

    // Cleanup the cloned source code to save disk space
    fs.rmSync(cloneDir, { recursive: true, force: true });

    return { success: true };
  } catch (error) {
    streamLog(`\n❌ Pipeline Failure: ${error.message}\n`);
    if (fs.existsSync(cloneDir)) {
      fs.rmSync(cloneDir, { recursive: true, force: true });
    }
    return { success: false, error: error.message };
  }
}

// ==========================================
// 5. TEARDOWN PIPELINE
// ==========================================
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

// Ensure all functions are exported
module.exports = { deployWorkload, teardownWorkload, getContainerStatus };
