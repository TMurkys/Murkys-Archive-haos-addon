# Murkys Internet Archive

A dark fantasy personal archive for saved websites and research links.

## Home Assistant add-on

This add-on runs the archive app and keeps saved entries in the Home Assistant persistent `/data` directory.

## Ports
- `8099`: web UI

## Data persistence
The archive writes its `entries.json` file into `/data`.

## Run locally
```bash
npm install
npm run build
PORT=8099 DATA_DIR=/tmp/archive-data node server.js
```
