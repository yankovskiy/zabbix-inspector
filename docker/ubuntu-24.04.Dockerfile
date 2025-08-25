# Ubuntu 24.04 build environment for zdiag
FROM ubuntu:24.04 as builder

# Set non-interactive mode for apt
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Ubuntu 24.04 uses externally managed Python environments
# Create virtual environment for PyInstaller
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip in virtual environment
RUN pip install --upgrade pip

# Copy requirements first for better layer caching
COPY requirements.txt /app/requirements.txt
WORKDIR /app

# Install Python dependencies
RUN pip install -r requirements.txt

# Copy source code
COPY . /app

# Build the application
RUN make build

# Export stage - copy built files
FROM scratch as export
COPY --from=builder /app/dist/zdiag /zdiag_ubuntu24.04
COPY --from=builder /app/python/sql /sql/