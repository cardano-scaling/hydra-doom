# Hydra Doom

Experiment of running Doom using a [Cardano Hydra head](https://github.com/input-output-hk/hydra).

This is using a forked version of [doom-wasm](https://github.com/ch1bo/doom-wasm), make sure to build it first and copy or symlink the build results:

``` shell
cp ../doom-wasm/src/websockets-doom.wasm assets/websockets-doom.wasm
cp ../doom-wasm/src/websockets-doom.wasm.map assets/websockets-doom.wasm.map
cp ../doom-wasm/src/websockets-doom.js assets/websockets-doom.js
```

Then to build & run:

```shell
npm install
npm start
```

