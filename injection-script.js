var playerDiv = document.querySelector("#movie_player");
playerDiv.playVideo();
playerDiv.addEventListener("onStateChange",function(state){
	if(state === 0) { /* Ended */
		window.postMessage("tabplaylist: ended", "*");
	}
});
