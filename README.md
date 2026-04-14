# Monaco Language Servers

This project `language-servers` provides standalone language servers for Monaco Editor, containerized with Docker.

## Features
- **JSON Server**: Port 30000
- **Python Server** (Pyright): Port 30001
- **TypeScript Server** (typescript-language-server): Port 30002
- **Golang Server** (Gopls): Port 30005
- **Rust Server** (rust-analyzer): Port 30006
- **Protobuf Server** (buf lsp): Port 30007
- **Per-Language Workspace Isolation**: Each language has a dedicated workspace directory (`/workspace/{language}`) to prevent conflicts.
- **Built-in Package Management Support**: Caches for tools like `go get` and `cargo add` are automatically targeted into the workspace volume for seamless persistence.
- **Selective Startup**: Control which servers start via `START_SERVERS` env var.
- **Multi-platform Support**: linux/amd64, linux/arm64.
- **Auto-build on Tag Push**: GitHub Actions automatically builds and publishes to Docker Hub.

## Quick Start

### Pull from Docker Hub
```bash
docker pull your-dockerhub-username/language-servers:latest
```

### Run Servers (with Workspace Persistence)
We strongly recommend mounting a host directory to `/workspace` so that third-party packages, caches, and files persist across restarts.

```bash
docker run -d \
  -p 30000:30000 -p 30001:30001 -p 30002:30002 -p 30005:30005 -p 30006:30006 -p 30007:30007 \
  -v /path/to/your/host/workspace:/workspace \
  your-dockerhub-username/language-servers:latest
```

### Using Docker Compose (Recommended)
```bash
# Edit docker-compose.yml with your settings
docker-compose up -d
```

---

## Workspace Layout & Dependency Management

To prevent file conflicts and ensure smooth package management, each language gets its own pre-scaffolded subdirectory inside `/workspace`. This layout enforces single-volume mount migrations (moving the server is just copying the host folder).

```text
/workspace/
├── python/       ← Python third-party packages (e.g. from pip install)
│   ├── main.py   ← (Pre-created empty file to anchor the Pyright root)
│   └── pyrightconfig.json
├── golang/       ← Go module workspace
│   ├── go.mod    ← (Pre-created base go.mod)
│   ├── src/      
│   └── pkg/mod/  ← Cache for `go get` (GOMODCACHE)
├── typescript/   
│   └── node_modules/ ← `npm install` packages
├── protobuf/     ← `.proto` dependencies
└── rust/         
    ├── Cargo.toml ← (Pre-created base Cargo.toml)
    └── .cargo/    ← Cache for `cargo add` / `cargo build` (CARGO_HOME)
```

### Installing Dependencies for Code Completion
Because language package managers are routed into the workspace volume, you can install third-party dependencies from the hosting environment or inside the running container. The Language Servers will automatically detect them to offer proper typing, definitions, and completions.

- **Python**: `docker exec -it <container_name> pip install requests` (Pyright is mapped to seamlessly pick this up).
- **Golang**: `docker exec -it -w /workspace/golang <container_name> go get github.com/gin-gonic/gin`
- **TypeScript**: `docker exec -it -w /workspace/typescript <container_name> npm install lodash`
- **Rust**: `docker exec -it -w /workspace/rust <container_name> cargo add serde`
- **Protobuf**: Place `.proto` files (e.g., `google/protobuf/timestamp.proto`) directly into `/path/to/your/host/workspace/protobuf/`.

---

## Frontend Client Integration Guide

When connecting a Monaco Editor component (or any frontend UI) to these backend language servers via JSON-RPC/WebSockets, **you must adhere to the container's workspace path conventions.**

The `rootUri` (or `workspaceFolders`) sent during the LSP `initialize` request and the `uri` of the actual text document being opened MUST point to that language's matching root:

| Language | Port | Expected `rootUri` | Expected Document `uri` |
|----------|------|--------------------|-------------------------|
| Python | 30001 | `file:///workspace/python` | `file:///workspace/python/main.py` |
| Golang | 30005 | `file:///workspace/golang` | `file:///workspace/golang/main.go` |
| TypeScript | 30002 | `file:///workspace/typescript` | `file:///workspace/typescript/main.ts` |
| Protobuf | 30007 | `file:///workspace/protobuf` | `file:///workspace/protobuf/main.proto` |
| Rust | 30006 | `file:///workspace/rust` | `file:///workspace/rust/main.rs` |

