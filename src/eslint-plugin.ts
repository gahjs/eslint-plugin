import { GahModuleType, GahPlugin, GahPluginConfig } from "@gah/shared";

import { EslintPluginConfig } from "./eslint-config";

/**
 * A gah plugin has to extend the abstract GahPlugin base class and implement the abstract methods.
 */
export class EslintPlugin extends GahPlugin {
  constructor() {
    // Call the constructor with the name of the plugin (only used for logging, does not need to match the package name)
    super("TemplatePlugin");
  }

  /**
   * Called after adding the plugin with gah. Used to configure the plugin.
   * @param existingCfg This will be passed by gah and is used to check wheter a property is already configured or not
   */
  public async onInstall(
    existingCfg: EslintPluginConfig
  ): Promise<GahPluginConfig> {
    // Create a new instance of the plugin configuration
    const newCfg = new EslintPluginConfig();

    return newCfg;
  }

  /**
   * Called everytime gah gets used for all configured plugins. Register your handlers here.
   */
  public onInit() {
    this.registerCommandHandler("lint", async (args, gahFile) => {
      for (const module of gahFile?.modules!) {
        if (module.isHost) {
          continue;
        }
        this.loggerService.log("Linting " + module.moduleName);
        await this.executionService.execute(
          "ng lint",
          true,
          undefined,
          module.basePath
        );
      }

      return true;
    });
  }

  /**
   * For convenience the correctly casted configuration
   */
  private get cfg() {
    return this.config as EslintPluginConfig;
  }
}
