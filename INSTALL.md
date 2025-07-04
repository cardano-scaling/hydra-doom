1. Install Ubuntu v20+
   1. If using Windows:
       1. Turn on virtualization at the BIOS level
       2. Enable Hyper-V
       3. iii. Install Windows Subsystem for Linux (WSL) Version 2
       4. iv.  Install Ubuntu from the Microsoft Store
   2. If using Linux:
       1. Just install Ubuntu bro
2. Install Nix Shell
   1. Follow instructions for "multi-user installation" following instructions here: https://nixos.org/download/
       1. sh <(curl -L https://nixos.org/nix/install) --daemon
   2. Restart your terminal session after installing Nix Shell
   3. Update Nix configuration to support experimental features and install IOG Nix Cache
       1. Modify /etc/nix/nix.conf
       2. Add the following:
     ```
     auto-optimise-store = true
     max-jobs = auto
     extra-nix-path = nixpkgs=flake:nixpkgs
     upgrade-nix-store-path-url = https://install.determinate.systems/nix-upgrade/stable/universal
     substituters = https://cache.iog.io https://cache.nixos.org/
     trusted-public-keys = cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY= hydra.iohk.io:f/Ea+s+dFdN+3Y/G+FDgSq+a5NEWhJGzdjvKNGv0/EQ=
     experimental-features = nix-command flakes fetch-closure
    ```
3. Clone the hydra-doom repository
   1. `git clone https://github.com/cardano-scaling/hydra-doom`
4. Transfer to the hydra-doom directory
   1. `cd hydra-doom`
   2. Checkout the `single-player` branch: `git checkout single-player`
5. Use Nix to build and run Hydra DOOM!
   1.  `nix run`
   > Note that Nix Run will most likely be very slow the first time you run it
   > as the system must build up its caches and build the packages but subsequent
   > runs will be much quicker once the cache is hydrated locally.
6. Once you see the "control plane" running on your local terminal you may connect to http://localhost:3000 in order to play!