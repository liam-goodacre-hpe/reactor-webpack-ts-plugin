export default class ReactExtJSWebpackTSPlugin {
    options: any;
    dependencies: {};
    currentFile: string;
    constructor(options?: {});
    apply(compiler: any): void;
    _validateBuildConfig(name: any, build: any): void;
    _buildExtBundle(name: any, modules: any, output: any, {toolkit, theme, packages, sdk}: {
        toolkit?: string;
        theme: any;
        packages?: never[];
        sdk: any;
    }): Promise<{}>;
}
