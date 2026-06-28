const { exec } = require("child_process");
const EngineManager = require("./engine-manager");

const docker = EngineManager.getEngine();

function checkCommandExists(command) {
  return new Promise((resolve) => {
    exec(`${command} --version`, { shell: true }, (err) => resolve(!err));
  });
}

async function runDiagnostics() {
  const diagnostics = {
    gitInstalled: false,
    dockerInstalled: false,
    dockerRunning: false,
    platform: EngineManager.getPlatform(),
    errors: [],
  };

  try {
    diagnostics.gitInstalled = await checkCommandExists("git");
    if (!diagnostics.gitInstalled) diagnostics.errors.push("Git is missing.");

    diagnostics.dockerInstalled = await checkCommandExists("docker");
    if (!diagnostics.dockerInstalled)
      diagnostics.errors.push("Docker is missing.");

    if (diagnostics.dockerInstalled) {
      try {
        await docker.ping();
        diagnostics.dockerRunning = true;
      } catch (e) {
        diagnostics.errors.push("Docker daemon is not running.");
      }
    }
  } catch (error) {
    diagnostics.errors.push(`System check failed: ${error.message}`);
  }

  // Determine overall readiness
  diagnostics.isReady = diagnostics.gitInstalled && diagnostics.dockerRunning;
  return diagnostics;
}

module.exports = { runDiagnostics, docker };
