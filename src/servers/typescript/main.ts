/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { runLanguageServer } from '../../common/language-server-runner.js';
import { LanguageName } from '../../common/server-commons.js';

export const runTypecriptServer = () => {
    runLanguageServer({
        serverName: 'TYPESCRIPT',
        pathName: '/typescript',
        serverPort: 30002,
        runCommand: LanguageName.node,
        runCommandArgs: [
            './node_modules/typescript-language-server/lib/cli.mjs',
            '--stdio'
        ],
        wsServerOptions: {
            noServer: true,
            perMessageDeflate: false
        }
    });
};
