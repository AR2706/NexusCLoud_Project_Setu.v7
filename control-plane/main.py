from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import motor.motor_asyncio
import uuid
import os
from dotenv import load_dotenv
from typing import Dict, List

# Load secure variables from the .env file
load_dotenv()

app = FastAPI(title="Nexus Cloud V7 Control Plane", version="7.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 🗄️ DATABASE INITIALIZATION (MongoDB Atlas)
# ==========================================
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client.nexus_db # Update this to your actual database name if different

# ==========================================
# 📡 STATE & CONNECTION MANAGER
# ==========================================
class ConnectionManager:
    def __init__(self):
        # Maps Region -> List of connected Desktop Engine WebSockets
        self.providers: Dict[str, List[WebSocket]] = {}
        # Maps DeploymentID -> Vercel UI WebSocket
        self.clients: Dict[str, WebSocket] = {}
        
    async def connect_provider(self, websocket: WebSocket, region: str):
        await websocket.accept()
        if region not in self.providers:
            self.providers[region] = []
        self.providers[region].append(websocket)
        
    def disconnect_provider(self, websocket: WebSocket, region: str):
        if region in self.providers and websocket in self.providers[region]:
            self.providers[region].remove(websocket)
            
    async def connect_client(self, websocket: WebSocket, deployment_id: str):
        await websocket.accept()
        self.clients[deployment_id] = websocket
        
    def disconnect_client(self, deployment_id: str):
        if deployment_id in self.clients:
            del self.clients[deployment_id]
            
    async def send_log_to_client(self, deployment_id: str, log: str):
        if deployment_id in self.clients:
            await self.clients[deployment_id].send_text(log)

manager = ConnectionManager()

# ==========================================
# 📦 REQUEST MODELS
# ==========================================
class AuthRequest(BaseModel):
    email: str
    password: str
    region: str = "global"

class DeployRequest(BaseModel):
    github_url: str
    targetPort: int = 80
    region: str = "in-mum"
    limits: dict = {"maxCpu": 1, "maxRamMb": 512}

# ==========================================
# 🌐 REST API ROUTES
# ==========================================
@app.post("/api/v1/auth/register")
async def register(req: AuthRequest):
    # Add your MongoDB user creation logic here
    token = f"nxt_{uuid.uuid4().hex}"
    return {"success": True, "token": token}

@app.post("/api/v1/auth/provider")
async def login(req: AuthRequest):
    # Add your MongoDB user verification logic here
    token = f"nxt_{uuid.uuid4().hex}"
    return {"success": True, "token": token}

@app.post("/api/v1/deploy")
async def deploy_workload(req: DeployRequest):
    deployment_id = f"nexus-app-{uuid.uuid4().hex[:8]}"
    region = req.region
    
    # Optional: Save deployment metadata to MongoDB here
    # await db.deployments.insert_one({"deployment_id": deployment_id, "url": req.github_url, "region": region})
    
    print(f"🚀 Routing workload [{deployment_id}] to physical region: {region.upper()}")
    
    # 🔥 THE MISSING LINK: Transmit the command to the Desktop Engine
    if region in manager.providers and len(manager.providers[region]) > 0:
        provider_ws = manager.providers[region][0] # Grab the first available node in the region
        
        try:
            await provider_ws.send_json({
                "command": "DEPLOY_WORKLOAD",
                "github_url": req.github_url,
                "limits": req.limits,
                "containerId": deployment_id,
                "targetPort": req.targetPort
            })
            return {"success": True, "deploymentId": deployment_id}
        except Exception as e:
            print(f"Failed to transmit to Edge Node: {e}")
            raise HTTPException(status_code=500, detail="Edge Node connection dropped.")
    else:
        raise HTTPException(status_code=503, detail=f"No active Edge Nodes in region {region.upper()}")

@app.delete("/api/v1/deploy/{deployment_id}")
async def teardown_workload(deployment_id: str):
    stop_payload = {"command": "STOP_WORKLOAD", "containerId": deployment_id}
    
    # Optional: Update status in MongoDB here
    
    for region, providers in manager.providers.items():
        for provider_ws in providers:
            try:
                await provider_ws.send_json(stop_payload)
            except:
                pass
    return {"success": True}

# ==========================================
# ⚡ WEBSOCKET ROUTES (THE REAL-TIME BRIDGE)
# ==========================================

# Endpoint for Desktop Engine (Electron)
@app.websocket("/ws/provider/{token}/{region}")
async def provider_ws(websocket: WebSocket, token: str, region: str):
    await manager.connect_provider(websocket, region)
    print(f"🌍 Authenticated Edge Node connected to Region: [{region.upper()}]")
    
    # Acknowledge connection
    await websocket.send_json({"status": "acknowledged"})
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("action") == "register_capacity":
                print(f"✅ Node capacity logged: {data.get('cores')} Cores, {data.get('ram')}GB RAM")
                # Optional: Update node capacity in MongoDB
            
            # 🔥 BRIDGE LOGS: Route logs from Electron -> Control Plane -> Vercel UI
            elif data.get("type") == "BUILD_LOG":
                await manager.send_log_to_client(data["containerId"], data["log"])
                
    except WebSocketDisconnect:
        print(f"⚠️ Edge Node dropped from Region: [{region.upper()}]")
        manager.disconnect_provider(websocket, region)

# Endpoint for Vercel Dashboard UI
@app.websocket("/ws/client/{deployment_id}")
async def client_ws(websocket: WebSocket, deployment_id: str):
    await manager.connect_client(websocket, deployment_id)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive
    except WebSocketDisconnect:
        manager.disconnect_client(deployment_id)

@app.get("/")
def health_check():
    return {"status": "Nexus Control Plane Online", "version": "7.0.0"}