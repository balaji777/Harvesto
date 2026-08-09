# Harvesto — Pending Work

Running list of what's left. See [GAME_DESIGN.md](GAME_DESIGN.md) for full
design/roadmap context, and `server/README.md` / `client/README.md` for the
per-package detail behind each item.

## Blocked (need real credentials from the user)

- Google Play IAP receipt validation
- Apple App Store IAP receipt validation
- Firebase push (FCM) delivery

## Not built yet — client UI

- Unity WebSocket/chat client (no built-in Socket.IO client in Unity)
- Neighborhoods UI
- Roadside Shop UI
- Town system UI
- Seasonal events UI
- Derby leaderboard UI
- Farm-tile expansion UI (clear-tile buttons)
- Friend search / friend-code (currently a raw pasted user id)
- Friend farm-view rendering (currently just logs a summary, doesn't render their grid)

## Not built yet — backend

- Derby weekly auto-payout (leaderboard is live; nothing mails prizes at week's end)
- Newspaper/classifieds (cross-neighborhood roadside-shop advertising)
- A/B testing framework
- Admin console (anti-cheat flags / economy analytics are self-serve `GET` only)
- Building/decoration grid placement (still just an owned-count, not a placed object)

## Art

- Icons exist only for: wheat, corn, carrot, locked-tile glyph
- Everything else (other crops, animals, buildings, fish, cosmetics, decorations) — flat colored square
- All UI chrome (panels, buttons, tab bar) — flat colored square

## Housekeeping

- Offline action queue (client) — actions taken without connectivity just fail, not queued/replayed
- Google/Apple sign-in — client and server are both guest/email-only
