var alreadyExistingTag = document.querySelector("script[async][src='" + chrome.runtime.getURL("content-script-js-accesser.js") + "']");
if(!alreadyExistingTag) {
	var scriptTag = document.createElement("script");
	scriptTag.src = chrome.runtime.getURL("content-script-js-accesser.js");
	scriptTag.async = true;
	document.head.appendChild(scriptTag);
	// Could this be simplified or is there a reason we're posting a message from the accesser and handling it here by sending another message to the service worker?
	window.addEventListener("message", function(event) {
		if(event.data == "tabplaylist: ended") {
			chrome.runtime.sendMessage("ended");
		}
	});
}
