{ inputs, ... }: {
  imports = [
    inputs.process-compose-flake.flakeModule
    inputs.hydra-coding-standards.flakeModule
  ];
}
