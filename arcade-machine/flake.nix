{
  description = "Hydra Doom";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
    hydra.url = "github:input-output-hk/hydra/non-persisting-prototype";
    cardano-node.url = "github:intersectmbo/cardano-node/8.9.4";
    flake-parts.url = "github:hercules-ci/flake-parts";
    process-compose-flake.url = "github:Platonic-Systems/process-compose-flake";
    hydra-control-plane.url = "github:cardano-scaling/hydra-control-plane";
    doom-wasm.url = "github:cardano-scaling/doom-wasm";
    nix-inclusive.url = "github:input-output-hk/nix-inclusive";
  };

  outputs = { self, flake-parts, nixpkgs, ... }@ inputs:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.process-compose-flake.flakeModule
      ];
      flake = {
        # Put your original flake attributes here.
      };
      systems = [
        # systems for which you want to build the `perSystem` attributes
        "x86_64-linux"
        # ...
      ];
      perSystem = { config, system, pkgs, lib, ... }:
        let
          hydraDataDir = "state-hydra";
          # edit these to override defaults for serverUrl and doom wad file
          controlPlaneHost = "0.0.0.0";
          controlPlanePort = "8000";
          controlPlaneUrl = "http://${controlPlaneHost}:${controlPlanePort}";
          doomWad = pkgs.fetchurl {
            url = "https://distro.ibiblio.org/slitaz/sources/packages/d/doom1.wad";
            sha256 = "sha256-HX1DvlAeZ9kn5BXguPPinDvzMHXoWXIYFvZSpSbKx3E=";
          };
          mkHydraDoomStatic =
            { serverUrl ? controlPlaneUrl
            , wadFile ? doomWad
            }:
            let
              src = inputs.nix-inclusive.lib.inclusive ./. [
                ./src
                ./assets
                ./fonts
                ./package.json
                ./package-lock.json
                ./tsconfig.json
                ./webpack.config.js
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
            inherit (inputs.hydra.packages.${system}) hydra-cluster hydra-tui hydra-node;
            inherit (inputs.cardano-node.packages.${system}) cardano-node cardano-cli bech32;
            inherit (inputs.hydra-control-plane.packages.${system}) hydra-control-plane;
            inherit (inputs.doom-wasm.packages.${system}) doom-wasm;
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
            hydra-doom-static-remote = mkHydraDoomStatic { serverUrl = "http://3.15.33.186:8000"; };
            hydra-doom-wrapper = pkgs.writeShellApplication {
              name = "hydra-doom-wrapper";
              runtimeInputs = [ config.packages.bech32 pkgs.jq pkgs.git pkgs.nodejs ];
              text = ''
                [ -f assets/doom1.wad ] || ln -s ${doomWad} assets/doom1.wad
                ln -sf ${config.packages.doom-wasm}/websockets-doom.js assets/websockets-doom.js
                ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm assets/websockets-doom.wasm
                ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm.map assets/websockets-doom.wasm.map
                sleep 1
                npm install
                npm start
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
                cat > Rocket.toml << EOF
                [default]
                ttl_minutes = 5
                max_players = 100
                port = ${controlPlanePort}
                address = "${controlPlaneHost}"

                [[default.nodes]]
                connection_url = "ws://127.0.0.1:4001"
                admin_key_file = "admin.sk"
                persisted = false
                EOF
                ${lib.getExe' config.packages.hydra-control-plane "hydra_control_plane"}
              '';
            };
            qemu-run-iso = pkgs.writeShellApplication {
              name = "qemu-run-iso";
              runtimeInputs = with pkgs; [ fd qemu_kvm ];

              text = ''
                if fd --type file --has-results 'nixos-.*\.iso' result/iso 2> /dev/null; then
                  echo "Symlinking the existing iso image for qemu:"
                  ln -sfv result/iso/nixos-*.iso result-iso
                  echo
                else
                  echo "No iso file exists to run, please build one first, example:"
                  echo "  nix build -L .#nixosConfigurations.kiosk-boot.config.system.build.isoImage"
                  exit
                fi

                qemu-kvm \
                  -smp 2 \
                  -m 4G \
                  -drive file=result-iso,format=raw,if=none,media=cdrom,id=drive-cd1,readonly=on \
                  -device ahci,id=achi0 \
                  -device ide-cd,bus=achi0.0,drive=drive-cd1,id=cd1,bootindex=1 \
              '';
            };
          };
          devShells.default = pkgs.mkShell
            {
              buildInputs = [
                config.packages.hydra-cluster
                config.packages.hydra-node
                config.packages.hydra-tui
                config.packages.cardano-node
                config.packages.cardano-cli
                config.packages.bech32
                config.packages.hydra-offline-wrapper
                config.packages.hydra-cluster-wrapper
                config.packages.hydra-doom-wrapper
                pkgs.nodejs
                pkgs.jq
              ];
            };
          process-compose."default" =
            {
              # httpServer.enable = true;
              settings = {
                #environment = {
                #};

                processes = {
                  #hydra-cluster = {
                  #  command = config.packages.hydra-cluster-wrapper;
                  #};
                  hydra-offline = {
                    command = config.packages.hydra-offline-wrapper;
                  };
                  hydra-doom = {
                    command = config.packages.hydra-doom-wrapper;
                    depends_on."hydra-offline".condition = "process_started";
                    availability = {
                      restart = "on_failure";
                      backoff_seconds = 2;
                    };
                  };
                  hydra-control-plane = {
                    command = config.packages.hydra-control-plane-wrapper;
                    depends_on."hydra-offline".condition = "process_started";
                    availability = {
                      restart = "on_failure";
                      backoff_seconds = 2;
                    };
                  };
                  hydra-tui = {
                    command = config.packages.hydra-tui-wrapper;
                    depends_on."hydra-offline".condition = "process_started";
                    is_foreground = true;
                    disabled = true;
                  };

                  # If a process is named 'test', it will be ignored. But a new
                  # flake check will be created that runs it so as to test the
                  # other processes.
                  #test = {
                  #  command = pkgs.writeShellApplication {
                  #    name = "hydra-doom-tests";
                  #    runtimeInputs = [ pkgs.curl ];
                  #    text = ''
                  #      curl -v http://localhost:${builtins.toString port}/
                  #    '';
                  #  };
                  #  depends_on."sqlite-web".condition = "process_healthy";
                  #};
                };
              };
            };

        };
      flake.nixosConfigurations.kiosk-boot = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [ ./kiosk-boot.nix ];
        specialArgs = {
          inherit self;
          system = "x86_64-linux";
        };
      };
    };
}
