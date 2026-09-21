#!/usr/bin/env bash
# Keep the AXIOM Quantum Lab deploy alive without systemd: respawn the Next
# standalone server (:3000) and Caddy (:8081) whenever they go down (this
# sandbox reaps background processes). On a real host use the systemd user
# units in ~/.config/systemd/user/axiom-*.service instead.
set -u
cd /home/fellcrack/Trabajo/Personal/proyects/Mathematics/Mathematics-landing || exit 1
BUN=/home/fellcrack/.bun/bin/bun
CADDY=/home/fellcrack/.local/bin/caddy

while true; do
  if ! curl -s -o /dev/null --max-time 2 http://localhost:3000/ ; then
    NODE_ENV=production "$BUN" .next/standalone/server.js >> server.log 2>&1 &
  fi
  if ! curl -s -o /dev/null --max-time 2 http://localhost:8081/ ; then
    "$CADDY" run --config Caddyfile --adapter caddyfile >> caddy.log 2>&1 &
  fi
  sleep 10
done
