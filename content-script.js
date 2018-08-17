// When the extension updates the script can be injected multiple times.
// This lexical scope takes care of that.
{


const tasks = new Set();
class Task {
	constructor() {
		debugLog("Starting " + this.constructor.name);
		tasks.add(this);
	}
	destructor() {
		debugLog("Stopping " + this.constructor.name);
		tasks.delete(this);
	}
}

class TaskFindVideo extends Task {
	constructor() {
		super();
		this.interval = NaN;
		this.observer = new MutationObserver(this.onMutations.bind(this));
		const pageManager = $("#page-manager");
		if(!pageManager) {
			this.queryVideoNode();
			throw new Error("No page manager found");
		}
		this.observer.observe(pageManager, {childList: true});
		this.queryVideoNode();
	}

	destructor() {
		super.destructor();
		clearInterval(this.interval);
		this.observer.disconnect();
	}

	onMutations(mutations) {
		outer:
		for(const mutation of mutations) {
			for(const node of mutation.addedNodes) {
				if(this.isWatchNode(node)) {
					this.onWatchNode(node);
					break outer;
				}
			}
		}
	}

	isWatchNode(node) {
		return node.tagName.startsWith("YTD-WATCH");
	}

	onWatchNode(watchNode) {
		this.interval = setInterval(
			this.queryVideoNode.bind(this),
			this.retryFreq,
			watchNode
		);
	}

	queryVideoNode(watchNode) {
		const node = $("#movie_player video", watchNode);
		if(node) {
			new TaskProxyState(node);
			this.destructor();
		}
	}
}
Object.defineProperty(TaskFindVideo, "retryFreq", {value: 500, enumerable: true});

class TaskProxyState extends Task {
	constructor(video) {
		super();
		this.e = {};
		this.e.video = video;
		this.e.autoplay = $("#movie_player .ytp-upnext");
		this.e.$autoplayCancel = () => $(".ytp-upnext-cancel-button", this.e.autoplay);
		this.autoplayObserver = new MutationObserver(this.onAutoplayMutation.bind(this));
		this.listeners = [];
		this.port = this.setupPort();
		this.state = {
			real: {},
			desired: {}
		}
		this.setState({
			ended: false,
			playing: false,
			autoplay: true,
			fullscreen: false
		});
		this.desireState(this.state.real);
	}

	destructor() {
		super.destructor();
		if(!this.autoplayObserver) debugger;
		this.autoplayObserver.disconnect();
		for(const [e, args] of this.listeners) {
			e.removeEventListener(...args);
		}
	}

	setupPort() {
		const port = browser.runtime.connect();
		if(port.error) throw port.error;
		port.onMessage.addListener(message => {
			this.desireState(message);
		});
		port.onDisconnect.addListener(() => {
			debugLog("port.onDisconnect");
			this.destructor();
		});
		return port;
	}

	setState(partialState) {
		const {state} = this;
		let changed = false;
		const changes = {};
		for(const [key, value] of Object.entries(partialState)) {
			if(state.real[key] !== value) {
				changed = true;
				changes[key] = value;
			}
		}
		if(!changed) return;
		Object.assign(state.real, changes);
		this.port.postMessage(changes);
	}

	desireState(partialState) {
		const {state, e} = this;
		const changes = {};
		for(const [key, value] of Object.entries(partialState)) {
			if(state.desired[key] !== value) {
				changes[key] = value;
			}
		}
		Object.assign(state.desired, changes);
		if("playing" in changes) {
			if(changes.playing) {
				e.video.play();
			} else {
				e.video.pause();
				e.video.autoplay = false;
			}
		}
		if("autoplay" in changes) {
			if(changes.autoplay) {
				this.autoplayObserver.disconnect();
			} else {
				this.cancelAutoplay();
				this.autoplayObserver.observe(e.autoplay, {
					attributes: true
				});
			}
			this.setState({autoplay: changes.autoplay});
		}
		if("ended" in changes) {
			if(changes.ended) {
				e.video.currentTime = e.video.duration;
			} else {
				if(state.real.ended) {
					e.video.currentTime = 0;
					e.video.play();
				}
			}
		}
		Object.assign(state.desired, changes);
	}

	on(e, ...args) {
		e.addEventListener(...args);
		this.listeners.push([e, args]);
	}

	onAutoplayMutation() {
		this.cancelAutoplay();
	}

	addVideoListeners() {
		this.on(this.e.video, "ended", () => {
			this.setState({ended: true, playing: false});
		});
		this.on(this.e.video, "play", () => {
			this.setState({ended: false, playing: true});
		});
		this.on(this.e.video, "pause", () => {
			this.setState({ended: false, playing: true});
		});
	}

	cancelAutoplay() {
		const {e} = this;
		if(e.autoplay && e.autoplay.style.display !== "none") {
			e.$autoplayCancel().click()
		}
	}
}

if(window.killPastSelf) {
	window.killPastSelf();
}
window.killPastSelf = () => {
	for(const task of tasks) {
		try {
			task.destructor();
		} catch(error) {
			console.warn("Error while killing past self", error);
		}
	}
	debugLog("Killed past self");
};

new TaskFindVideo();

// Prevents tabs.executeScript error
0;


}
