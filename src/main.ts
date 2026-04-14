/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { existsSync } from 'fs';
import { runJsonServer } from './servers/json/main.js';
import { runPythonServer } from './servers/python/main.js';
import { runGolangServer } from './servers/golang/main.js';
import { runTypecriptServer } from './servers/typescript/main.js';
import { runRustServer } from './servers/rust/main.js';
import { runProtobufServer } from './servers/protobuf/main.js';

/**
 * Workspace convention: /workspace/{language}/
 *
 * Each language LSP expects its dependencies to be placed in the corresponding
 * subdirectory. Clients connecting to the LSP must pass the matching rootUri:
 *   Python     → file:///workspace/python    (file URI: .../python/main.py)
 *   Golang     → file:///workspace/golang    (file URI: .../golang/main.go)
 *   TypeScript → file:///workspace/typescript
 *   Protobuf   → file:///workspace/protobuf  (file URI: .../protobuf/main.proto)
 *   Rust       → file:///workspace/rust
 */
const WORKSPACE_ROOTS: Record<string, string> = {
    python:     process.env.PYTHON_WORKSPACE || '/workspace/python',
    golang:     process.env.GOPLS_WORKSPACE  || '/workspace/golang',
    typescript: process.env.TS_WORKSPACE     || '/workspace/typescript',
    protobuf:   process.env.PROTO_WORKSPACE  || '/workspace/protobuf',
    rust:       process.env.RUST_WORKSPACE   || '/workspace/rust',
};

const checkWorkspaces = (servers: string[]): void => {
    console.log('--- Workspace health check ---');
    for (const lang of servers) {
        const root = WORKSPACE_ROOTS[lang];
        if (!root) continue;
        if (!existsSync(root)) {
            console.warn(
                `[WARN] ${lang.padEnd(12)} workspace NOT FOUND: ${root}\n` +
                `         → Mount the directory or place files before connecting clients.`
            );
        } else {
            console.log(`[OK]   ${lang.padEnd(12)} workspace: ${root}`);
        }
    }
    console.log('-----------------------------');
};

const startServers = () => {
    const servers = process.env.START_SERVERS
        ? process.env.START_SERVERS.split(',')
        : ['json', 'python', 'golang', 'typescript', 'rust', 'protobuf'];

    console.log(`Starting servers: ${servers.join(', ')}`);
    checkWorkspaces(servers);

    if (servers.includes('json')) {
        runJsonServer();
    }
    if (servers.includes('python')) {
        runPythonServer();
    }
    if (servers.includes('golang')) {
        runGolangServer();
    }
    if (servers.includes('typescript')) {
        runTypecriptServer();
    }
    if (servers.includes('rust')) {
        runRustServer();
    }
    if (servers.includes('protobuf')) {
        runProtobufServer();
    }
};

startServers();

