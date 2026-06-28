const Docker = require("dockerode");

class EngineManager {
  static getEngine() {
    const isWin = process.platform === "win32";

    // Windows uses a Named Pipe by default for Docker Desktop
    if (isWin) {
      return new Docker({ socketPath: "//./pipe/docker_engine" });
    }

    // macOS and Linux use the standard Unix Socket
    return new Docker({ socketPath: "/var/run/docker.sock" });
  }

  static getPlatform() {
    return process.platform;
  }
}

module.exports = EngineManager;
