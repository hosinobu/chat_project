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
			chat_add(document.querySelector('#chat-log'),data.name + ' さんが入室しました',"div")
			user_list_update_socket(chatSocket);
		break;
		case 'chat':
			let element = document.querySelector('#chat-log');
			chat_add(element,data.name + ' -> ' + data.content,"div",data.image_url)
			element.scrollTop = element.scrollHeight - element.clientHeight;
		break;
		case 'user-list-update':
			user_list_update(data);
		break
		case 'leave':
			dchat_add(document.querySelector('#chat-log'),data.name + ' さんが退室しました',"div")
			user_list_update_socket(chatSocket);
		break
	}
};