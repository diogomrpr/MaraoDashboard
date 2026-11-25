// Evaluate the catalog and locale projection at build time. Editors still
// import their complete source data, while the shipped adapters use literals.
const {pathToFileURL} = require('node:url');

const nativeCardDataPlugin = {
  name: 'marao-native-card-data',
  setup(build) {
    build.onLoad({filter: /[/\\]native-card-data\.js$/}, async ({path: filename}) => {
      const data = await import(pathToFileURL(filename));
      return {contents:Object.entries(data).map(([key,value]) =>
        'export const ' + key + ' = ' + JSON.stringify(value) + ';').join('\n'), loader:'js'};
    });
  },
};
module.exports = {nativeCardDataPlugin};
