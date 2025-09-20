# GalaSwap Trading Helper (Local Signer)

Black background + pink text ✅. Monitors prices from GalaSwap, suggests opportunities, and can prepare/sign/submit fills using a **local signer** you run locally (no private keys in the page).

## Features
- Live prices (GALA, GUSDC, ETIME, GMUSIC) with sparklines
- Suggestions via 15-minute moving average + momentum
- Safety controls: slippage %, max per trade, daily cap
- Dry-Run review (no network submit)
- Live (preview): prepares JSON with required `uniqueKey` (`galaswap-operation-…`)
- Local signing at `http://127.0.0.1:17777`
- Quick Fill (auto-retry) handles `SWAP_ALREADY_USED`

## How to run
### UI
Open `galaswap-bot.html` in Chrome.  
(If it opens in TextEdit, rename to end with `.html`.)

### Local signer (required for live submit)
- Install Node v18+.
- In Terminal (repo folder):
```bash
npm install   # only if sign-server.js uses deps
GALA_PK_HEX='0xYOUR_64_HEX_PRIVATE_KEY' node sign-server.js
# galaswap-bot
GalaSwap trading helper (local signer)
