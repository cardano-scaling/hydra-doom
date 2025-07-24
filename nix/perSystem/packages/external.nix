{ inputs, ... }: {
  perSystem = { system, ... }:
    {
      _module.args.pkgs = import inputs.nixpkgs {
        inherit system; overlays = [
        (_final: _prev: {
          inherit (inputs.hydra.packages.${system}) hydra-cluster hydra-tui hydra-node;
          inherit (inputs.cardano-node.packages.${system}) cardano-node cardano-cli bech32;
          doom-wasm = inputs.doom-wasm.packages.${system}.default;
          hydra-control-plane = inputs.hydra-control-plane.packages.${system}.default;
        })
      ];
      };
    };
}
