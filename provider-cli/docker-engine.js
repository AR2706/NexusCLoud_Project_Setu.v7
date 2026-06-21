const Docker = require('dockerode');
const simpleGit = require('simple-git');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const chalk = require('chalk');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const activeTunnels = new Map(); 

// Helper function to pause execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function establishPublicTunnel(localPort) {
    return new Promise((resolve, reject) => {
        console.log(chalk.gray(`   ├─ Negotiating Zero-Trust HTTPS Tunnel with Cloudflare...`));
        const tunnelProcess = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${localPort}`]);

        tunnelProcess.stderr.on('data', (data) => {
            const output = data.toString();
            const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
            if (urlMatch) {
                resolve({ publicUrl: urlMatch[0], processId: tunnelProcess.pid });
            }
        });

        tunnelProcess.on('close', (code) => {
            if (code !== 0) console.log(chalk.red(`   ├─ Cloudflare daemon exited unexpectedly (Code: ${code})`));
        });

        setTimeout(() => reject(new Error("Cloudflare tunnel handshake timed out.")), 15000);
    });
}

async function deployWorkload(githubUrl, limits, containerId, targetPort, onLog) {
    const deploymentId = containerId; 
    const cloneDir = path.join(os.tmpdir(), deploymentId);
    const hostPort = Math.floor(Math.random() * (9000 - 3000 + 1)) + 3000; 
    const containerPortString = `${targetPort}/tcp`; 

    const streamLog = (msg) => { if (onLog) onLog(msg.toString()); };

    try {
        console.log(chalk.cyan(`\n🐳 [Docker Engine] Initiating pipeline for ${deploymentId}...`));
        streamLog(`Initiating pipeline for ${deploymentId}...\n`);
        streamLog(`Cloning repository: ${githubUrl}\n`);
        
        await simpleGit().clone(githubUrl, cloneDir);

        if (!fs.existsSync(path.join(cloneDir, 'Dockerfile'))) {
            throw new Error("No Dockerfile detected. Pipeline aborted.");
        }

        streamLog(`Compiling Docker image natively...\n`);
        await new Promise((resolve, reject) => {
            const buildProcess = spawn('docker', ['build', '-t', deploymentId, '.'], {
                cwd: cloneDir,
                env: { ...process.env, DOCKER_BUILDKIT: '1' } 
            });

            // Stream logs directly up to the React UI
            buildProcess.stdout.on('data', streamLog);
            buildProcess.stderr.on('data', streamLog);

            buildProcess.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Docker build failed.`)));
        });

        streamLog(`Provisioning sandbox: ${limits.maxCpu} vCPU, ${limits.maxRamMb}MB RAM\n`);
        const container = await docker.createContainer({
            Image: deploymentId,
            name: deploymentId,
            ExposedPorts: { [containerPortString]: {} }, 
            HostConfig: {
                PortBindings: { [containerPortString]: [{ HostPort: hostPort.toString() }] },
                Memory: limits.maxRamMb * 1024 * 1024,
                NanoCpus: limits.maxCpu * 1e9,
                NetworkMode: 'bridge',
            }
        });
        await container.start();
        
        // Wait for the container's internal web server to wake up
        streamLog(`Waiting for container services to boot up (3s)...\n`);
        console.log(chalk.gray(`   ├─ Pausing 3 seconds for container boot...`));
        await sleep(3000); 

        streamLog(`Negotiating secure HTTPS tunnel on port ${targetPort}...\n`);
        const tunnel = await establishPublicTunnel(hostPort);

        activeTunnels.set(deploymentId, tunnel.processId);
        
        // Output both Local and Public URLs
        streamLog(`\n✅ WORKLOAD LIVE!\nLOCAL URL: http://localhost:${hostPort}\nPUBLIC URL: ${tunnel.publicUrl}\n`);
        console.log(chalk.green(`   ├─ 🏠 Local Preview: http://localhost:${hostPort}`));
        console.log(chalk.green(`   └─ 🌐 Public URL: ${tunnel.publicUrl}`));

        fs.rmSync(cloneDir, { recursive: true, force: true });
        return { success: true, localPort: hostPort, containerId: deploymentId, publicUrl: tunnel.publicUrl };

    } catch (error) {
        streamLog(`\n❌ Pipeline Failure: ${error.message}\n`);
        console.log(chalk.red(`   └─ ❌ Pipeline Failure: ${error.message}`));
        if (fs.existsSync(cloneDir)) fs.rmSync(cloneDir, { recursive: true, force: true });
        return { success: false, error: error.message };
    }
}

async function teardownWorkload(containerId, onLog) {
    const streamLog = (msg) => { if (onLog) onLog(msg.toString()); };
    
    console.log(chalk.yellow(`\n🗑️ [Docker Engine] Initiating Teardown Sequence for ${containerId}...`));
    streamLog(`\n[System] Initiating Teardown Sequence for ${containerId}...\n`);

    try {
        const container = docker.getContainer(containerId);
        
        streamLog(`Stopping container sandbox...\n`);
        await container.stop(); 
        
        streamLog(`Removing container layers...\n`);
        await container.remove(); 

        const tunnelPid = activeTunnels.get(containerId);
        if (tunnelPid) {
            streamLog(`Severing secure HTTPS tunnel...\n`);
            try { process.kill(tunnelPid); } catch (e) {}
            activeTunnels.delete(containerId); 
        }

        console.log(chalk.green(`   └─ ✅ Workload Eradicated!`));
        streamLog(`✅ Workload Eradicated! Ports and memory released.\n`);
        return { success: true };
    } catch (error) {
        console.log(chalk.red(`   └─ ❌ Teardown Failure: ${error.message}`));
        streamLog(`❌ Teardown Failure: ${error.message}\n`);
        return { success: false, error: error.message };
    }
}

module.exports = { deployWorkload, teardownWorkload };