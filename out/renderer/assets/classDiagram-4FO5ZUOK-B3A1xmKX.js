import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-727SXJPM-BOcAl-YA.js";
import { _ as __name } from "./index-U_OPcZ2N.js";
import "./chunk-FMBD7UC4-DswqAxuE.js";
import "./chunk-ND2GUHAM-DLmbVDBA.js";
import "./chunk-55IACEB6-DhdUmGeS.js";
import "./chunk-2J33WTMH-BZBNGA2Q.js";
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
