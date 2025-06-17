{ inputs, ... }: {
  perSystem = { system, ... }:
    {
      packages = {
        inherit (inputs.hydra.packages.${system}) hydra-cluster hydra-tui hydra-node;
        inherit (inputs.cardano-node.packages.${system}) cardano-node cardano-cli bech32;
        inherit (inputs.doom-wasm.packages.${system}) doom-wasm;
        hydra-control-plane = inputs.hydra-control-plane.packages.${system}.default;
      };
    };
}
