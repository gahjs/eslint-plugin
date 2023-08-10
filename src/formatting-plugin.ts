import { GahFileData, GahPlugin, GahPluginConfig } from '@gah/shared';

import { FormattingPluginConfig } from './formatting-config';

/**
 * A gah plugin has to extend the abstract GahPlugin base class and implement the abstract methods.
 */
export class FormattingPlugin extends GahPlugin {
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
    const newCfg = this.cfg ?? new FormattingPluginConfig();
    return newCfg;
  }

  /**
   * This method is a workaround for the issue that the package import is not working in the CI environment.
   * Any required linting or prettier config is not installed in the directory of the module, because yarn install is not called there.
   */
  private async createPackageImportWorkaround(gahFile: GahFileData) {
    const hostModule = gahFile.modules.find(x => x.isHost)!;
    const hostNodeModules = this.fileSystemService.join(hostModule.basePath, 'node_modules');
    const rootDir = await this.gitService.getRootDir();
    const rootNodeModules = this.fileSystemService.join(rootDir, 'node_modules');
    if (await this.fileSystemService.directoryExists(rootNodeModules)) {
      await this.fileSystemService.deleteDirectoryRecursively(rootNodeModules);
    }
    await this.fileSystemService.createDirLink(rootNodeModules, hostNodeModules);
  }

  /**
   * Called everytime gah gets used for all configured plugins. Register your handlers here.
   */
  public onInit() {
    this.registerCommandHandler('lint', async (args, gahFile) => {
      let result = true;
      const modulesWithUniquePaths = gahFile!.modules.filter((v, i, a) => a.findIndex(t => t.basePath === v.basePath) === i);

      if (args.includes('ci')) {
        await this.createPackageImportWorkaround(gahFile!);
      }

      for (const module of modulesWithUniquePaths) {
        if (module.isHost) {
          continue;
        }
        this.loggerService.startLoadingAnimation(`Linting ${module.moduleName}`);
        const res = await this.executionService.execute('ng lint', false, undefined, module.basePath);
        if (res) {
          this.loggerService.stopLoadingAnimation(false, true, `Linting successfull for ${module.moduleName}`);
        } else {
          this.loggerService.stopLoadingAnimation(false, false, `Linting failed for ${module.moduleName}`);
          this.loggerService.error(this.executionService.executionResult);
          result = false;
        }
      }

      return result;
    });

    this.registerCommandHandler('prettier', async (args, gahFile) => {
      let result = true;
      const modulesWithUniquePaths = gahFile!.modules.filter((v, i, a) => a.findIndex(t => t.basePath === v.basePath) === i);

      if (args.includes('ci')) {
        await this.createPackageImportWorkaround(gahFile!);
      }

      this.loggerService.startLoadingAnimation('Installing prettier globally');
      const prettierInstallRes = await this.executionService.execute('yarn global add prettier@^2.8.8', false);
      this.loggerService.stopLoadingAnimation(
        false,
        prettierInstallRes,
        prettierInstallRes ? 'Prettier installed successfully' : 'Failed to install prettier'
      );
      if (!prettierInstallRes) {
        return false;
      }

      for (const module of modulesWithUniquePaths) {
        if (module.isHost) {
          continue;
        }
        this.loggerService.startLoadingAnimation(`Checking ${module.moduleName}`);
        const res = await this.executionService.execute(
          this.cfg.prettierCommand ?? 'prettier --check "**/*.ts"',
          false,
          undefined,
          module.basePath
        );
        if (res) {
          this.loggerService.stopLoadingAnimation(false, true, `Prettier check successfull for ${module.moduleName}`);
        } else {
          this.loggerService.stopLoadingAnimation(false, false, `Prettier check failed for ${module.moduleName}`);
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
    return this.config as FormattingPluginConfig;
  }
}
