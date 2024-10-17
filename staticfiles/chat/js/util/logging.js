export default function logging_server_message(message){
	let from = message.from //fromはサーバーが設定してくる
	let color = ""
	let size = "font-size: 13px"
	let logstyle = size

	if(message.logstyle){//メッセージにスタイルが設定されていればそれを優先
		logstyle = message.logstyle
	}else{
		if( message.is_server ){//サーバーの自発的なメッセージ
			from = "server"
			color = "color: black;"
		}else{　//他のユーザーからのメッセージ
			color = "color: red;"
		}
		logstyle += color + size
	}

	console.log(`%c${from} ->  ${message.server_message_type}`, logstyle)

}