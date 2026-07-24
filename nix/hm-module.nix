# Home Manager module for Showhow
# Usage in flake-based Home Manager config:
#
#   inputs.showhow-desktop.url = "github:bedarstudios/showhow";
#
#   { inputs, ... }: {
#     imports = [ inputs.showhow-desktop.homeManagerModules.default ];
#     programs.showhow-desktop.enable = true;
#   }
self:
{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.programs.showhow-desktop;
in
{
  options.programs.showhow-desktop = {
    enable = lib.mkEnableOption "Showhow workflow documentation recorder";

    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.showhow-desktop;
      defaultText = lib.literalExpression "inputs.showhow-desktop.packages.\${pkgs.stdenv.hostPlatform.system}.showhow-desktop";
      description = "The Showhow package to use.";
    };
  };

  config = lib.mkIf cfg.enable {
    home.packages = [ cfg.package ];
  };
}
