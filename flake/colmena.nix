{
  self,
  inputs,
  config,
  lib,
  ...
}: let
  mkWireGuardTunnel = ips: privateKeyFile: {
    networking.wireguard.interfaces.wg0 = {
      inherit ips privateKeyFile;
      listenPort = 51820;
      postSetup = ''
        ip link set mtu 1492 dev wg0
      '';
      peers = [
        {
          publicKey = "RtwIQ8Ni8q+/E5tgYPFUnHrOhwAnkGOEe98h+vUYmyg=";
          allowedIPs = [ "10.40.33.0/24" "10.40.9.0/24" "10.70.0.0/24" ];
          endpoint = "prophet.samleathers.com:51820";
          persistentKeepalive = 30;
        }
      ];
    };
  };
  arcadeHardware = { config, pkgs, lib, ... }: {
    networking.networkmanager.enable = lib.mkForce false;
    nixpkgs.config.pulseaudio = true;
    hardware = {
      openrazer = {
        enable = true;
        users = [ "doom" ];
      };
      nvidia = {
        modesetting.enable = true;
        open = false;
        nvidiaSettings = true;
      };
      pulseaudio.enable = true;
    };
    sound.enable = true;

    environment.systemPackages = [
      pkgs.polychromatic
    ];
  };
  adminGui = { config, pkgs, ... }: {
    services.xserver = {
      enable = true;
      displayManager.gdm.enable = true;
      desktopManager.gnome.enable = true;
    };
  };
  hydraCageLocal = { config, pkgs, ... }: {
    services = {
      cage = {
        enable = true;
        program = "${pkgs.google-chrome}/bin/google-chrome-stable --app=http://doom-offline.local";
        user = "doom";
      };
    };
  };
  hydraCageRemote = { config, pkgs, ... }: {
    services = {
      cage = {
        enable = true;
        program = "${pkgs.google-chrome}/bin/google-chrome-stable --app=http://doom-remote.local";
        user = "doom";
      };
    };
  };
  hydraBase = {inputs, config, pkgs,  ...}: let
    system = "x86_64-linux";
  in {
    networking.hosts = lib.mkForce {
      "127.0.0.1" = [ "localhost" "doom-remote.local" "doom-offline.local" ];
      "::1" = [ "localhost" "doom-remote.local" "doom-offline.local" ];
    };
    environment.systemPackages = with self.packages.${system}; [
      hydra-offline-wrapper
      hydra-control-plane-wrapper
      hydra-tui-wrapper
    ];
    users = {
      users."doom" = {
        createHome = true;
        group = "doom";
        extraGroups = ["plugdev"];
        home = "/home/doom";
        uid = 9999;
        isNormalUser = true;
      };
      groups.doom = {};
      groups.plugdev = {};
    };
    services = {
      nginx = {
        enable = true;
        virtualHosts = {
          "doom-remote.local" = {
            root = self.packages.${system}.hydra-doom-static-remote.overrideAttrs (_: {
              cabinetKey = import ../deployment/cabinet-key.nix;
            });
            extraConfig = ''
              disable_symlinks off;
              try_files $uri $uri /index.html;
            '';
          };
          "doom-offline.local" = {
            root = self.packages.${system}.hydra-doom-static-local.overrideAttrs (_: {
              cabinetKey = import ../deployment/cabinet-key.nix;
            });
            extraConfig = ''
              disable_symlinks off;
              try_files $uri $uri /index.html;
            '';
          };
        };
      };
    };
  };
  baseConfig = { pkgs, ...}: {
    boot = {
      loader.grub = {
        enable = true;
        efiInstallAsRemovable = true;
        efiSupport = true;
        device = "nodev";
      };

    };
    nix = {
      settings.sandbox = true;
      settings.cores = 4;
      settings.extra-sandbox-paths = [ "/etc/nsswitch.conf" "/etc/protocols" ];
      settings.substituters = [ "https://cache.nixos.org" "https://cache.iog.io" ];
      settings.trusted-public-keys = [ "hydra.iohk.io:f/Ea+s+dFdN+3Y/G+FDgSq+a5NEWhJGzdjvKNGv0/EQ=" ];
      extraOptions = ''
        binary-caches-parallel-connections = 3
        connect-timeout = 5
        experimental-features = nix-command flakes
      '';
    };
    nixpkgs.config.allowUnfree = true;

    environment.systemPackages = with pkgs; [
      neovim
      ssh-to-age
      tmux
      tmate
      wezterm
      termite
      magic-wormhole
      google-chrome
      grim
      slurp
      dmenu
    ];


    services.openssh = {
      enable = true;
      settings = {
        PasswordAuthentication = false;
        PermitRootLogin = "without-password";
      };
    };
    systemd.services.sshd.wantedBy = lib.mkForce [ "multi-user.target" ];
    users.users.root.openssh.authorizedKeys.keys = [
      # we hard-code this because it runs on the system itself
      "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDEPOLnk4+mWNGOXd309PPxal8wgMzKXHnn7Jbu/SpSUYEc1EmjgnrVBcR0eDxgDmGD9zJ69wEH/zLQLPWjaTusiuF+bqAM/x7z7wwy1nZ48SYJw3Q+Xsgzeb0nvmNsPzb0mfnpI6av8MTHNt+xOqDnpC5B82h/voQ4m5DGMQz60ok2hMeh+sy4VIvX5zOVTOFPQqFR6BGDwtALiP5PwMfyScYXlebWHhDRdX9B0j9t+cqiy5utBUsl4cIUInE0KW7Z8Kf6gIsmQnfSZadqI857kdozU3IbaLoJc1C6LyVjzPFyC4+KUC11BmemTGdCjwcoqEZ0k5XtJaKFXacYYXi1l5MS7VdfHldFDZmMEMvfJG/PwvXN4prfOIjpy1521MJHGBNXRktvWhlNBgI1NUQlx7rGmPZmtrYdeclVnnY9Y4HIpkhm0iEt/XUZTMQpXhedd1BozpMp0h135an4uorIEUQnotkaGDwZIV3mSL8x4n6V02Qe2CYvqf4DcCSBv7D91N3JplJJKt7vV4ltwrseDPxDtCxXrQfSIQd0VGmwu1D9FzzDOuk/MGCiCMFCKIKngxZLzajjgfc9+rGLZ94iDz90jfk6GF4hgF78oFNfPEwoGl0soyZM7960QdBcHgB5QF9+9Yd6QhCb/6+ENM9sz6VLdAY7f/9hj/3Aq0Lm4Q== samuel.leathers@iohk.io"
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIATbejW2TmxxkzFxDzU0Lw2S4Lig0UdSgl8xO761WVtd Adam Key"
      "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDHRjFKHOS4lOw907VWvDMrx/XawRMV2wyc+VSbA4YHnG2ecv6y/JT3gBjmdNw0bgltgQqeBBG/iTciio+Zax8I36rPWMEomDvpgq8B7i1L23eWoK9cKMqYNAUpIAfManhJKvZfBjJ9dRLz4hfUGo2Gah5reuweFrkzWGb2zqILNXoM2KowlkqMOFrd09SgP52sUuwNmaCJaPba7IdqzLqxotWaY420Msd5c8B2l/0E/hNgRu6m5qbZpidmQQJsTk2tq4CWP5xB2SbgEwAuZZ6AUOn2IqGfF8bkLfwHb5qdtss0jxZm47s5Fag9T9MzzbXCAHEdyO01+q83FKIxkiW/ sebastian"
    ];
  };
