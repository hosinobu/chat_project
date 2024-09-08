function user_list_update_socket(socket){
	if (socket){
		socket.send(JSON.stringify({
			'client_message_type': 'user-list-update'
			})
		)
	}
}

document.querySelector('#user-list-update').onclick = user_list_update_socket()


function user_list_update(d){
	let userlist = document.querySelector('#user-list')
	while(userlist.firstChild){
		userlist.removeChild(userlist.firstChild);
	}
	d.userlist.forEach((n)=>{
		var new_element = document.createElement('p');
		new_element.textContent = n;
		userlist.appendChild(new_element);
	})
}