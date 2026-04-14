/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
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

const ensureWorkspaces = (servers: string[]): void => {
    console.log('--- Workspace Initialization ---');
    for (const lang of servers) {
        const root = WORKSPACE_ROOTS[lang];
        if (!root) continue;

        try {
            if (!existsSync(root)) {
                mkdirSync(root, { recursive: true });
                console.log(`[OK]   ${lang.padEnd(12)} workspace created: ${root}`);
            } else {
                console.log(`[OK]   ${lang.padEnd(12)} workspace exists: ${root}`);
            }

            // Language specific scaffold
            if (lang === 'python') {
                const pyrightConfig = path.join(root, 'pyrightconfig.json');
                if (!existsSync(pyrightConfig)) {
                    writeFileSync(pyrightConfig, JSON.stringify({
                        pythonVersion: "3.11",
                        pythonPlatform: "Linux",
                        extraPaths: [root]
                    }, null, 2));
                }
                const mainPy = path.join(root, 'main.py');
                if (!existsSync(mainPy)) {
                    writeFileSync(mainPy, '');
                }
            } else if (lang === 'golang') {
                mkdirSync(path.join(root, 'src'), { recursive: true });
                mkdirSync(path.join(root, 'pkg', 'mod'), { recursive: true });
                mkdirSync(path.join(root, 'bin'), { recursive: true });
                const goMod = path.join(root, 'go.mod');
                if (!existsSync(goMod)) {
                    writeFileSync(goMod, 'module workspace\n\ngo 1.21\n');
                }
            } else if (lang === 'typescript') {
                mkdirSync(path.join(root, 'node_modules'), { recursive: true });
            } else if (lang === 'rust') {
                mkdirSync(path.join(root, '.cargo', 'registry'), { recursive: true });
                const cargoToml = path.join(root, 'Cargo.toml');
                if (!existsSync(cargoToml)) {
                    writeFileSync(cargoToml, '[package]\nname = "workspace"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n');
                }
            }
        } catch (e: any) {
            console.error(`[ERR]  Failed to initialize workspace for ${lang}:`, e.message);
        }
    }
    console.log('-----------------------------');
};

const startServers = () => {
    const servers = process.env.START_SERVERS
        ? process.env.START_SERVERS.split(',')
        : ['json', 'python', 'golang', 'typescript', 'rust', 'protobuf'];

    console.log(`Starting servers: ${servers.join(', ')}`);
    ensureWorkspaces(servers);

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

