# RHEL 8 build environment for zdiag
FROM rockylinux:8 as builder

# Install build dependencies
RUN dnf install -y \
    python3 \
    python3-pip \
    python3-devel \
    gcc \
    gcc-c++ \
    make \
    && dnf clean all

# Upgrade pip
RUN python3 -m pip install --upgrade pip

# Copy requirements first for better layer caching
COPY requirements.txt /app/requirements.txt
WORKDIR /app

# Install Python dependencies
RUN python3 -m pip install -r requirements.txt

# Copy source code
COPY . /app

# Build the application
RUN make build

# Export stage - copy built files
FROM scratch as export
COPY --from=builder /app/dist/zdiag /zdiag_rhel8
COPY --from=builder /app/python/sql /sql/