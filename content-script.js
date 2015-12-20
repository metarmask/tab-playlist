var alreadyExistingTag = document.querySelector("script[async][src='chrome-extension://afcmfnlbcoginnfdkokfgpcmooekakhf/injection-script.js']");
if(alreadyExistingTag) {
	console.log("Already injected");
}else{
	var scriptTag = document.createElement("script");
	scriptTag.src = chrome.runtime.getURL("injection-script.js");
	scriptTag.async = true;
	document.head.appendChild(scriptTag);
	console.log("Script injected");
	window.addEventListener("message",function(){
		if(event.data == "tabplaylist: ended") {
			chrome.runtime.sendMessage("ended");
		}
	});
}