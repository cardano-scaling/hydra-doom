{ inputs, ... }: {
  perSystem = { config, pkgs, lib, ... }:
    let
      hydraDataDir = "state-hydra";
      # edit these to override defaults for serverUrl and doom wad file
      controlPlaneListenAddr = "0.0.0.0";
      controlPlaneHost = "localhost";
      controlPlanePort = "8000";
      controlPlaneUrl = "http://${controlPlaneHost}:${controlPlanePort}";
      hydraHost = "localhost";
      hydraPort = "4001";
      doomWad = pkgs.fetchurl {
        url = "https://distro.ibiblio.org/slitaz/sources/packages/d/doom1.wad";
        sha256 = "sha256-HX1DvlAeZ9kn5BXguPPinDvzMHXoWXIYFvZSpSbKx3E=";
      };
      hydra-doom-static =
        let
          serverUrl = controlPlaneUrl;
          wadFile = doomWad;
          cabinetKey = null;
          region = "local";
          useMouse = "1";
          src = "${inputs.self}/web";

          nodeModules = pkgs.mkYarnPackage {
            name = "hydra-doom-node-modules";
            inherit src;
            packageJSON = "${src}/package.json";
            yarnLock = "${src}/yarn.lock";
            inherit (pkgs) nodejs;
          };

        in
        pkgs.stdenv.mkDerivation (finalAttrs: {
          name = "hydra-doom-static";
          phases = [ "unpackPhase" "buildPhase" "installPhase" ];
          inherit src;
          passthru = { inherit serverUrl wadFile cabinetKey useMouse region; };
          buildInputs = [
            pkgs.nodejs
            pkgs.yarn
            nodeModules
          ];
          buildPhase = ''
            ln -s ${nodeModules}/libexec/hydra-doom/node_modules node_modules
            ln -sf ${finalAttrs.passthru.wadFile} assets/doom1.wad
            ln -sf ${pkgs.doom-wasm.site}/websockets-doom.js assets/websockets-doom.js
            ln -sf ${pkgs.doom-wasm.site}/websockets-doom.wasm assets/websockets-doom.wasm
            ln -sf ${pkgs.doom-wasm.site}/websockets-doom.wasm.map assets/websockets-doom.wasm.map

            cat > .env << EOF
            SERVER_URL=${finalAttrs.passthru.serverUrl}
            ${lib.optionalString (finalAttrs.passthru.cabinetKey != null) "CABINET_KEY=${finalAttrs.passthru.cabinetKey}"}
            REGION=${finalAttrs.passthru.region}
            EOF
            yarn build
            sed -i "s/use_mouse.*/use_mouse                     ${finalAttrs.passthru.useMouse}/" dist/default.cfg
          '';
          installPhase = ''
            cp -a dist $out
          '';
        });
    in
    {
      packages = {
        hydra-cluster-wrapper = pkgs.writeShellApplication {
          name = "hydra-cluster-wrapper";
          runtimeInputs = [
            pkgs.cardano-node
            pkgs.cardano-cli
          ];
          text = ''
            rm -rf "${hydraDataDir}"
            ${lib.getExe' config.packages.hydra-cluster "hydra-cluster"} --devnet --publish-hydra-scripts --state-directory ${hydraDataDir}
          '';
        };
        hydra-offline-wrapper = pkgs.writeShellApplication {
          name = "hydra-offline-wrapper";
          runtimeInputs = [ pkgs.cardano-node pkgs.cardano-cli pkgs.jq pkgs.curl ];
          text = ''
            rm -rf "${hydraDataDir}"
            mkdir -p "${hydraDataDir}"
            cardano-cli address key-gen --normal-key --verification-key-file admin.vk --signing-key-file admin.sk
            pushd ${hydraDataDir}
            ${lib.getExe' pkgs.hydra-node "hydra-node"} gen-hydra-key --output-file hydra
            curl https://raw.githubusercontent.com/cardano-scaling/hydra/0.22.2/hydra-cluster/config/protocol-parameters.json \
              | jq '.utxoCostPerByte = 0' \
              | jq '.minFeeRefScriptCostPerByte = 0' > protocol-parameters.json
            cp "${inputs.self}/config/initial-utxo.json" utxo.json
            sed -i "s/YOURADDRESSHERE/$(cardano-cli address build --verification-key-file ../admin.vk --testnet-magic 1)/g" utxo.json
            ${lib.getExe' pkgs.hydra-node "hydra-node"} \
              --hydra-signing-key hydra.sk \
              --ledger-protocol-parameters protocol-parameters.json \
              --api-host 0.0.0.0 \
              --api-port 4001 \
              --offline-head-seed "0000000000000000" \
              --initial-utxo utxo.json
            popd
          '';
        };
        inherit hydra-doom-static;
        hydra-doom-wrapper = pkgs.writeShellApplication {
          name = "hydra-doom-wrapper";
          runtimeInputs = [ pkgs.bech32 pkgs.jq pkgs.git pkgs.nodejs pkgs.python3 ];
          text = ''
            export STATIC="''${STATIC:-1}"
            if [ "''${STATIC}" -eq 0 ]; then
              echo "running npm..."
              [ -f assets/doom1.wad ] || ln -s ${doomWad} assets/doom1.wad
              ln -sf ${pkgs.doom-wasm.site}/websockets-doom.js assets/websockets-doom.js
              ln -sf ${pkgs.doom-wasm.site}/websockets-doom.wasm assets/websockets-doom.wasm
              ln -sf ${pkgs.doom-wasm.site}/websockets-doom.wasm.map assets/websockets-doom.wasm.map
              npm install
              npm start
            else
              echo "running http webserver for local play..."
              pushd ${config.packages.hydra-doom-static}
              python3 -m http.server 3000
            fi
          '';
        };
        hydra-tui-wrapper = pkgs.writeShellApplication {
          name = "hydra-tui-wrapper";
          runtimeInputs = [ pkgs.hydra-tui ];
          text = ''
            ${lib.getExe' pkgs.hydra-tui "hydra-tui"} -k admin.sk
          '';
        };
        hydra-control-plane-wrapper = pkgs.writeShellApplication {
          name = "hydra-control-plane-wrapper";
          text = ''
            export RESERVED="''${RESERVED:-false}"
            export PRESERVE_ROCKET_TOML="''${PRESERVE_ROCKET_TOML:-0}"
            export ROCKET_PROFILE=local
            if [ "$PRESERVE_ROCKET_TOML" -eq 0 ]
            then
            cat > Rocket.toml << EOF
            [default]
            ttl_minutes = 5
            port = ${controlPlanePort}
            address = "${controlPlaneListenAddr}"

            [[local.nodes]]
            local_url = "ws://${hydraHost}"
            remote_url = "ws://${hydraHost}"
            port = ${hydraPort}
            max_players = 100
            admin_key_file = "admin.sk"
            persisted = false
            reserved = ''${RESERVED}
            region = "local"
            stats-file = "local-stats"
            EOF
            fi
            ${lib.getExe' pkgs.hydra-control-plane "hydra_control_plane"}
          '';
        };
      };
    };
}
