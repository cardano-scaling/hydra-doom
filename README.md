# Hydra Doom

Experiment of running Doom using a [Cardano Hydra head](https://github.com/cardano-scaling/hydra).

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

The application requires connection to a [hydra-control-plane](https://github.com/cardano-scaling/hydra-control-plane) which provides managed Hydra head instances provided as SERVER_URL in the `.envrc` file.

Then to build & run:

```shell
npm install
npm start
```
