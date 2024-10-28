{
  self,
  inputs,
  config,
  lib,
  ...
}: {
      flake.nixosConfigurations.kiosk-boot = inputs.nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [ ../../deployment/kiosk-boot.nix ];
        specialArgs = {
          inherit self;
          system = "x86_64-linux";
        };
      };
}
