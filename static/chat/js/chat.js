

const chatinput = document.querySelector('#chat-message-input')
const ebutton = document.querySelector('#emoji-button');
const chatsubmit = document.querySelector('#chat-message-submit')

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

chatsubmit.onclick = function(e) {
	const messageInputDom = chatinput;
	var exp = /((?<!href="|href='|src="|src=')(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
	const content = messageInputDom.value.replace(exp, "<a href='$1' target='_blank' rel='noreferrer'>$1</a>"); 
	chatSocket.send(JSON.stringify({
		'client_message_type': 'chat',
		'content': content,
	}));
	messageInputDom.value = '';
};


// カーソル位置に絵文字を挿入する関数
function insertAtCaret(input, textToInsert) {
    // カーソル位置を取得
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;

    // テキストを分割してカーソル位置に挿入
    const beforeText = input.value.substring(0, startPos);
    const afterText = input.value.substring(endPos, input.value.length);
    
    input.value = beforeText + textToInsert + afterText;

    // カーソルを絵文字の後ろに移動
    const newCaretPos = startPos + textToInsert.length;
    input.setSelectionRange(newCaretPos, newCaretPos);
    input.focus();
}
