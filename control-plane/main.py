from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import motor.motor_asyncio
import uuid
import os
from dotenv import load_dotenv
from typing import Dict, List
from datetime import datetime, timezone
import asyncio

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
db = client.nexus_db 
users_collection = db.users
nodes_collection = db.edge_nodes  
deployments_collection = db.deployments 

@app.get("/debug/db")
async def debug_db():
    try:
        count = await users_collection.count_documents({})
        return {"status": "connected", "user_count": count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# 📡 STATE & CONNECTION MANAGER
# ==========================================
class ConnectionManager:
    def __init__(self):
        self.providers: Dict[str, List[WebSocket]] = {}
        self.clients: Dict[str, WebSocket] = {}
        self.pending_logs: Dict[str, List[str]] = {} 
        
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
        print(f"DEBUG: ✅ WebSocket connection confirmed for {deployment_id}")
        
        if deployment_id in self.pending_logs:
            for log in self.pending_logs[deployment_id]:
                await websocket.send_text(log)
            del self.pending_logs[deployment_id]
            
    def disconnect_client(self, deployment_id: str):
        if deployment_id in self.clients:
            del self.clients[deployment_id]
            
    async def send_log_to_client(self, deployment_id: str, log: str):
        if deployment_id in self.clients:
            await self.clients[deployment_id].send_text(log)
        else:
            if deployment_id not in self.pending_logs:
                self.pending_logs[deployment_id] = []
            self.pending_logs[deployment_id].append(log)
            print(f"DEBUG: Client {deployment_id} not connected. Buffering log.")

manager = ConnectionManager()

# ==========================================
# 📦 REQUEST MODELS
# ==========================================
class AuthRequest(BaseModel):
    email: str
    password: str
    region: str = "global"

class DeployRequest(BaseModel):
    token: str           
    github_url: str
    target_port: int = 80
    region: str = "in-mum"
    limits: dict = {"maxCpu": 1, "maxRamMb": 512}

class HeartbeatRequest(BaseModel):
    token: str
    region: str
    container_id: str = None
    status: str = "idle"

class UpdateUrlRequest(BaseModel):
    url: str

# ==========================================
# 🌐 REST API ROUTES 
# ==========================================
@app.post("/api/v1/auth/register")
async def register(req: AuthRequest):
    token = f"nxt_{uuid.uuid4().hex}"
    return {"success": True, "token": token}

@app.post("/api/v1/auth/provider")
async def login(req: AuthRequest):
    token = f"nxt_{uuid.uuid4().hex}"
    return {"success": True, "token": token}

@app.post("/api/v1/deploy")
async def deploy_workload(req: DeployRequest):
    deployment_id = f"nexus-app-{uuid.uuid4().hex[:8]}"
    region = req.region
    
    # Save the new deployment to MongoDB immediately
    await deployments_collection.insert_one({
        "id": deployment_id,
        "token": req.token,
        "repo": req.github_url,
        "port": req.target_port,
        "region": region,
        "status": "provisioning",
        "url": None,
        "last_seen": datetime.now(timezone.utc)
    })

    print(f"🚀 Routing workload [{deployment_id}] to physical region: {region.upper()}")
    
    if region in manager.providers and len(manager.providers[region]) > 0:
        provider_ws = manager.providers[region][0] 
        try:
            await provider_ws.send_json({
                "command": "DEPLOY_WORKLOAD", 
                "github_url": req.github_url,
                "limits": req.limits,
                "containerId": deployment_id,
                "targetPort": req.target_port
            })
            return {"success": True, "container_id": deployment_id}
        except Exception as e:
            print(f"Failed to transmit to Edge Node: {e}")
            raise HTTPException(status_code=500, detail="Edge Node connection dropped.")
    else:
        raise HTTPException(status_code=503, detail=f"No active Nodes in {region.upper()}")

@app.patch("/api/v1/deploy/{deployment_id}/url")
async def update_deployment_url(deployment_id: str, req: UpdateUrlRequest):
    await deployments_collection.update_one(
        {"id": deployment_id},
        {"$set": {"url": req.url, "status": "active"}}
    )
    return {"success": True}

@app.get("/api/v1/deployments/{token}")
async def get_deployments(token: str):
    cursor = deployments_collection.find({"token": token}, {"_id": 0})
    deployments = await cursor.to_list(length=100)
    return {"success": True, "deployments": deployments}

@app.post("/api/v1/heartbeat")
async def node_heartbeat(req: HeartbeatRequest):
    timestamp = datetime.now(timezone.utc)
    await nodes_collection.update_one(
        {"token": req.token},
        {"$set": {"region": req.region, "status": req.status, "last_seen": timestamp}},
        upsert=True
    )
    if req.container_id:
        await deployments_collection.update_one(
            {"id": req.container_id},
            {"$set": {"status": req.status, "last_seen": timestamp}}
        )
    return {"success": True}

@app.delete("/api/v1/deploy/{deployment_id}")
async def teardown_workload(deployment_id: str):
    stop_payload = {"command": "STOP_WORKLOAD", "containerId": deployment_id}
    
    for region, providers in manager.providers.items():
        for provider_ws in providers:
            try:
                await provider_ws.send_json(stop_payload)
            except:
                pass
    return {"success": True}

# ==========================================
# ⚡ WEBSOCKET ROUTES 
# ==========================================
@app.websocket("/ws/provider/{token}/{region}")
async def provider_ws(websocket: WebSocket, token: str, region: str):
    await manager.connect_provider(websocket, region)
    print(f"🌍 Authenticated Edge Node connected to Region: [{region.upper()}]")
    
    await websocket.send_json({"status": "acknowledged"})
    
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("action") == "register_capacity":
                print(f"✅ Node capacity logged: {data.get('cores')} Cores, {data.get('ram')}GB RAM")
            elif data.get("type") == "BUILD_LOG":
                container_id = data.get("containerId")
                log_content = data.get("log")
                await manager.send_log_to_client(container_id, log_content)
                
    except WebSocketDisconnect:
        print(f"⚠️ Edge Node dropped from Region: [{region.upper()}]")
        manager.disconnect_provider(websocket, region)

@app.websocket("/ws/client/{deployment_id}")
async def client_ws(websocket: WebSocket, deployment_id: str):
    print(f"DEBUG: Client connecting with ID: {deployment_id}")
    await manager.connect_client(websocket, deployment_id)
    try:
        while True:
            await websocket.receive_text() 
    except WebSocketDisconnect:
        manager.disconnect_client(deployment_id)

@app.get("/")
def health_check():
    return {"status": "Nexus Control Plane Online", "version": "7.0.0"}

# ==========================================
# 🛡️ SYSTEM WATCHDOG (BACKGROUND TASK)
# ==========================================
async def watchdog_task():
    while True:
        try:
            threshold_time = datetime.now(timezone.utc).timestamp() - 60
            
            # Sweep Nodes
            result_nodes = await nodes_collection.update_many(
                {
                    "status": {"$ne": "offline"},
                    "last_seen": {"$lt": datetime.fromtimestamp(threshold_time, tz=timezone.utc)}
                },
                {"$set": {"status": "offline"}}
            )
            
            # Sweep Deployments
            result_deps = await deployments_collection.update_many(
                {
                    "status": {"$in": ["active", "provisioning"]},
                    "last_seen": {"$lt": datetime.fromtimestamp(threshold_time, tz=timezone.utc)}
                },
                {"$set": {"status": "offline"}}
            )
            
            if result_nodes.modified_count > 0 or result_deps.modified_count > 0:
                print(f"[WATCHDOG] Swept {result_nodes.modified_count} stale nodes and {result_deps.modified_count} stale deployments.")
                
            await asyncio.sleep(30) 
        except Exception as e:
            print(f"[WATCHDOG] Error during sweep: {e}")
            await asyncio.sleep(30)

@app.on_event("startup")
async def startup_event():
    print("🚀 Initiating System Watchdog...")
    asyncio.create_task(watchdog_task())