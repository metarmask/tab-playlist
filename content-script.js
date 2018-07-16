var video;
var eAutoplay;

function cancelAutoplay() {
	if(eAutoplay && eAutoplay.style.display !== "none") {
		eAutoplay.querySelector(".ytp-upnext-cancel-button").click();
		return;
	}
}

function attach() {
	video = $("#movie_player video");
	eAutoplay = $("#movie_player .ytp-upnext");
	if(!video) return false;
	const port = browser.runtime.connect();
	if(port.error) throw port.error;
	debugLog("content-script.js", "connected to port", port);

	const autoplayObserver = new MutationObserver(mutations => {
		for(const mutation of mutations) {
			cancelAutoplay();
			return;
		}
	});

	const state = {};
	const desiredState = {};
	const setState = partialState => {
		const changes = {};
		for(const [key, value] of Object.entries(partialState)) {
			if(state[key] !== value) {
				changes[key] = value;
			}
		}
		Object.assign(state, changes);
		console.log("content-script state changes", changes);
		port.postMessage(changes);
	};
	const desireState = partialState => {
		const changes = {};
		for(const [key, value] of Object.entries(partialState)) {
			if(desiredState[key] !== value) {
				changes[key] = value;
			}
		}
		debugLog("Fulfilling desire", changes);
		Object.assign(desiredState, changes);
		if("playing" in changes) {
			if(changes.playing) {
				video.play();
			} else {
				video.pause();
				video.autoplay = false;
			}
		}
		if("autoplay" in changes) {
			if(changes.autoplay) {
				autoplayObserver.disconnect();
			} else {
				cancelAutoplay();
				autoplayObserver.observe(eAutoplay, {
					attributes: true
				});
			}
			setState({autoplay: changes.autoplay});
		}
		if("ended" in changes) {
			if(changes.ended) {
				video.currentTime = video.duration;
			} else {
				if(state.ended) {
					video.currentTime = 0;
					video.play();
				}
			}
		}
		Object.assign(desiredState, changes);
	};
	setState({
		ended: false,
		playing: false,
		autoplay: true,
		fullscreen: false
	});
	desireState(state);
	port.onMessage.addListener(changes => {
		debugLog("onMessage tab", changes);
		if(changes[Symbol.iterator]) {
			// Read
		} else {
			desireState(changes);
		}
	});
	port.onDisconnect.addListener(() => debugLog("background disconnected from tab"));
	let everPlayed = false;
	video.addEventListener("ended", () => {
		setState({ended: true, playing: false});
	});
	video.addEventListener("play", () => {
		setState({ended: false, playing: true});
	});
	video.addEventListener("pause", () => {
		setState({ended: false, playing: true});
	});
	debugLog("Attached");
	return true;
}

if(!attach()) {
	debugLog("Could not attach to video element, observing page mutations");
	const observer = new MutationObserver(mutations => {
		outer:
		for(const mutation of mutations) {
			for(const node of mutation.addedNodes) {
				if(node.tagName === "YTD-WATCH") {
					debugLog("Watch view was added, trying again");
					if(attach()) {
						observer.disconnect();
						break outer;
					}
				}
			}
		}
	});
	observer.observe($("#page-manager"), {
		childList: true
	});
}
