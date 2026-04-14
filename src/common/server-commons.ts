/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { WebSocketServer, ServerOptions } from 'ws';
import { IncomingMessage, Server } from 'http';
import { URL } from 'url';
import { Socket } from 'net';
import { IWebSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { createConnection, createServerProcess, forward } from 'vscode-ws-jsonrpc/server';
import { Message, InitializeRequest, InitializeParams } from 'vscode-languageserver';
import * as cp from 'child_process';

export enum LanguageName {
    /** https://nodejs.org/api/cli.html  */
    node = 'node',
    /** https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html */
    java = 'java'
}

export interface LanguageServerRunConfig {
    serverName: string;
    pathName: string;
    serverPort: number;
    runCommand: LanguageName | string;
    runCommandArgs: string[];
    wsServerOptions: ServerOptions;
    spawnOptions?: cp.SpawnOptions;
    /**
     * Optional message interceptor for client→server messages.
     * If the handler sends a synthetic response and returns `true`,
     * the message is NOT forwarded to the LSP process.
     *
     * @param message  - parsed JSON-RPC message from the client
     * @param reply    - send a raw JSON-RPC string back to the client
     */
    interceptClientMessage?: (message: unknown, reply: (data: string) => void) => boolean;
}

/**
 * start the language server inside the current process
 */
export const launchLanguageServer = (runconfig: LanguageServerRunConfig, socket: IWebSocket) => {
    const { serverName, runCommand, runCommandArgs, spawnOptions } = runconfig;
    // start the language server as an external process
    const reader = new WebSocketMessageReader(socket);
    const writer = new WebSocketMessageWriter(socket);
    const socketConnection = createConnection(reader, writer, () => socket.dispose());
    const serverConnection = createServerProcess(serverName, runCommand, runCommandArgs, spawnOptions);
    if (serverConnection) {
        forward(socketConnection, serverConnection, message => {
            if (Message.isRequest(message)) {
                console.log(`${serverName} Server received:`);
                console.log(message);
                if (message.method === InitializeRequest.type.method) {
                    const initializeParams = message.params as InitializeParams;
                    initializeParams.processId = process.pid;
                }
            }
            if (Message.isResponse(message)) {
                console.log(`${serverName} Server sent:`);
                console.log(message);
            }
            return message;
        });
    }
};

export const upgradeWsServer = (runconfig: LanguageServerRunConfig,
    config: {
        server: Server,
        wss: WebSocketServer
    }) => {
    config.server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
        const baseURL = `http://${request.headers.host}/`;
        const pathName = request.url ? new URL(request.url, baseURL).pathname : undefined;
        if (pathName === runconfig.pathName) {
            config.wss.handleUpgrade(request, socket, head, webSocket => {
                // Helper: send a synthetic JSON-RPC response back to the client
                const reply = (data: string) =>
                    webSocket.send(data, err => {
                        if (err) console.error(`[${runconfig.serverName}] reply error:`, err);
                    });

                const socket: IWebSocket = {
                    send: content => webSocket.send(content, error => {
                        if (error) {
                            throw error;
                        }
                    }),
                    onMessage: cb => webSocket.on('message', (data) => {
                        // Run optional interceptor before forwarding to LSP process
                        if (runconfig.interceptClientMessage) {
                            try {
                                const parsed: unknown = JSON.parse(data.toString());
                                if (runconfig.interceptClientMessage(parsed, reply)) {
                                    return; // Intercepted – skip forwarding to LSP
                                }
                            } catch {
                                // Non-JSON frame, fall through
                            }
                        }
                        cb(data);
                    }),
                    onError: cb => webSocket.on('error', cb),
                    onClose: cb => webSocket.on('close', cb),
                    dispose: () => webSocket.close()
                };
                // launch the server when the web socket is opened
                if (webSocket.readyState === webSocket.OPEN) {
                    launchLanguageServer(runconfig, socket);
                } else {
                    webSocket.on('open', () => {
                        launchLanguageServer(runconfig, socket);
                    });
                }
            });
        }
    });
};
