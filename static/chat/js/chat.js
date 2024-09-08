
document.querySelector('#chat-message-input').focus();
document.querySelector('#chat-message-input').onkeyup = function(e) {
	if (e.keyCode === 13) {  // Enter key pressed
		document.querySelector('#chat-message-submit').click();
	}
};

document.querySelector('#chat-message-submit').onclick = function(e) {
	const messageInputDom = document.querySelector('#chat-message-input');
	const content = messageInputDom.value;
	chatSocket.send(JSON.stringify({
		'client_message_type': 'chat',
		'content': content,
	}));
	messageInputDom.value = '';
};

