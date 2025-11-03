#!/bin/bash

while true; do
  # Total RAM in bytes
  total_bytes=$(sysctl -n hw.memsize)

  # Free + inactive + speculative pages in bytes
  free_bytes=$(vm_stat | awk '
    /Pages free/ {free=$3}
    /Pages inactive/ {inactive=$3}
    /Pages speculative/ {spec=$3}
    END {print (free+inactive+spec)*4096}
  ')

  # Used RAM
  used_bytes=$((total_bytes - free_bytes))
  ram_percent=$(echo "scale=1; $used_bytes*100/$total_bytes" | bc)

  # Swap usage
  swap_info=$(sysctl vm.swapusage | awk '{print $3, $7}')
  swap_used=$(echo $swap_info | awk '{gsub(/M/,"",$1); print $1}')
  swap_total=$(echo $swap_info | awk '{gsub(/M/,"",$2); print $2}')
  if [[ "$swap_total" == 0 ]]; then
    swap_percent=0
  else
    swap_percent=$(echo "scale=1; $swap_used*100/$swap_total" | bc)
  fi

  # Display
  printf "\rRAM used: %5.1f%% | Swap used: %5.1f%%" "$ram_percent" "$swap_percent"

  sleep 1
done
