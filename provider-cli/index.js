import fetch from "node-fetch";
import { WebSocket } from "ws";

// Hardcoded production backend control plane
const BACKEND_URL = "https://nexuscloud-project-setu-v7.onrender.com";

// Extract arguments: node index.js <nodeId> <region>
const args = process.argv.slice(2);
const nodeId = args[0];
const region = args[1] || "in-mum";

if (!nodeId) {
  console.error("❌ Error: Missing Node ID.");
  console.log("Usage: node index.js <node_id> [region]");
  process.exit(1);
}

/**
 * Communicates with the control plane to register/verify the node
 */
async function joinNetwork(nodeId, region) {
  const targetUrl = `${BACKEND_URL}/api/nodes/join`;
  console.log(`📡 Attempting to connect to Control Plane at: ${targetUrl}...`);

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nodeId: nodeId,
        region: region,
      }),
    });

    // Safe Fallback: Verify the response object actually exists
    if (!response) {
      console.error(
        "❌ Network Error: No response received from the server. The connection dropped.",
      );
      return false;
    }

    // Handle unsuccessful HTTP status codes safely
    if (response.status !== 200) {
      console.error(
        `❌ Join Failed: Server returned status code ${response.status}`,
      );
      try {
        const errorData = await response.json();
        console.error(
          `📝 Server Message:`,
          errorData.detail || errorData.message || errorData,
        );
      } catch (e) {
        console.error("📝 Could not parse error details from server response.");
      }
      return false;
    }

    const data = await response.json();
    console.log("==========================================");
    console.log("✅ Successfully joined the NexusEdge Mesh Network!");
    console.log(`🌐 Node ID: ${nodeId}`);
    console.log(`📍 Region : ${region.toUpperCase()}`);
    console.log("==========================================");
    return true;
  } catch (error) {
    // This catches system errors like ENOTFOUND, ECONNREFUSED, or server sleep timeouts
    console.error("\n❌ Critical Connection Failure!");
    console.error("------------------------------------------------");
    console.error(`Message: ${error.message}`);
    console.error("------------------------------------------------");
    console.error("💡 Troubleshooting Tips:");
    console.error(
      "1. Make sure your Render instance isn't undergoing a cold-start sleep (visit the URL in your browser to wake it up).",
    );
    console.error(
      "2. Verify that your Render application is actively listening for POST requests on /api/nodes/join.",
    );
    return false;
  }
}

/**
 * Opens a real-time bi-directional pipeline for executing cloud workloads
 */
function connectWebSocket(nodeId) {
  // Convert https:// to wss:// for the WebSocket handshake
  const wsUrl = BACKEND_URL.replace(/^http/, "ws") + `/ws/node/${nodeId}`;
  console.log(`🔌 Initializing live workload tunnel at: ${wsUrl}`);

  const ws = new WebSocket(wsUrl);

  ws.on("open", () => {
    console.log(
      "⚡ Secure Edge Tunnel established. Listening for container orchestration events...",
    );
  });

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📦 Incoming Deployment Event Received:`, message);

      // Handle image pulling / deployment logic here
      if (message.type === "DEPLOY_WORKLOAD") {
        console.log(
          `🚀 Provisioning target container image: ${message.image} on port ${message.port}`,
        );
        // Your Docker orchestration step goes here!
      }
    } catch (err) {
      console.error(
        "⚠️ Failed to parse inbound WebSocket message frame:",
        err.message,
      );
    }
  });

  ws.on("close", (code, reason) => {
    console.warn(
      `⚠️ Tunnel disconnected (Code: ${code}). Reconnecting in 5 seconds...`,
    );
    setTimeout(() => connectWebSocket(nodeId), 5000);
  });

  ws.on("error", (error) => {
    console.error("❌ Tunnel socket exception error:", error.message);
  });
}

// Execution orchestration
async function main() {
  const success = await joinNetwork(nodeId, region);
  if (success) {
    connectWebSocket(nodeId);
  } else {
    console.log("🛑 CLI execution halted due to connection setup failure.");
  }
}

main();
