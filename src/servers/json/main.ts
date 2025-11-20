/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { runLanguageServer } from '../../common/language-server-runner.js';
import { resolve } from 'path';
import { LanguageName } from '../../common/server-commons.js';
import { getLocalDirectory } from '../../utils/fs-utils.js';

export const runJsonServer = () => {
    const baseDir = resolve(getLocalDirectory(import.meta.url));
    // Assuming dist structure mirrors src
    const processRunPath = resolve(baseDir, 'json-server.js');
    runLanguageServer({
        serverName: 'JSON',
        pathName: '/json',
        serverPort: 30000,
        runCommand: LanguageName.node,
        runCommandArgs: [
            processRunPath,
            '--stdio'
        ],
        wsServerOptions: {
            noServer: true,
            perMessageDeflate: false
        }
    });
};
