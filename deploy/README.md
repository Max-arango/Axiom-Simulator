# Deploy — AXIOM (self-hosted)

Production build is a Next.js **standalone** server on `:3000`, fronted by **Caddy** on `:8081` (see `../Caddyfile`).

```bash
npm run build                      # produces .next/standalone + copies static/public
NODE_ENV=production bun .next/standalone/server.js   # serves :3000
~/.local/bin/caddy run --config Caddyfile --adapter caddyfile   # proxies :8081 -> :3000
```

## Persistent supervision (systemd, real host)

Unit files live in `systemd/`. Install them as **user services**:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/systemd/axiom-*.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now axiom-quantum.service axiom-caddy.service
sudo loginctl enable-linger "$USER"   # keep running after logout / across reboot
```

Both units use `Restart=always`. Paths in the unit files are absolute — edit them if the
repo, bun, or caddy live elsewhere.

## Fallback (no systemd)

`../scripts/serve.sh` is a plain keep-alive loop that respawns the server + Caddy if they
die. Run detached:

```bash
nohup setsid bash scripts/serve.sh >/dev/null 2>&1 &
```
