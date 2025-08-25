# Zabbix Diagnostic Tool Build System

PYTHON := python3
PYINSTALLER := pyinstaller
DIST_DIR := dist
BUILD_DIR := build
BINARY_NAME := zdiag
SOURCE_FILE := python/zdiag.py
SQL_DIR := python/sql

.PHONY: all build clean install deps build-docker build-all-docker \
        build-ubuntu20 build-ubuntu24 build-rhel7 build-rhel8

all: build

# Build the binary
build:
	$(PYINSTALLER) --onefile \
		--name $(BINARY_NAME) \
		--distpath $(DIST_DIR) \
		--workpath $(BUILD_DIR) \
		--specpath . \
		$(SOURCE_FILE)
	mkdir -p $(DIST_DIR)/sql
	cp $(SQL_DIR)/*.sql $(DIST_DIR)/sql/

# Docker build targets
build-ubuntu20:
	mkdir -p $(DIST_DIR)
	docker build --target export --output $(DIST_DIR)/ -f docker/ubuntu-20.04.Dockerfile .

build-ubuntu24:
	mkdir -p $(DIST_DIR)
	docker build --target export --output $(DIST_DIR)/ -f docker/ubuntu-24.04.Dockerfile .

build-rhel7:
	mkdir -p $(DIST_DIR)
	docker build --target export --output $(DIST_DIR)/ -f docker/rhel7.Dockerfile .

build-rhel8:
	mkdir -p $(DIST_DIR)
	docker build --target export --output $(DIST_DIR)/ -f docker/rhel8.Dockerfile .

# Build all Docker variants
build-all-docker: build-ubuntu20 build-ubuntu24 build-rhel7 build-rhel8

# Docker build with fallback for older Docker/Podman versions
build-docker-legacy:
	@echo "Building for Ubuntu 20.04..."
	docker build -f docker/ubuntu-20.04.Dockerfile -t zdiag:ubuntu20 .
	docker create --name temp-ubuntu20 zdiag:ubuntu20
	docker cp temp-ubuntu20:/app/dist/zdiag $(DIST_DIR)/zdiag_ubuntu20.04
	docker rm temp-ubuntu20
	
	@echo "Building for Ubuntu 24.04..."
	docker build -f docker/ubuntu-24.04.Dockerfile -t zdiag:ubuntu24 .
	docker create --name temp-ubuntu24 zdiag:ubuntu24
	docker cp temp-ubuntu24:/app/dist/zdiag $(DIST_DIR)/zdiag_ubuntu24.04
	docker rm temp-ubuntu24

# Clean build artifacts
clean:
	rm -rf $(BUILD_DIR) $(DIST_DIR) *.spec
