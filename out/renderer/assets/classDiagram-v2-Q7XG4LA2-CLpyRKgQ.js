import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-727SXJPM-BbMirR5G.js";
import { _ as __name } from "./index-ufGy8Tqm.js";
import "./chunk-FMBD7UC4-DvjhRrLp.js";
import "./chunk-ND2GUHAM-DVkoNX0X.js";
import "./chunk-55IACEB6-JEAA1Gwu.js";
import "./chunk-2J33WTMH-D75fZB0f.js";
var diagram = {
  parser: classDiagram_default,
  get db() {
    return new ClassDB();
  },
  renderer: classRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.class) {
      cnf.class = {};
    }
    cnf.class.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
