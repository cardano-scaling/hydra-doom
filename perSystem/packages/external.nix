{ inputs, ... }: {
  perSystem = {config, system, pkgs, lib, ...}:
    {
      packages = {
        inherit (inputs.hydra.packages.${system}) hydra-cluster hydra-tui hydra-node;
        inherit (inputs.cardano-node.packages.${system}) cardano-node cardano-cli bech32;
        inherit (inputs.hydra-control-plane.packages.${system}) hydra-control-plane;
        inherit (inputs.doom-wasm.packages.${system}) doom-wasm;
      };
    };
}
