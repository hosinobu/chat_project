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

let account_id

chatSocket.onmessage = function(e) {

    const data = JSON.parse(e.data);
    console.log('received message from server :: ',data.server_message_type);
    switch(data.server_message_type){
        case 'your_account_id':
            account_id = data.account_id
        break
        case 'join':
            console.log('joined ->', data.name)
            chat_add(document.querySelector('#chat-log'),data.name + ' さんが入室しました',"div")
            user_list_update_socket(chatSocket);
            if (data.name === account_id) return;
            createOffer(data.name)
        break;
        case 'leave':
            chat_add(document.querySelector('#chat-log'),data.name + ' さんが退室しました',"div")
            user_list_update_socket(chatSocket);
        break
        case 'chat':
            let element = document.querySelector('#chat-log');
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
        case 'p2pOffer':
            if(account_id === data.from){
                console.log('your_offer')
                return;
            }
            console.log('オファーハンドラを呼びます')
            handleOffer(data.from, data.offer);
        break
        case 'p2pAnswer':
            console.log('アンサーハンドラを呼びます')
            handleAnswer(data.from, data.answer);
        break
        case 'p2pIceCandidate':
            console.log('ICE候補ハンドラを呼びます')
            handleIceCandidate(data.from, data.candidate)
        break
    }
};


const remoteAudio = document.getElementById('remoteAudio');
const peerConnections = {}; // アカウントIDごとにRTCPeerConnectionを保持するオブジェクト
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

let localStream

// 音声ストリームを取得する非同期関数
async function getAudioStream() {
    if (localStream){
        //すでに取得済み
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream = stream;
        console.log('音声ストリーム取得成功');
    } catch (error) {
        console.log('音声ストリーム取得失敗', error);
        throw error;  // エラーが発生した場合、例外を投げる
    }
}

//ピアにストリームを設定する関数。offerやanswerを作成する前に適用する必要があります。
function setStream(peerConnection){
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
}

function peerConnection_init(accountId, peerConnection){
    console.log('called peerConnection_init')

    //ピア保存
    peerConnections[accountId] = peerConnection;

    //接続状態確認設定
    peerConnection.onconnectionstatechange = event => {
        console.log('Current connection state:', peerConnection.connectionState)
        switch(peerConnection.connectionState) {
            case 'connected':
                console.log('WebRTC接続が確立されました');
                break;
            case 'disconnected':
            case 'failed':
                console.log('WebRTC接続が切断されました');
                break;
            case 'closed':
                console.log('WebRTC接続が終了しました');
            break;
        }
    };

    //トラックイベントハンドリング
    peerConnection.ontrack = event =>{
        console.log('ontrack')
        remoteAudio.srcObject = event.streams[0];
    }

    // ICE候補のハンドリング
    peerConnection.onicecandidate = event => {
        console.log('ICE候補イベント:', event.candidate);
        if (event.candidate) {
            chatSocket.send(JSON.stringify({
                'client_message_type': 'p2pIceCandidate',
                'candidate': event.candidate,
                'for': accountId
            }));
        }
    };
}

async function createOffer(accountId) {
    console.log('called createOffer')

    await getAudioStream();

    const peerConnection = new RTCPeerConnection(configuration);
    setStream(peerConnection)

    try{
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer);
                
        console.log('sending offer ->', accountId)
        chatSocket.send(JSON.stringify({
            'client_message_type': 'p2pOffer',
            'offer': peerConnection.localDescription,
            'for': accountId //オファーを出す相手
        }));

        peerConnection_init(accountId, peerConnection)
    }catch(error) {
        console.error('Error creating offer:', error);
    };
}


// アカウントIDごとに新しいRTCPeerConnectionを作成してオファーを処理
async function handleOffer(accountId, offer) {
    console.log('オファーハンドラが呼ばれました')

    await getAudioStream();

    const peerConnection = new RTCPeerConnection(configuration);

    try{
    // 受信したオファーをリモートSDPとしてセット
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    setStream(peerConnection)

    answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    console.log('sendding answer -> ', accountId)
    chatSocket.send(JSON.stringify({
        'client_message_type': 'p2pAnswer',
        'answer': peerConnection.localDescription,
        'for': accountId, //answerを返す相手
    }));

     peerConnection_init(accountId, peerConnection)

    }catch(error) {
        console.error("Error handling offer:", error);
    }
}

function handleAnswer(accountId, answer) {
    console.log('アンサーハンドラが呼ばれました')

    const peerConnection = peerConnections[accountId]
    if(!peerConnection){
        console.log('予期しないアンサー', accountId)
        return;
    }

    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => {
            console.log(`Remote description set for account ${accountId}`);
        })
        .catch(error => {
            console.error("Error setting remote description:", error);
        });
}

// アカウントIDごとのICE候補を処理
function handleIceCandidate(accountId, candidate) {
    console.log('ICE候補ハンドラが呼ばれました')
    const peerConnection = peerConnections[accountId];

    if (peerConnection.remoteDescription){
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => {
                console.log(`ICE candidate added for account ${accountId}`);
            })
            .catch(error => {
                console.error("Error adding ICE candidate:", error);
            });
    }else{

        console.warn(`Cannot add ICE candidate for ${accountId}: remote description not set.`);

    }
}


// 任意のボタンやイベントでユーザー操作があった後
document.getElementById('playButton').addEventListener('click', () => {
  remoteAudio.play();
});