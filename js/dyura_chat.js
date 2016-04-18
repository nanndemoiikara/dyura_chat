function ClientChat(data)
{
	this.connect_url = data.socket_url || 'http://localhost:8214';
	this.name        = data.username   || 'セットン';
	this.color       = data.color      || 'gray';
	this.sendButton  = document.getElementById('send_message');
	this.inputBox    = this.sendButton.previousElementSibling;
	this.messageBox  = document.getElementById('chat_body');
	this.io;
	this.__construct();
}

ClientChat.prototype.__construct = function(){
	var that = this;
	this.io = io.connect(this.connect_url);
	this.eventHandler();
	this.sendButton.addEventListener('click', function(ev){
		( ev.preventDefault )? ev.preventDefault() : ev.returnValue = false ;
		that.addMessage();
	},false);
	this.io.emit('connection', this.name, this.color);
};

ClientChat.prototype.eventHandler = function(){
	
	this.io.on('getMessage', this.getMessage.bind(this));
}

ClientChat.prototype.getMessage = function(obj){
	var elem   = document.createDocumentFragment(),
		msgDiv = document.createElement('DIV'),
		msgBox = document.createElement('P'),
		that   = this;

	msgDiv.className = 'system_message';
	if ( obj.sysMsg === false )
	{
		var name_anchor = document.createElement('A');

		name_anchor.href      = '#' + obj.id;
		name_anchor.className = 'user_icon';
		name_anchor.appendChild(document.createTextNode(obj.name));
		msgDiv.appendChild(name_anchor);

		msgBox.appendChild(document.createTextNode(obj.value));
		msgDiv.className = 'chat_message ' + obj.color;
	}
	else
	{
		msgBox.innerHTML = obj.value;
	}

	msgDiv.appendChild(msgBox);
	var user_icon = msgDiv.getElementsByClassName('user_icon');

	if ( user_icon.length > 0 )
	{
		user_icon[0].addEventListener('click', function(ev){
			( ev.preventDefault )? ev.preventDefault() : ev.returnValue = false ;
			var userId = this.getAttribute('href').replace('#', '@');
			that.inputBox.value = userId + ' ' + that.inputBox.value;
		}, false);
	}

	elem.appendChild(msgDiv);
	this.messageBox.insertBefore(elem, this.messageBox.firstChild);
}

ClientChat.prototype.addMessage = function ()
{
	if ( this.inputBox.tagName !== 'INPUT' ) return;
	if ( this.inputBox.value == '' ) return;
	var message = this.inputBox.value;
	this.io.emit('sendMessage', message);
	this.inputBox.value = '';
}

document.addEventListener('DOMContentLoaded', function(){
	new ClientChat(default_data);
},false);
