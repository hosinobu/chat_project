let mouseX = -1
let mouseY = -1
let clicked = false


function CreateCanvas(element,width, height){

	let canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	canvas.addEventListener('mousemove', function(event){
		mouseX = event.offsetX
		mouseY = event.offsetY
		document.getElementById('position').textContent = `x = ${mouseX} : y = ${mouseY}`
	})

	canvas.addEventListener('click',function(event){
		clicked = true
	})

	element.appendChild(canvas);

	let ctx = canvas.getContext('2d');


	return ctx

}

document.getElementById("makeboard").addEventListener('click', function(event){
	if (goban_board)return;
	document.getElementById('make-board-modal').showModal();
});