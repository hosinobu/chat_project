//chat.js
import { getSocket } from "./websocket.js";
import {
    chatInput, eButton, imageInput, chatSubmit, chatLog,
     clearChatInput, focusChatInput, csrftoken
    } from "./elements.js";
const socket = getSocket();
socket.registerFunction('chat', (data)=>{
    chat_add(chatLog, data.from + ' -> ' + data.content,"div",data.image_url,data.thumbnail_url)
    chatLog.scrollTop = chatLog.scrollHeight - chatLog.clientHeight;
})
function sendMessage(){

    let content = chatInput.value;
    const urlRegex = /(https?|ftp|file):\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[a-zA-Z0-9.=-_?#%$&/]*)?/g;
    
    const formattedContent = content.replace(urlRegex, (url) => {
        return `<a href='${url}' target='_blank' rel='noreferrer'>${url}</a>`;
    });
    
    const imageFile = imageInput.files[0];  // 選択された画像ファイル
    
    const formData = new FormData();
    formData.append('content',formattedContent)

    if (formattedContent || imageFile) {
        if (imageFile) {
            console.log("http_post!--"+window.roomid)
            console.log(formattedContent)
            // 画像がある場合は、HTTP POSTで送信
            formData.append('image', imageFile);

            fetch(`/chat/${window.roomid}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,  // CSRFトークン
                    'X-Requested-With' : ' XMLHttpRequest',
                },
                body: formData
            }).then(response => {
                if (!response.ok){
                    throw new Error('Network response was not ok')
                }
                return response.json()
            }).then(data => {
                console.log('Success:',data);
            });
        } else {
            // 画像がない場合は、WebSocketでメッセージを送信
            socket.send(JSON.stringify({
                'client_message_type': 'chat',
                'content': formattedContent,
            }));
        }
    }

    //入力フィールドと画像のリセット
    clearChatInput()
}

chatSubmit.onclick = ()=>{
    sendMessage()
}
chatInput.onkeydown =(event)=>{
    if (event.key === "Enter"){
        event.preventDefault();
        sendMessage();
    }
}

const picker = new EmojiButton();
picker.on('emoji', emoji => {
    insertAtCaret(chatInput,emoji);
});

eButton.onclick = ()=>{
    picker.showPicker(eButton);
};

// カーソル位置に絵文字を挿入する関数
function insertAtCaret(input, textToInsert) {
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const beforeText = input.value.substring(0, startPos);
    const afterText = input.value.substring(endPos, input.value.length);
    input.value = beforeText + textToInsert + afterText;
    const newCaretPos = startPos + textToInsert.length;
    input.setSelectionRange(newCaretPos, newCaretPos);
    input.focus();
}

//チャット欄にメッセージを追加する関数
export function chat_add(tag,content,addtag,image = "",thumbnail = ""){
    const new_text_element = document.createElement(addtag)
    new_text_element.innerHTML = content
    if (image){//画像あり
        console.log("画像あり")
        const new_img_element = document.createElement('img')
        if (thumbnail){//サムネイルあり
            console.log("サムネイルあり")
            new_img_element.src = thumbnail
            const new_a_element = document.createElement('a')
            new_a_element.href = image
            new_a_element.appendChild(new_img_element)
            new_text_element.appendChild(new_a_element)
        }else{
            new_img_element.src = image
            new_text_element.appendChild(new_img_element)
        }
    }
    tag.appendChild(new_text_element)
}

focusChatInput();

