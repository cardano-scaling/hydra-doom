import { hydraSend, hydraRecv } from "./hydra";

declare var Module: any;
declare function callMain(args: string[]): void;

// Callbacks available from doom-wasm

// FIXME: if we do real work on module imports, this binding comes too late..
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
