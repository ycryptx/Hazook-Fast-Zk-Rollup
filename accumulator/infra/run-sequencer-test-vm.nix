{ pkgs ? import (
  builtins.fetchTarball {
    # Note: keep in sync with AMI image deployed on EC2!!!!!
    url = "https://github.com/NixOS/nixpkgs/archive/aed4b19d312525ae7ca9bceb4e1efe3357d0e2eb.tar.gz";
    sha256 = "sha256:1hxgxfa5a880xw1ni7xssg3zbkg3dl62w7qgiln636m80zaqma24";
  }) { } }:

let
  testVmClosure = { ... }: {
    imports = [ ./sequencer-nixos-config.nix ];
    # Setting root password as empty to interactively debug the VM.
    users.users.root.password = "";
    users.mutableUsers = false;
  };
in (pkgs.nixos testVmClosure).vm
