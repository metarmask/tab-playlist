chrome.runtime.onInstalled.addListener(function() {
	console.debug("runtime.onInstalled");
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [
				new chrome.declarativeContent.PageStateMatcher({
					pageUrl: {
						hostEquals: "www.youtube.com",
						pathEquals: "/watch"
					},
				})
			],
			actions: [new chrome.declarativeContent.ShowPageAction()]
		}]);
	});
	chrome.storage.local.set({playingTabs:[]}); // Reloading the extension doesn't trigger onStartup
});

chrome.runtime.onStartup.addListener(function() {
	console.debug("runtime.onStartup");
	chrome.storage.local.set({playingTabs:[]});
});

function startPlaying(tabID) {
	console.log("Playing in tab with ID " + tabID);
	chrome.pageAction.setIcon({tabId:tabID,path:"images/pageAction/enabled.png"});
	chrome.pageAction.setTitle({tabId:tabID,title:"Click to disable\nWhen this video finishes the tab to the right will be opened"});
	chrome.tabs.update(tabID,{active:true});
	chrome.tabs.executeScript(tabID,{file:"content-script.js"});
	chrome.storage.local.get("playingTabs",function(items){
		items.playingTabs.push(tabID);
		chrome.storage.local.set({playingTabs:items.playingTabs});
	});
}

function stopPlaying(tabID) {
	console.log("No longer playing in tab with ID " + tabID);
	chrome.storage.local.get("playingTabs",function(items){
		var index = items.playingTabs.indexOf(tabID);
		if(index != -1) {
			items.playingTabs.splice(index,1);
		}
		chrome.storage.local.set({playingTabs:items.playingTabs});
	});
	var manifest = chrome.runtime.getManifest();
	chrome.pageAction.setIcon({tabId:tabID,path:manifest.page_action.default_icon});
	chrome.pageAction.setTitle({tabId:tabID,title:manifest.page_action.default_title});
}

chrome.pageAction.onClicked.addListener(function(tab){
	chrome.storage.local.get("playingTabs",function(items){
		if(items.playingTabs.indexOf(tab.id) == -1) {
			startPlaying(tab.id);
		}else{
			stopPlaying(tab.id);
		}
	});
});

chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
	console.debug("runtime.onMessage: ",arguments);
	if(message == "ended" && sender.tab !== undefined) {
		console.log("Got \"ended\"-message, checking if it is playing");
		chrome.storage.local.get("playingTabs",function(items){
			if(items.playingTabs.indexOf(sender.tab.id) != -1) {
				chrome.tabs.query({windowId:sender.tab.windowId,index:sender.tab.index+1},function(tabs){
					console.log("Queried tabs",tabs);
					if(tabs[0] !== undefined) {
						var url = new URL(tabs[0].url);
						if(!(url.host == "www.youtube.com" && url.pathname == "/watch")) {
							console.log("The next tab wasn't a youtube one.");
							return;
						}
						startPlaying(tabs[0].id);
						chrome.storage.sync.get({"option-closeTab":true},function(items){
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
