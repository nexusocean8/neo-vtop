# Neo VTop

A graphical activity monitor for the command line. A neo fork of [vtop](https://github.com/MrRio/vtop) rewritten in TypeScript with updated dependencies.

![](https://raw.githubusercontent.com/MrRio/vtop/master/docs/example.gif)

## Installation

Requires Node.js >= 24.

> ⚠️ If you have the legendary [vtop](https://github.com/MrRio/vtop) installed, `neo-vtop` will replace the `vtop` command. Uninstall it first with `npm uninstall -g vtop`, or just let neo-vtop take over — it's more based anyway.

```bash
npm install -g neo-vtop
```

If you're on macOS, or get an error about file permissions, you may need to do `sudo npm install -g neo-vtop`. Don't do this if you're using [nvm](https://github.com/nvm-sh/nvm).

## Running

```bash
neo-vtop
# or
vtop
```

If your muscle memory keeps typing `top`:

```bash
alias top="vtop"
alias oldtop="/usr/bin/top"
```

## Keyboard shortcuts

- Arrow up or `k` — move up the process list
- Arrow down or `j` — move down
- Arrow left or `h` — zoom graphs in
- Arrow right or `l` — zoom graphs out
- `g` — jump to top of process list
- `G` — jump to bottom
- `dd` — kill all processes in that group
- `c` — sort by CPU
- `m` — sort by memory
- `q` / `esc` / `Ctrl+C` — quit

## Mouse control

If your terminal supports mouse events (like iTerm) you can click items in the process list and use the scroll wheel. Disable with:

```bash
neo-vtop --no-mouse
```

## Themes

```bash
neo-vtop --theme wizard
```

Themes live in the `themes/` folder. Make your own and send a pull request.

```bash
alias vtop="vtop --theme brew"
```

## FAQ

### How does it work?

It uses [drawille](https://github.com/madbence/node-drawille) to draw CPU and memory charts with Unicode braille characters. Processes with the same name are grouped together.

### The CPU % looks wrong.

CPU is calculated as a percentage of total system power across all cores and HyperThreads. 100% means all cores maxed out — this differs from how Activity Monitor on macOS reports it.

### What about measuring server req/s, log entries, etc?

It's on the list. Feel free to send a pull request — check out the `sensors/` folder.

### What license is this under?

MIT — do what you like with it.

## Contributing

Fork, clone, then:

```bash
yarn install
yarn start
```

ESLint and Prettier run on commit via Husky. Make sure `yarn lint` passes before opening a PR.

## Credits

Originally created by [James Hall](https://github.com/MrRio/vtop). Modernized and maintained by [nexusocean8](https://github.com/nexusocean8/neo-vtop).
