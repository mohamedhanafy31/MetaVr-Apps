#!/bin/bash

# GCP Deployment Configuration
# This file contains the default configuration for MetaVR deployment

# GCP Project ID
export GCP_PROJECT_ID="meta-478212"

# Zone nearest to Egypt (europe-west1-b is in Belgium, closest to Egypt)
# Alternative zones: europe-west3-b (Frankfurt), europe-west4-b (Netherlands)
export GCP_ZONE="europe-west1-b"

# VM Instance Configuration
export VM_INSTANCE_NAME="metavr-vps"
export VM_MACHINE_TYPE="e2-standard-4"  # 4 vCPUs, 16GB RAM
export VM_DISK_SIZE="50GB"
export VM_IMAGE_FAMILY="ubuntu-2204-lts"
export VM_IMAGE_PROJECT="ubuntu-os-cloud"
export VM_BOOT_DISK_TYPE="pd-ssd"

# Remote Configuration
export REMOTE_USER="${REMOTE_USER:-$USER}"
export REMOTE_PATH="/home/$REMOTE_USER/MetaVR/managment_test"

