chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [
				new chrome.declarativeContent.PageStateMatcher({
					pageUrl: {
						hostSuffix: ".youtube.com"
					},
				})
			],
			actions: [new chrome.declarativeContent.ShowAction()]
		}]);
	});
	chrome.storage.local.set({ playingTabs: [] }); // Reloading the extension doesn't trigger onStartup
});

chrome.runtime.onStartup.addListener(function() {
	chrome.storage.local.set({ playingTabs: [] });
});

function startPlaying(tabID) {
	var manifest = chrome.runtime.getManifest();
	chrome.action.setIcon({ tabId: tabID, path: manifest.action.enabled_icon });
	chrome.action.setTitle({ tabId: tabID, title: manifest.action.enabled_title });
	chrome.tabs.update(tabID, { active: true });
	chrome.scripting.executeScript({ target: { tabId: tabID }, files: ["content-script.js"] });
	chrome.storage.local.get("playingTabs").then((items) => {
		items.playingTabs.push(tabID);
		chrome.storage.local.set({ playingTabs: items.playingTabs });
	});
}

function stopPlaying(tabID) {
	chrome.storage.local.get("playingTabs").then((items) => {
		var index = items.playingTabs.indexOf(tabID);
		if(index != -1) {
			items.playingTabs.splice(index, 1);
		}
		chrome.storage.local.set({ playingTabs: items.playingTabs });
	});
	var manifest = chrome.runtime.getManifest();
	chrome.action.setIcon({ tabId: tabID, path: manifest.action.default_icon });
	chrome.action.setTitle({ tabId: tabID, title: manifest.action.default_title });
}

// Determines if a given URL is a website with a video player to activate and play (Youtube right now)
function validateTabUrl(url) {
	if (!url) {
		return false;
	}

	var urlObj = new URL(url);
	if (!urlObj.host.includes("youtube.com")) {
		return false;
	}

	if (urlObj.pathname != "/watch" && urlObj.pathname != "/") {
		return false;
	}

	return true;
}

chrome.action.onClicked.addListener(function(tab) {
	chrome.storage.local.get("playingTabs").then((items) => {
		if(items.playingTabs.indexOf(tab.id) == -1) {
			startPlaying(tab.id);
		} else {
			stopPlaying(tab.id);
		}
	});
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	if(message == "ended" && sender.tab !== undefined) {
		// Received video ended message from player. Attempting to switch tabs
		chrome.storage.local.get("playingTabs").then((items) => {
			if(items.playingTabs.indexOf(sender.tab.id) != -1) {
				// Find the next tab to the right (+1) in our original window
				chrome.tabs.query({ windowId: sender.tab.windowId, index: sender.tab.index+1 }).then((tabs) => {
					if(tabs[0] !== undefined) {
						// Found a tab, make sure its Youtube before we switch to it
						if (!validateTabUrl(tabs[0].url)) {
							return;
						}

						// Switch to the tab and start the video
						startPlaying(tabs[0].id);

						// Optionally close the tab that just finished playing
						chrome.storage.sync.get({"option-closeTab":true}).then((items) => {
							if(items["option-closeTab"] === true) {
								chrome.tabs.remove(sender.tab.id);
							}
						});
					}
				});
			}
		});
	}
});
