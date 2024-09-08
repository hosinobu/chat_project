const chatSocket = new WebSocket(
	'ws://' + window.location.host.replace(':8000', ':8001') + '/ws/chat/' + roomid + "/"
	);

chatSocket.onopen= function(e){
	console.log("" + roomid +"に接続成功")
}


chatSocket.onmessage = function(e) {
	const data = JSON.parse(e.data);
	console.log(data.server_message_type);
	switch(data.server_message_type){
		case 'join':
			document.querySelector('#chat-log').innerHTML += (data.name + ' さんが入室しました<br>');
			user_list_update_socket(chatSocket);
		break;
		case 'chat':
			let element = document.querySelector('#chat-log');
			element.innerHTML += (data.name + ' -> ' + data.content + '<br>');
			element.scrollTop = element.scrollHeight - element.clientHeight;
		break;
		case 'user-list-update':
			user_list_update(data);
		break
		case 'leave':
			document.querySelector('#chat-log').innerHTML += (data.name + ' さんが退室しました<br>');
			user_list_update_socket(chatSocket);
		break
	}
};