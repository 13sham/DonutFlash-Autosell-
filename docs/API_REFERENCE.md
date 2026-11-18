# Control Plane Local REST API Reference

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/status` | Returns engine state, Mineflayer bot telemetry, SQLite revenue metrics, and recent logs. |
| `GET` | `/orders` | Lists the latest 100 Eldorado.gg orders ingested into SQLite. |
| `POST` | `/orders/:id/retry` | Re-attempts the in-game `/pay` command and Eldorado delivery confirmation for a failed order. |
| `POST` | `/orders/:id/deliver` | Force-marks an order as Delivered on Eldorado.gg and updates SQLite. |
| `POST` | `/engine/toggle` | Toggles automatic order polling (`{ "running": true \| false }`). |
| `POST` | `/bot/command` | Sends a raw chat/command string through the active Mineflayer worker (`{ "command": "/bal" }`). |
| `GET` | `/skus` | Lists all configured Eldorado Offer ID to DonutSMP payout multiplier mappings. |
| `POST` | `/skus` | Creates or updates an Offer ID SKU rule (`offer_id`, `label`, `unit_multiplier`, `cmd_template`, `auto_pause_below`). |
| `DELETE` | `/skus/:offerId` | Deletes an Offer ID SKU rule. |
| `POST` | `/pricing/push` | Updates unit pricing live on Eldorado.gg (`{ "offerId": "...", "pricePerUnit": 0.0138 }`). |
| `POST` | `/config` | Hot-reloads Eldorado API keys, Minecraft username, and Discord webhook URL into the active runtime. |
