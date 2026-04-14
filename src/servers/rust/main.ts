/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { runLanguageServer } from '../../common/language-server-runner.js';

export const runRustServer = () => {
    const rustWorkspace = process.env.RUST_WORKSPACE || '/workspace/rust';
    // CARGO_HOME points to the workspace so that:
    //   - `cargo add/build` downloads crates to /workspace/rust/.cargo/registry
    //   - rust-analyzer reads from the same location
    // A single -v /host/workspace:/workspace mount persists everything.
    const cargoHome = `${rustWorkspace}/.cargo`;

    runLanguageServer({
        serverName: 'RUST',
        pathName: '/rust',
        serverPort: 30006,
        runCommand: 'rust-analyzer',
        runCommandArgs: [],
        spawnOptions: {
            env: {
                ...process.env,
                CARGO_HOME:    cargoHome,
                RUST_SRC_PATH: rustWorkspace,
            }
        },
        wsServerOptions: {
            noServer: true,
            perMessageDeflate: false
        }
    });
};


