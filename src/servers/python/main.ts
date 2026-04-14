/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { resolve } from 'path';
import { runLanguageServer } from '../../common/language-server-runner.js';
import { LanguageName } from '../../common/server-commons.js';
import { getLocalDirectory } from '../../utils/fs-utils.js';


export const runPythonServer = () => {
    const baseDir = resolve(getLocalDirectory(import.meta.url));
    // dist/servers/python/main.js -> ../../../node_modules...
    const processRunPath = resolve(baseDir, '../../../node_modules/pyright/dist/pyright-langserver.js');
    const pythonWorkspace = process.env.PYTHON_WORKSPACE || '/workspace/python';

    runLanguageServer({
        serverName: 'PYTHON',
        pathName: '/python',
        serverPort: 30001,
        runCommand: LanguageName.node,
        runCommandArgs: [
            processRunPath,
            '--stdio'
        ],
        spawnOptions: {
            env: {
                ...process.env,
                // Pyright discovers third-party packages via PYTHONPATH.
                // Place .pyi stubs or package source in /workspace/python/
                // and Pyright will pick them up automatically.
                PYTHONPATH: pythonWorkspace,
            }
        },
        wsServerOptions: {
            noServer: true,
            perMessageDeflate: false,
            clientTracking: true,
            // verifyClient: (
            //     clientInfo: { origin: string; secure: boolean; req: IncomingMessage },
            //     callback
            // ) => {
            //     try {
            //         const parsedURL = new URL(clientInfo.req?.url || '', 'http://localhost');
            //         const authToken = parsedURL.searchParams.get('authorization');
            //         if (authToken === 'UserAuth') {
            //             callback(true);
            //         } else {
            //             callback(false);
            //         }
            //     } catch (e) {
            //         console.error('[PYTHON Server] verifyClient error:', e);
            //         callback(false);
            //     }
            // }
        }
    });
};

