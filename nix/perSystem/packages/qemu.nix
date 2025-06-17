_: {
  perSystem = { pkgs, ... }:
    {
      packages = {
        qemu-run-iso = pkgs.writeShellApplication {
          name = "qemu-run-iso";
          runtimeInputs = with pkgs; [ fd qemu_kvm ];

          text = ''
            if fd --type file --has-results 'nixos-.*\.iso' result/iso 2> /dev/null; then
              echo "Symlinking the existing iso image for qemu:"
              ln -sfv result/iso/nixos-*.iso result-iso
              echo
            else
              echo "No iso file exists to run, please build one first, example:"
              echo "  nix build -L .#nixosConfigurations.kiosk-boot.config.system.build.isoImage"
              exit
            fi

            qemu-kvm \
              -smp 2 \
              -m 4G \
              -drive file=result-iso,format=raw,if=none,media=cdrom,id=drive-cd1,readonly=on \
              -device ahci,id=achi0 \
              -device ide-cd,bus=achi0.0,drive=drive-cd1,id=cd1,bootindex=1 \
          '';
        };
      };
    };
}
