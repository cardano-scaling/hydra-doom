import React, { useEffect, useRef } from "react";
import { EGameType, EmscriptenModule, NewGameResponse } from "../../types";
import { useAppContext } from "../../context/useAppContext";
import { HydraMultiplayer } from "../../utils/hydra-multiplayer";
import useKeys from "../../hooks/useKeys";
import { getArgs } from "../../utils/game";
import { useQuery } from "@tanstack/react-query";
import { SERVER_URL } from "../../constants";

const DoomCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isEffectRan = useRef(false);
  const {
    gameData: { code, petName, type },
  } = useAppContext();
  const keys = useKeys();
  const url =
    type === EGameType.HOST
      ? `${SERVER_URL}new_game?address=${keys.address}`
      : `${SERVER_URL}add_player?address=${keys.address}&id=${code}`;
  const newGameQuery = useQuery<NewGameResponse>({
    queryKey: ["game", url],
    queryFn: async () => {
      const response = await fetch(url);
      return response.json();
    },
    enabled: !!keys.address,
  });

  const { data } = newGameQuery;
  const ip = data?.ip;

  useEffect(() => {
    if (!keys.address || !ip) return;

    // Prevent effect from running twice
    if (isEffectRan.current) return;
    isEffectRan.current = true;

    const canvas = canvasRef.current;

    if (!canvas) {
      console.error("Canvas element not found.");
      return;
    }

    const handleContextLost = (e: Event) => {
      alert("WebGL context lost. You will need to reload the page.");
      e.preventDefault();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, false);

    // Setup configuration for doom-wasm
    const Module: EmscriptenModule = {
      noInitialRun: true,
      preRun: function () {
        const files = [
          "doom1.wad",
          "freedoom2.wad",
          "default.cfg",
          "Cardano.wad",
        ];
        files.forEach((file) => {
          Module.FS!.createPreloadedFile("/", file, file, true, true);
        });
      },
      printErr: console.error,
      postRun: () => {},
      canvas: canvas,
      print: (text: string) => {
        console.log("stdout:", text);
      },
      setStatus: (text: string) => {
        console.log("setStatus:", text);
      },
      onRuntimeInitialized: function () {
        const args = getArgs({ code, petName, type });
        window.callMain(args);
      },
    };

    // Attach Module to the window object to make it globally accessible
    window.Module = Module;

    // Initialize HydraMultiplayer
    window.HydraMultiplayer = new HydraMultiplayer(keys, ip, Module);

    // Dynamically load websockets-doom.js
    const script = document.createElement("script");
    script.src = "/websockets-doom.js";
    document.body.appendChild(script);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      document.body.removeChild(script);
    };
  }, [code, petName, keys, type, ip]);

  return <canvas id="canvas" ref={canvasRef} className="w-full h-full" />;
};

export default DoomCanvas;
