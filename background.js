browser.runtime.onInstalled.addListener(async () => {
	debugLog("runtime.onInstalled");
	const tabs = await browser.tabs.query({});
	for(const tab of tabs) {
		try {
			await browser.tabs.executeScript(tab.id, {file: "common.js"});
			await browser.tabs.executeScript(tab.id, {file: "content-script.js"});
		} catch(error) {
			if([
				"Missing host permission for the tab",
				"Cannot access a chrome:// URL"
			].includes(error.message)) continue;
			console.warn(error);
		}
	}
});

const envChrome = navigator.userAgent.split(" ").map(s => (s.match(/^(.+?)\/.+?$/) || [])[1]).some(s => s === "Chrome");
function isIconGrayedWhenHidden() {
	// TODO: Actual detection?
	return envChrome;
}

const tabs = {};
class Tab {
	static _onConnect(port) {
		if(!port.sender.tab) return null;
		const tab = new Tab(port);
		tabs[tab.id] = tab;
		return tab;
	}

	constructor(port) {
		this.port = port;
		if(port.error) throw port.error;
		this.id = port.sender.tab.id;
		this._state = {};
		this.showIcon();
		this._listenForEvents();
		this.merge();
	}

	_listenForEvents() {
		this.port.onMessage.addListener(this._onMessage.bind(this));
		this.port.onDisconnect.addListener(this._onDisconnect.bind(this));
	}

	update(...args) {return browser.tabs.update(this.id, ...args)}
	remove(...args) {return browser.tabs.remove(this.id, ...args)}
	showIcon(options) {
		return browser.pageAction.show(this.id);
	}
	setIcon(options) {
		return browser.pageAction.setIcon(Object.assign({tabId: this.id}, options));
	}
	setTitle(options) {
		return browser.pageAction.setTitle(Object.assign({tabId: this.id}, options));
	}

	_onDisconnect() {
		console.log(this, "disconnected");
	}

	_onMessage(message) {
		debugLog("Tab.prototype._onMessage", message);
		if(!this.enabled) return;
		Object.assign(this._state, message);
		if(message.ended === true) {
			this.tryNext();
		}
	}

	_onClicked() {
		this.enabled = !this.enabled;
	}

	_enabledSet(enabled) {
		if(enabled) {
			this.setTitle({title: getText("icon_disable")});
			this.setIcon({path: "images/pageAction/enabled/any.svg"});
		} else {
			this.setTitle({title: getText("icon_enable")});
			if(isIconGrayedWhenHidden()) {
				this.setIcon({path: "images/pageAction/half-enabled/any.svg"});
			} else {
				this.setIcon({path: "images/pageAction/disabled/any.svg"});
			}
		}
	}

	async _refreshRaw(assignment) {
		if(assignment) {
			Object.assign(this.raw, assignment);
			this._refreshedRaw = true;
			setTimeout(() => this._refreshedRaw = false, 0);
		} else {
			if(!this._refreshedRaw) {
				this.raw = await browser.tabs.get(this.id);
			}
		}
		return this.raw;
	}

	async ended(ended) {
		if(arguments.length === 0) {
			return this._state.ended;
		} else {
			this.port.postMessage({ended});
		}
	}

	async playing(playing) {
		if(arguments.length === 0) {
			return this._state.playing;
		} else {
			this.port.postMessage({playing});
		}
	}

	async autoplay(autoplay) {
		if(arguments.length === 0) {
			return this._state.autoplay;
		} else {
			this.port.postMessage({autoplay});
		}
	}

	async fullscreen(fullscreen) {
		if(arguments.length === 0) {
			return this._state.fullscreen;
		} else {
			this.port.postMessage({fullscreen});
		}
	}

	async gatherPlaylist() {
		await this._refreshRaw();
		// tabs.query makes no guarantees about order
		const rawWinTabs = [];
		for(const rawTab of await browser.tabs.query({windowId: this.raw.windowId})) {
			rawWinTabs[rawTab.index] = rawTab;
		}
		const playlist = [this];
		for(const direction of [1, -1]) {
			let i = this.raw.index + direction;
			let tab;
			while(rawWinTabs[i] && (tab = tabs[rawWinTabs[i].id])) {
				tab.raw = rawWinTabs[i];
				if(direction === 1) {
					playlist.push   (tab);
				} else {
					playlist.unshift(tab);
				}
				i += direction;
			}
		}
		return playlist;
	}

