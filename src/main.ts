/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { runJsonServer } from './servers/json/main.js';
import { runPythonServer } from './servers/python/main.js';
import { runGolangServer } from './servers/golang/main.js';
import { runTypecriptServer } from './servers/typescript/main.js';
import { runRustServer } from './servers/rust/main.js';

const startServers = () => {
    const servers = process.env.START_SERVERS ? process.env.START_SERVERS.split(',') : ['json', 'python', 'golang', 'typescript', 'rust'];

    console.log(`Starting servers: ${servers.join(', ')}`);

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
};

startServers();
