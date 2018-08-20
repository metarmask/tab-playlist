class OptionsUI {
	constructor() {

	}

	scopes() {
		return ["tab", "global"];
	}

	contexts() {
		return ["page_action"];
	}

	scopeID(scope) {
		return `options_scope_${scope}`;
	}

	* eachOptionID(scope) {
		for(const [key, props] of Object.entries(Tab.options)) {
			if(props.hidden === "always" || props.hidden === scope) continue;
			yield [[key, props], `options_option_${scope}_${key}`];
		}
	}

	async init() {
		await browser.contextMenus.removeAll();
		for(const scope of this.scopes()) {
			let parentId;
			if(scope === "global") {
				parentId = this.scopeID(scope);
				await browser.contextMenus.create({
					title: getText("options_global"),
					contexts: this.contexts(),
					id: parentId
				});
			}
			for(const [[key, {"default": aDefault, hidden}], id] of this.eachOptionID(scope)) {
				if(typeof aDefault !== "boolean") throw new Error("Cannot handle non-boolean" + aDefault);
				let title = getText("options_option_" + key);
				if(hidden === "upcoming") {
					title += " " + getText("options_upcoming");
				}
				await browser.contextMenus.create({
					title,
					enabled: hidden !== "upcoming",
					id,
					checked: aDefault,
					contexts: this.contexts(),
					type: "checkbox",
					parentId
				});
			}
		}
	}

	async updateTab(tab) {
		for(const [[key, {"default": aDefault}], id] of this.eachOptionID("tab")) {
			if(typeof aDefault !== "boolean") throw new Error("Cannot handle non-boolean" + aDefault);
			await browser.contextMenus.update(id, {
				checked: tab[key],
			});
		}
	}
}

const optionsUI = new OptionsUI();

browser.tabs.onActivated.addListener(({tabId}) => {
	const tab = tabs[tabId];
	if(!tab) return;
	optionsUI.updateTab(tab);
});

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
