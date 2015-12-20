chrome.runtime.onInstalled.addListener(function() {
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
});

function startPlaying(tabID) {
	console.log("Playing in tab with ID " + tabID);
	chrome.pageAction.setIcon({tabId:tabID,path:"images/pageAction/enabled.png"});
	chrome.tabs.update(tabID,{active:true});
	chrome.tabs.executeScript(tabID,{file:"content-script.js"});
}

chrome.pageAction.onClicked.addListener(function(tab){
	startPlaying(tab.id);
});

chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
	console.log("runtime.onMessage: ",arguments);
	if(message == "ended" && sender.tab !== undefined) {
		console.log("Got \"ended\"-message, querying tabs");
		chrome.tabs.query({windowId:sender.tab.windowId,index:sender.tab.index+1},function(tabs){
			console.log("Queried tabs",tabs);
			if(tabs[0] !== undefined) {
				var url = new URL(tabs[0].url);
				if(!(url.host == "www.youtube.com" && url.pathname == "/watch")) {
					console.log("The next tab wasn't a youtube one.");
					return;
				}
				startPlaying(tabs[0].id);
				chrome.tabs.remove(sender.tab.id);
			}
		});
	}
});
