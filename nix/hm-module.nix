# Home Manager module for Showhow
# Usage in flake-based Home Manager config:
#
#   inputs.showhow.url = "github:bedarstudios/showhow";
#
#   { inputs, ... }: {
#     imports = [ inputs.showhow.homeManagerModules.default ];
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
    home.packages = [ cfg.package ];
  };
}
