{ inputs, ... }: {
  perSystem = {config, system, pkgs, lib, ...}: {
    devShells.default = pkgs.mkShell
      {
        nativeBuildInputs = let
          inherit (inputs.sops-nix.packages."${system}") sops-import-keys-hook ssh-to-pgp sops-init-gpg-key;
        in [
          config.packages.hydra-cluster
          config.packages.hydra-node
          config.packages.hydra-tui
          config.packages.cardano-node
          config.packages.cardano-cli
          config.packages.bech32
          config.packages.hydra-offline-wrapper
          config.packages.hydra-cluster-wrapper
          config.packages.hydra-doom-wrapper
          pkgs.nodejs
          pkgs.jq
          pkgs.age
          pkgs.ssh-to-age
          pkgs.pwgen
          pkgs.just
          inputs.colmena.packages.${system}.colmena
          sops-import-keys-hook
          ssh-to-pgp
          sops-init-gpg-key
          config.treefmt.build.wrapper
        ];
      };
    };
}
