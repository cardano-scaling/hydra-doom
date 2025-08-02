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
    cardano-node.url = "github:IntersectMBO/cardano-node/10.5.1";
    doom-wasm.url = "github:cardano-scaling/doom-wasm/0.0.0.3";
    flake-parts.url = "github:hercules-ci/flake-parts";
    hydra-control-plane.url = "github:cardano-scaling/hydra-control-plane/0.2.2";
    hydra-coding-standards.url = "github:cardano-scaling/hydra-coding-standards/0.7.0";
    hydra.url = "github:input-output-hk/hydra/0.22.3";
    import-tree.url = "github:vic/import-tree";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
    process-compose-flake.url = "github:Platonic-Systems/process-compose-flake";
  };

  outputs = inputs: inputs.flake-parts.lib.mkFlake { inherit inputs; } (inputs.import-tree ./nix);

}
