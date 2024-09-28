document.querySelector('#user-list-update').onclick = ()=>{user_list_update_socket(chatSocket)}

function user_list_update_socket(socket){
	if (socket){
		socket.send(JSON.stringify({
			'client_message_type': 'user-list-update'
			})
		)
	}
}


const userlist_container = document.querySelector('#user-list')
userlist_container.addEventListener('click',(event)=>{
	console.log('リンクの親コンテナがクリックされたよ')
	if (event.target.classList.contains('link-userlist')){
		event.preventDefault();
		console.log("リンクがクリックされたよ")
		chatSocket.send(JSON.stringify({
			'client_message_type': 'get-user-page',
			'userid': event.target.dataset.userId
		}))
	}
})

function user_list_update(data_from_server){
	console.log("ユーザーリストをアップデートするよ")
	while(userlist_container.firstChild){
		userlist_container.removeChild(userlist_container.firstChild);
	}
	data_from_server.userlist.forEach((data)=>{
		const new_element = document.createElement('a');
		new_element.href = "#";

		new_element.classList.add("link-userlist");
		new_element.textContent = data[0];
		new_element.dataset.userId = data[1]
		userlist_container.appendChild(new_element);
	})
}

