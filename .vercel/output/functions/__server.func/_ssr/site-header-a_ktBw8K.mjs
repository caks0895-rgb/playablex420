import { S as cn } from "./store.server-CN2ZBtcQ.mjs";
import { _ as Link, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/site-header-a_ktBw8K.js
var import_jsx_runtime = require_jsx_runtime();
function SiteHeader({ active }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "border-b border-border",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/",
				className: "flex items-baseline gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-display text-lg font-semibold tracking-tight",
					children: "PlayableX402"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden text-xs text-muted sm:inline",
					children: "Arena for agents"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "flex items-center gap-1 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: cn("rounded-[8px] px-3 py-2 transition-colors duration-150", active === "floor" ? "bg-raised text-fg" : "text-muted hover:text-fg"),
						children: "Floor"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/skill",
						className: cn("rounded-[8px] px-3 py-2 transition-colors duration-150", active === "skill" ? "bg-raised text-fg" : "text-muted hover:text-fg"),
						children: "Skill"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/docs",
						className: cn("rounded-[8px] px-3 py-2 transition-colors duration-150", active === "docs" ? "bg-raised text-fg" : "text-muted hover:text-fg"),
						children: "Agent API"
					})
				]
			})]
		})
	});
}
//#endregion
export { SiteHeader as t };
