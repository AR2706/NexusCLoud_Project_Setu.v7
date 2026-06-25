import { useState, useRef, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Rocket,
  Server,
  Activity,
  Globe,
  GitBranch,
  Lock,
  Download,
  Key,
  ChevronRight,
  Trash2,
  ExternalLink,
  BookOpen,
  Cpu,
  User,
  Layers,
  Sliders,
  CheckCircle,
  Terminal,
  Info,
  AlertTriangle,
} from "lucide-react";
import "./App.css";

const glassStyle = {
  background: "rgba(15, 15, 20, 0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
  borderRadius: "16px",
};

const inputGlassStyle = {
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "10px",
  color: "#ffffff",
  outline: "none",
  padding: "0.8rem 1rem",
  transition: "all 0.3s ease",
};

function LandingPage() {
  return (
    <div
      className="page-container"
      style={{
        textAlign: "center",
        maxWidth: "1000px",
        margin: "0 auto",
        paddingTop: "4rem",
      }}
    >
      <header style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontSize: "4rem",
            fontWeight: "800",
            letterSpacing: "-1.5px",
            marginBottom: "1rem",
          }}
        >
          The Edge is <span style={{ color: "#0070f3" }}>Everywhere.</span>
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "1.25rem",
            maxWidth: "600px",
            margin: "0 auto 2.5rem",
            lineHeight: "1.6",
          }}
        >
          Decentralized, zero-trust edge computing. Turn your local hardware
          into a globally accessible cloud network in seconds.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
          <Link
            to="/login"
            className="btn btn-primary"
            style={{
              padding: "0.8rem 2rem",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: "600",
            }}
          >
            Start Deploying
          </Link>

          <Link
            to="/download"
            className="btn btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.8rem 2rem",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: "600",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
          >
            <Download size={18} /> Download Engine
          </Link>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1.5rem",
          textAlign: "left",
        }}
      >
        <div style={{ ...glassStyle, padding: "2rem" }}>
          <Server color="#0070f3" size={28} style={{ marginBottom: "1rem" }} />
          <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>
            Host Anywhere
          </h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              lineHeight: "1.5",
            }}
          >
            Bypass expensive data centers. Run production workloads natively on
            consumer hardware.
          </p>
        </div>
        <div style={{ ...glassStyle, padding: "2rem" }}>
          <Globe color="#10b981" size={28} style={{ marginBottom: "1rem" }} />
          <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>
            Zero-Trust Tunnels
          </h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              lineHeight: "1.5",
            }}
          >
            Dynamic Cloudflare integration punches secure HTTPS ingress routes
            through any local firewall.
          </p>
        </div>
        <div style={{ ...glassStyle, padding: "2rem" }}>
          <Activity
            color="#f59e0b"
            size={28}
            style={{ marginBottom: "1rem" }}
          />
          <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>
            Real-Time Telemetry
          </h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              lineHeight: "1.5",
            }}
          >
            Stream native Docker compilation output directly to your browser via
            secure WebSockets.
          </p>
        </div>
      </div>
    </div>
  );
}

