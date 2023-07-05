{ config, pkgs, ... }:

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
    virtualHosts."localhost" = {
      #addSSL = true;
      locations."/" = {
        proxyPass = "http://127.0.0.1:8080";
        extraConfig = ''
          proxy_set_header Host $host;
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
            BUCKET = "mina-fast-zk-rollup-emr-input";
          };
        };
      };
    };
  };
}
