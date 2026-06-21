const WebSocket = require('ws');
const chalk = require('chalk');
const engine = require('./docker-engine'); 

const token = process.argv[2];
const region = process.argv[3] || 'global'; 

if (!token) {
    console.log(chalk.red("❌ Fatal Error: Edge node requires an authentication token."));
    process.exit(1);
}

const CONTROL_PLANE_URL = `ws://localhost:8080/ws/provider/${token}/${region}`;

console.log(chalk.cyan(`⚙️ Nexus V7 Edge Node Engine Initializing...`));
console.log(chalk.magenta(`   ├─ Physical Territory Claimed: [${region.toUpperCase()}]`));
console.log(chalk.gray(`   ├─ Connecting to Central Brain at ${CONTROL_PLANE_URL}`));

const ws = new WebSocket(CONTROL_PLANE_URL);

ws.on('open', () => {
    console.log(chalk.green(`   └─ ✅ Secure Uplink Established with Control Plane.`));
});

ws.on('message', async (message) => {
    try {
        const payload = JSON.parse(message);
        
        if (payload.command === 'DEPLOY_WORKLOAD') {
            console.log(chalk.cyan(`\n< INBOUND WORKLOAD DETECTED <`));
            console.log(chalk.gray(`   ├─ Target Repository: ${payload.github_url}`));
            console.log(chalk.gray(`   ├─ Target Port: ${payload.targetPort}`));
            console.log(chalk.gray(`   ├─ Assigned Container ID: ${payload.containerId}`));
            
            await engine.deployWorkload(
                payload.github_url, 
                payload.limits, 
                payload.containerId, 
                payload.targetPort,
                (logText) => {
                    // Stream the raw Docker logs up to Python
                    ws.send(JSON.stringify({
                        type: 'BUILD_LOG',
                        containerId: payload.containerId,
                        log: logText
                    }));
                }
            );
        } 
        else if (payload.command === 'STOP_WORKLOAD') {
            console.log(chalk.yellow(`\n< INBOUND TEARDOWN SIGNAL <`));
            
            // Pass the WebSocket sender to stream teardown logs to the UI
            await engine.teardownWorkload(payload.containerId, (logText) => {
                ws.send(JSON.stringify({
                    type: 'BUILD_LOG',
                    containerId: payload.containerId,
                    log: logText
                }));
            });
        }

    } catch (error) {
        console.log(chalk.red(`❌ Error processing central brain message: ${error.message}`));
    }
});

ws.on('close', () => {
    console.log(chalk.red(`\n⚠️ Connection to Control Plane lost. Entering standby mode.`));
    process.exit(1);
});

ws.on('error', (error) => {
    console.log(chalk.red(`\n❌ WebSocket Error: ${error.message}`));
});