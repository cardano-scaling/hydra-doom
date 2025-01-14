import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EGameType, EmscriptenModule, NewGameResponse } from "../../types";
import { useAppContext } from "../../context/useAppContext";
import { getArgs } from "../../utils/game";
import { useMutation } from "@tanstack/react-query";
import Card from "../Card";
import { FaRegCircleCheck } from "react-icons/fa6";
import { MdContentCopy } from "react-icons/md";
import { ClipboardAPI, useClipboard } from "use-clipboard-copy";
import createModule from "../../../websockets-doom.js";
import { useUrls } from "../../hooks/useUrls";
import { Core } from "@blaze-cardano/sdk";
import { HydraMultiplayerClient } from "../../utils/HydraMultiplayer/client.js";
import cx from "classnames";
import {
  NETWORK_ID,
  LOCAL_HYDRA_HOST,
  LOCAL_HYDRA_PORT,
} from "../../constants.js";

const DoomCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    gameData: { code, petName, type },
    keys,
    region,
  } = useAppContext();
  const { address } = keys || {};
  const urlClipboard = useClipboard({ copiedTimeout: 1500 });
  const { newGame, addPlayer, share } = useUrls();
  const [isLoading, setIsLoading] = useState(true);
  const mutationKey = useMemo(
    () => ["fetchGameData", address, code, type],
    [address, code, type],
  );

  const {
    mutate: fetchGameData,
    data,
    isError,
  } = useMutation<NewGameResponse>({
    mutationKey,
    mutationFn: async () => {
      if (type === EGameType.SOLO) {
        return { game_id: "solo" };
      }
      const url =
        type === EGameType.HOST ? newGame(address!) : addPlayer(address!, code);
      console.log("fetching", mutationKey);
      const response = await fetch(url);
      const json = await response.json();
      return json;
    },
  });

  const gameUrl = share(data?.game_id);

  const urlClipboardCopy = useCallback(
    (clipboard: ClipboardAPI, value: string) => {
      clipboard.copy(value);
    },
    [],
  );

  const hasFetched = useRef(false);
  useEffect(() => {
    if (!address || !region || hasFetched.current) return;

    fetchGameData();
    hasFetched.current = true;
  }, [address, fetchGameData, region]);

  useEffect(() => {
    if (!address || !data?.admin_pkh) return;

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
      postRun: () => {
        setIsLoading(false);
      },
      locateFile: (path) => {
        return path;
      },
      canvas: canvas,
      print: (text: string) => {
        console.log("stdout:", text);
      },
      setStatus: (text: string) => {
        console.log("setStatus:", text);
      },
      onRuntimeInitialized: () => {},
    };

    // Attach Module to the window object to make it globally accessible
    window.Module = Module;
    // Initialize HydraMultiplayer
    if (keys) {
      const adminAddress = Core.Address.fromBytes(
        Core.HexBlob.fromBytes(
          new Uint8Array([
            0b0110_0000 | NETWORK_ID,
            ...Buffer.from(data.admin_pkh, "hex"),
          ]),
        ),
      );

      window.HydraMultiplayer = new HydraMultiplayerClient({
        key: keys,
        adminPkh: data.admin_pkh,
        url: `ws://${LOCAL_HYDRA_HOST}:${LOCAL_HYDRA_PORT}`,
        module: Module,
        filterAddress: adminAddress.toBech32(),
        networkId: NETWORK_ID,
      });
    }
    // Dynamically load websockets-doom.js
    const loadDoom = async () => {
      const args = getArgs({ code, petName, type }, type === EGameType.HOST);
      const module = await createModule(Module);
      module.callMain(args);
    };
    loadDoom();
    console.log("JSHY", "Loaded DOOM");

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
    };
  }, [address, code, data?.admin_pkh, keys, petName, type]);

  return (
    <>
      <Card className="relative">
        <canvas
          id="canvas"
          ref={canvasRef}
          className={cx("w-full", { "opacity-0": isLoading || isError })}
          style={{ aspectRatio: "1028/805" }}
        />
        {(isLoading || isError) && (
          <div className="absolute inset-0 flex items-center justify-center text-yellow-400 text-4xl text-center px-4 w-4/5 mx-auto">
            {isLoading && !isError
              ? "Loading..."
              : type === EGameType.HOST
                ? "We're spinning up more servers to meet demand, please try again shortly."
                : "Oops! You can't join this game right now. It may have already started or hasn't begun yet. Please try again later or check for a new game to join!"}
          </div>
        )}
      </Card>
      {type === EGameType.HOST && data?.game_id && (
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
