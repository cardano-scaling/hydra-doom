# TODO: use process-compose-services flake utilizing nixos modules

{
  perSystem = { config, ... }: {
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
            cardano-node = {
              command = config.packages.cardano-node-wrapper;
            };
            hydra-offline = {
              command = config.packages.hydra-offline-wrapper;
              disabled = true;
            };
            hydra-doom = {
              command = config.packages.hydra-doom-wrapper;
              availability = {
                restart = "on_failure";
                backoff_seconds = 2;
              };
            };
            hydra-control-plane = {
              command = config.packages.hydra-control-plane-wrapper;
              readiness_probe = {
                http_get = {
                  host = "127.0.0.1";
                  scheme = "http";
                  port = 8000;
                  path = "/global";
                };
              };
              depends_on."hydra-offline".condition = "process_healthy";
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

          };
        };
      };
  };
}
