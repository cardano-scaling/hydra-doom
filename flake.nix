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
    doom-wasm.url = "github:cardano-scaling/doom-wasm/sl/build-wasm";
  };

  outputs = inputs@{ flake-parts, ... }:
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
                ${lib.getExe config.packages.hydra-cluster} --devnet --publish-hydra-scripts --state-directory ${hydraDataDir}
              '';
            };
            hydra-offline-wrapper = pkgs.writeShellApplication {
              name = "hydra-offline-wrapper";
              runtimeInputs = [ config.packages.cardano-node config.packages.cardano-cli ];
              text = ''
                rm -rf "${hydraDataDir}"
                mkdir -p "${hydraDataDir}"
                cardano-cli address key-gen --normal-key --verification-key-file admin.vk --signing-key-file admin.sk
                pushd ${hydraDataDir}
                ${lib.getExe config.packages.hydra-node} gen-hydra-key --output-file hydra
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
                ${lib.getExe config.packages.hydra-node} offline \
                  --hydra-signing-key hydra.sk \
                  --ledger-protocol-parameters protocol-parameters.json \
                  --initial-utxo utxo.json
                popd
              '';
            };
            hydra-doom-wrapper = pkgs.writeShellApplication {
              name = "hydra-doom-wrapper";
              runtimeInputs = [ config.packages.bech32 pkgs.jq pkgs.git pkgs.nodejs ];
              text = ''
                ln -sf ${config.packages.doom-wasm}/websockets-doom.js assets/websockets-doom.js
                ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm assets/websockets-doom.wasm
                ln -sf ${config.packages.doom-wasm}/websockets-doom.wasm.map assets/websockets-doom.wasm.map
                sleep 5
                npm install
                npm start
              '';
            };
            hydra-tui-wrapper = pkgs.writeShellApplication {
              name = "hydra-tui-wrapper";
              runtimeInputs = [ config.packages.hydra-tui ];
              text = ''
                hydra-tui -k admin.sk
              '';
            };
            hydra-control-plane-wrapper = pkgs.writeShellApplication {
              name = "hydra-control-plane-wrapper";
              text = ''
                cat > Rocket.toml << EOF
                [default]
                ttl_minutes = 5
                max_players = 100
                port = 8000
                address = "0.0.0.0"

                [[default.nodes]]
                connection_url = "ws://127.0.0.1:4001"
                admin_key_file = "admin.sk"
                persisted = false
                EOF
                ${lib.getExe config.packages.hydra-control-plane}
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
    };
}