in {
    flake.colmena = {
      meta = {
        nixpkgs = import inputs.nixpkgs {
          system = "x86_64-linux";
        };
      };
      hydra-arcade-test = { config, pkgs, ... }: {
        deployment = {
          targetHost = "hydra-arcade-test";
          targetPort = 22;
          targetUser = "root";
        };
        imports = [
          inputs.sops-nix.nixosModules.sops
          baseConfig
          hydraBase
          hydraCageRemote
          #adminGui
          ../deployment/hydra-arcade-test/hardware-configuration.nix
          (mkWireGuardTunnel [ "10.40.9.8/24" "fd00::8" ] config.sops.secrets.wg0PrivateKey.path)
        ];
        networking.hostId = "ca488476"; # required for zfs use
        sops = {
         defaultSopsFile = ../deployment/hydra-arcade-test/secrets.yaml;
         age = {
           sshKeyPaths = ["/etc/ssh/ssh_host_ed25519_key"];
         };
         secrets.wg0PrivateKey = {};
         };
      };
      hydra-arcade-1 = { config, pkgs, ... }: {
        deployment = {
          targetHost = "hydra-arcade-1";
          targetPort = 22;
          targetUser = "root";
        };
        imports = [
          inputs.sops-nix.nixosModules.sops
          baseConfig
          arcadeHardware
          hydraBase
          hydraCageRemote
          #adminGui
          ../deployment/hydra-arcade-1/hardware-configuration.nix
          (mkWireGuardTunnel [ "10.40.9.6/24" "fd00::6" ] config.sops.secrets.wg0PrivateKey.path)
        ];
        networking.hostId = "4e825531"; # required for zfs use
        sops = {
         defaultSopsFile = ../deployment/hydra-arcade-1/secrets.yaml;
         age = {
           sshKeyPaths = ["/etc/ssh/ssh_host_ed25519_key"];
         };
         secrets.wg0PrivateKey = {};
         };
      };
      hydra-arcade-2 = { config, pkgs, ... }: {
        deployment = {
          targetHost = "hydra-arcade-2";
          targetPort = 22;
          targetUser = "root";
        };
        imports = [
          inputs.sops-nix.nixosModules.sops
          baseConfig
          arcadeHardware
          hydraBase
          hydraCageRemote
          #adminGui
          ../deployment/hydra-arcade-2/hardware-configuration.nix
          (mkWireGuardTunnel [ "10.40.9.7/24" "fd00::7" ] config.sops.secrets.wg0PrivateKey.path)
        ];
        networking.hostId = "0904bbe4"; # required for zfs use
        sops = {
         defaultSopsFile = ../deployment/hydra-arcade-2/secrets.yaml;
         age = {
           sshKeyPaths = ["/etc/ssh/ssh_host_ed25519_key"];
         };
         secrets.wg0PrivateKey = {};
         };
      };
    };
}
