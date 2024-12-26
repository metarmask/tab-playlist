var playerDiv = document.querySelector("#movie_player");
playerDiv.playVideo();
console.log("Accesser addEventListener for onStateChange");
playerDiv.addEventListener("onStateChange", function(state) {
	if(state === 0) { /* Ended */
		console.log("Video ended, triggering message to tabplaylist: ended");
		window.postMessage("tabplaylist: ended", "*");
	}
});
