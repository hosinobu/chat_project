//room.js
import { initializeWebSocket, processMessageQueue, saveInitializedSocket} from "./websocket.js";
import { chatLog, makeBoardModal, makeBoard, inputBoardX, inputBoardY,boardCanvas } from "./elements.js";
import GoBoard from "./goban/goban.js";

let goban; //碁盤用の変数

initializeWebSocket("chat/" + window.roomid).then(async (socket) =>{
    saveInitializedSocket(socket) //ここで保存する
    const[chat_js,userlist_js] = await Promise.all([
        import("./chat.js"),
        import("./userlist.js")
    ])
    console.log('import complated')
    const chat_add = chat_js.chat_add
    const user_list_update_socket = userlist_js.user_list_update_socket
    //インポート完了

    socket.registerFunction('your_account_id',(data)=>{
        window.account_id = data.account_id
    });
    socket.registerFunction('join',(data)=>{
        console.log('joined -> ', data.name)
        chat_add(chatLog,data.name + ' さんが入室しました',"div")
        user_list_update_socket(socket);
        if (data.name === window.account_id) return;
        createOffer(data.name)
    })
    socket.registerFunction('make_go_board',(data)=>{
        console.log(`作るよ碁盤、このサイズ→:${data.y} ${data.x}`)
        const boardid = data.id
        const canvas = document.createElement('canvas')
        canvas.width =640
        canvas.height = 480
        boardCanvas.appendChild(canvas)
        let mousePos
        canvas.addEventListener('mousemove',(event)=>{
            mousePos = getMousePos(canvas, event);
            goban.checkOnMouse(mousePos.y,mousePos.x)
        })
    
        canvas.addEventListener('click',()=>{
            if(goban.onMouse){
                if(goban.canMove(goban.my,goban.my,goban.turn)){
                    socket.send(JSON.stringify({
                        'client_message_type': 'place_stone',
                        'id':boardid,
                        'x': goban.mx,
                        'y': goban.my,
                        'turn': goban.turn
                    }))
                }
            }
        })
        function getMousePos(canvas, event) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: event.clientX - rect.left, // Canvas内のX座標
                y: event.clientY - rect.top   // Canvas内のY座標
            };
        }
    
        goban = new GoBoard(canvas.getContext("2d"),data.id,400,400,data.y,data.x,0,0)
    
    });
    socket.registerFunction('place_stone',(data)=>{
        
        console.log(data)
        goban.board = data.board
        goban.turn = data.turn
        goban.koY = data.koY
        goban.koX = data.koX
        goban.koTurn = data.koTurn
        goban.blackCaptureCount = data.black_capture
        goban.whiteCaptureCount = data.white_capture
    })
    
    socket.registerFunction('p2pOffer',(data)=>{
        if(window.account_id === data.from){
            console.log('your_offer')
            return;
        }
        console.log('オファーハンドラを呼びます')
        handleOffer(data.from, data.offer);
    })
    socket.registerFunction('p2pAnswer',(data)=>{
        console.log('アンサーハンドラを呼びます')
        handleAnswer(data.from, data.answer);
    })
    
    socket.registerFunction('p2pIceCandidate',(data)=>{
        console.log('ICE候補ハンドラを呼びます from:' + data.from)
        handleIceCandidate(data.from, data.candidate)
    })
    makeBoardModal.addEventListener('close', () => {
        switch(makeBoardModal.returnValue){
            case 'make-board-submit':
                socket.send(JSON.stringify({
                    'client_message_type': "make_go_board",
                    'x': parseInt(inputBoardX.value),
                    'y': parseInt(inputBoardY.value)
                }));
            break;
            case 'make-board-cancel':
                console.log('make-board-cancel');
            break;
    
        }
    });
    makeBoard.onclick = ()=>{
        makeBoardModal.showModal();
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

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log("このブラウザはgetUserMediaをサポートしています");
    } else {
        console.error("このブラウザではgetUserMediaがサポートされていません");
    }

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
                socket.send(JSON.stringify({
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
            socket.send(JSON.stringify({
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
        console.log('Received offer:', offer);

        const peerConnection = new RTCPeerConnection(configuration);

    // 受信したオファーをリモートSDPとしてセット
        try {
            console.log('Setting remote description with offer:', offer);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('Remote description set successfully');

        } catch (error) {
            console.error('Error setting remote description:', error);
        }
        await getAudioStream();
        setStream(peerConnection)

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        console.log('sendding answer -> ', accountId)
        socket.send(JSON.stringify({
            'client_message_type': 'p2pAnswer',
            'answer': peerConnection.localDescription,
            'for': accountId, //answerを返す相手
        }));

        peerConnection_init(accountId, peerConnection)

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

        if(peerConnection.remoteDescription !== null){
            console.log("ICE候補ハンドラが処理中")
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
    processMessageQueue(); //動的インポート中にたまったメッセージを処理
})

function mainloop(){
    if(goban){
        goban.draw();
    }
    requestAnimationFrame(mainloop)
}
mainloop();