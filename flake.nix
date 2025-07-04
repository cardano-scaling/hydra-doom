{

  nixConfig = {
    extra-substituters = [
      "https://cache.iog.io"
      "https://cardano-scaling.cachix.org"
    ];
    extra-trusted-public-keys = [
      "hydra.iohk.io:f/Ea+s+dFdN+3Y/G+FDgSq+a5NEWhJGzdjvKNGv0/EQ="
      "cardano-scaling.cachix.org-1:QNK4nFrowZ/aIJMCBsE35m+O70fV6eewsBNdQnCSMKA="
    ];
    allow-import-from-derivation = true;
  };

  description = "Hydra Doom";

  inputs = {
    cardano-node.follows = "hydra/cardano-node";
    doom-wasm.url = "github:cardano-scaling/doom-wasm";
    flake-parts.url = "github:hercules-ci/flake-parts";
    hydra-control-plane.url = "github:cardano-scaling/hydra-control-plane";
    hydra-coding-standards.url = "github:cardano-scaling/hydra-coding-standards";
    hydra.url = "github:input-output-hk/hydra/doom";
    import-tree.url = "github:vic/import-tree";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
    process-compose-flake.url = "github:Platonic-Systems/process-compose-flake";
  };

  outputs = inputs: inputs.flake-parts.lib.mkFlake { inherit inputs; } (inputs.import-tree ./nix);

}
