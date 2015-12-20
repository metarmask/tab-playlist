var labels = document.querySelectorAll("label");
for(var i = 0;i < labels.length;i++) {
	labels[i].htmlFor = labels[i].previousElementSibling.id;
}

var options = {};

var checkboxes = document.querySelectorAll("input[type=checkbox]");
for(var i = 0;i < checkboxes.length;i++) {
	checkboxes[i].addEventListener("click",function(){
		var obj = {};
		obj[this.id] = this.checked;
		console.log("Setting " + this.id + " to " + this.checked);
		chrome.storage.sync.set(obj,function(){
			if(chrome.runtime.lastError) {
				console.log("Error setting option: ",chrome.runtime.lastError);
			}else{
				console.log("Option set successfully");
			}
		});
	});
	options[checkboxes[i].id] = checkboxes[i].checked;
}

chrome.storage.sync.get(options,function(items){
	options = items;
	var optionKeys = Object.keys(items);
	for(var i = 0;i < optionKeys.length;i++) {
		var optionElement = document.getElementById(optionKeys[i]);
		if(optionElement.type == "checkbox") {
			optionElement.checked = items[optionKeys[i]];
		}
	}
	document.getElementById("loadingMessage").setAttribute("hidden","");
	document.getElementById("options").removeAttribute("hidden");
});