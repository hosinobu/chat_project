//lobby.js
import { initializeWebSocket, processMessageQueue, saveInitializedSocket} from "./websocket.js";
import { chatLog, roomListUpdate, roomList, roomNameInput, makeRoomModal , makeRoomSubmit} from "./elements.js";

initializeWebSocket("chat/lobby").then( async (websocket) =>{
	saveInitializedSocket(websocket); //利用可能ソケットを送りつける
	const[chat_js,userlist_js] = await Promise.all([
		import("./chat.js"),
		import("./userlist.js")
	])
	//インポート完了
	console.log("import_complated")

	const chat_add = chat_js.chat_add
	const user_list_update_socket = userlist_js.user_list_update_socket



	websocket.registerFunction('join', (data)=>{
		chat_add(chatLog,data.name + ' さんが入室しました',"div")
		user_list_update_socket(websocket)
		room_list_update_socket(websocket)
	})

	websocket.registerFunction('get_lobby_id', (data)=>{
		window.roomid = data.result
		console.log(`ロビーのroomidを取得しました -> ${window.roomid}`)
	})
	websocket.registerFunction('your_account_id', (data)=>{
		window.userId = data.account_id
	})
	websocket.registerFunction('make_room',(data) =>{roomListUpdate.onclick()})
	websocket.registerFunction('room-list-update',(data)=>{
		console.log(data);
		while(roomList.firstChild){
			roomList.removeChild(roomList.firstChild);
		}
		for(let[key,value] of Object.entries(data.roomlist)){
			let new_element = document.createElement('a');
			new_element.href = window.location.origin + '/chat/' + value
			new_element.textContent = "" + value + ":" + key;
			roomList.appendChild(new_element);
			roomList.appendChild(document.createElement('br'));
		}
	})
	


	roomListUpdate.onclick = ()=>{room_list_update_socket(websocket)}
	makeRoomSubmit.onclick = function(e) {
		makeRoomModal.showModal();
	};
	
	makeRoomModal.addEventListener('close', () => {
		switch(makeRoomModal.returnValue){
			case 'make-room-submit':
				websocket.send(JSON.stringify({
					'client_message_type': 'make_room',
					'room_name': roomNameInput.value
				}));
			break;
			case 'make-room-cancel':
				console.log('make-room-cancel');
			break;
		}
	});
	
	
	function room_list_update_socket(socket){
		if (socket){
			socket.send(JSON.stringify({
				'client_message_type': 'room-list-update'
			}));
		}
	}
	websocket.send(JSON.stringify({
		'client_message_type': 'get_lobby_id'
	}))
	processMessageQueue(); //たまったメッセージを処理
})
