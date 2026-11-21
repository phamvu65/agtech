// CMake hashes deep object paths before Windows Ninja reaches MAX_PATH.
const { withAppBuildGradle } = require("expo/config-plugins");
module.exports = function withShortCmakePaths(config) {
  return withAppBuildGradle(config, (mod) => {
    const argument =
      'externalNativeBuild { cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=240" } }';
    if (!mod.modResults.contents.includes("CMAKE_OBJECT_PATH_MAX")) {
      mod.modResults.contents = mod.modResults.contents.replace(
        "defaultConfig {",
        `defaultConfig {\n        ${argument}`,
      );
    }
    return mod;
  });
};
