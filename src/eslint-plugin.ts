import { GahPlugin, GahPluginConfig } from '@gah/shared';

import { EslintPluginConfig } from './eslint-config';

/**
 * A gah plugin has to extend the abstract GahPlugin base class and implement the abstract methods.
 */
export class EslintPlugin extends GahPlugin {
  constructor() {
    // Call the constructor with the name of the plugin (only used for logging, does not need to match the package name)
    super('TemplatePlugin');
  }

  /**
   * Called after adding the plugin with gah. Used to configure the plugin.
   * @param existingCfg This will be passed by gah and is used to check wheter a property is already configured or not
   */
  public async onInstall(): Promise<GahPluginConfig> {
    // Create a new instance of the plugin configuration
    const newCfg = new EslintPluginConfig();

    return newCfg;
  }

  /**
   * Called everytime gah gets used for all configured plugins. Register your handlers here.
   */
  public onInit() {
    this.registerCommandHandler('lint', async (args, gahFile) => {
      let result = true;
      const modulesWithUniquePaths = gahFile!.modules.filter((v, i, a) => a.findIndex(t => t.basePath === v.basePath) === i);
      for (const module of modulesWithUniquePaths) {
        if (module.isHost) {
          continue;
        }
        this.loggerService.log(`Linting ${module.moduleName}`);
        const res = await this.executionService.execute('ng lint', false, undefined, module.basePath);
        if (res) {
          this.loggerService.success(`Linting successfull for ${module.moduleName}`);
        } else {
          this.loggerService.error(`Linting failed for ${module.moduleName}`);
          this.loggerService.error(this.executionService.executionResult);
          result = false;
        }
      }

      return result;
    });
  }

  /**
   * For convenience the correctly casted configuration
   */
  private get cfg() {
    return this.config as EslintPluginConfig;
  }
}
