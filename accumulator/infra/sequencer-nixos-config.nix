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
        "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCz7QlDRx7Vvra3XCfB4bWwFSxEgw81DHgeNrFTR5dxT/J29MfZhW+rjJXR4mVAvUGEBlNsGJ6EwBt65FqWxuWTGARoW2jBVMxqwqxldYLKHWcWTv8IdaYAQniKwfOX/3NaaQEw93HwHbb8aYjbBudR/UtwOgT0vDpuxUzPwIDRxea3Za64qV0H7s6PnfbC5DcC9fOX72fiGXuwMaZAUN8dIgI9mZcEn3yaWfwqYQ+Qcx6pDEWG73YLXJfoZ7UtSp+GF6lgOcTc7pw+NIoUcU/Pq+I0d7ECIEaRXv97U2R8lbgBRkR7NIBjxqSKHb3m5wfDvLQGrrn2Mg7zmGa8buyfeNaBfolEfa+c8R2fS8smvd7El3K/ogMeRJ3j5actRIP74UKqrgQd6nTJDkxD4F09bDHcke+PLlLkyURnatcRGH3J56sVTXRM5mRGuoFufBz8s6K+jS2Fmxirf97fJ61gq/M7w4LEDDX2gncrNeX+QmqGeWXV5wBFkvS2lxYGl88="
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
  networking.interfaces.ens5.ipv4.routes = [ {
    address = "169.254.169.254";
    prefixLength = 32;
    via = "10.0.0.1";
  }];

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
            REGION = "eu-central-1";
            BUCKET_PREFIX = "mina-fast-zk-rollup";
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
