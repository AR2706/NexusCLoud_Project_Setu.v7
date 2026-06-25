/**
 * NEXUS CLOUD V7 - DOCKER ENGINE ORCHESTRATOR
 * Provides cross-platform container management and tunneling
 */

const Docker = require("dockerode");
const simpleGit = require("simple-git");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const chalk = require("chalk");

// 1. Cross-Platform Docker Connection
// Automatically switches between Windows Named Pipe and Unix Socket
const isWin = process.platform === "win32";
const docker = new Docker(
  isWin
    ? { socketPath: "//./pipe/docker_engine" }
    : { socketPath: "/var/run/docker.sock" },
);

const activeTunnels = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 2. Cloudflare Tunnel Orchestrator
function establishPublicTunnel(localPort) {
  return new Promise((resolve, reject) => {
    console.log(
      chalk.gray(
        `   ├─ Negotiating Zero-Trust HTTPS Tunnel with Cloudflare...`,
      ),
    );

    // Windows requires '.exe' extension and shell:true to execute from PATH
    const cmd = isWin ? "cloudflared.exe" : "cloudflared";
    const tunnelProcess = spawn(
      cmd,
      ["tunnel", "--url", `http://127.0.0.1:${localPort}`],
      { shell: isWin },
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

    tunnelProcess.on("error", (err) => {
      console.log(
        chalk.red(
          `   ├─ Cloudflare Error: ${err.message}. Ensure cloudflared is in your system PATH.`,
        ),
      );
    });

    setTimeout(
      () => reject(new Error("Cloudflare tunnel handshake timed out.")),
      15000,
    );
  });
}

// 3. Main Workload Deployment Pipeline
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
    console.log(
      chalk.cyan(`\n🐳 [Docker Engine] Pipeline start: ${deploymentId}...`),
    );
    streamLog(
      `Initiating pipeline for ${deploymentId}...\nCloning: ${githubUrl}\n`,
    );

    await simpleGit().clone(githubUrl, cloneDir);

    if (!fs.existsSync(path.join(cloneDir, "Dockerfile"))) {
      throw new Error("No Dockerfile detected in repository.");
    }

    streamLog(`Compiling Docker image natively...\n`);
    await new Promise((resolve, reject) => {
      // Critical: shell: isWin enables CMD/PowerShell execution on Windows
      const buildProcess = spawn("docker", ["build", "-t", deploymentId, "."], {
        cwd: cloneDir,
        env: { ...process.env, DOCKER_BUILDKIT: "1" },
        shell: isWin,
      });

      buildProcess.stdout.on("data", streamLog);
      buildProcess.stderr.on("data", streamLog);
      buildProcess.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`Docker build failed.`)),
      );
      buildProcess.on("error", () =>
        reject(new Error("Docker engine not responding.")),
      );
    });

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

    streamLog(`Waiting for container services (3s)...\n`);
    await sleep(3000);

    streamLog(`Negotiating secure HTTPS tunnel...\n`);
    const tunnel = await establishPublicTunnel(hostPort);

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

// 4. Cleanup Sequence
async function teardownWorkload(containerId, onLog) {
  const streamLog = (msg) => {
    if (onLog) onLog(msg.toString());
  };
  console.log(chalk.yellow(`\n🗑️ [Docker Engine] Teardown: ${containerId}...`));

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
    streamLog(`❌ Teardown Failure: ${error.message}\n`);
    return { success: false };
  }
}

module.exports = { deployWorkload, teardownWorkload };