function DownloadPage() {
  return (
    <div
      className="page-container"
      style={{ maxWidth: "1100px", margin: "0 auto" }}
    >
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "800",
            letterSpacing: "-1px",
            marginBottom: "0.5rem",
          }}
        >
          Nexus Edge Engine
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
          Download the standalone binary for your operating system.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2rem",
        }}
      >
        {/* WINDOWS */}
        <div
          style={{
            ...glassStyle,
            padding: "2.5rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "1.5rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>🪟</span>
            <h3 style={{ margin: 0, fontSize: "1.4rem" }}>Windows</h3>
          </div>
          <a
            href="https://github.com/AR2706/NexusCLoud_Project_Setu.v7/releases/download/v1.0.0/gui-win.exe"
            className="btn btn-primary"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              padding: "0.8rem",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: "600",
              marginBottom: "2rem",
            }}
          >
            <Download size={18} /> Download .exe
          </a>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "12px",
              padding: "1.2rem",
              flex: 1,
            }}
          >
            <h4
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "0 0 1rem 0",
                color: "#0070f3",
                fontSize: "0.95rem",
              }}
            >
              <Info size={16} /> Quick Start
            </h4>
            <ol
              style={{
                margin: 0,
                paddingLeft: "1.2rem",
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                lineHeight: "1.6",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <li>Download the executable file.</li>
              <li>Double-click to run. No installation required.</li>
              <li>
                If Windows Defender SmartScreen appears, click{" "}
                <strong>More info</strong> then <strong>Run anyway</strong>.
              </li>
            </ol>
          </div>
        </div>

        {/* MACOS */}
        <div
          style={{
            ...glassStyle,
            padding: "2.5rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "1.5rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>🍎</span>
            <h3 style={{ margin: 0, fontSize: "1.4rem" }}>macOS</h3>
          </div>
          <a
            href="https://github.com/AR2706/NexusCLoud_Project_Setu.v7/releases/download/v1.0.0/gui-macos.zip"
            className="btn btn-primary"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              padding: "0.8rem",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: "600",
              marginBottom: "2rem",
            }}
          >
            <Download size={18} /> Download .zip
          </a>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "12px",
              padding: "1.2rem",
              flex: 1,
            }}
          >
            <h4
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "0 0 1rem 0",
                color: "#0070f3",
                fontSize: "0.95rem",
              }}
            >
              <Terminal size={16} /> Quick Start
            </h4>
            <ol
              style={{
                margin: 0,
                paddingLeft: "1.2rem",
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                lineHeight: "1.6",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <li>Download and extract the .zip file.</li>
              <li>
                Open Terminal and run:{" "}
                <code
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    padding: "2px 4px",
                    borderRadius: "4px",
                  }}
                >
                  chmod +x ~/Downloads/gui-macos
                </code>
              </li>
              <li>
                Right-click the file and select <strong>Open</strong> to bypass
                Gatekeeper.
              </li>
            </ol>
          </div>
        </div>

        {/* LINUX */}
        <div
          style={{
            ...glassStyle,
            padding: "2.5rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "1.5rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>🐧</span>
            <h3 style={{ margin: 0, fontSize: "1.4rem" }}>
              Linux{" "}
              <span
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-muted)",
                  fontWeight: "normal",
                }}
              >
                (Ubuntu/Debian)
              </span>
            </h3>
          </div>
          <a
            href="https://github.com/AR2706/NexusCLoud_Project_Setu.v7/releases/download/v1.0.0/gui-linux"
            className="btn btn-primary"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              padding: "0.8rem",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: "600",
              marginBottom: "2rem",
            }}
          >
            <Download size={18} /> Download AppImage
          </a>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "12px",
              padding: "1.2rem",
              flex: 1,
            }}
          >
            <h4
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "0 0 1rem 0",
                color: "#0070f3",
                fontSize: "0.95rem",
              }}
            >
              <Terminal size={16} /> Quick Start
            </h4>
            <ol
              style={{
                margin: 0,
                paddingLeft: "1.2rem",
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                lineHeight: "1.6",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <li>Download the executable.</li>
              <li>
                Right-click the file ➔ <strong>Properties</strong> ➔{" "}
                <strong>Permissions</strong>.
              </li>
              <li>
                Check <strong>"Allow executing file as program"</strong>.
              </li>
              <li>
                Double-click to launch, or run{" "}
                <code
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    padding: "2px 4px",
                    borderRadius: "4px",
                  }}
                >
                  ./gui-linux
                </code>{" "}
                in the terminal.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const endpoint = isRegistering
      ? "/api/v1/auth/register"
      : "/api/v1/auth/provider";

    try {
      const response = await fetch(
        `https://nexuscloud-project-setu-v7.onrender.com${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      const data = await response.json();

      if (data.success) {
        onLogin(data.token);
        navigate("/dashboard");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Unable to connect to the Control Plane.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="page-container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "70vh",
      }}
    >
      <div
        style={{
          ...glassStyle,
          width: "100%",
          maxWidth: "400px",
          padding: "3rem",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Lock size={32} color="#0070f3" style={{ marginBottom: "1rem" }} />
          <h2 style={{ margin: 0, fontWeight: "700" }}>
            {isRegistering ? "Create Account" : "Access Console"}
          </h2>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              marginTop: "0.5rem",
            }}
          >
            {isRegistering
              ? "Join the Global Compute Mesh"
              : "Authenticate with the Control Plane"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}
        >
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              ...inputGlassStyle,
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              ...inputGlassStyle,
              width: "100%",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <div
              style={{
                color: "#ef4444",
                fontSize: "0.85rem",
                textAlign: "center",
                background: "rgba(239, 68, 68, 0.1)",
                padding: "0.5rem",
                borderRadius: "6px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{
              padding: "1rem",
              borderRadius: "10px",
              fontWeight: "700",
              marginTop: "0.5rem",
              fontSize: "1rem",
            }}
          >
            {isLoading
              ? "Processing..."
              : isRegistering
                ? "Register Node"
                : "Secure Login"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.9rem",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>
            {isRegistering
              ? "Already have an account? "
              : "Need an edge node? "}
          </span>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#0070f3",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {isRegistering ? "Log In here" : "Sign Up here"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div
      className="page-container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
      }}
    >
      <div
        className="card"
        style={{
          ...glassStyle,
          width: "100%",
          maxWidth: "750px",
          padding: "3rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #0070f3, #00dfd8)",
              padding: "12px",
              borderRadius: "12px",
            }}
          >
            <User size={28} color="white" />
          </div>
          <div>
            <h2
              style={{ margin: 0, fontWeight: "800", letterSpacing: "-0.5px" }}
            >
              Core Architect
            </h2>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.95rem",
              }}
            >
              Platform Design & Engineering
            </p>
          </div>
        </div>

        <div
          style={{
            marginBottom: "2rem",
            paddingBottom: "1.5rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              color: "#fff",
              fontSize: "1.4rem",
            }}
          >
            Aritra Pradhan
          </h3>
          <span
            style={{
              fontSize: "0.85rem",
              background: "rgba(0, 112, 243, 0.15)",
              color: "#0070f3",
              padding: "4px 10px",
              borderRadius: "20px",
              fontWeight: "bold",
            }}
          >
            CSE Student @ VIT Bhopal University
          </span>
        </div>

        <p
          style={{
            color: "rgba(255, 255, 255, 0.7)",
            lineHeight: "1.7",
            fontSize: "1rem",
            marginBottom: "2rem",
          }}
        >
          Focused on building deterministic, ultra-low latency runtime
          orchestration frames, quant-infrastructure frameworks, and
          containerized application routing layers.
        </p>

        <h4 style={{ color: "#fff", marginBottom: "1rem", fontSize: "1.1rem" }}>
          Active Production Repositories
        </h4>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {[
            {
              name: "Nexus Cloud V7",
              desc: "Decentralized mesh network micro-orchestrator running native Docker runtimes.",
            },
            {
              name: "ReadAI Core",
              desc: "Automated corporate documentation ingestion stack utilizing transformer configurations (BERT & T5).",
            },
            {
              name: "SolarCarbon AI Engine",
              desc: "Full-stack mathematical projection framework parsing environmental datasets and satellite interfaces.",
            },
          ].map((project, index) => (
            <div
              key={index}
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.04)",
                padding: "1rem",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  color: "#fff",
                  fontSize: "0.95rem",
                }}
              >
                {project.name}
              </div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  marginTop: "4px",
                }}
              >
                {project.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArchitecturePage() {
  return (
    <div className="page-container">
      <div style={{ textAlign: "center", marginBottom: "4rem" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "800",
            letterSpacing: "-1px",
          }}
        >
          Topology of the Grid
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Low-latency orchestration across isolated runtime barriers.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={{ ...glassStyle, padding: "2.5rem" }}>
          <div style={{ color: "#0070f3", marginBottom: "1rem" }}>
            <Layers size={32} />
          </div>
          <h3 style={{ marginBottom: "1rem" }}>1. UI Management System</h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              lineHeight: "1.6",
            }}
          >
            A unified React command console providing declarative
            configurations, custom dynamic port specifications, and streaming
            websocket standard-output consumers.
          </p>
        </div>
        <div style={{ ...glassStyle, padding: "2.5rem" }}>
          <div style={{ color: "#10b981", marginBottom: "1rem" }}>
            <Cpu size={32} />
          </div>
          <h3 style={{ marginBottom: "1rem" }}>2. Control Plane Core</h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              lineHeight: "1.6",
            }}
          >
            A high-throughput FastAPI engine implementing asymmetric
            authentication paradigms, connection logging, and deterministic
            geo-routing workload broadcasting.
          </p>
        </div>
        <div style={{ ...glassStyle, padding: "2.5rem" }}>
          <div style={{ color: "#f59e0b", marginBottom: "1rem" }}>
            <Server size={32} />
          </div>
          <h3 style={{ marginBottom: "1rem" }}>3. Edge Provisioner Node</h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              lineHeight: "1.6",
            }}
          >
            Local hypervisors communicating via direct Docker system sockets,
            computing container builds, and spawning independent reverse ingress
            tunnels.
          </p>
        </div>
      </div>
    </div>
  );
}

function UserManualPage() {
  return (
    <div
      className="page-container"
      style={{ display: "flex", justifyContent: "center" }}
    >
      <div
        className="card"
        style={{
          ...glassStyle,
          width: "100%",
          maxWidth: "800px",
          padding: "3rem",
        }}
      >
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "2rem",
          }}
        >
          <BookOpen className="header-icon" /> Operational Execution Manual
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {[
            {
              title: "Initialize local CLI workspace",
              body: "Extract the core node zip to your native machine terminal. Ensure Docker is installed.",
            },
            {
              title: "Register node cluster identity",
              body: "Pass your uniquely generated identity token and physical region to the orchestration agent by executing: node index.js [token] [region]",
            },
            {
              title: "Declare application properties",
              body: "Specify your public repository reference link, internal cluster routing port (e.g. 80, 3000), and optimal geographical plane.",
            },
            {
              title: "Compile and audit workloads",
              body: "Hit deploy to instantly watch atomic streaming logs and open your dynamic live link.",
            },
          ].map((step, idx) => (
            <div key={idx} style={{ display: "flex", gap: "1.5rem" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--primary)",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  flexShrink: 0,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {idx + 1}
              </div>
              <div>
                <h4 style={{ margin: "0 0 0.4rem 0", color: "#fff" }}>
                  {step.title}
                </h4>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    lineHeight: "1.5",
                  }}
                >
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ token }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [repoUrl, setRepoUrl] = useState("");
  const [targetPort, setTargetPort] = useState("80");
  const [selectedRegion, setSelectedRegion] = useState("in-mum");
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState(null);
  const [activeDeployments, setActiveDeployments] = useState([]);
  const [liveLogs, setLiveLogs] = useState([]);

  const terminalEndRef = useRef(null);

  const USER_TOKEN = token;

  const regions = [
    { id: "in-mum", name: "Asia South (Mumbai)", flag: "🇮🇳", latency: "12ms" },
    {
      id: "us-east",
      name: "US East (N. Virginia)",
      flag: "🇺🇸",
      latency: "74ms",
    },
    {
      id: "eu-west",
      name: "Europe West (Frankfurt)",
      flag: "🇪🇺",
      latency: "61ms",
    },
    {
      id: "global",
      name: "Global Edge Anycast",
      flag: "🌐",
      latency: "Optimal",
    },
  ];

  const handleDeploy = async (e) => {
    e.preventDefault();
    setIsDeploying(true);
    setError(null);
    setLiveLogs(["[System] Establishing upstream multiplexer connection...\n"]);
    setCurrentStep(3);

    try {
      const response = await fetch(
        "https://nexuscloud-project-setu-v7.onrender.com/api/v1/deploy",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            github_url: repoUrl,
            target_port: parseInt(targetPort),
            region: selectedRegion,
          }),
        },
      );
      const data = await response.json();

      if (!response.ok || !data.success)
        throw new Error(
          data.error || "Deployment pipeline rejected parameters.",
        );

      if (data.container_id) {
        const wsUrl = `wss://nexuscloud-project-setu-v7.onrender.com/ws/client/${data.container_id}`;
        console.log(`[DEBUG] Attempting WebSocket connection: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);

        const freshDeployment = {
          id: data.container_id,
          url: null,
          repo: repoUrl,
          region: regions.find((r) => r.id === selectedRegion),
          port: targetPort,
          isTerminating: false,
        };

        setActiveDeployments((prev) => [...prev, freshDeployment]);

        ws.onopen = () => {
          setLiveLogs((prev) => [
            ...prev,
            "[System] WebSocket Tunnel Established.\n",
          ]);
        };

        ws.onmessage = (event) => {
          // SAFE PARSING: Handle both JSON and Plain Text
          let logContent = event.data;

          try {
            const parsed = JSON.parse(event.data);
            if (parsed.log) logContent = parsed.log;
          } catch (e) {
            // It's plain text, keep logContent as is
          }

          setLiveLogs((prev) => [...prev, logContent]);

          // URL Extraction
          const linkHarvest = logContent.match(
            /https:\/\/[a-zA-Z0-9-]+\.loca\.lt|https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/,
          );

          if (linkHarvest) {
            const liveUrl = linkHarvest[0];
            setActiveDeployments((prev) =>
              prev.map((dep) =>
                dep.id === data.container_id ? { ...dep, url: liveUrl } : dep,
              ),
            );
          }
        };

        ws.onerror = (err) => {
          console.error("[WS] Error:", err);
          setError("WebSocket connection error.");
        };
      }
    } catch (err) {
      setError(err.message);
      setCurrentStep(2);
      setIsDeploying(false);
    }
    // Note: Do not set setIsDeploying(false) here,
    // let it stay true while the deployment is active.
  };

  const handleTeardown = async (containerId) => {
    setActiveDeployments((prev) =>
      prev.map((dep) =>
        dep.id === containerId ? { ...dep, isTerminating: true } : dep,
      ),
    );

    try {
      await fetch(
        `https://nexuscloud-project-setu-v7.onrender.com/api/v1/deploy/${containerId}`,
        { method: "DELETE" },
      );

      setTimeout(() => {
        setActiveDeployments((prev) =>
          prev.filter((dep) => dep.id !== containerId),
        );
      }, 3000);
    } catch (err) {
      console.error("Teardown transaction fault:", err);
      setActiveDeployments((prev) =>
        prev.map((dep) =>
          dep.id === containerId ? { ...dep, isTerminating: false } : dep,
        ),
      );
    }
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveLogs]);

  return (
    <div
      className="page-container dashboard-layout"
      style={{ maxWidth: "1100px", margin: "0 auto" }}
    >
      <div
        style={{
          ...glassStyle,
          padding: "1.5rem 2rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              padding: "8px",
              borderRadius: "8px",
              color: "#10b981",
            }}
          >
            <Key size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, color: "#fff" }}>
              Local Infrastructure Cluster Status
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--text-muted)",
              }}
            >
              Secure orchestration token active
            </p>
          </div>
        </div>
        <div
          style={{
            background: "#000",
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.06)",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            color: "#10b981",
          }}
        >
          <code>node index.js {USER_TOKEN} in-mum</code>
        </div>
      </div>

      <div style={{ ...glassStyle, padding: "2.5rem", marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "2.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            paddingBottom: "1rem",
          }}
        >
          {[
            {
              step: 1,
              name: "Import Repository",
              icon: <GitBranch size={16} />,
            },
            {
              step: 2,
              name: "Configure Edge Routing",
              icon: <Sliders size={16} />,
            },
            {
              step: 3,
              name: "Production Build Output",
              icon: <Terminal size={16} />,
            },
          ].map((s) => (
            <div
              key={s.step}
              onClick={() =>
                !isDeploying && currentStep > s.step && setCurrentStep(s.step)
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color:
                  currentStep === s.step
                    ? "#0070f3"
                    : currentStep > s.step
                      ? "#10b981"
                      : "var(--text-muted)",
                fontWeight: "600",
                cursor:
                  currentStep > s.step && !isDeploying ? "pointer" : "default",
                fontSize: "0.95rem",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background:
                    currentStep === s.step
                      ? "rgba(0,112,243,0.1)"
                      : currentStep > s.step
                        ? "rgba(16,185,129,0.1)"
                        : "rgba(255,255,255,0.03)",
                  border: "1px solid currentColor",
                  fontSize: "0.8rem",
                }}
              >
                {currentStep > s.step ? <CheckCircle size={14} /> : s.step}
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                {s.icon} {s.name}
              </span>
            </div>
          ))}
        </div>

        {currentStep === 1 && (
          <div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontWeight: "700" }}>
              Import Git Repository
            </h3>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginBottom: "1.5rem",
              }}
            >
              Provide the public deployment reference link configuration.
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div
                style={{
                  ...inputGlassStyle,
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  padding: "0.2rem 1rem",
                }}
              >
                <GitBranch
                  size={18}
                  style={{ color: "var(--text-muted)", marginRight: "10px" }}
                />
                <input
                  type="url"
                  placeholder="https://github.com/dockersamples/linux_tweet_app.git"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#fff",
                    width: "100%",
                    padding: "0.8rem 0",
                    outline: "none",
                  }}
                />
              </div>
              <button
                disabled={!repoUrl}
                onClick={() => setCurrentStep(2)}
                className="btn btn-primary"
                style={{
                  padding: "0 1.5rem",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <form onSubmit={handleDeploy}>
            <h3 style={{ margin: "0 0 0.5rem 0", fontWeight: "700" }}>
              Configure Network Plane
            </h3>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginBottom: "2rem",
              }}
            >
              Declare port constraints and pinpoint geographical routing nodes.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "2rem",
                marginBottom: "2rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    color: "#fff",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  Internal Port
                </label>
                <div
                  style={{
                    ...inputGlassStyle,
                    display: "flex",
                    alignItems: "center",
                    padding: "0.2rem 1rem",
                  }}
                >
                  <Server
                    size={16}
                    style={{ color: "var(--text-muted)", marginRight: "8px" }}
                  />
                  <input
                    type="number"
                    placeholder="80"
                    value={targetPort}
                    onChange={(e) => setTargetPort(e.target.value)}
                    required
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#fff",
                      width: "100%",
                      padding: "0.8rem 0",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "#fff",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  Target Cluster Deployment Region
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "0.75rem",
                  }}
                >
                  {regions.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRegion(r.id)}
                      style={{
                        padding: "0.8rem",
                        borderRadius: "10px",
                        border:
                          selectedRegion === r.id
                            ? "2px solid #0070f3"
                            : "1px solid rgba(255,255,255,0.08)",
                        background:
                          selectedRegion === r.id
                            ? "rgba(0,112,243,0.06)"
                            : "rgba(255,255,255,0.02)",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "500",
                          color:
                            selectedRegion === r.id
                              ? "#fff"
                              : "var(--text-muted)",
                        }}
                      >
                        {r.flag} &nbsp; {r.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color:
                            selectedRegion === r.id
                              ? "#0070f3"
                              : "rgba(255,255,255,0.3)",
                          fontFamily: "monospace",
                        }}
                      >
                        {r.latency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: "1.5rem",
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn btn-secondary"
                style={{ borderRadius: "10px" }}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: "0 2rem", borderRadius: "10px" }}
              >
                Deploy to Edge Network
              </button>
            </div>
          </form>
        )}

        {currentStep === 3 && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isDeploying
                    ? "Compiling Compute Core..."
                    : "Deployment Transaction Completed"}
                </h3>
              </div>
              {!isDeploying && (
                <button
                  onClick={() => {
                    setLiveLogs([]);
                    setCurrentStep(1);
                  }}
                  className="btn btn-primary"
                  style={{ borderRadius: "10px", fontSize: "0.85rem" }}
                >
                  Start New Deployment
                </button>
              )}
            </div>

            <div
              style={{
                background: "#050507",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "#0e0e12",
                  padding: "10px 15px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#888",
                  fontSize: "0.8rem",
                  fontFamily: "monospace",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: isDeploying ? "#f59e0b" : "#10b981",
                  }}
                ></div>
                Runtime Standard-Output Stream
              </div>
              <div
                style={{
                  padding: "1.5rem",
                  height: "320px",
                  overflowY: "auto",
                  fontFamily: "monospace",
                  color: "#a1a1aa",
                  fontSize: "0.85rem",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.6",
                }}
              >
                {liveLogs.join("")}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="alert error"
            style={{
              marginTop: "1.5rem",
              color: "#ef4444",
              fontSize: "0.9rem",
              background: "rgba(239, 68, 68, 0.1)",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            ⚠️ Configuration Fault: {error}
          </div>
        )}
      </div>

      {activeDeployments.length > 0 && (
        <div style={{ ...glassStyle, padding: "2.5rem" }}>
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "1.5rem",
              fontSize: "1.4rem",
              fontWeight: "800",
            }}
          >
            <Activity className="header-icon" color="#0070f3" /> Production
            Deployments
          </h2>

          <div
            style={{
              background: "rgba(245, 158, 11, 0.05)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: "10px",
              padding: "1.2rem",
              marginBottom: "2rem",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle
              color="#f59e0b"
              size={22}
              style={{ flexShrink: 0, marginTop: "2px" }}
            />
            <div>
              <h4
                style={{
                  margin: "0 0 0.4rem 0",
                  color: "#f59e0b",
                  fontSize: "1rem",
                }}
              >
                Node Uptime Requirement
              </h4>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                  lineHeight: "1.5",
                }}
              >
                Your local machine is actively routing live network traffic.{" "}
                <strong>
                  Closing this window or shutting down your computer will sever
                  the Edge tunnel and take your deployments offline
                </strong>{" "}
                unless you have configured a secondary HA (High Availability)
                replica node.
              </p>
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            {activeDeployments.map((dep) => (
              <div
                key={dep.id}
                style={{
                  padding: "1.5rem",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.01)",
                  flexWrap: "wrap",
                  gap: "1.5rem",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: dep.url ? "#10b981" : "#f59e0b",
                      }}
                    ></span>
                    <strong style={{ color: "#fff", fontSize: "1rem" }}>
                      {dep.url
                        ? "Production Active"
                        : "Building Virtual Sandbox..."}
                    </strong>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        background: "rgba(255,255,255,0.06)",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      {dep.region?.flag} {dep.region?.name}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      marginTop: "8px",
                      fontFamily: "monospace",
                    }}
                  >
                    Instance ID: {dep.id}
                  </div>

                  {dep.url ? (
                    <a
                      href={dep.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "12px",
                        color: "#0070f3",
                        textDecoration: "none",
                        fontWeight: "700",
                        padding: "6px 14px",
                        background: "rgba(0, 112, 243, 0.1)",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        border: "1px solid rgba(0, 112, 243, 0.2)",
                        transition: "all 0.2s",
                      }}
                    >
                      Visit Deployment <ExternalLink size={14} />
                    </a>
                  ) : (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "12px",
                        color: "#f59e0b",
                        fontWeight: "600",
                        padding: "6px 14px",
                        background: "rgba(245, 158, 11, 0.05)",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                      }}
                    >
                      Tunnel Allocation Processing...
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleTeardown(dep.id)}
                  disabled={dep.isTerminating}
                  style={{
                    backgroundColor: dep.isTerminating
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                    color: dep.isTerminating ? "#888" : "#ef4444",
                    border: dep.isTerminating
                      ? "1px solid rgba(255, 255, 255, 0.1)"
                      : "1px solid rgba(239, 68, 68, 0.2)",
                    padding: "0.6rem 1.2rem",
                    borderRadius: "8px",
                    cursor: dep.isTerminating ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.85rem",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Trash2 size={15} />{" "}
                  {dep.isTerminating ? "Terminating..." : "Terminate"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MainLayout() {
  const [userToken, setUserToken] = useState(null);
  const location = useLocation();

  const getNavClass = (path) => {
    return `nav-link ${location.pathname === path ? "active-tab" : ""}`;
  };

  return (
    <div
      className="dashboard-container"
      style={{
        background:
          "radial-gradient(circle at 50% -20%, #1e1e2f 0%, #070709 60%)",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      <nav
        className="navbar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 3rem",
          background: "rgba(7, 7, 9, 0.7)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Link
          to="/"
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M50 5L95 85H5L50 5Z" fill="#ffffff" />
          </svg>
          <span
            style={{
              fontWeight: "800",
              letterSpacing: "-0.5px",
              fontSize: "1.2rem",
            }}
          >
            Nexus <span style={{ color: "#0070f3" }}>Edge</span>
          </span>
        </Link>

        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <Link
            to="/download"
            className={getNavClass("/download")}
            style={{
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
          >
            Downloads
          </Link>
          <Link
            to="/architecture"
            className={getNavClass("/architecture")}
            style={{
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
          >
            Topology
          </Link>
          <Link
            to="/docs"
            className={getNavClass("/docs")}
            style={{
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
          >
            Manual
          </Link>
          <Link
            to="/about"
            className={getNavClass("/about")}
            style={{
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
          >
            Creator
          </Link>

          <div
            style={{
              width: "1px",
              height: "18px",
              background: "rgba(255,255,255,0.15)",
            }}
          ></div>

          {userToken ? (
            <>
              <Link
                to="/dashboard"
                className="btn btn-primary"
                style={{
                  padding: "0.5rem 1.2rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                }}
              >
                Console
              </Link>
              <button
                onClick={() => setUserToken(null)}
                className="btn btn-outline"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  padding: "0.5rem 1.2rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="btn btn-outline"
              style={{
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                padding: "0.5rem 1.2rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
              }}
            >
              Log In
            </Link>
          )}
        </div>
      </nav>

      <main style={{ padding: "3rem 2rem" }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/docs" element={<UserManualPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage onLogin={setUserToken} />} />
          <Route
            path="/dashboard"
            element={
              userToken ? (
                <Dashboard token={userToken} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}
