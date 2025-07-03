{ self
, inputs
, config
, lib
, ...
}:
let
  inherit (config.flake) nixosModules;
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
      pulseaudio = {
        enable = true;
        package = pkgs.pulseaudioFull;
        extraConfig = "load-module module-switch-on-connect";
      };
    };
    sound.enable = true;

    environment.systemPackages = [
      pkgs.polychromatic
    ];
  };
  miniHardware = { config, pkgs, lib, ... }:
    let
      inherit (builtins) map;
      externalInterface = "enp2s0";
      internalInterfaces = [
        "enp3s0"
        "wg0"
      ];
    in
    {
      boot.kernel.sysctl = {
        "net.ipv4.conf.all.forwarding" = 1;
        "net.ipv4.conf.default.forwarding" = 1;
      };
      networking = {
        nameservers = [ "10.15.0.1" "8.8.8.8" ];
        interfaces = {
          ${externalInterface} = {
            useDHCP = true;
          };
          enp3s0 = {
            ipv4.addresses = [{
              address = "10.15.0.1";
              prefixLength = 24;
            }];
          };
        };
        nat = {
          enable = true;
          externalInterface = "${externalInterface}";
          internalIPs = [ "10.15.0.0/24" ];
          internalInterfaces = [ "enp2s0" ];
        };
        dhcpcd.persistent = true;
        firewall = {
          enable = true;
          allowPing = true;
          extraCommands =
            let
              dropPortNoLog = port:
                ''
                  ip46tables -A nixos-fw -p tcp \
                    --dport ${toString port} -j nixos-fw-refuse
                  ip46tables -A nixos-fw -p udp \
                    --dport ${toString port} -j nixos-fw-refuse
                '';

              dropPortIcmpLog =
                ''
                  iptables -A nixos-fw -p icmp \
                    -j LOG --log-prefix "iptables[icmp]: "
                  ip6tables -A nixos-fw -p ipv6-icmp \
                    -j LOG --log-prefix "iptables[icmp-v6]: "
                '';

              refusePortOnInterface = port: interface:
                ''
                  ip46tables -A nixos-fw -i ${interface} -p tcp \
                    --dport ${toString port} -j nixos-fw-log-refuse
                  ip46tables -A nixos-fw -i ${interface} -p udp \
                    --dport ${toString port} -j nixos-fw-log-refuse
                '';
              acceptPortOnInterface = port: interface:
                ''
                  ip46tables -A nixos-fw -i ${interface} -p tcp \
                    --dport ${toString port} -j nixos-fw-accept
                  ip46tables -A nixos-fw -i ${interface} -p udp \
                    --dport ${toString port} -j nixos-fw-accept
                '';
              privatelyAcceptPort = port:
                lib.concatMapStrings
                  (interface: acceptPortOnInterface port interface)
                  internalInterfaces;

              publiclyRejectPort = port:
                refusePortOnInterface port externalInterface;

              allowPortOnlyPrivately = port:
                ''
                  ${privatelyAcceptPort port}
                  ${publiclyRejectPort port}
                '';
            in
            lib.concatStrings [
              (lib.concatMapStrings allowPortOnlyPrivately
                [
                  67 # DHCP
                  53 # DNS
                  80 # nginx
                  4001 # hydra api
                  8000 # hydra control plane
                ])
              (lib.concatMapStrings dropPortNoLog
                [
                  23 # Common from public internet
                  143 # Common from public internet
                  139 # From RT AP
                  515 # From RT AP
                  9100 # From RT AP
                ])
              dropPortIcmpLog
              ''
                # allow from trusted interfaces
                ip46tables -A FORWARD -m state --state NEW -i br0 -o ${externalInterface} -j ACCEPT
                ip46tables -A FORWARD -m state --state NEW -i wg0 -o ${externalInterface} -j ACCEPT
                # allow traffic with existing state
                ip46tables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT
                # block forwarding from external interface
                ip6tables -A FORWARD -i ${externalInterface} -j DROP
              ''
            ];
          allowedTCPPorts = [ 32400 22 ];
          allowedUDPPorts = [ 51820 ];
        };
      };

      nixpkgs = {
        config = {
          allowUnfree = true;
        };
        overlays = [
          #(import ../overlays/plex.nix)
        ];
      };

      i18n = {
        consoleFont = "Lat2-Terminus16";
        consoleKeyMap = "us";
        defaultLocale = "en_US.UTF-8";
      };

      # List packages installed in system profile. To search, run:
      # $ nix search wget
      environment.systemPackages = with pkgs; [
        dmenu
        pavucontrol
        wezterm
        wget
        vim
        tmux
        screen
      ];

      # Some programs need SUID wrappers, can be configured further or are
      # started in user sessions.
      # programs.mtr.enable = true;
      # programs.gnupg.agent = { enable = true; enableSSHSupport = true; };

      # List services that you want to enable:

      # Enable the OpenSSH daemon.
      services = {
        openssh = {
          enable = true;
          settings = {
            PasswordAuthentication = false;
            PermitRootLogin = "without-password";
          };
        };
        dnsmasq = {
          enable = true;
          settings = {
            bind-interfaces = true;
            address =
              let
                cnames = [
                  "router"
                  "offline"
                ];
                ipv4 = "10.15.0.1";
                createAddress = domain: ipv4: name: "/${name}.${domain}/${ipv4}";
              in
              map (createAddress "doom.lan" ipv4) cnames;
          };

        };
        kea = {
          dhcp4 = {
            enable = true;
            settings = {
              interfaces-config = {
                interfaces = [ "enp3s0" ];
              };
              lease-database = {
                name = "/var/lib/kea/dhcp4.leases";
                persist = true;
                type = "memfile";
              };
              option-data = [
                {
                  name = "domain-name-servers";
                  data = "10.15.0.1";
                  always-send = true;
                }
                {
                  name = "routers";
                  data = "10.15.0.1";
                }
                {
                  name = "domain-name";
                  data = "doom.lan";
                }
              ];

              rebind-timer = 2000;
              renew-timer = 1000;
              valid-lifetime = 4000;

              subnet4 = [
                {
                  pools = [
                    {
                      pool = "10.15.0.100 - 10.15.0.200";
                    }
                  ];
                  option-data = [
                    {
                      name = "routers";
                      data = "10.15.0.1";
                    }
                  ];
                  subnet = "10.15.0.0/24";
                }
              ];
            };
          };
        };
      };

      users.extraUsers.sam = {
        isNormalUser = true;
        description = "Sam Leathers";
        extraGroups = [ "wheel" ];
        openssh.authorizedKeys.keys = [
          "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDEPOLnk4+mWNGOXd309PPxal8wgMzKXHnn7Jbu/SpSUYEc1EmjgnrVBcR0eDxgDmGD9zJ69wEH/zLQLPWjaTusiuF+bqAM/x7z7wwy1nZ48SYJw3Q+Xsgzeb0nvmNsPzb0mfnpI6av8MTHNt+xOqDnpC5B82h/voQ4m5DGMQz60ok2hMeh+sy4VIvX5zOVTOFPQqFR6BGDwtALiP5PwMfyScYXlebWHhDRdX9B0j9t+cqiy5utBUsl4cIUInE0KW7Z8Kf6gIsmQnfSZadqI857kdozU3IbaLoJc1C6LyVjzPFyC4+KUC11BmemTGdCjwcoqEZ0k5XtJaKFXacYYXi1l5MS7VdfHldFDZmMEMvfJG/PwvXN4prfOIjpy1521MJHGBNXRktvWhlNBgI1NUQlx7rGmPZmtrYdeclVnnY9Y4HIpkhm0iEt/XUZTMQpXhedd1BozpMp0h135an4uorIEUQnotkaGDwZIV3mSL8x4n6V02Qe2CYvqf4DcCSBv7D91N3JplJJKt7vV4ltwrseDPxDtCxXrQfSIQd0VGmwu1D9FzzDOuk/MGCiCMFCKIKngxZLzajjgfc9+rGLZ94iDz90jfk6GF4hgF78oFNfPEwoGl0soyZM7960QdBcHgB5QF9+9Yd6QhCb/6+ENM9sz6VLdAY7f/9hj/3Aq0Lm4Q== samuel.leathers@iohk.io"
        ];
      };
      users.extraUsers.root = {
        openssh.authorizedKeys.keys = [
          "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDEPOLnk4+mWNGOXd309PPxal8wgMzKXHnn7Jbu/SpSUYEc1EmjgnrVBcR0eDxgDmGD9zJ69wEH/zLQLPWjaTusiuF+bqAM/x7z7wwy1nZ48SYJw3Q+Xsgzeb0nvmNsPzb0mfnpI6av8MTHNt+xOqDnpC5B82h/voQ4m5DGMQz60ok2hMeh+sy4VIvX5zOVTOFPQqFR6BGDwtALiP5PwMfyScYXlebWHhDRdX9B0j9t+cqiy5utBUsl4cIUInE0KW7Z8Kf6gIsmQnfSZadqI857kdozU3IbaLoJc1C6LyVjzPFyC4+KUC11BmemTGdCjwcoqEZ0k5XtJaKFXacYYXi1l5MS7VdfHldFDZmMEMvfJG/PwvXN4prfOIjpy1521MJHGBNXRktvWhlNBgI1NUQlx7rGmPZmtrYdeclVnnY9Y4HIpkhm0iEt/XUZTMQpXhedd1BozpMp0h135an4uorIEUQnotkaGDwZIV3mSL8x4n6V02Qe2CYvqf4DcCSBv7D91N3JplJJKt7vV4ltwrseDPxDtCxXrQfSIQd0VGmwu1D9FzzDOuk/MGCiCMFCKIKngxZLzajjgfc9+rGLZ94iDz90jfk6GF4hgF78oFNfPEwoGl0soyZM7960QdBcHgB5QF9+9Yd6QhCb/6+ENM9sz6VLdAY7f/9hj/3Aq0Lm4Q== samuel.leathers@iohk.io"
          "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDLXWTrZ1bFD+mz+PUQfbHPsOKbsUVY46ZqQWh+PInNZgoxLt2LZRma9nb4kF529PgWg3amWiIrLKFUa5ro7pHo53uGmIDLY3vgs1Bj0mMKvBS68rcyBwb/Q0MBx51yjlUFc0VPtUMlT9HgmGjF7owosuwyNRVGN7cp2Fn5j2VwAmvagqUi1VQl1onpIKmkPEzseR9SbY5E/5I9avdOuJimw5MKRYTZeI525xiFWtCx1812E9cfgeFFXGKEngaAd1Lw/m6P3Oapumll6dp0oVjfRrT1lPO0Vk9LWMfho5mE0zUm4qVKwqk8kfe0UPDRyErY0OGZRrSGufgdgp06AUjt carloslopezdelara@iMacCLR-9.local"
        ];
      };

      boot.extraModprobeConfig = ''
        options kvm_intel nested=1
        options kvm_intel emulate_invalid_guest_state=0
        options kvm ignore_msrs=1
      '';
      networking.networkmanager.enable = lib.mkForce false;
      nixpkgs.config.pulseaudio = true;
      hardware = {
        opengl.enable = true;
        opengl.driSupport32Bit = true;
        opengl.extraPackages = [ pkgs.vaapiIntel ];
        pulseaudio.enable = true;
      };
      sound.enable = true;

    };
  adminGui = { pkgs, ... }: {
    environment.systemPackages = [
      pkgs.sway
    ];
    #services.xserver = {
    #  enable = true;
    #  #displayManager.gdm.enable = true;
    #  #desktopManager.gnome.enable = true;
    #};
  };
  hydraCageRemote = { pkgs, ... }:
    let
      chrome-kiosk-wrapper = pkgs.writeShellApplication {
        name = "chrome-kiosk-wrapper";
        text = ''
          rm -f ~/.config/google-chrome/Singleton
          ${pkgs.google-chrome}/bin/google-chrome-stable --app=http://doom-offline.local
        '';
      };
    in
    {
      services = {
        cage = {
          enable = true;
          program = "${chrome-kiosk-wrapper}/bin/chrome-kiosk-wrapper";
          user = "doom";
        };
      };
    };
  hydraBase = _:
    let
      system = "x86_64-linux";
    in
    {

      imports = [
        nixosModules.hydra-node
        nixosModules.hydra-control-plane
      ];
      networking.hosts = lib.mkForce {
        "127.0.0.1" = [ "localhost" "doom-remote.local" "doom-offline.local" ];
        "::1" = [ "localhost" "doom-remote.local" "doom-offline.local" ];
      };
      environment.systemPackages = with self.packages.${system}; [
        hydra-tui-wrapper
      ];
      users = {
        users."doom" = {
          createHome = true;
          group = "doom";
          extraGroups = [ "plugdev" ];
          home = "/home/doom";
          uid = 9999;
          isNormalUser = true;
        };
        groups.doom = { };
        groups.plugdev = { };
      };
      services = {
        hydra-node = {
          enable = true;
        };
        hydra-control-plane = {
          enable = true;
          reserved = true;
        };
        nginx = {
          enable = true;
          virtualHosts = {
            "offline.doom.lan" = {
              root = self.packages.${system}.hydra-doom-static.overrideAttrs (_finalAttrs: prevAttrs: {
                passthru = prevAttrs.passthru // {
                  serverUrl = "http://offline.doom.lan:8000";
                  useMouse = "1";
                  cabinetKey = import ../deployment/cabinet-key.nix;
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
    };
  baseConfig = { pkgs, ... }: {
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


    systemd.services.sshd.wantedBy = lib.mkForce [ "multi-user.target" ];
    users.users.root.openssh.authorizedKeys.keys = [
      # we hard-code this because it runs on the system itself
      "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDEPOLnk4+mWNGOXd309PPxal8wgMzKXHnn7Jbu/SpSUYEc1EmjgnrVBcR0eDxgDmGD9zJ69wEH/zLQLPWjaTusiuF+bqAM/x7z7wwy1nZ48SYJw3Q+Xsgzeb0nvmNsPzb0mfnpI6av8MTHNt+xOqDnpC5B82h/voQ4m5DGMQz60ok2hMeh+sy4VIvX5zOVTOFPQqFR6BGDwtALiP5PwMfyScYXlebWHhDRdX9B0j9t+cqiy5utBUsl4cIUInE0KW7Z8Kf6gIsmQnfSZadqI857kdozU3IbaLoJc1C6LyVjzPFyC4+KUC11BmemTGdCjwcoqEZ0k5XtJaKFXacYYXi1l5MS7VdfHldFDZmMEMvfJG/PwvXN4prfOIjpy1521MJHGBNXRktvWhlNBgI1NUQlx7rGmPZmtrYdeclVnnY9Y4HIpkhm0iEt/XUZTMQpXhedd1BozpMp0h135an4uorIEUQnotkaGDwZIV3mSL8x4n6V02Qe2CYvqf4DcCSBv7D91N3JplJJKt7vV4ltwrseDPxDtCxXrQfSIQd0VGmwu1D9FzzDOuk/MGCiCMFCKIKngxZLzajjgfc9+rGLZ94iDz90jfk6GF4hgF78oFNfPEwoGl0soyZM7960QdBcHgB5QF9+9Yd6QhCb/6+ENM9sz6VLdAY7f/9hj/3Aq0Lm4Q== samuel.leathers@iohk.io"
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIATbejW2TmxxkzFxDzU0Lw2S4Lig0UdSgl8xO761WVtd Adam Key"
      "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDHRjFKHOS4lOw907VWvDMrx/XawRMV2wyc+VSbA4YHnG2ecv6y/JT3gBjmdNw0bgltgQqeBBG/iTciio+Zax8I36rPWMEomDvpgq8B7i1L23eWoK9cKMqYNAUpIAfManhJKvZfBjJ9dRLz4hfUGo2Gah5reuweFrkzWGb2zqILNXoM2KowlkqMOFrd09SgP52sUuwNmaCJaPba7IdqzLqxotWaY420Msd5c8B2l/0E/hNgRu6m5qbZpidmQQJsTk2tq4CWP5xB2SbgEwAuZZ6AUOn2IqGfF8bkLfwHb5qdtss0jxZm47s5Fag9T9MzzbXCAHEdyO01+q83FKIxkiW/ sebastian"
    ];
  };
in
{
  flake.colmena = {
    meta = {
      nixpkgs = import inputs.nixpkgs {
        system = "x86_64-linux";
      };
    };
    hydra-arcade-test = { config, ... }: {
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
          sshKeyPaths = [ "/etc/ssh/ssh_host_ed25519_key" ];
        };
        secrets.wg0PrivateKey = { };
      };
    };
    hydra-arcade-1 = { config, ... }: {
      deployment = {
        targetHost = "hydra-arcade-1";
        targetPort = 22;
        targetUser = "root";
      };
      networking.hostName = "hydra-arcade-1";
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
          sshKeyPaths = [ "/etc/ssh/ssh_host_ed25519_key" ];
        };
        secrets.wg0PrivateKey = { };
      };
    };
    hydra-arcade-2 = { config, ... }: {
      deployment = {
        targetHost = "hydra-arcade-2";
        targetPort = 22;
        targetUser = "root";
      };
      networking.hostName = "hydra-arcade-2";
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
          sshKeyPaths = [ "/etc/ssh/ssh_host_ed25519_key" ];
        };
        secrets.wg0PrivateKey = { };
      };
    };
    hydra-doom-mini = { config, ... }: {
      deployment = {
        targetHost = "hydra-doom-mini";
        targetPort = 22;
        targetUser = "root";
      };
      networking.hostName = "hydra-doom-mini";
      imports = [
        inputs.sops-nix.nixosModules.sops
        baseConfig
        miniHardware
        hydraBase
        #hydraCageLocal
        adminGui
        ../deployment/hydra-doom-mini/hardware-configuration.nix
        (mkWireGuardTunnel [ "10.40.9.9/24" "fd00::9" ] config.sops.secrets.wg0PrivateKey.path)
      ];
      networking.hostId = "37f9660d"; # required for zfs use
      sops = {
        defaultSopsFile = ../deployment/hydra-doom-mini/secrets.yaml;
        age = {
          sshKeyPaths = [ "/etc/ssh/ssh_host_ed25519_key" ];
        };
        secrets.wg0PrivateKey = { };
      };
    };
  };
}
