# Monaco Language Servers

This project `monaco-language-servers` provides standalone language servers for Monaco Editor, containerized with Docker.

## Features
- **JSON Server**: Port 30000
- **Python Server** (Pyright): Port 30001
- **TypeScript Server** (typescript-language-server): Port 30002
- **Golang Server** (Gopls): Port 30005
- **Rust Server** (rust-analyzer): Port 30006
- **Selective Startup**: Control which servers start via `START_SERVERS` env var.

## Usage

### Build Docker Image
```bash
# Standard build
docker build -t monaco-language-servers .

# Build for Linux AMD64
docker build --platform linux/amd64 -t monaco-language-servers .
```

### Run All Servers
```bash
docker run -p 30000:30000 -p 30001:30001 -p 30002:30002 -p 30005:30005 -p 30006:30006 monaco-language-servers
```

### Run Specific Servers
To run only Python and JSON servers:
```bash
docker run -e START_SERVERS="python,json" -p 30000:30000 -p 30001:30001 monaco-language-servers
```

### Configuration
- `GOPLS_WORKSPACE`: Set the workspace path for Gopls (default: `/workspace`).
  - Mount your code: `-v /path/to/code:/workspace`

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

