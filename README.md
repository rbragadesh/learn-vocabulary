# Word Quest

A vocabulary adventure for kids, built for iPad. It goes from three-letter words (`nap`, `sly`) to the rare words strong adult readers use (`perspicacious`, `ineffable`): **5,000 words in 500 units across 9 worlds**. Each unit teaches 10 words, then uses all 10 in an interactive picture story, then checks both recall *and* understanding.

**Live app:** https://rbragadesh.github.io/learn-vocabulary/

## Put it on the iPad

1. Open the link above in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Open it from the Home Screen icon from then on.

Step 3 matters. Safari can delete a website's saved data after about 7 days without a visit, but a Home Screen app is kept. Progress is stored on the device only. Use **Grown-ups → Save her progress → Download backup** now and then, and restore it there if needed.

## How a day works

Tap **Continue** on the home screen. The app picks the next step:

1. **Review:** words that are due again (spaced repetition: 1, 2, 4, 8, 16, 35, 90 days). Once one review round is done, new words unlock.
2. **New unit** (1 a day by default; change it in Grown-ups):
   - **Learn:** 10 word cards with a picture, kind of word, kid-friendly meaning, example, similar words, read-aloud, and a pad for drawing her own picture.
   - **Story:** a picture-book story starring her (by name) and Ziggy the dragon. She fills each gap by choosing the right word, so she has to use the meaning.
   - **Quiz:** a mix of question types (below). Missed words come back at the end.
   - **Say it your way:** she makes up her own sentence for 3 of the words and a grown-up taps ✓.
3. **Level challenge** every 5 units: 20 questions, 70% to unlock the next level.

There's also a placement check that skips worlds she already knows, a Quick Test, a word collection, and a dragon that grows as she learns.

## Recall vs. understanding

Being able to match a word to its definition isn't the same as understanding it. The app checks both:

| Check | What it shows |
| --- | --- |
| Word ↔ definition, similar word | She **remembers** the meaning |
| Fill the gap (quiz and stories) | She can pick the right word **for a context** |
| **Which sentence fits this word best?** | She can tell **correct use from misuse**. One sentence uses the word properly; two put it into another word's sentence. |
| **Say it your way** | She can **produce** the word in a sentence of her own (judged by a grown-up) |

The parent dashboard shows these separately under **Understanding, not just memorizing**. It warns you when definition scores run well ahead of usage scores, which is the sign of memorizing without understanding.

Limits:
- "Which sentence fits" is used only for nouns and verbs from World 2 on. Describing words fit too many sentences ("a *shiny* pair of socks" sounds fine) to judge automatically.
- About 1 in 12 of these questions has a wrong option that's arguably not wrong. The feedback always shows the real meaning, so she still learns from it.

## The worlds

| # | World | Words | Examples |
| --- | --- | --- | --- |
| 1 | 🌱 Word Sprouts | 300 | nap, mud, gust, wary |
| 2 | 🌿 Seedlings | 400 | curious, glimpse, sizzle |
| 3 | 🌳 Saplings | 600 | deserted, encourage, pounce |
| 4 | 🧭 Explorers | 700 | obvious, swivel, sleuth |
| 5 | ⚔️ Adventurers | 700 | ample, quench, apprentice |
| 6 | 🚢 Voyagers | 700 | potent, testify, meticulous |
| 7 | 🎓 Scholars | 600 | altruistic, appease, myriad |
| 8 | 🦉 Sages | 550 | iconoclast, equanimity, plethora |
| 9 | 👑 Masters | 450 | perspicacious, obfuscate, ineffable |

## Honest expectations for parents

- **"Top 0.1%" can't be measured by this app,** and 5,000 words isn't a finish line. A typical 7-year-old already understands several thousand words; the placement check skips what she knows. The words that set strong readers apart are the rarer ones in Worlds 5–9.
- **Reading volume matters more than any app.** Most vocabulary comes from reading and being read to, especially books above her own reading level. Use this alongside books, not instead of them.
- **Pace:** at one 10-word unit a day, 500 units take about 16 months *if done every single day*. Two years is realistic. Pushing faster mostly produces words that are "studied" but forgotten.
- **Worlds 8–9 are abstract** (`hegemony`, `sacrosanct`). Understanding them needs world knowledge that most 7–9-year-olds don't have yet. If "Spots correct use" falls well below "Knows the meaning", slow down. That's normal, not failure.
- **"Mastered" is the number to watch**: a word she still recalls after 8+ days. Keep reviews near zero most days.
- **The content was written with AI help and machine-checked**: no duplicate words, no definition that gives the word away, every word used exactly once in its story. It has not been checked line by line by a human. If you see a definition or sentence that's off, fix it in the text files (below).
- Pictures are emoji, simple drawn scenes, and her own drawings, not illustrations.

## Change or add words

All content lives in plain text files in `src/content/worlds/`, one per world:

```
@world sages | Sages | 🦉 | Rich words that great writers love

@unit Courage
word | emoji | pos | definition | Example with the [word] in brackets. | similar, words
valiant | 🛡️ | adj | brave and determined | The [valiant] knight faced the dragon. | brave, bold
...exactly 10 words per unit...

@story Story Title | castle
🐉🏰 | Each line is one page: art | text. {Name} becomes her name.
🛡️⚔️ | Every unit word is used exactly once, in [brackets], like [valiant].
```

- `pos` is `noun`, `verb`, `adj`, `adv` or `other`.
- Put the exact form used inside the brackets (`[strolled]`). Irregular forms name the base word: `[strode|stride]`.
- List near-synonyms within a unit as each other's similar words, so quizzes never offer two right answers.
- Story themes: home, meadow, forest, ocean, beach, space, castle, city, snow, desert, jungle, school, night, mountain, farm, cave, sky, garden, library, kitchen, market, river, island, lab, museum, park, rain, volcano, underwater, camp.
- 5 units make a level; levels and unit ids are generated from the order in the file.

Run `npm test` after editing. It checks every rule above and reports the file and line of anything wrong. The deploy won't go out if a check fails.

## Development

```bash
npm install
npm run dev      # http://localhost:5173 (also reachable from an iPad on the same Wi-Fi)
npm test         # curriculum validation + quiz and spaced-review tests
npm run build    # typecheck + production build into dist/
```

Built with Vite, React and TypeScript. No backend and no accounts: it's an installable offline web app (PWA) that keeps progress in the browser's local storage, keeps her drawings in IndexedDB, and uses the device's own voice for read-aloud.

Every push to `main` runs the tests and deploys to GitHub Pages (`.github/workflows/deploy.yml`).
