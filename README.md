# Monaco Language Servers

This project `language-servers` provides standalone language servers for Monaco Editor, containerized with Docker.

## Features
- **JSON Server**: Port 30000
- **Python Server** (Pyright): Port 30001
- **TypeScript Server** (typescript-language-server): Port 30002
- **Golang Server** (Gopls): Port 30005
- **Rust Server** (rust-analyzer): Port 30006
- **Selective Startup**: Control which servers start via `START_SERVERS` env var
- **Multi-platform Support**: linux/amd64, linux/arm64
- **Auto-build on Tag Push**: GitHub Actions automatically builds and publishes to Docker Hub

## Quick Start

### Pull from Docker Hub
```bash
docker pull your-dockerhub-username/language-servers:latest
```

### Run All Servers
```bash
docker run -d \
  -p 30000:30000 -p 30001:30001 -p 30002:30002 -p 30005:30005 -p 30006:30006 \
  your-dockerhub-username/language-servers:latest
```

### Using Docker Compose (Recommended)
```bash
# Edit docker-compose.yml with your settings
docker-compose up -d
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GOPLS_WORKSPACE` | `/workspace` | Golang language server workspace path |
| `START_SERVERS` | `json,python,golang,typescript,rust` | Comma-separated list of servers to start |

### Run Specific Servers
To run only Python and JSON servers:
```bash
docker run -d \
  -e START_SERVERS="python,json" \
  -p 30000:30000 -p 30001:30001 \
  your-dockerhub-username/language-servers:latest
```

### Mount Workspace for Golang
```bash
docker run -d \
  -p 30005:30005 \
  -e GOPLS_WORKSPACE=/workspace \
  -e START_SERVERS=golang \
  -v /path/to/your/go/project:/workspace \
  your-dockerhub-username/language-servers:latest
```

### Using .env File
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your settings
vim .env

# docker-compose will automatically use .env
docker-compose up -d
```

## Building from Source

### Local Build
```bash
# Standard build
docker build -t language-servers .

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t language-servers .
```

### Automated Builds (GitHub Actions)

The project uses GitHub Actions to automatically build and push multi-platform Docker images to Docker Hub when you push a git tag.

#### Setup

1. **Configure GitHub Secrets**
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add these secrets:
     - `DOCKERHUB_USERNAME`: Your Docker Hub username
     - `DOCKERHUB_TOKEN`: Docker Hub Access Token ([Get it here](https://hub.docker.com/settings/security))

2. **Create and Push a Tag**
   ```bash
   # Create a tag
   git tag 1.0.0

   # Or create an annotated tag
   git tag -a 1.0.0 -m "Release version 1.0.0"

   # Push the tag
   git push origin 1.0.0
   ```

3. **Automatic Build**
   - GitHub Actions will automatically build for `linux/amd64` and `linux/arm64`
   - Images will be pushed with tags: `1.0.0` and `latest`
   - View progress in the **Actions** tab on GitHub

## Development
1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Start: `npm start`

## Extending with New Language Servers

To add a new language server:

1.  **Create Server Logic**:
    Create a new directory in `src/servers/<language>` and add a `main.ts`.
    Use `runLanguageServer` from `../../common/language-server-runner.js` to configure your server.

    ```typescript
    import { runLanguageServer } from '../../common/language-server-runner.js';

    export const runMyLangServer = () => {
        runLanguageServer({
            serverName: 'MYLANG',
            pathName: '/mylang', // WebSocket path
            serverPort: 30006,   // Port
            runCommand: 'mylang-server', // Command to start the LS
            runCommandArgs: ['--stdio'],
            wsServerOptions: {
                noServer: true,
                perMessageDeflate: false
            }
        });
    };
    ```

2.  **Register in Main**:
    Import and call your `runMyLangServer` function in `src/main.ts`. Add it to the `startServers` logic.

3.  **Update Dockerfile**:
    Ensure the language runtime and the language server binary are installed in the `Dockerfile`.

    ```dockerfile
    # Example: Install MyLang
    RUN apt-get install -y mylang
    ```

4.  **Expose Port**:
    Add the new port (e.g., `30006`) to the `EXPOSE` instruction in `Dockerfile` and your `docker run` command.

