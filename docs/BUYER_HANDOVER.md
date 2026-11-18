# Commercial Buyer Handover Checklist

When selling or transferring a self-hosted license of **DONUT // AUTO-SELL v3.0**:

1. **Ensure Clean State:** Verify that `.env`, `data/`, `backups/`, and `.minecraft-cache/` are excluded before zipping (already configured in `.gitignore`).
2. **Generate Buyer License Key:** Provide your buyer with a unique identifier (e.g. `DONUT-8842-VAULT-PRO`) to enter on the first-launch Activation Gate in `public/index.html`.
3. **Interactive Onboarding:** Instruct the buyer to run `npm install` followed by `npm run setup` to generate their local `.env` interactively without editing files manually.
4. **First-Run Microsoft Auth:** Remind the buyer to watch the terminal during their first `npm start` to complete the one-time `microsoft.com/link` device code prompt.
