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
        }:
        let
          src = inputs.nix-inclusive.lib.inclusive ../../. [
            ../../src
            ../../assets
            ../../package.json
            ../../package-lock.json
            ../../tsconfig.json
            ../../webpack.config.js
          ];
          packageLock = builtins.fromJSON (builtins.readFile (src + "/package-lock.json"));
          deps = builtins.attrValues (removeAttrs packageLock.packages [ "" ]);

          nodeModules = pkgs.writeTextFile {
            name = "tarballs";
            text = ''
              ${builtins.concatStringsSep "\n" (map (p: pkgs.fetchurl { url = p.resolved; hash = p.integrity; }) deps)}
            '';
          };
        in
        pkgs.stdenv.mkDerivation {
          name = "hydra-doom-static";
          phases = [ "unpackPhase" "buildPhase" "installPhase" ];
          inherit src;
          buildInputs = [
            pkgs.nodejs
            pkgs.curl
            pkgs.coreutils
          ];
          buildPhase = ''
            export HOME="$PWD/.home"
            mkdir -p "$HOME"
            export npm_config_cache=$HOME/.npm
            while read package
            do
              echo "caching $package"
              npm cache add "$package"
            done <${nodeModules} > /dev/null

            ln -sf ${wadFile} assets/doom1.wad
            ln -sf ${config.packages.doom-wasm}/websockets-doom.js assets/websockets-doom.js
            ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm assets/websockets-doom.wasm
            ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm.map assets/websockets-doom.wasm.map

            echo "SERVER_URL=${serverUrl}" > .env;

            npm install
            head -n 1 node_modules/.bin/webpack
            patchShebangs --build node_modules/webpack/bin/webpack.js
            head -n 1 node_modules/.bin/webpack
            npm run build
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
            export LOCAL_HYDRA=1
            if [ -z "''${LOCAL_HYDRA}" ]; then
              echo "Not starting hydra control plane because LOCAL_HYDRA is not set"
              sleep 600
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
        hydra-doom-static-remote = mkHydraDoomStatic { serverUrl = "http://3.145.114.225:8000"; };
        hydra-doom-wrapper = pkgs.writeShellApplication {
          name = "hydra-doom-wrapper";
          runtimeInputs = [ config.packages.bech32 pkgs.jq pkgs.git pkgs.nodejs pkgs.python3 ];
          text = ''
            export STATIC=1
            export LOCAL_HYDRA=1
            if [ -z "''${STATIC}" ]; then
              echo "running npm..."
              [ -f assets/doom1.wad ] || ln -s ${doomWad} assets/doom1.wad
              ln -sf ${config.packages.doom-wasm}/websockets-doom.js assets/websockets-doom.js
              ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm assets/websockets-doom.wasm
              ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm.map assets/websockets-doom.wasm.map
              sleep 1
              npm install
              npm start
            elif [ -z "''${LOCAL_HYDRA}" ]; then
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
            export LOCAL_HYDRA=1
            if [ -z "''${LOCAL_HYDRA}" ]; then
              echo "Not starting hydra control plane because LOCAL_HYDRA is not set"
              sleep 600
              exit 0
            fi
            cat > Rocket.toml << EOF
            [default]
            ttl_minutes = 5
            max_players = 100
            port = ${controlPlanePort}
            address = "${controlPlaneListenAddr}"

            [[default.nodes]]
            local_url = "ws://${hydraHost}:${hydraPort}"
            remote_url = "ws://${hydraHost}:${hydraPort}"
            max_players = 5
            admin_key_file = "admin.sk"
            persisted = false
            EOF
            ${lib.getExe' config.packages.hydra-control-plane "hydra_control_plane"}
          '';
        };
      };
    };
}
