/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { runLanguageServer } from '../../common/language-server-runner.js';

/**
 * JSON-RPC request shape (minimal, for type narrowing).
 */
interface JsonRpcRequest {
    jsonrpc: string;
    id?: number | string;
    method: string;
    params?: unknown;
}

interface CodeActionParams {
    context?: {
        only?: string[];
    };
}

function isJsonRpcRequest(msg: unknown): msg is JsonRpcRequest {
    return (
        typeof msg === 'object' &&
        msg !== null &&
        'method' in msg &&
        typeof (msg as Record<string, unknown>).method === 'string'
    );
}

export const runProtobufServer = () => {
    runLanguageServer({
        serverName: 'PROTOBUF',
        pathName: '/protobuf',
        serverPort: 30007,
        runCommand: 'buf',
        runCommandArgs: ['lsp', 'serve'],
        wsServerOptions: {
            noServer: true,
            perMessageDeflate: false,
        },

        /**
         * Workaround for a known panic in buf lsp v1.67.0:
         *
         *   panic: protocompile/token: passed zero token to NewCursorAt
         *
         * Triggered by `getOrganizeImportsCodeAction` whenever the proto file
         * contains an empty import (`import ""`). The panic crashes the buf lsp
         * process. To prevent this we intercept ALL `textDocument/codeAction`
         * requests and return an empty code-action list, so buf lsp is never
         * asked to run organize-imports on a potentially broken AST.
         *
         * Remove this interceptor once the upstream bug is fixed.
         * Tracking: https://github.com/bufbuild/buf/issues (panic in organize_imports.go:242)
         */
        interceptClientMessage: (message, reply) => {
            if (!isJsonRpcRequest(message)) return false;
            if (message.method !== 'textDocument/codeAction') return false;

            const params = message.params as CodeActionParams | undefined;
            const only = params?.context?.only;

            // Intercept if:
            //  1. `only` is absent → all code actions requested (organizeImports included)
            //  2. `only` explicitly requests any `source.*` code action kind
            const shouldIntercept =
                !only ||
                only.length === 0 ||
                only.some(kind => kind === 'source.organizeImports' || kind.startsWith('source.'));

            if (!shouldIntercept) return false;

            // Return an empty code-action list; id may be absent for notifications
            if (message.id !== undefined) {
                reply(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: [] }));
            }
            console.log('[PROTOBUF] Intercepted codeAction (organizeImports guard), returning []');
            return true;
        },
    });
};
