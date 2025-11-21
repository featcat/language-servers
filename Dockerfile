FROM node:20-bullseye

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Install Go
COPY --from=golang:1.21 /usr/local/go /usr/local/go
ENV PATH=$PATH:/usr/local/go/bin:/root/go/bin

# Install gopls
RUN go install golang.org/x/tools/gopls@latest

# Create symbolic link for Go workspace
RUN ln -s /workspace/src /root/go/src

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install rust-analyzer
RUN rustup component add rust-analyzer

WORKDIR /app

COPY package.json tsconfig.json ./

RUN npm install

COPY src ./src

RUN npm run build

EXPOSE 30000 30001 30002 30005 30006

# Set default environment variables
ENV GOPLS_WORKSPACE=/workspace
ENV START_SERVERS=json,python,golang,typescript,rust

CMD ["npm", "start"]
