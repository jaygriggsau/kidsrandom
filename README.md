# 🎡 Spin the Wheel!

A kid-friendly wheel spinner for picking names and rewards — with sound effects,
confetti, and a happy winner popup. Built with plain HTML, CSS, and JavaScript,
so it works offline with **no build step and no dependencies**.

## Features

- **Two wheels**, switched with tabs:
  - 🧑‍🤝‍🧑 **Name Wheel** — pick a random person
  - 🎁 **Reward Wheel** — pick a random prize/treat
- ➕ Add, ✕ remove, 🔀 shuffle, and 🗑️ clear items
- 🔊 Sound effects (spin ticks, winner fanfare, add blip) synthesized with the
  Web Audio API — no audio files needed
- 🎉 Confetti + winner popup
- ☑️ Optional "remove the winner/reward after each spin"
- 💾 Lists are saved automatically in your browser (localStorage)
- ⛶ Fullscreen, ⌨️ press **Spacebar** to spin, 📱 mobile-friendly

## Run locally

Just open `index.html` in any web browser. That's it.

## Deploy to Vercel

This is a static site, so Vercel serves it with zero configuration.

**One-time setup (~2 minutes):**

1. Go to <https://vercel.com/new> and sign in with GitHub.
2. Click **Import** next to the `jaygriggsau/kidsrandom` repository.
3. Leave every setting at its default (Framework Preset: **Other**, no build
   command, output directory = root) and click **Deploy**.
4. Vercel gives you a public URL like `https://kidsrandom.vercel.app`.

After that, **every push to `main` automatically redeploys** the live site.

Alternatively, with the [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm i -g vercel
vercel        # preview deploy
vercel --prod # production deploy
```
