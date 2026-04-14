FROM node:20-bullseye

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Install Go
COPY --from=golang:1.21 /usr/local/go /usr/local/go
ENV PATH=$PATH:/usr/local/go/bin:/root/go/bin

# Install gopls (uses default GOPATH=/root/go during build)
RUN go install golang.org/x/tools/gopls@latest

# Install buf (for Protobuf Language Server)
RUN npm install -g @bufbuild/buf

# Install Rust (uses default CARGO_HOME=~/.cargo during build)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install rust-analyzer
RUN rustup component add rust-analyzer

# ── Workspace layout ────────────────────────────────────────────────────────
# Convention: each language server owns /workspace/{language}/
# Single volume mount covers everything:
#   docker run -v /host/workspace:/workspace lsp-server
# Migration: just copy the entire /host/workspace directory.
# ────────────────────────────────────────────────────────────────────────────
RUN mkdir -p /workspace/python \
             /workspace/golang/src \
             /workspace/golang/pkg/mod \
             /workspace/golang/bin \
             /workspace/typescript/node_modules \
             /workspace/protobuf \
             /workspace/rust \
             /workspace/rust/.cargo/registry

# Python: pyrightconfig.json lets Pyright discover packages placed in /workspace/python
RUN printf '{\n  "pythonVersion": "3.11",\n  "pythonPlatform": "Linux",\n  "extraPaths": ["/workspace/python"]\n}\n' \
    > /workspace/python/pyrightconfig.json

# Python: a minimal main.py so Pyright recognises the workspace root
RUN touch /workspace/python/main.py

# Go: initialise a base go.mod so `go get` works inside the container
RUN cd /workspace/golang && go mod init workspace

# Rust: initialise a base Cargo.toml so `cargo add` works inside the container
RUN cd /workspace/rust && cargo init --name workspace --vcs none

WORKDIR /app

COPY package.json tsconfig.json ./

RUN npm install

COPY src ./src

RUN npm run build

EXPOSE 30000 30001 30002 30005 30006 30007

# ── Runtime environment ──────────────────────────────────────────────────────
# Redirect Go module cache and Cargo registry into the workspace volume.
# All package data lives under /workspace — single -v mount, easy migration.
# ────────────────────────────────────────────────────────────────────────────

# Go: GOPATH points to workspace; gopls binary stays at /root/go/bin (build-time)
ENV GOPATH=/workspace/golang
ENV PATH=$PATH:/workspace/golang/bin

# Rust: CARGO_HOME points to workspace so `cargo add/build` caches there
ENV CARGO_HOME=/workspace/rust/.cargo

# Language workspace paths (override with docker run -e if needed)
ENV PYTHON_WORKSPACE=/workspace/python
ENV GOPLS_WORKSPACE=/workspace/golang
ENV TS_WORKSPACE=/workspace/typescript
ENV PROTO_WORKSPACE=/workspace/protobuf
ENV RUST_WORKSPACE=/workspace/rust

ENV START_SERVERS=json,python,golang,typescript,rust,protobuf

CMD ["npm", "start"]

