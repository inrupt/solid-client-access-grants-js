/* eslint-disable header/header */

export const ralewayMedium = (path: string): string => `
@font-face {
  font-family: "Raleway-Medium";
  src: url("${path}.eot"); /* IE9 Compat Modes */
  src: url("${path}.eot?#iefix") format("embedded-opentype"), /* IE6-IE8 */
    url("${path}.otf") format("opentype"), /* Open Type Font */
    url("${path}.svg") format("svg"), /* Legacy iOS */
    url("${path}.woff") format("woff"), /* Modern Browsers */
    url("${path}.woff2") format("woff2"); /* Modern Browsers */
  font-weight: normal;
  font-style: normal;
}`;
