# Tartan

A small static toy for designing a tartan in the [Scottish Register of Tartans](https://www.tartanregister.gov.uk/threadcount) palette and threadcount, and seeing it as 2/2 twill cloth.

The cloth fills the screen. Palette, threadcount, presets, and export sit in the design panel. A share link keeps the design in the URL hash only.

It is meant to be published later at `mikeornstein.com/tartan/`. Asset paths are relative, so the same files work from that subpath. Publishing waits for an explicit ship.

```bash
npm test
python3 -m http.server 4173
```

Then open `http://localhost:4173/`. The type is the system sans-serif, so the page does not fetch a font.
