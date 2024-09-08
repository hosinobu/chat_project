const chatSocket = new WebSocket(
'ws://' + window.location.host.replace(':8000', ':8001') + '/ws/chat/' + roomName + '/'
);

chatSocket.onmessage = function(e) {
	const data = JSON.parse(e.data);
	document.querySelector('#chat-log').innerHTML += (data.name + ' -> ' + data.message + '<br>');
};

chatSocket.onclose = function(e) {
	console.error('Chat socket closed unexpectedly');
};

document.querySelector('#chat-message-input').focus();
document.querySelector('#chat-message-input').onkeyup = function(e) {
	if (e.keyCode === 13) {  // Enter key pressed
		document.querySelector('#chat-message-submit').click();
	}
};

document.querySelector('#chat-message-submit').onclick = function(e) {
	const messageInputDom = document.querySelector('#chat-message-input');
	const message = messageInputDom.value;
	chatSocket.send(JSON.stringify({
		'message': message
	}));
	messageInputDom.value = '';
};