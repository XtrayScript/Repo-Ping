# Xtray Ping Bot

Bot Discord otomatis yang mengirim notifikasi ke channel Discord setiap ada konten baru dari YouTube, TikTok, Twitter/X, Telegram, Pinterest, Anime (AniList), dan MyAnimeList.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — jalankan API server + bot Discord
- `pnpm run typecheck` — full typecheck semua packages
- `pnpm run build` — typecheck + build semua packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerasi API hooks dan Zod schemas
- `pnpm --filter @workspace/db run push` — push perubahan DB schema (dev only)
- Required secrets: `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Discord: discord.js v14, @discordjs/rest v2
- Validation: Zod (`zod/v4`)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/bot/` — semua logika bot Discord
- `artifacts/api-server/src/bot/index.ts` — entry point bot, setup client & pollers
- `artifacts/api-server/src/bot/storage.ts` — penyimpanan config JSON (bot-data.json)
- `artifacts/api-server/src/bot/commands.ts` — registrasi slash commands global
- `artifacts/api-server/src/bot/handlers/interaction.ts` — handler slash commands
- `artifacts/api-server/src/bot/pollers/youtube.ts` — YouTube RSS (5 menit)
- `artifacts/api-server/src/bot/pollers/tiktok.ts` — TikTok via TikWM API (10 menit)
- `artifacts/api-server/src/bot/pollers/twitter.ts` — Twitter via Nitter RSS (15 menit)
- `artifacts/api-server/src/bot/pollers/telegram.ts` — Telegram via RSSHub (10 menit)
- `artifacts/api-server/src/bot/pollers/pinterest.ts` — Pinterest RSS (15 menit)
- `artifacts/api-server/src/bot/pollers/anime.ts` — Anime via AniList GraphQL (30 menit)
- `artifacts/api-server/src/bot/pollers/mal.ts` — MAL via Jikan API (30 menit)
- `bot-data.json` — file penyimpanan config bot (dibuat otomatis saat pertama jalan)

## Slash Commands

| Command | Deskripsi |
|---|---|
| `/youtube set channel_id discord_channel` | Pantau channel YouTube |
| `/youtube stop` | Hentikan pemantauan YouTube |
| `/tiktok set username discord_channel` | Pantau akun TikTok |
| `/tiktok stop` | Hentikan pemantauan TikTok |
| `/twitter set username discord_channel` | Pantau akun Twitter/X |
| `/twitter stop` | Hentikan pemantauan Twitter/X |
| `/telegram set channel discord_channel` | Pantau channel Telegram |
| `/telegram stop` | Hentikan pemantauan Telegram |
| `/pinterest set username discord_channel` | Pantau akun Pinterest |
| `/pinterest stop` | Hentikan pemantauan Pinterest |
| `/anime set judul discord_channel` | Pantau episode anime baru |
| `/anime stop` | Hentikan pemantauan anime |
| `/mal set username discord_channel` | Pantau aktivitas MAL |
| `/mal stop` | Hentikan pemantauan MAL |
| `/status` | Tampilkan semua konfigurasi aktif |

## Architecture decisions

- Bot berjalan berdampingan dengan Express server dalam satu proses (`src/index.ts` memanggil `startBot()`)
- Config bot disimpan ke `bot-data.json` menggunakan fs sync — sederhana, tidak butuh DB
- Setiap `updatePlatform()` mempertahankan `lastId` agar tidak reset saat update konfigurasi
- `lastId` diisi di polling pertama tanpa mengirim notifikasi (mencegah spam saat pertama kali dikonfigurasi)
- Poller anime menggunakan `lastEpisode` integer untuk tracking episode terakhir
- discord.js di-externalize di esbuild agar tidak di-bundle (discord.js menggunakan dynamic loading)
- Twitter dipantau via beberapa Nitter host sebagai fallback (nitter.privacyredirect.com, nitter.poast.org, dst)

## Product

Bot Xtray Ping memantau 7 platform secara otomatis:
- **YouTube** (5 menit) — video baru via RSS feed Atom
- **TikTok** (10 menit) — video baru via TikWM API
- **Twitter/X** (15 menit) — tweet baru via Nitter RSS (multi-host fallback)
- **Telegram** (10 menit) — pesan channel baru via RSSHub
- **Pinterest** (15 menit) — pin baru via RSS feed
- **Anime/AniList** (30 menit) — episode baru via AniList GraphQL API
- **MyAnimeList** (30 menit) — aktivitas watching via Jikan API

## User preferences

- Teks UI bot dalam Bahasa Indonesia
- Gunakan pino logger untuk semua log (bukan console.log)
- Setiap embed menyertakan `.setTimestamp()` dan `.setFooter()` dengan nama bot + platform

## Gotchas

- Slash commands global aktif ~1 jam setelah registrasi pertama
- `bot-data.json` disimpan di working directory saat runtime — pastikan direktori writable
- Poller pertama kali hanya menyimpan `lastId` tanpa kirim notifikasi (perilaku yang diinginkan)
- discord.js harus ada di external di `build.mjs` — jangan di-bundle
- Nitter RSS bisa tidak stabil; bot mencoba beberapa host sebagai fallback
- RSSHub (Telegram) adalah layanan publik gratis, bisa lambat atau down kadang
- YouTube hanya mendukung Channel ID (format UCxxxxx), bukan @handle langsung

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
