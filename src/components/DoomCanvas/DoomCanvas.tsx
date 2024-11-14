import React, { useCallback, useEffect, useRef } from "react";
import { EGameType, EmscriptenModule, NewGameResponse } from "../../types";
import { useAppContext } from "../../context/useAppContext";
import { HydraMultiplayer } from "../../utils/hydra-multiplayer";
import useKeys from "../../hooks/useKeys";
import { getArgs } from "../../utils/game";
import { useMutation } from "@tanstack/react-query";
import Card from "../Card";
import { FaRegCircleCheck } from "react-icons/fa6";
import { MdContentCopy } from "react-icons/md";
import { ClipboardAPI, useClipboard } from "use-clipboard-copy";
import useUrls from "../../hooks/useUrls";

const DoomCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isEffectRan = useRef(false);
  const {
    gameData: { code, petName, type },
    region,
  } = useAppContext();
  const keys = useKeys();
  const urlClipboard = useClipboard({ copiedTimeout: 1500 });
  const { newGame, addPlayer, share } = useUrls();

  const { mutate: fetchGameData, data } = useMutation<NewGameResponse>({
    mutationKey: ["fetchGameData", keys.address, code, type],
    mutationFn: async () => {
      const url =
        type === EGameType.HOST
          ? newGame(keys.address!)
          : addPlayer(keys.address!, code);
      const response = await fetch(url);
      return response.json();
    },
  });

  const gameUrl = share(data?.game_id);

  const urlClipboardCopy = useCallback(
    (clipboard: ClipboardAPI, value: string) => {
      clipboard.copy(value);
    },
    [],
  );

  useEffect(() => {
    if (!keys.address || !region) return;

    fetchGameData();
  }, [fetchGameData, keys.address, region]);

  useEffect(() => {
    if (!keys.address || !data?.ip) return;

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
    window.HydraMultiplayer = new HydraMultiplayer(keys, data.ip, Module);

    // Dynamically load websockets-doom.js
    const script = document.createElement("script");
    script.src = "/websockets-doom.js";
    document.body.appendChild(script);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      document.body.removeChild(script);
    };
  }, [code, data?.ip, keys, petName, type]);

  return (
    <>
      <Card className="h-[40rem]">
        <canvas id="canvas" ref={canvasRef} className="w-full h-full" />
      </Card>
      {type === EGameType.HOST && (
        <Card className="px-4 py-2 text-center text-xl text-white flex items-center gap-2 justify-center">
          Share this URL with friends{" "}
          <a
            className="text-yellow-400 underline"
            href={gameUrl}
            target="_blank"
          >
            {gameUrl}
          </a>
          {urlClipboard.copied ? (
            <FaRegCircleCheck className="text-green-600" />
          ) : (
            <MdContentCopy
              role="button"
              onClick={() => urlClipboardCopy(urlClipboard, gameUrl)}
            />
          )}
        </Card>
      )}
    </>
  );
};

export default DoomCanvas;
