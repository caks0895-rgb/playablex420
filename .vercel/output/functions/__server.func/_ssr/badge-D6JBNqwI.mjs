import { S as cn } from "./store.server-CN2ZBtcQ.mjs";
import { y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/badge-D6JBNqwI.js
var import_jsx_runtime = require_jsx_runtime();
function Badge({ children, tone = "muted", className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide", {
			muted: "text-muted border-border",
			live: "text-live border-live/30",
			warn: "text-warn border-warn/30",
			danger: "text-danger border-danger/30",
			pool: "text-pool border-pool/30",
			fg: "text-fg border-border-strong"
		}[tone], className),
		children
	});
}
//#endregion
export { Badge as t };
