{ moduleWithSystem, ... }: {
  flake.nixosModules.hydra-control-plane = moduleWithSystem ({ self', inputs' }: { pkgs
                                                                                 , lib
                                                                                 , config
                                                                                 , ...
                                                                                 }:
    let
      inherit (lib) mkOption mkEnableOption getExe' boolToString;
      inherit (lib.types) bool path package str int port;

      cfg = config.services.hydra-control-plane;
      cfgHydraNode = config.services.hydra-node;
    in
    {
      options.services.hydra-control-plane = {
        enable = mkEnableOption "Enable hydra-control-plane";
        package = mkOption {
          type = package;
          default = self'.packages.hydra-control-plane;
          description = ''
            hydra-control-plane package
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
        port = mkOption {
          type = port;
          default = 8000;
          description = ''
            Port to bind
          '';
        };
        ttl = mkOption {
          type = int;
          default = 5;
          description = ''
            TTL in minutes
          '';
        };
        maxPlayers = mkOption {
          type = int;
          default = 100;
          description = ''
            maximum number of players for head
          '';
        };
        reserved = mkOption {
          type = bool;
          default = false;
          description = ''
            true if reserved instance
          '';
        };
        region = mkOption {
          type = str;
          default = "local";
          description = ''
            region node is in
          '';
        };
        configFile = mkOption {
          type = path;
          default = pkgs.writeText "rocket.toml" ''
            [default]
            ttl_minutes = ${toString cfg.ttl}
            port = ${toString cfg.port}
            address = "${cfg.host}"

            [[local.nodes]]
            local_url = "ws://offline.doom.lan"
            remote_url = "ws://offline.doom.lan"
            port = 4001
            max_players = ${toString cfg.maxPlayers}
            admin_key_file = "admin.sk"
            persisted = false
            reserved = ${boolToString cfg.reserved}
            region = "${cfg.region}"
            stats-file = "local-stats"
          '';
          description = ''
            Rocket.toml configuration file for control plane
          '';
        };

      };
      config = {
        systemd.services = {
          hydra-control-plane = {
            environment.ROCKET_PROFILE = "local";
            wantedBy = [ "multi-user.target" ];
            requires = [ "hydra-node.service" ];
            startLimitIntervalSec = 0;
            serviceConfig = {
              ExecStartPre = pkgs.writeScript "hydra-control-plane-pre" ''
                #!${pkgs.stdenv.shell}
                ln -sf ${cfg.configFile} Rocket.toml
                while ! ${pkgs.netcat}/bin/nc -z -v -w1 localhost 4001 2>/dev/null; do
                  echo "Waiting for port 4001 to open..."
                  sleep 2
                done
              '';
              ExecStart = getExe' self'.packages.hydra-control-plane "hydra_control_plane";
              Restart = "always";
              RestartSec = "30s";
              WorkingDirectory = cfgHydraNode.dataDir;
              StateDirectory = "hydra-node";
              User = "hydra-node";
              Group = "hydra-node";
            };
          };
        };
      };
    });
}
