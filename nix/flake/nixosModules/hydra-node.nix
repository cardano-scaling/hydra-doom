{ moduleWithSystem, ... }: {
  flake.nixosModules.hydra-node = moduleWithSystem ({ self', inputs' }: { pkgs
                                                                        , lib
                                                                        , config
                                                                        , ...
                                                                        }:
    let
      inherit (lib) mkOption mkEnableOption getExe';
      inherit (lib.types) bool path package str;

      cfg = config.services.hydra-node;
    in
    {
      options.services.hydra-node = {
        enable = mkEnableOption "Enable hydra-node";
        package = mkOption {
          type = package;
          default = self'.packages.hydra-node;
          description = ''
            Data directory state is stored in.
            If not, defaults to current directory.
          '';
        };
        clearState = mkOption {
          type = bool;
          default = true;
          description = ''
            Whether or not to clear state on startup
          '';
        };
        dataDir = mkOption {
          type = path;
          default = "/var/lib/hydra-node";
          description = ''
            Data directory state is stored in.
            If not, defaults to /var/lib/hydra-node
          '';
        };
        host = mkOption {
          type = str;
          default = "0.0.0.0";
          description = ''
            host to bind node IP to
            Defaults to all IP addresses
          '';
        };
        apiHost = mkOption {
          type = str;
          default = cfg.host;
          description = ''
            Host to bind API service to
            Defaults to `cfg.host`
          '';
        };
        initalUtxo = mkOption {
          type = str;
          default = "utxo.json";
          description = ''
            Initial utxo set
          '';
        };
        pparams = mkOption {
          type = str;
          default = "pparams.json";
          description = ''
            Pparams file
          '';
        };
        startupScript = mkOption {
          type = path;
          default = pkgs.writeScript "hydra startup script" ''
            #!${pkgs.stdenv.shell}
            mkdir -p "${cfg.dataDir}"
            pushd "${cfg.dataDir}"
            ${lib.optionalString cfg.clearState "rm -rf *"}
            ${getExe' self'.packages.cardano-cli "cardano-cli"} address key-gen --normal-key --verification-key-file admin.vk --signing-key-file admin.sk
            ${getExe' self'.packages.hydra-node "hydra-node"} gen-hydra-key --output-file hydra
            cp ${../../pparams.json} pparams.json
            cp ${../../initial-utxo.json} utxo.json
            sed -i "s/YOURADDRESSHERE/$(${getExe' self'.packages.cardano-cli "cardano-cli"} address build --verification-key-file admin.vk --testnet-magic 1)/g" utxo.json
          '';
          description = ''
            Script to run before starting hydra
          '';
        };
        runScript = mkOption {
          type = path;
          default = pkgs.writeScript "hydra run script" ''
            #!${pkgs.stdenv.shell}
            cd ${cfg.dataDir} && exec ${lib.getExe' self'.packages.hydra-node "hydra-node"} offline \
              --hydra-signing-key hydra.sk \
              --ledger-protocol-parameters ${cfg.pparams} \
              --host ${cfg.host} \
              --api-host ${cfg.apiHost} \
              --initial-utxo ${cfg.initalUtxo}
          '';
          description = ''
            Script to run starting hydra-node
          '';
        };
      };
      config = {
        environment.systemPackages = with self'.packages; with pkgs;[
          cardano-cli
          hydra-node
        ];

        networking.firewall.allowedTCPPorts = [ 4001 5001 ];
        users.groups.hydra-node.gid = 10016;
        users.users.hydra-node = {
          description = "hydra-node user";
          uid = 10016;
          group = "hydra-node";
          isSystemUser = true;
        };

        systemd.services = {
          hydra-node = {
            wantedBy = [ "multi-user.target" ];
            startLimitIntervalSec = 0;
            serviceConfig = {
              ExecStartPre = cfg.startupScript;
              ExecStart = cfg.runScript;
              Restart = "always";
              RestartSec = "30s";
              WorkingDirectory = cfg.dataDir;
              StateDirectory = "hydra-node";
              User = "hydra-node";
              Group = "hydra-node";
            };
          };
        };
      };
    });
}
