var $ = (selector, from = document) => {
	return from.querySelector(selector);	
};

{
	const createPromiseProxy = forObject => {
		return new Proxy(forObject, {
			get(target, property) {
				const value = target[property];
				if(value === chrome.runtime.connect) {
					return value.bind(target);
				} else if(typeof value === "function" && !value.prototype) {
					return (...args) => {
						return new Promise((resolve, reject) => {
							value.call(target, ...args, result => {
								if(chrome.runtime.lastError) {
									reject(chrome.runtime.lastError);
								} else {
									resolve(result);
								}
							});
						});
					};
				} else if(typeof value === "object" && !(value instanceof chrome.Event)) {
					return createPromiseProxy(value);
				} else {
					return value;
				}
			}
		});
	};
	if(!window.browser) {
		window.browser = createPromiseProxy(chrome);
	}
}

function getText(name, ...args) {
	const message = chrome.i18n.getMessage(name, args);
	if(!message) {
		console.warn("Cannot find message %s", name);
		return name;
	}
	return message;
}

const debugEnabled = false;
function debugLog(...args) {
	if(!debugEnabled) return;
	console.debug(...args);
}
