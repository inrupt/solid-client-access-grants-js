/* eslint import/extensions: 0 */
import packageJson from "./package.json";

export default () => ({
  libraryRepoUrl: packageJson.repository.url,
  demoRepoUrl: packageJson.repository.url,
  copyright: "Copyright 2021 Inrupt, Inc.",
  demoTitle: "Web App Template Demo",
  demoDescription: "A template for building in-browser demos",
});
