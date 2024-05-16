import { hydraSend, hydraRecv } from "./hydra";

declare var Module: any;
declare function callMain(args: string[]): void;

// Glue together callbacks available from doom-wasm

Module.onRuntimeInitialized = () => {
    console.log("WASM module loaded");

    Module.hydraSend = hydraSend;
    Module.hydraRecv = hydraRecv;

    var args = [
        "-iwad",
        "doom1.wad",
        "-window",
        "-nogui",
        "-nomusic",
        "-config",
        "default.cfg",
    ];
    callMain(args);
};
