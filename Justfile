set shell := ["bash", "-uc"]
set positional-arguments

# List all just recipes available
default:
  @just --list

# Deploy select machines
apply machine:
  echo "\"$(sops -d deployment/{{machine}}/secrets.yaml|grep cabinetKey|cut -d' ' -f2)\"" > deployment/cabinet-key.nix
  colmena apply --verbose --on {{machine}}
  git checkout HEAD deployment/cabinet-key.nix

# Generate age key
generate-age-key:
  #!/usr/bin/env bash
  mkdir -p ~/.config/sops/age
  if [ ! -f ~/.config/sops/age/keys.txt ]; then
    echo "Generating private age key..."
    age-keygen -o ~/.config/sops/age/keys.txt
    echo "Backup ~/.config/sops/age/keys.txt or you will lose access to secrets!!!"
  else
    echo "Not regenerating key because age key already exists!"
  fi
  echo "Your public key is: $(age-keygen -y ~/.config/sops/age/keys.txt)"

generate-cabinet-key:
  #!/usr/bin/env bash
  cardano-cli address key-gen --signing-key-file /dev/stdout --verification-key-file /dev/null|jq -r .cborHex|cut -c 5-
