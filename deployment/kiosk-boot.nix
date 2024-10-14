{
  lib,
  modulesPath,
  pkgs,
  self,
  system,
  ...
}: let
  # change to false when running in qemu
  prodImage = true;
in {
  imports = [(modulesPath + "/installer/cd-dvd/installation-cd-graphical-gnome.nix")];

  boot = {
    initrd.availableKernelModules = [
      # Support for various usb hubs
      "ohci_pci"
      "ohci_hcd"
      "ehci_pci"
      "ehci_hcd"
      "xhci_pci"
      "xhci_hcd"

      # May be needed in some situations
      "uas"

      # Needed to mount usb as a storage device
      "usb-storage"
    ];

    kernelModules = ["kvm-intel"];

    supportedFilesystems = ["zfs"];

    # To address build time warn
    swraid.enable = lib.mkForce false;
  };

  documentation.info.enable = false;

  environment = {
    systemPackages = with self.packages.${system};
      [
        hydra-node
        hydra-tui
        hydra-control-plane
        hydra-offline-wrapper
        hydra-doom-wrapper
        cardano-node
        cardano-cli
        bech32
        default
      ]
      ++ (with pkgs; [
        gnome3.adwaita-icon-theme
        gnupg
        jq
        neovim
        openssl
        usbutils
        util-linux
        google-chrome
      ]);

  };

  # Used by starship for fonts
  fonts.packages = with pkgs; [
    (nerdfonts.override {fonts = ["FiraCode"];})
  ];

  # Disable squashfs for testing only
  # Set the flake.nix `imageParameters.prodImage = true;` when ready to build the distribution image to use image compression
  isoImage.squashfsCompression = lib.mkIf (!prodImage) ((lib.warn "Generating a testing only ISO with compression disabled") null);

  nix = {
    extraOptions = ''
      experimental-features = nix-command flakes
      accept-flake-config = true
    '';

    nixPath = ["nixpkgs=${pkgs.path}"];
    settings = {
      substituters = lib.mkForce [];
    };
  };

  nixpkgs.config.allowUnfree = true;

  programs = {
    bash = {
      enableCompletion = true;
    };

    fzf = {
      fuzzyCompletion = true;
      keybindings = true;
    };

    starship = {
      enable = true;
      settings = {
        git_commit = {
          tag_disabled = false;
          only_detached = false;
        };
        git_metrics = {
          disabled = false;
        };
        memory_usage = {
          disabled = false;
          format = "via $symbol[\${ram_pct}]($style) ";
          threshold = -1;
        };
        shlvl = {
          disabled = false;
          symbol = "↕";
          threshold = -1;
        };
        status = {
          disabled = false;
          map_symbol = true;
          pipestatus = true;
        };
        time = {
          disabled = false;
          format = "[\\[ $time \\]]($style) ";
        };
      };
    };

    dconf.enable = true;
    gnupg.agent.enable = true;
  };

  networking.hosts = lib.mkForce {
    "127.0.0.1" = [ "localhost" "doom-remote.local" "doom-offline.local" ];
    "::1" = [ "localhost" "doom-remote.local" "doom-offline.local" ];
  };
  services = {
    #cage = {
    #  enable = true;
    #  program = "${pkgs.google-chrome}/bin/google-chrome-stable --app=http://doom-remote.local";
    #  #program = "${pkgs.google-chrome}/bin/google-chrome-stable";
    #  user = "nixos";
    #};
    nginx = {
      enable = true;
      virtualHosts = {
        "doom-remote.local" = {
          root = self.packages.${system}.hydra-doom-static-remote;
          extraConfig = ''
            disable_symlinks off;
            try_files $uri $uri /index.html;
          '';
        };
        "doom-offline.local" = {
          root = self.packages.${system}.hydra-doom-static;
          extraConfig = ''
            disable_symlinks off;
            try_files $uri $uri /index.html;
          '';
        };
      };
    };
  };


  system = {
    stateVersion = lib.versions.majorMinor lib.version;
  };
}
