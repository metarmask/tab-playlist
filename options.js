(async () => {

for(const scope of ["tab", "global"]) {
	let parentId;
	if(scope === "global") {
		parentId = `options_scope_${scope}`;
		await browser.contextMenus.create({
			title: getText("options_global"),
			contexts: ["page_action"],
			id: parentId
		});
	}
	for(const [key, {"default": aDefault, hidden}] of Object.entries(Tab.options)) {
		if(hidden === "always" || hidden === scope) continue;
		if(typeof aDefault !== "boolean") throw new Error("Cannot handle non-boolean" + aDefault);
		let title = getText("options_option_" + key);
		if(hidden === "upcoming") {
			title += " " + getText("options_upcoming");
		}
		await browser.contextMenus.create({
			title,
			enabled: hidden !== "upcoming",
			id: `options_option_${scope}_${key}`,
			checked: aDefault,
			contexts: ["page_action"],
			type: "checkbox",
			parentId
		});
	}
}

})();


browser.contextMenus.onClicked.addListener(({menuItemId: id, checked}, rawTab) => {
	const idPrefix = "options_option_";
	debugLog(id, checked, rawTab);
	if(!id.startsWith(idPrefix)) return;
	const [scope, key] = id.substr(idPrefix.length).split("_");
	debugLog(scope, key);
	if(scope === "tab") {
		const tab = tabs[rawTab.id];
		if(!tab) throw new Error("Changed tab option in non-video tab");
		tab[key] = checked;
	}
});