### Protobuf Specifics & System Robustness
The `buf lsp` handles Protobuf functionality. Due to a known edge-case upstream in `buf` (where `import ""` triggers a process panic), our proxy layer (`main.ts`) dynamically intercepts and gracefully suppresses problematic `textDocument/codeAction` requests.

**Frontend Implementation Tip**: Regardless of backend proxy protections, your Monaco WebSocket client should implement an auto-reconnect strategy:
```javascript
// Example Frontend Reconnect Schema
socket.onclose = () => {
    setTimeout(() => reconnectLanguageClient(), 1000);
};
```
This ensures high frontend availability even if a backend LSP process undergoes an unexpected crash.

## Nginx Reverse Proxy Configuration

When deploying in a production environment, you will likely need to expose these language servers securely over WebSockets (`wss://`). Below is a dynamic regular expression configuration for Nginx that maps a single URL structure (e.g. `wss://domain.com/lsp/json`) directly to the underlying ports.

```nginx
# Place this map block in the top-level `http { ... }` context
map $lsp_lang $lsp_port {
    "json"       30000;
    "python"     30001;
    "typescript" 30002;
    "golang"     30005;
    "rust"       30006;
    "protobuf"   30007;
}

server {
    listen 443 ssl;
    server_name domain.com;
    
    # ... ssl certificates ...

    # Match routes like /lsp/python and capture the language name into $lsp_lang
    location ~ ^/lsp/(?<lsp_lang>json|python|typescript|golang|rust|protobuf)$ {
        proxy_pass http://127.0.0.1:$lsp_port/$lsp_lang;

        # Protocol Upgrade bindings for WebSockets
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        
        # Real IP Forwarding
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # IMPORTANT: Increase timeout settings so Nginx doesn't abruptly drop idle WebSocket connections
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

---

## Configuration

| Variable | Default Workspace | Description |
|----------|-------------------|-------------|
| `START_SERVERS` | `json,python,golang,typescript,rust,protobuf` | Servers to start |
| `PYTHON_WORKSPACE` | `/workspace/python` | Python workspace mapping & PYTHONPATH |
| `GOPLS_WORKSPACE` | `/workspace/golang` | Golang workspace and module cache |
| `TS_WORKSPACE` | `/workspace/typescript` | Typescript workspace mapping |
| `PROTO_WORKSPACE` | `/workspace/protobuf` | Protobuf workspace mapping |
| `RUST_WORKSPACE` | `/workspace/rust` | Rust workspace mapping |

*You generally do not need to alter the workspace variables unless deploying custom Dockerfile layouts.*

## Building from Source

### Local Build
```bash
# Standard build
docker build -t language-servers .

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t language-servers .
```

### Automated Builds (GitHub Actions)
The project is configured for GitHub Actions.
1. Add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` action secrets to GitHub.
2. Tag and push (`git tag 1.0.0 && git push origin 1.0.0`) to trigger multi-architecture builds.

## Extending with New Language Servers

1.  **Create Server Logic**:
    Make `src/servers/<language>/main.ts`.
    ```typescript
    import { runLanguageServer } from '../../common/language-server-runner.js';

    export const runMyLangServer = () => {
        runLanguageServer({
            serverName: 'MYLANG',
            pathName: '/mylang',
            serverPort: 30008,
            runCommand: 'mylang-server',
            runCommandArgs: ['--stdio'],
            wsServerOptions: { noServer: true, perMessageDeflate: false }
        });
    };
    ```

2.  **Register It**: Import your function into `src/main.ts`. Add it to `startServers()` and the `WORKSPACE_ROOTS` registry.
3.  **Update Dockerfile**: Add OS install steps, `mkdir -p /workspace/<language>`, its Env mappings, and exposed ports.

## Kubernetes Deployment
Deploy using `kubectl apply -f deployment/k8s`. Note that volume persistence (e.g. mounting a proper `PersistentVolumeClaim` to `/workspace`) is recommended in clustered environments.
