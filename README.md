# Hydra Doom

Experiment of running Doom using a [Cardano Hydra head](https://github.com/cardano-scaling/hydra).

## Manual startup

This is using a forked version of [doom-wasm](https://github.com/cardano-scaling/doom-wasm), make sure to build it first and copy or symlink the build results:

``` shell
cp ../doom-wasm/src/websockets-doom.js assets/websockets-doom.js
cp ../doom-wasm/src/websockets-doom.wasm assets/websockets-doom.wasm
cp ../doom-wasm/src/websockets-doom.wasm.map assets/websockets-doom.wasm.map
```

Also, you need to copy the shareware version of [doom1.wad](https://doomwiki.org/wiki/DOOM1.WAD) to `./assets`:

```shell
curl https://distro.ibiblio.org/slitaz/sources/packages/d/doom1.wad -o assets/doom1.wad
```

The application requires connection to a [hydra-control-plane](https://github.com/cardano-scaling/hydra-control-plane) which provides managed Hydra head instances provided as `SERVER_URL` in the `.env` file.

Then to build & run:

```shell
npm install
npm start
```

## Integrated startup

There is a way to start all required processes using `nix` and `process-compose`:

``` shell
nix run
```

The browser session will be available at `localhost:3000`.

## Persistent sessions

If we want to keep using the same key and remote node configuration between runs, set the `PERSISTENT_SESSION=true` variable in the `.env` file before starting the dev web server.



### Local Development

To run the project locally (using the POO integration), you need to set a `CABINET_KEY` in the `.env` file. For example:

```sh
CABIENT_KEY=A610911D628D5475EFFBA5E80ED09D1260B49E6935C40E4195C4D4AA17963CBF
```
