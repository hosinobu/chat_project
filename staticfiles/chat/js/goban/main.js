
ctx = CreateCanvas(document.getElementById('board-main'),640,480)

goban_board = null


let lastTime = -1;
let deltaTime = -1;

captureboard = document.getElementById("captures")

function gameLoop(timestamp){

	if (goban_board){
		if (lastTime === -1){
			lastTime = timestamp
		}
		deltaTime = (timestamp - lastTime) / 1000

		goban_board.checkOnMouse(mouseY,mouseX)

		if (clicked){
			clicked = false
			console.log(goban_board.my,goban_board.mx, goban_board.turn)
			let[success,result] = goban_board.canMove(
				goban_board.my, goban_board.mx, goban_board.turn
			)
			if(success){
				chatSocket.send(JSON.stringify({
					'client_message_type': 'place_stone',
					'y': goban_board.my,
					'x': goban_board.mx,
					'turn': goban_board.turn,
					'id': goban_board.id
				}))
			}
		}

		ctx.clearRect(0, 0, ctx.width, ctx.height)
		goban_board.draw()
		captureboard.textContent = `${goban_board.blackCaptureCount} : ${goban_board.whiteCaptureCount}`

	}

	requestAnimationFrame(gameLoop)

}
requestAnimationFrame(gameLoop)

