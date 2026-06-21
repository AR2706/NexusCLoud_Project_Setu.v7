from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import motor.motor_asyncio
import uuid
import os
from dotenv import load_dotenv

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

# ---------------------------------------------------------------------------
# 🗄️ DATABASE INITIALIZATION (MongoDB Atlas)
# ---------------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    print("⚠️ WARNING: MONGO_URI not found in .env file. Database connection will fail.")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client.nexus_cloud
users_collection = db.users
deployments_collection = db.deployments

# ---------------------------------------------------------------------------
# 🔐 AUTHENTICATION & REGISTRATION LAYER
# ---------------------------------------------------------------------------
class ProviderAuth(BaseModel):
    email: str
    password: str
    region: str = "global"

@app.post("/api/v1/auth/register")
async def register_user(credentials: ProviderAuth):
    """Creates a new developer account and generates their unique Edge Token."""
    existing_user = await users_collection.find_one({"email": credentials.email})
    if existing_user:
        return {"success": False, "error": "Email already registered."}
    
    # Generate a cryptographically unique token for their Edge Node
    edge_token = f"nxt_{uuid.uuid4().hex}"
    
    new_user = {
        "email": credentials.email,
        "password": credentials.password, # Note: In production, hash this using passlib
        "edge_token": edge_token
    }
    await users_collection.insert_one(new_user)
    
    return {"success": True, "token": edge_token, "message": "Account created successfully."}

@app.post("/api/v1/auth/provider")
async def provider_login(credentials: ProviderAuth):
    """Verifies credentials against MongoDB Atlas."""
    # 1. If no users exist yet, let's create the admin user automatically for testing
    count = await users_collection.count_documents({})
    if count == 0 and credentials.email == "admin@nexus.dev":
        edge_token = "nexus-secure-token-777"
        await users_collection.insert_one({
            "email": credentials.email,
            "password": credentials.password,
            "edge_token": edge_token
        })
        return {"success": True, "token": edge_token, "message": "Admin account auto-created."}

    # 2. Standard login check
    user = await users_collection.find_one({"email": credentials.email, "password": credentials.password})
    
    if user:
        return {"success": True, "token": user["edge_token"], "message": "Authenticated."}
    return {"success": False, "error": "Invalid email or password."}

# ---------------------------------------------------------------------------
# 🔌 WEBSOCKET MESSAGE BROKER (Regional Ledger)
# ---------------------------------------------------------------------------
active_clients: dict[str, WebSocket] = {} 

# The Regional Bucket System
regional_nodes = {
    "in-mum": [],    # Asia South (Mumbai)
    "us-east": [],   # US East (N. Virginia)
    "eu-west": [],   # Europe West (Frankfurt)
    "global": []     # Anycast/Fallback
}

@app.websocket("/ws/client/{container_id}")
async def client_log_endpoint(websocket: WebSocket, container_id: str):
    """Allows the React dashboard to listen for live build logs."""
    await websocket.accept()
    active_clients[container_id] = websocket
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if container_id in active_clients:
            del active_clients[container_id]

@app.websocket("/ws/provider/{token}/{region}")
async def provider_node_endpoint(websocket: WebSocket, token: str, region: str):
    """Persistent tunnel. Receives telemetry and build logs from regional nodes."""
    await websocket.accept()
    
    # NEW: Secure the grid! Verify the token actually exists in MongoDB Atlas
    user = await users_collection.find_one({"edge_token": token})
    if not user:
        print(f"❌ Rejected unauthorized node connection attempt. Token: {token}")
        await websocket.close(code=1008)
        return
        
    if region not in regional_nodes:
        region = "global"
        
    regional_nodes[region].append(websocket)
    print(f"\n🌍 Authenticated Edge Node connected to Region: [{region.upper()}]")
    
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "BUILD_LOG":
                cid = data.get("containerId")
                if cid in active_clients:
                    await active_clients[cid].send_json({"log": data.get("log")})
            else:
                await websocket.send_json({"status": "acknowledged"})
            
    except WebSocketDisconnect:
        regional_nodes[region].remove(websocket)
        print(f"\n⚠️ Edge Node dropped from Region: [{region.upper()}]")

# ---------------------------------------------------------------------------
# 📡 REST API GATEWAY (Intelligent Geo-Routing)
# ---------------------------------------------------------------------------
@app.get("/")
async def health_check():
    return {"status": "online"}

@app.post("/api/v1/deploy")
async def request_deployment(payload: dict):
    github_url = payload.get("github_url")
    target_port = payload.get("target_port", 80)
    requested_region = payload.get("region", "global") 
    
    if not github_url:
        return {"success": False, "error": "Missing 'github_url'."}
        
    target_node = None
    assigned_region = None
    
    # 1. Try to find a node in the requested physical region
    if regional_nodes.get(requested_region) and len(regional_nodes[requested_region]) > 0:
        target_node = regional_nodes[requested_region][0]
        assigned_region = requested_region
    # 2. Fallback to a global node
    elif regional_nodes.get("global") and len(regional_nodes["global"]) > 0:
        target_node = regional_nodes["global"][0]
        assigned_region = "global"
    else:
        return {"success": False, "error": f"No capacity in {requested_region} or global fallback."}
    
    container_id = f"nexus-app-{uuid.uuid4().hex[:8]}"
    
    deployment_task = {
        "command": "DEPLOY_WORKLOAD",
        "github_url": github_url,
        "containerId": container_id,
        "targetPort": target_port,
        "limits": {"maxCpu": 2, "maxRamMb": 512}
    }
    
    try:
        print(f"\n🚀 Routing workload [{container_id}] to physical region: {assigned_region.upper()}")
        await target_node.send_json(deployment_task)
        
        # NEW: Log this deployment into the MongoDB Atlas database
        await deployments_collection.insert_one({
            "container_id": container_id,
            "github_url": github_url,
            "target_port": target_port,
            "region": assigned_region,
            "status": "active"
        })
        
        return {"success": True, "container_id": container_id}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.delete("/api/v1/deploy/{container_id}")
async def stop_deployment(container_id: str):
    payload = {"command": "STOP_WORKLOAD", "containerId": container_id}
    
    # Broadcast kill signal to ALL regions to ensure eradication
    for region in regional_nodes.values():
        for connection in region:
            try:
                await connection.send_json(payload)
            except:
                pass

    # NEW: Update database ledger
    await deployments_collection.update_one(
        {"container_id": container_id},
        {"$set": {"status": "terminated"}}
    )

    return {"success": True, "message": "Teardown signal broadcasted."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)