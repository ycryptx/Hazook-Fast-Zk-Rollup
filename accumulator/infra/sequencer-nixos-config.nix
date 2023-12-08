{ config, pkgs, lib, ... }:

{
  imports = [ <nixpkgs/nixos/modules/virtualisation/amazon-image.nix> ];
  ec2.hvm = true;
  security.sudo.wheelNeedsPassword = false;

  users.users = {
    ninjatrappeur = {
      isNormalUser = true;
      extraGroups = [ "wheel" ];
      openssh.authorizedKeys.keys = [
        "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHzd1XAB7Pc8Tplur5iV3llOXtvlHru8pLtQlbvHzmt1"
        "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOE7oDtq+xt5RuvMigDZMeZQODFr5Otz6HCO8wnI80oo"
      ];
    };
    ycryptx = {
      isNormalUser = true;
      extraGroups = [ "wheel" ];
      openssh.authorizedKeys.keys = [
        (builtins.readFile ./ycryptx.pub)
      ];
    };
  };

  services = {
    openssh = {
      enable = true;
      settings = {
        PasswordAuthentication = false;
        KbdInteractiveAuthentication = false;
      };
    };
  };

  services.nginx = {
    enable = true;
    virtualHosts."ec2-3-120-144-49.eu-central-1.compute.amazonaws.com" = {
      addSSL = true;
      # Self-signed certificates.
      sslCertificate = "/var/lib/acme/ec2-3-120-144-49.eu-central-1.compute.amazonaws.com/cert.pem";
      sslCertificateKey = "/var/lib/acme/ec2-3-120-144-49.eu-central-1.compute.amazonaws.com/key.pem";
      locations."/" = {
        extraConfig = ''
          grpc_pass grpc://127.0.0.1:8080;
        '';
      };
    };
  };

  security.acme = {
    defaults.email = "consulting@alternativebit.fr";
    acceptTerms = true;
  };

  networking.firewall.allowedTCPPorts = [
    80
    443
    22
  ];

  # We need to explicitely route the metadata service through the
  # subnet VPC. It won't respond from the public one.
  networking.interfaces.ens5.ipv4.routes = [{
    address = "169.254.169.254";
    prefixLength = 32;
    via = "10.0.0.1";
  }];

  networking.nat = {
    enable = true;
    internalInterfaces = [
      "podman0"
    ];
    externalInterfaces = [
      "ens5"
    ];
  };

  virtualisation = {
    podman = {
      enable = true;
    };
    oci-containers = {
      backend = "podman";
      containers = {
        zk-rollup = {
          image = "public.ecr.aws/y6u2m5w7/zk-rollup-docker-registry:latest";
          autoStart = true;
          extraOptions = [ "--expose=8080" ];
          ports = [
            "8080:8080"
          ];
          environment = {
            MODE = "production";
            GRPC_SERVER_PORT = "8080";
            REGION = "us-west-2";
            BUCKET_PREFIX = "673156464838-mina-fast-zk-rollup";
          };
        };
      };
    };
  };

  # Dirty hack time. There's sadly currently no way to add some custom
  # script to the container systemd pre-start target on NixOS.
  # PRd a fix upstream: https://github.com/NixOS/nixpkgs/pull/241908
  #
  # It's going to take a while before reaching the stable releases.
  # Until then, we vendor the upstream pre-start script in the
  # overriden one.
  #
  # On top of that we pull the latest image from the docker registry
  # to make sure we're always using the most up-to-date image.
  systemd.services.podman-zk-rollup.preStart = lib.mkForce ''
    podman rm -f zk-rollup || true
    rm -f /run/podman-zk-rollup.ctr-id
    podman pull public.ecr.aws/y6u2m5w7/zk-rollup-docker-registry:latest
  '';

}
