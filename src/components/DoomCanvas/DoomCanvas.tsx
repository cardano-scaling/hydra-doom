import React, { useCallback, useEffect, useRef } from "react";
import { EGameType, EmscriptenModule, NewGameResponse } from "../../types";
import { useAppContext } from "../../context/useAppContext";
import useKeys from "../../hooks/useKeys";
import { getArgs } from "../../utils/game";
import { useMutation } from "@tanstack/react-query";
import Card from "../Card";
import { FaRegCircleCheck } from "react-icons/fa6";
import { MdContentCopy } from "react-icons/md";
import { ClipboardAPI, useClipboard } from "use-clipboard-copy";
import createModule from "../../../websockets-doom.js";
import { useUrls } from "../../hooks/useUrls";
import { C, fromHex } from "lucid-cardano";
import { HydraMultiplayerClient } from "../../utils/HydraMultiplayer/client.js";

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
    mutationKey: ["fetchGameData", keys?.address, code, type],
    mutationFn: async () => {
      if (type === EGameType.SOLO) {
        return { game_id: "solo" };
      }
      const url =
        type === EGameType.HOST
          ? newGame(keys!.address)
          : addPlayer(keys!.address, code);
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
    if (!keys?.address || !region) return;

    fetchGameData();
  }, [fetchGameData, keys?.address, region]);

  useEffect(() => {
    if (!keys?.address) return;
    if (type !== EGameType.SOLO && !data?.ip) return;

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
          "freedoom2.wad",
          "default.cfg",
          "dm_iog.wad",
          "iog_assets.wad",
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
      onRuntimeInitialized: function () {},
    };

    // Attach Module to the window object to make it globally accessible
    window.Module = Module;
    // Initialize HydraMultiplayer
    if (data?.ip && !!keys) {
      const adminAddress = C.Address.from_bytes(
        new Uint8Array([0b1100000, ...fromHex(data.admin_pkh)]),
      );

      window.HydraMultiplayer = new HydraMultiplayerClient({
        key: keys,
        adminPkh: data.admin_pkh,
        url: data.ip,
        module: Module,
      });

      adminAddress.free();
    }
    // Dynamically load websockets-doom.js
    const loadDoom = async () => {
      const args = getArgs({ code, petName, type });
      const module = await createModule(Module);
      module.callMain(args);
    };
    loadDoom();

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
    };
  }, [code, data?.admin_pkh, data?.ip, keys, petName, type]);

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
