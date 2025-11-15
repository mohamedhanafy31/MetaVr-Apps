#!/usr/bin/env python3
"""
Unified startup script for Unity Showcase with RAG integration
Runs all required services in parallel
"""

import os
import sys
import subprocess
import time
import signal
import shutil
from pathlib import Path

# Get project root directory
PROJECT_ROOT = Path(__file__).parent.absolute()

# Detect Python command (python3 on Linux/Mac, python on Windows)
# Check if we're in a conda environment and use that Python
if os.environ.get("CONDA_DEFAULT_ENV"):
    # Use the conda environment's Python
    conda_env = os.environ.get("CONDA_DEFAULT_ENV")
    conda_prefix = os.environ.get("CONDA_PREFIX")
    if conda_prefix:
        conda_python = os.path.join(conda_prefix, "bin", "python")
        if os.path.exists(conda_python):
            PYTHON_CMD = conda_python
        else:
            # Fallback to python3
            PYTHON_CMD = "python3" if shutil.which("python3") else "python"
    else:
        PYTHON_CMD = "python3" if shutil.which("python3") else "python"
else:
    PYTHON_CMD = "python3" if shutil.which("python3") else "python"

# Service configurations
SERVICES = [
    {
        "name": "Gateway API",
        "port": 8000,
        "command": [PYTHON_CMD, "gateway_api.py"],
        "cwd": PROJECT_ROOT / "ai-backend",
        "url": "http://localhost:8000"
    },
    {
        "name": "RAG Backend",
        "port": 8001,
        "command": [PYTHON_CMD, "main.py"],
        "cwd": PROJECT_ROOT / "ai-backend" / "E-commerce-Arabic-RAG",
        "url": "http://localhost:8001"
    },
    {
        "name": "TTS API",
        "port": 8002,
        "command": [PYTHON_CMD, "run.py"],
        "cwd": PROJECT_ROOT / "ai-backend" / "TTS_API",
        "url": "http://localhost:8002"
    },
    {
        "name": "Frontend (Vite)",
        "port": 5173,
        "command": ["npm", "run", "dev"],
        "cwd": PROJECT_ROOT / "vite-project",
        "url": "http://localhost:5173"
    }
]

# Store process references
processes = []

def signal_handler(sig, frame):
    """Handle Ctrl+C to gracefully stop all services"""
    print("\n\n🛑 Stopping all services...")
    for proc in processes:
        if proc is not None:
            try:
                proc.terminate()
            except (AttributeError, ProcessLookupError):
                pass
    time.sleep(2)
    for proc in processes:
        if proc is not None:
            try:
                proc.kill()
            except (AttributeError, ProcessLookupError):
                pass
    print("✅ All services stopped.")
    sys.exit(0)

def check_command_exists(command):
    """Check if a command exists in PATH"""
    cmd = command[0] if isinstance(command, list) else command
    return shutil.which(cmd) is not None

def start_service(service):
    """Start a single service"""
    print(f"🚀 Starting {service['name']} on port {service['port']}...")
    
    # Check if command exists
    if not check_command_exists(service['command']):
        cmd_name = service['command'][0]
        print(f"❌ Failed to start {service['name']}: '{cmd_name}' command not found in PATH")
        print(f"   Please ensure {cmd_name} is installed and available in your PATH")
        return None
    
    # Check if working directory exists
    if not service['cwd'].exists():
        print(f"❌ Failed to start {service['name']}: Directory not found: {service['cwd']}")
        return None
    
    try:
        # Start the process
        if sys.platform == "win32":
            # Windows: use CREATE_NEW_CONSOLE to show output in separate window
            proc = subprocess.Popen(
                service['command'],
                cwd=str(service['cwd']),
                creationflags=subprocess.CREATE_NEW_CONSOLE
            )
        else:
            # Linux/Mac: run in background but capture output for error reporting
            # Use unbuffered output and combine stderr with stdout
            proc = subprocess.Popen(
                service['command'],
                cwd=str(service['cwd']),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
        
        processes.append(proc)
        print(f"✅ {service['name']} started (PID: {proc.pid})")
        
        # Give it a moment to start, then check if it crashed immediately
        time.sleep(0.5)
        if proc.poll() is not None:
            # Process died immediately, try to read error output
            error_output = ""
            try:
                if proc.stdout:
                    # Try to read available output (non-blocking)
                    import select
                    if sys.platform != "win32":
                        # On Unix, check if there's data available
                        if select.select([proc.stdout], [], [], 0.1)[0]:
                            error_output = proc.stdout.read(1000)
                    else:
                        # On Windows, just try to read
                        error_output = proc.stdout.read(1000) if proc.stdout else ""
            except (IOError, OSError, ValueError):
                pass
            
            if error_output:
                print(f"❌ {service['name']} crashed immediately. Error output:")
                # Show first 500 chars
                for line in error_output[:500].split('\n')[:5]:
                    if line.strip():
                        print(f"   {line[:200]}")
            else:
                print(f"❌ {service['name']} crashed immediately (no error output captured)")
            print(f"⚠️  {service['name']} exited with code {proc.returncode}")
            return None
        
        return proc
        
    except Exception as e:
        print(f"❌ Failed to start {service['name']}: {e}")
        return None

def main():
    """Main function to start all services"""
    print("=" * 50)
    print("  Unity Showcase - Starting All Services")
    print("=" * 50)
    print()
    
    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    if sys.platform != "win32":
        signal.signal(signal.SIGTERM, signal_handler)
    
    # Start all services
    print("Starting services...\n")
    for service in SERVICES:
        start_service(service)
        time.sleep(1)  # Small delay between starts
    
    print()
    print("=" * 50)
    print("  All services started!")
    print("=" * 50)
    print()
    print("Services running:")
    for service in SERVICES:
        print(f"  • {service['name']:20} {service['url']}")
    print()
    
    if sys.platform == "win32":
        print("Each service is running in its own console window.")
        print("Close the windows or press Ctrl+C here to stop all services.")
    else:
        print("All services are running in the background.")
        print("Press Ctrl+C to stop all services.")
    print()
    
    # Keep the script running
    try:
        while True:
            time.sleep(1)
            # Check if any process has died
            for i, proc in enumerate(processes):
                if proc is None:
                    continue
                if proc.poll() is not None:
                    service_name = SERVICES[i]['name']
                    exit_code = proc.returncode
                    print(f"⚠️  {service_name} has stopped (exit code: {exit_code})")
                    
                    # Try to read error output if available
                    if proc.stdout and not sys.platform == "win32":
                        try:
                            # Read any remaining output
                            remaining = proc.stdout.read()
                            if remaining:
                                print(f"   Error output from {service_name}:")
                                # Show last 500 chars (most recent errors)
                                error_lines = remaining.strip().split('\n')
                                for line in error_lines[-10:]:  # Last 10 lines
                                    if line.strip():
                                        print(f"   {line[:200]}")
                        except (IOError, OSError, ValueError):
                            pass
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()



