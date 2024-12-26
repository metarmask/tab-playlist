var alreadyExistingTag = document.querySelector("script[async][src='" + chrome.runtime.getURL("content-script-js-accesser.js") + "']");
if(!alreadyExistingTag) {
	console.log("Content-script adding script tag for accesser");
	var scriptTag = document.createElement("script");
	scriptTag.src = chrome.runtime.getURL("content-script-js-accesser.js");
	scriptTag.async = true;
	document.head.appendChild(scriptTag);
	window.addEventListener("message", function(event) {
		console.log("Window addEventListener message for tabplaylist:ended");
		if(event.data == "tabplaylist: ended") {
			chrome.runtime.sendMessage("ended");
		}
	});
}
