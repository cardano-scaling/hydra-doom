{
  description = "Hydra Doom";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
    hydra.url = "github:input-output-hk/hydra/0.19.0";
    cardano-node.url = "github:intersectmbo/cardano-node/8.9.4";
    flake-parts.url = "github:hercules-ci/flake-parts";
    process-compose-flake.url = "github:Platonic-Systems/process-compose-flake";
    hydra-control-plane.url = "github:cardano-scaling/hydra-control-plane";
    doom-wasm.url = "github:cardano-scaling/doom-wasm";
    nix-inclusive.url = "github:input-output-hk/nix-inclusive";
    colmena.url = "github:zhaofengli/colmena";
    sops-nix.url = "github:Mic92/sops-nix";
    treefmt-nix.url = "github:numtide/treefmt-nix";
    treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";
    import-tree.url = "github:vic/import-tree";
  };

  outputs = inputs: inputs.flake-parts.lib.mkFlake { inherit inputs; } (inputs.import-tree ./nix);

}
