# TODO: use process-compose-services flake utilizing nixos modules

{ inputs, ... }: {
  perSystem = {config, system, pkgs, lib, ...}: {
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
}
