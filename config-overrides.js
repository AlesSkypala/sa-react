const path = require("path");
const {
  override
} = require("customize-cra");

const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

module.exports = override(
  // make the file loader ignore wasm files
  config => {
    config.module.rules.find(rule => {
      return (rule.oneOf || []).find(item => {
        if (item.loader && item.loader.indexOf("file-loader") >= 0) {
          item.exclude.push(/\.wasm$/); //exclude wasm
          return true; //ignore remaining rules
        }
      });
    });

    return config;
  },

  //hook up our helloHelper wasm module
  config => {
    config.plugins = (config.plugins || []).concat([
      new WasmPackPlugin({
        crateDirectory: path.resolve(__dirname, "./plotting"),
        outDir: path.resolve(__dirname, "./src/plotting"),
        forceMode: 'production',
      })
    ]);

    return config;
  }
);