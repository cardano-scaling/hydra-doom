declare var Module: any;
declare function callMain(args: string[]): void;

Module.hydraSend = () => {
    console.log("hydraSend");
};

Module.hydraRecv = () => {
    console.log("hydraRecv");
};

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
