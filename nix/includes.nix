{ inputs, ...}: {
  imports = [
    inputs.process-compose-flake.flakeModule
    inputs.treefmt-nix.flakeModule
   ];
}
