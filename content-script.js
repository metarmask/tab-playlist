var alreadyExistingTag = document.querySelector("script[async][src='" + chrome.runtime.getURL("content-script-js-accesser.js") + "']");
if(!alreadyExistingTag) {
	var scriptTag = document.createElement("script");
	scriptTag.src = chrome.runtime.getURL("content-script-js-accesser.js");
	scriptTag.async = true;
	document.head.appendChild(scriptTag);
	window.addEventListener("message",function(){
		if(event.data == "tabplaylist: ended") {
			chrome.runtime.sendMessage("ended");
		}
	});
}
