var playerDiv = document.querySelector("#movie_player");
playerDiv.playVideo();
playerDiv.addEventListener("onStateChange", function(state) {
	if(state === 0) { /* Ended event from video player has state of 0 */
		window.postMessage("tabplaylist: ended", "*");
	}
});
