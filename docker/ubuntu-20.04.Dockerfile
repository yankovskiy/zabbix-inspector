# Ubuntu 20.04 build environment for zdiag
FROM ubuntu:20.04 as builder

# Set non-interactive mode for apt
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN python3 -m pip install --upgrade pip

# Copy requirements first for better layer caching
COPY requirements.txt /app/requirements.txt
WORKDIR /app

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Copy source code
COPY . /app

# Build the application
RUN make build

# Export stage - copy built files
FROM scratch as export
COPY --from=builder /app/dist/zdiag /zdiag_ubuntu20.04
COPY --from=builder /app/python/sql /sql/