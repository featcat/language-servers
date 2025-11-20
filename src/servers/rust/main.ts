/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { runLanguageServer } from '../../common/language-server-runner.js';

export const runRustServer = () => {
    runLanguageServer({
        serverName: 'RUST',
        pathName: '/rust',
        serverPort: 30006,
        runCommand: 'rust-analyzer',
        runCommandArgs: [],
        wsServerOptions: {
            noServer: true,
            perMessageDeflate: false
        }
    });
};
