import { hydraSend, hydraRecv } from "./hydra";

declare var Module: any;
declare function callMain(args: string[]): void;

// Callbacks available from doom-wasm

Module.hydraSend = hydraSend;
Module.hydraRecv = hydraRecv;
Module.onRuntimeInitialized = () => {
    console.log("WASM module loaded");
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
