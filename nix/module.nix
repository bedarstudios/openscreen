# NixOS module for Showhow
# Usage in flake-based NixOS config:
#
#   inputs.showhow.url = "github:bedarstudios/showhow";
#
#   { inputs, ... }: {
#     imports = [ inputs.showhow.nixosModules.default ];
#     programs.showhow.enable = true;
#   }
self:
{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.programs.showhow;
in
{
  options.programs.showhow = {
    enable = lib.mkEnableOption "Showhow workflow documentation recorder";

    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.showhow;
      defaultText = lib.literalExpression "inputs.showhow.packages.\${pkgs.stdenv.hostPlatform.system}.showhow";
      description = "The Showhow package to use.";
    };
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [ cfg.package ];

    # Screen capture on Wayland requires xdg-desktop-portal.
    # We enable the base portal; users should also enable a
    # desktop-specific portal (e.g. xdg-desktop-portal-gtk,
    # xdg-desktop-portal-hyprland) in their DE config.
    xdg.portal.enable = lib.mkDefault true;
  };
}
