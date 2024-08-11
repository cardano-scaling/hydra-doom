# TODO: replace with nixosModules

{ inputs, ... }: {
  perSystem = {config, system, pkgs, lib, ...}:
    let
      hydraDataDir = "state-hydra";
      # edit these to override defaults for serverUrl and doom wad file
      controlPlaneListenAddr = "0.0.0.0";
      controlPlaneHost = "127.0.0.1";
      controlPlanePort = "8000";
      controlPlaneUrl = "http://${controlPlaneHost}:${controlPlanePort}";
      hydraHost = "127.0.0.1";
      hydraPort = "4001";
      doomWad = pkgs.fetchurl {
        url = "https://distro.ibiblio.org/slitaz/sources/packages/d/doom1.wad";
        sha256 = "sha256-HX1DvlAeZ9kn5BXguPPinDvzMHXoWXIYFvZSpSbKx3E=";
      };
      mkHydraDoomStatic =
        { serverUrl ? controlPlaneUrl
        , wadFile ? doomWad
        , cabinetKey ? import ../../deployment/cabinet-key.nix
        }:
        let
          src = inputs.nix-inclusive.lib.inclusive ../../. [
            ../../src
            ../../assets
            ../../package.json
            ../../yarn.lock
            ../../tsconfig.json
            ../../webpack.config.js
          ];

          nodeModules = pkgs.mkYarnPackage {
            name = "hydra-doom-node-modules";
            inherit src;
            packageJSON = ../../package.json;
            yarnLock = ../../yarn.lock;
            nodejs = pkgs.nodejs;
           };

        in
        pkgs.stdenv.mkDerivation {
          name = "hydra-doom-static";
          phases = [ "unpackPhase" "buildPhase" "installPhase" ];
          inherit src;
          buildInputs = [
            pkgs.nodejs
            pkgs.yarn
            nodeModules
          ];
          buildPhase = ''
            ln -s ${nodeModules}/libexec/hydra-doom/node_modules node_modules
            ln -sf ${wadFile} assets/doom1.wad
            ln -sf ${config.packages.doom-wasm}/websockets-doom.js assets/websockets-doom.js
            ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm assets/websockets-doom.wasm
            ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm.map assets/websockets-doom.wasm.map

            cat > .env << EOF
            SERVER_URL=${serverUrl}
            ${lib.optionalString (cabinetKey != "") "CABINET_KEY=${cabinetKey}"}
            ${lib.optionalString (serverUrl == "http://127.0.0.1:8000") "REGION=us-west-2"}
            EOF
            yarn build
          '';
          installPhase = ''
            cp -a dist $out
          '';
        };
    in
    {
      packages = {
        hydra-cluster-wrapper = pkgs.writeShellApplication {
          name = "hydra-cluster-wrapper";
          runtimeInputs = [ config.packages.cardano-node config.packages.cardano-cli ];
          text = ''
            rm -rf "${hydraDataDir}"
            ${lib.getExe' config.packages.hydra-cluster "hydra-cluster"} --devnet --publish-hydra-scripts --state-directory ${hydraDataDir}
          '';
        };
        hydra-offline-wrapper = pkgs.writeShellApplication {
          name = "hydra-offline-wrapper";
          runtimeInputs = [ config.packages.cardano-node config.packages.cardano-cli pkgs.jq ];
          text = ''
            export LOCAL_HYDRA="''${LOCAL_HYDRA:-0}"
            if [ "''${LOCAL_HYDRA}" -eq 0 ]; then
              echo "Not starting hydra control plane because LOCAL_HYDRA is not set"
              exit 0
            fi
            rm -rf "${hydraDataDir}"
            mkdir -p "${hydraDataDir}"
            cardano-cli address key-gen --normal-key --verification-key-file admin.vk --signing-key-file admin.sk
            pushd ${hydraDataDir}
            ${lib.getExe' config.packages.hydra-node "hydra-node"} gen-hydra-key --output-file hydra
            curl https://raw.githubusercontent.com/cardano-scaling/hydra/0.17.0/hydra-cluster/config/protocol-parameters.json | jq '.utxoCostPerByte = 0' > protocol-parameters.json
            cat > utxo.json << EOF
            {
              "0000000000000000000000000000000000000000000000000000000000000000#0": {
                "address": "$(cardano-cli address build --verification-key-file ../admin.vk --testnet-magic 1)",
                "value": {
                  "lovelace": 1000000000
                }
              }
            }
            EOF
            ${lib.getExe' config.packages.hydra-node "hydra-node"} offline \
              --hydra-signing-key hydra.sk \
              --ledger-protocol-parameters protocol-parameters.json \
              --initial-utxo utxo.json
            popd
          '';
        };
        hydra-doom-static-local = mkHydraDoomStatic { };
        hydra-doom-static-remote = mkHydraDoomStatic { serverUrl = "https://hydra-doom.sundae.fi"; };
        hydra-doom-wrapper = pkgs.writeShellApplication {
          name = "hydra-doom-wrapper";
          runtimeInputs = [ config.packages.bech32 pkgs.jq pkgs.git pkgs.nodejs pkgs.python3 ];
          text = ''
            export STATIC="''${STATIC:-1}"
            export LOCAL_HYDRA="''${LOCAL_HYDRA:-0}"
            if [ "''${STATIC}" -eq 0 ]; then
              echo "running npm..."
              [ -f assets/doom1.wad ] || ln -s ${doomWad} assets/doom1.wad
              ln -sf ${config.packages.doom-wasm}/websockets-doom.js assets/websockets-doom.js
              ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm assets/websockets-doom.wasm
              ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm.map assets/websockets-doom.wasm.map
              npm install
              npm start
            elif [ "''${LOCAL_HYDRA}" -eq 0 ]; then
              echo "running http webserver for remote play..."
              pushd ${config.packages.hydra-doom-static-remote}
              python3 -m http.server 3000
            else
              echo "running http webserver for local play..."
              pushd ${config.packages.hydra-doom-static-local}
              python3 -m http.server 3000
            fi
          '';
        };
        hydra-tui-wrapper = pkgs.writeShellApplication {
          name = "hydra-tui-wrapper";
          runtimeInputs = [ config.packages.hydra-tui ];
          text = ''
            ${lib.getExe' config.packages.hydra-tui "hydra-tui"} -k admin.sk
          '';
        };
        hydra-control-plane-wrapper = pkgs.writeShellApplication {
          name = "hydra-control-plane-wrapper";
          text = ''
            export LOCAL_HYDRA="''${LOCAL_HYDRA:-0}"
            export ROCKET_PROFILE=local
            if [ "''${LOCAL_HYDRA}" -eq 0 ]; then
              echo "Not starting hydra control plane because LOCAL_HYDRA is not set"
              exit 0
            fi
            if [ ! -f Rocket.toml ]
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
            max_players = 10
            admin_key_file = "admin.sk"
            persisted = false
            reserved = false
            stats-file = "local-stats"
            EOF
            fi
            ${lib.getExe' config.packages.hydra-control-plane "hydra_control_plane"}
          '';
        };
      };
    };
}