	async merge() {
		const playlist = await this.gatherPlaylist();
		if(playlist.length <= 1) return;
		let allCheckedPromiseResolve;
		const allCheckedPromise = new Promise(resolve => {
			allCheckedPromiseResolve = resolve;
		});
		const playingTabPromises = [allCheckedPromise];
		let n = playlist.length;
		for(const tab of playlist) {
			playingTabPromises.push(new Promise(async resolve => {
				if(tab !== this && await tab.playing()) {
					resolve(tab);
				}
				if(--n === 0) allCheckedPromiseResolve();
			}));
		}
		let from = await Promise.race(playingTabPromises);
		if(from) {
			this.playing(false);
		} else {
			from = playlist.reverse().find(t => t !== this);
		}
		for(const option of Object.keys(Tab.options)) {
			const fromOwn = from["_" + option];
			if(typeof fromOwn !== "undefined") {
				this[option] = fromOwn;
			}
		}
	}

	async tryNext() {
		const {
			index: fromIndex,
			active: fromActive,
			windowId
		} = await this._refreshRaw();
		const [{id: activeID}] = await browser.tabs.query({windowId, active: true});
		const [rawNext] = await browser.tabs.query({windowId, index: fromIndex + 1});
		if(rawNext && tabs[rawNext.id]) {
			this.autoplay(false);
			const next = tabs[rawNext.id];
			next.playing(true);
			if(fromActive) {
				await next.update({active: true});
			} else {
				await next.premierForegroundForInstant(next);
			}
			if(this.endRemoval) {
				await this.remove();
			}
		} else {
			this.autoplay(true);
		}
	}

	async premierForegroundForInstant() {
		const {windowId, id} = this.raw;
		const [{id: activeBeforeID}] = await browser.tabs.query({windowId, active: true});
		if(activeBeforeID === id) return;
		await browser.tabs.update(            id, {active: true});
		await browser.tabs.update(activeBeforeID, {active: true});
	}
}
{
	Object.defineProperty(Tab, "options", {value: {
		enabled: {
			default: false,
			hidden: "tab"
		},
		loop: {
			default: false,
			hidden: "upcoming"
		},
		shuffle: {
			default: false,
			hidden: "upcoming"
		},
		shufflePlayed: {
			default: new Set(),
			hidden: "always"
		},
		endRemoval: {
			default: false
		}
	}});
	for(const [option, {"default": value}] of Object.entries(Tab.options)) {
		const kReal = "_" + option;
		const kObserver = "_" + option + "Set";
		Object.defineProperty(Tab.prototype, option, {
			get() {
				if(typeof this[kReal] === "undefined") {
					return Tab.options[option].default;
				} else {
					return this[kReal];
				}
			},
			set(setValue) {
				this[kReal] = setValue;
				if(this[kObserver]) {
					this[kObserver](setValue);
				}
				(async () => {
					for(const tab of await this.gatherPlaylist()) {
						tab[kReal] = setValue;
						if(tab !== this && tab[kObserver]) {
							tab[kObserver](setValue);
						}
					}
				})();
			}
		});
	}

	// Keeps the background/event page alive
	browser.runtime.onConnect.addListener(Tab._onConnect.bind(Tab));
}
browser.pageAction.onClicked.addListener(rawTab => {
	const tab = tabs[rawTab.id];
	if(!tab) return;
	tab._refreshRaw(rawTab);
	tab._onClicked();
});

browser.tabs.onAttached.addListener((id, {newWindowId: windowId, newPosition: index}) => {
	const tab = tabs[id];
	if(!tab) return;
	tab._refreshRaw({windowId, index});
	tab.merge();
});

browser.tabs.onMoved.addListener((id, {windowId, toIndex: index}) => {
	const tab = tabs[id];
	if(!tab) return;
	tab._refreshRaw({windowId, index});
	tab.merge();
});
