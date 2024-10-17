import logging_server_message from "./util/logging.js";
let websocket = null;
let promiseResolve
let promiseReject
let promise = new Promise((resolve, reject) => {
    promiseResolve = resolve
    promiseReject = reject
})
//メインスクリプトから呼ぶ
export function initializeWebSocket(url){
    if (!url) {
        return promiseReject(new Error("WebSocket URL must be provided."));
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    websocket = new WebSocket(
        'ws://' + window.location.host + "/ws/" + url
        + (url.slice(-1) === "/" ? "" : "/") //pythonサーバーのエンドポイントの為に、末尾はスラッシュ
    );
    websocket.onopen = () => {
        console.log('WebSocket connection opened');
        promiseResolve(); // WebSocketの初期化が完了したらresolveを呼ぶ
    };
    websocket.onclose = () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(() => initializeWebSocket(url), 1000); // URLを保持しつつ1秒後に再接続
    };

    websocket.functions = {};

    websocket.registerFunction = function(name, func) {
        if (this.functions[name]) {
            console.warn(`Function ${name} is already registered and will be overwritten.`);
        }
        this.functions[name] = func;
    };

    websocket.onmessage = (event) => {

        const message = JSON.parse(event.data);
        logging_server_message(message)

        if (websocket.functions[message.server_message_type]) {
            websocket.functions[message.server_message_type](message);
        } else {
            console.error(`No function found for ${message.server_message_type}`);
        }
    };
}

//サブモジュールから呼ぶ（メインスクリプトからも）
export async function getWebSocket(){
    await promise
    return websocket
}