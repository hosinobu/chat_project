const chatSocket = new WebSocket(
	'ws://' + window.location.host.replace(':8000', ':8001') + '/ws/chat/lobby/'
	);
	
	chatSocket.onopen = function(e){
		chatSocket.send(JSON.stringify({
			'client_message_type': 'get_lobby_id'
		}));
	}


	function room_list_update_socket(socket){
		if (socket){
			socket.send(JSON.stringify({
				'client_message_type': 'room-list-update'
			}));
		}
	}

	chatSocket.onmessage = function(e) {

		const data = JSON.parse(e.data);
		console.log(data.server_message_type);
		switch(data.server_message_type){
			case 'join':
				chat_add(document.querySelector('#chat-log'),data.name + ' さんが入室しました',"div")
				user_list_update_socket(chatSocket)
				room_list_update_socket(chatSocket)
			break;
			case 'get_lobby_id':
				roomid = data.result
				console.log(`ロビーのroomidを取得しました -> ${roomid}`)
			break;
			case 'chat':
				console.log("chat-lobby.js    " + data.content)
				let element = document.querySelector('#chat-log');
				chat_add(element,data.name + ' -> ' + data.content,"div",data.image_url,data.thumbnail_url)
				element.scrollTop = element.scrollHeight - element.clientHeight;
			break;
			case 'make_room':
				document.querySelector('#room-list-update').onclick()
			break;
			case 'room-list-update':
				console.log(data);
				let roomlist = document.querySelector('#room-list')
				while(roomlist.firstChild){
					roomlist.removeChild(roomlist.firstChild);
				}
				for(let[key,value] of Object.entries(data).slice(2,)){ //２個スライスしてるのは一つ目は誰からのメッセージか、二つ目はサーバーのメッセージタイプが入ってるからよ。
					let new_element = document.createElement('a');
					new_element.href = window.location.origin + '/chat/' + value
					new_element.textContent = "" + value + ":" + key;
					roomlist.appendChild(new_element);
					roomlist.appendChild(document.createElement('br'));
				}
			break
			case 'user-list-update':
				user_list_update(data);
			break
			case 'get-user-page':
				console.log('開けゴマ')
				window.location(data.url);
			break
			case 'leave':
				document.querySelector('#chat-log').innerHTML += (data.name + ' さんが退室しました<br>');
				user_list_update_socket(chatSocket);
			break
		}
	};
	
	chatSocket.onclose = function(e) {
		console.error('Chat socket closed unexpectedly');
	};	


	document.querySelector('#room-list-update').onclick = ()=>{room_list_update_socket(chatSocket)}

	document.querySelector('#make-room-submit').onclick = function(e) {
		document.getElementById('make-room-modal').showModal();
	};


	const dialog = document.querySelector('#make-room-modal')
	dialog.addEventListener('close', () => {
		switch(dialog.returnValue){
			case 'make-room-submit':
				chatSocket.send(JSON.stringify({
					'client_message_type': 'make_room',
					'room_name': document.querySelector('#room_name_input').value
				}));
			break;
			case 'make-room-cancel':
				console.log('make-room-cancel');
			break;
		}
	});