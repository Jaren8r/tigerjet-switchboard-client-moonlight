import { ExtensionWebExports } from "@moonlight-mod/types";

// https://moonlight-mod.github.io/ext-dev/webpack/#patching
export const patches: ExtensionWebExports["patches"] = [];

// https://moonlight-mod.github.io/ext-dev/webpack/#webpack-module-insertion
export const webpackModules: ExtensionWebExports["webpackModules"] = {
  entrypoint: {
    dependencies: [{ ext: "tigerjetSwitchboardClient", id: "discord" }],
    entrypoint: true
  },
  discord: {
    dependencies: [{ id: "discord/Dispatcher" }, { id: "spacepack" }]
  }
};
