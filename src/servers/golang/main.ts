/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { runLanguageServer } from '../../common/language-server-runner.js';

export const runGolangServer = () => {
    // GOPATH points to the workspace so that:
    //   - `go get` downloads modules to /workspace/golang/pkg/mod
    //   - gopls reads from the same location
    // A single -v /host/workspace:/workspace mount persists everything.
    const gopath = process.env.GOPLS_WORKSPACE || '/workspace/golang';

    runLanguageServer({
        serverName: 'GOLANG',
        pathName: '/golang',
        serverPort: 30005,
        runCommand: 'gopls',
        runCommandArgs: ['-mode', 'stdio'],
        spawnOptions: {
            env: {
                ...process.env,
                GOPATH:      gopath,
                GOMODCACHE: `${gopath}/pkg/mod`,
            }
        },
        wsServerOptions: {
            noServer: true,
            perMessageDeflate: false
        },
    });
};


