#!/bin/bash

# Script to kill processes running on ports 3000 and 4000

PORTS=(3000 4000)

echo "Killing processes on ports ${PORTS[@]}..."

for PORT in "${PORTS[@]}"; do
  echo ""
  echo "Checking port $PORT..."
  
  # Find all processes using the port (try multiple times to catch all)
  PIDS=$(lsof -ti:$PORT 2>/dev/null)
  
  if [ -z "$PIDS" ]; then
    echo "  ✓ No process found on port $PORT"
  else
    echo "  Found process(es): $PIDS"
    
    # Kill all processes (try multiple times)
    for attempt in {1..3}; do
      CURRENT_PIDS=$(lsof -ti:$PORT 2>/dev/null)
      if [ -z "$CURRENT_PIDS" ]; then
        break
      fi
      
      for pid in $CURRENT_PIDS; do
        echo "  Killing process $pid (attempt $attempt)..."
        kill -9 $pid 2>/dev/null
      done
      
      sleep 0.5
    done
    
    # Final verification
    sleep 1
    REMAINING=$(lsof -ti:$PORT 2>/dev/null)
    if [ -z "$REMAINING" ]; then
      echo "  ✓ Port $PORT is now free"
    else
      echo "  ⚠ Warning: Port $PORT still in use by: $REMAINING"
      echo "  Trying fuser as fallback..."
      fuser -k $PORT/tcp 2>/dev/null
      sleep 1
      FINAL_CHECK=$(lsof -ti:$PORT 2>/dev/null)
      if [ -z "$FINAL_CHECK" ]; then
        echo "  ✓ Port $PORT is now free (after fuser)"
      else
        echo "  ✗ Could not free port $PORT. Remaining PIDs: $FINAL_CHECK"
      fi
    fi
  fi
done

echo ""
echo "Done!"

