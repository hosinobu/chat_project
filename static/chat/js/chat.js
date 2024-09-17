//<--chat.js--!>
const chatinput = document.querySelector('#chat-message-input')
const ebutton = document.querySelector('#emoji-button')
const imageinput = document.querySelector('#image-input')
const chatsubmit = document.querySelector('#chat-form')

const picker = new EmojiButton();
picker.on('emoji', emoji => {
	insertAtCaret(chatinput,emoji);
 });

ebutton.addEventListener('click', () =>{
	picker.showPicker(ebutton)
});


chatinput.focus();
chatinput.onkeyup = function(e) {
	if (e.keyCode === 13) {  // Enter key pressed
		chatsubmit.click();
	}
};

chatsubmit.onsubmit = function(e) {
    e.preventDefault();  // フォームのデフォルト動作を無効化（ページリロード防止）

    var exp = /((?<!href="|href='|src="|src=')(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    const content = chatinput.value.replace(exp, "<a href='$1' target='_blank' rel='noreferrer'>$1</a>"); 
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
}


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
function chat_add(tag,content,addtag,image = ""){
	const new_text_element = document.createElement(addtag)
	new_text_element.innerHTML = content
	if (image){
		const new_img_element = document.createElement('img')
		new_img_element.src = image
		new_text_element.appendChild(new_img_element)
	}
	tag.appendChild(new_text_element)
}