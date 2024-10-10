document.getElementById('chat-message-submit').onclick = ()=>{
    sendMessage()
}
document.getElementById('chat-message-input').onkeydown =(event)=>{
    if (event.key === "Enter"){
        event.preventDefault();
        sendMessage();
    }
}

const chatinput = document.querySelector('#chat-message-input')
const ebutton = document.querySelector('#emoji-button')
const imageinput = document.querySelector('#image-input')
const chatsubmit = document.querySelector('#chat-form')


function sendMessage(){

    let content = chatinput.value;
    const urlRegex = /(https?|ftp|file):\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[a-zA-Z0-9.=-_?#%$&/]*)?/g;
    
    content = content.replace(urlRegex, (url) => {
        return `<a href='${url}' target='_blank' rel='noreferrer'>${url}</a>`;
    });

    const csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const imageFile = imageinput.files[0];  // 選択された画像ファイル
    
    const formData = new FormData();
    formData.append('content',content)

    if (content || imageFile) {
        if (imageFile) {
             console.log("http_post!--"+roomid)
             console.log(content)
             // 画像がある場合は、HTTP POSTで送信
             const formData = new FormData();
             formData.append('content', content?content:"");
             formData.append('image', imageFile);
 
             fetch(`/chat/${roomid}/`, {
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
             chatSocket.send(JSON.stringify({
                 'client_message_type': 'chat',
                 'content': content,
             }));
         }
     }
 
     //入力フィールドと画像のリセット
     chatinput.value = '';
     imageinput.value = '';
     //*/
 }
chatinput.focus();

const picker = new EmojiButton();
picker.on('emoji', emoji => {
	insertAtCaret(chatinput,emoji);
});

ebutton.onclick = ()=>{
	picker.showPicker(ebutton);
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
function chat_add(tag,content,addtag,image = "",thumbnail = ""){
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

//*/