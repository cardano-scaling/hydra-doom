import { hydraSend, hydraRecv } from "./hydra";

declare var Module: any;
declare function callMain(args: string[]): void;

// Glue together callbacks available from doom-wasm

const startButton: HTMLButtonElement | null = document.querySelector("#start");

// TODO: this is flaky and not always happens (in time?)
Module.onRuntimeInitialized = () => {
    console.log("WASM module loaded");

    Module.hydraSend = hydraSend;
    Module.hydraRecv = hydraRecv;

    if (startButton) {
        startButton.disabled = false;
    }
};

startButton?.addEventListener("click", () => {
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
});
