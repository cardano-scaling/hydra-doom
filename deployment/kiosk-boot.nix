{
  lib,
  modulesPath,
  pkgs,
  self,
  config,
  system,
  ...
}: let
  # change to false when running in qemu
  prodImage = false;
  inherit (self) nixosModules;
in {
  imports = [
    (modulesPath + "/installer/cd-dvd/installation-cd-minimal.nix")
    nixosModules.hydra-node
    nixosModules.hydra-control-plane

  ];

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
  console.keyMap = "us";
  console.packages = with pkgs; [ terminus_font ];
  console.font = "ter-i32b";
  i18n = {
    defaultLocale = "en_US.UTF-8";
  };
  fonts.fontDir.enable = true;
  fonts.enableGhostscriptFonts = true;
  fonts.packages = with pkgs; [
    # Used by starship for fonts
    (nerdfonts.override { fonts = [ "FiraCode" ]; })
    corefonts
    fira # monospaced
    fira-code
    powerline-fonts
    inconsolata
    liberation_ttf
    dejavu_fonts
    bakoma_ttf
    gentium
    ubuntu_font_family
    terminus_font
    unifont # some international languages
  ];
  nixpkgs.config.pulseaudio = true;
  hardware = {
    pulseaudio.enable = true;
  };
  sound.enable = true;

  documentation.info.enable = false;

  environment = {
    etc = {
      "sway/config".source = ./sway/config;
    };
    loginShellInit = ''
      [[ "$(tty)" == /dev/tty1 ]] && sway --config /etc/sway/config
    '';
    systemPackages = with self.packages.${system};
      [
        hydra-node
        hydra-tui
        hydra-tui-wrapper
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
        pavucontrol
        vim
        tmux
        wezterm
        sway
      ]);

  };

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

    dconf.enable = true;
    gnupg.agent.enable = true;
    sway = {
      enable = true;
      extraPackages = with pkgs; [
        swaylock
        swayidle
        xwayland
        waybar
        mako
        kanshi
      ];
    };
    waybar.enable = true;
  };

  networking.hosts = lib.mkForce {
    "127.0.0.1" = [ "localhost" "offline.doom.local" ];
    "::1" = [ "localhost" "offline.doom.local" ];
  };
  services = {
    hydra-node = {
      enable = true;
    };
    hydra-control-plane = {
      enable = true;
      reserved = true;
    };
    getty.autologinUser = "nixos";
    nginx = {
      enable = true;
      virtualHosts = {
        "offline.doom.local" = {
          root = self.packages.${system}.hydra-doom-static.overrideAttrs (finalAttrs: prevAttrs: {
            passthru = prevAttrs.passthru // {
              serverUrl = "http://offline.doom.local:8000";
              useMouse = "1";
              # uncomment below if you have a cabinet key for POO distribution
              #cabinetKey = import ../deployment/cabinet-key.nix;
            };
          });
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
