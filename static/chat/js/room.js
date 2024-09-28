const chatSocket = new WebSocket(
	'ws://' + window.location.host.replace(':8000', ':8001') + '/ws/chat/' + roomid + "/"
	);

chatSocket.onopen= function(e){
	console.log("" + roomid +"に接続成功")
}

const dialog = document.querySelector('#make-board-modal')
dialog.addEventListener('close', () => {
	switch(dialog.returnValue){
		case 'make-board-submit':

			console.log(typeof document.querySelector('#input-boardx').value)
			chatSocket.send(JSON.stringify({
				'client_message_type': "make_go_board",
				'x': parseInt(document.querySelector('#input-boardx').value),
				'y': parseInt(document.querySelector('#input-boardy').value)
			}));
		break;
		case 'make-board-cancel':
			console.log('make-board-cancel');
		break;
	}
});



chatSocket.onmessage = function(e) {
	const data = JSON.parse(e.data);
	console.log(data.server_message_type);
	switch(data.server_message_type){
		case 'join':
			chat_add(document.querySelector('#chat-log'),data.name + ' さんが入室しました',"div")
			user_list_update_socket(chatSocket);
		break;
		case 'leave':
			chat_add(document.querySelector('#chat-log'),data.name + ' さんが退室しました',"div")
			user_list_update_socket(chatSocket);
		break
		case 'chat':
			let element = document.querySelector('#chat-log');
			console.log("image = " + data.image_url )
			console.log("thumbnail = " + data.thumbnail_url)
			chat_add(element,data.name + ' -> ' + data.content,"div",data.image_url,data.thumbnail_url)
			element.scrollTop = element.scrollHeight - element.clientHeight;
		break;
		case 'user-list-update':
			user_list_update(data);
		break
		case 'get-user-page':
			console.log('開けゴマ')
			window.open(data.url);
		break
		case 'make_go_board':
			console.log(`作るよ碁盤、このサイズ→:${data.y} ${data.x}`)
			goban_board = new Goban(ctx,data.id,400,400,data.y,data.x,0,0)
		break
		case 'place_stone':
			console.log(data)
			goban_board.board = data.board
			goban_board.turn = data.turn
			goban_board.koY = data.koY
			goban_board.koX = data.koX
			goban_board.koTurn = data.koTurn
			goban_board.blackCaptureCount = data.black_capture
			goban_board.whiteCaptureCount = data.white_capture
		break
	}
};