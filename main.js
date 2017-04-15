const modalMessage = {

	show: function(title, message, buttonGenerator)
	{
		const closure = arguments.callee;
		if(!closure.elements)
		{
			const box = document.createElement("div");
			const flex = document.createElement("div");
			const text = document.createElement("p");
			const titleBar = document.createElement("p");
			const buttons = document.createElement("div");
			closure.elements = {box: box, text: text, titleBar: titleBar, buttons: buttons};

			box.appendChild(titleBar);
			box.appendChild(flex);
			flex.appendChild(text);
			box.appendChild(buttons);

			box.style["background-color"] = "#fff";
			box.style.border = "1px solid #000";
			box.style["border-radius"] = "10px";
			box.style.position = "fixed";
			box.style.top = "10vh";
			box.style.left = "30vw";
			box.style.width = "40vw";
			box.style.height = "15vh";

			flex.style.display = "flex";
			flex.style["justify-content"] = "center";
			flex.style["align-items"] = "center";
			flex.style.width = "100%";
			flex.style["margin-top"] = "30px";
			flex.style["margin-bottom"] = "10px";

			buttons.style.display = "flex";
			buttons.style["justify-content"] = "center";
			buttons.style["align-items"] = "center";
			buttons.style.width = "100%";

			titleBar.style.position = "absolute";
			titleBar.style.top = "2px";
			titleBar.style.left = "10px";
			titleBar.style["font-family"] = "sans-serif";
			titleBar.style["font-size"] = "10px";

			document.body.appendChild(box);
		}
		const box = closure.elements.box;
		const text = closure.elements.text;
		const titleBar = closure.elements.titleBar;
		const buttons = closure.elements.buttons;
		buttons.innerHTML = "";
		document.querySelector("#board").style.filter = "blur(2px)";
		do
		{
			var button = buttonGenerator();
			if(button)
				buttons.appendChild(button);
		}
		while(button);

		text.innerText = message;
		titleBar.innerText = title;
		box.style.display = "block";
	},

	dismiss: function()
	{
		const box = modalMessage.show.elements.box;
		if(box){
			box.style.display = "none";
			document.querySelector("#board").style.filter = "";
		}
	}
};

const shuffle = function(arr)
{
	for(let i = 1; i < arr.length; i++)
	{
		let toSwap = ~~( Math.random()*(arr.length - i) );
		let temp = arr[toSwap];
		arr[toSwap] = arr[arr.length-i];
		arr[arr.length-i] = temp;
	}
};

const randomStartPosition = function(boardWidth, boardHeight)
{
	const divisor = 10;
	const totalPositions = ~~( (boardWidth/divisor) * (boardHeight/divisor) );
	const closure = arguments.callee;
	if(!closure.remainingPositions)
	{
		closure.remainingPositions = new Array(totalPositions);
		console.log(totalPositions);
		for(let i = 0; i < totalPositions; i++)
		{
			let offset = ~~(divisor/2);
			let x = offset + (i*10)%boardWidth;
			let y = offset + (divisor * (~~(i/divisor)) ) % boardWidth;
			closure.remainingPositions[i] = {x: x, y: y};
		}
		shuffle(closure.remainingPositions);
	}
	const position = closure.remainingPositions.pop();

	return {success: (typeof position === "object"), position: position};
};
const rsp = randomStartPosition;

const startingTilesDummyData = [
	{start: rsp(100, 100).position, color: "#00ff00"},
	{start: rsp(100, 100).position, color: "#ff0000"}
];
let localPlayerID = 1;

class Board
{
	constructor(height, width, tableID, players)
	{
		//private constructor functions
		const parseId = function(id)
		{
			let arr = id.split("-");
			let x = parseInt(arr[0]);
			let y = parseInt(arr[1]);
			return {x: x, y: y};
		}
		const sound = function(url)
		{
			const soundObj = new Audio(url);
			return {
				play: function()
				{
					soundObj.currentTime = 0;
					soundObj.play();
				},
				audioObject: soundObj
			}
		};
		//end private constructor functions

		this.sounds = {
			success: sound("http://soundbible.com/grab.php?id=2154&type=mp3"),
			fail: sound("http://soundbible.com/grab.php?id=2017&type=mp3")
		};
		this.board = document.getElementById(tableID);
		this.ownership = new Array(100);
		this.players = players;
		for(let i = 0; i < this.ownership.length; i++)
		{
			this.ownership[i] = new Array(100);
		}
		for(let i = 0; i < 100; i++)
		{
			const row = document.createElement("tr");
			board.appendChild(row);
			for(let j = 0; j < 100; j++)
			{
				const td = document.createElement("td");
				td.id = `${j}-${i}`;
				const self = this;
				var holdingMouse = false; //need to use var for these to make all the events get closure on the same ones
				var lastSpot;
				td.onmouseup = function(e){
					const spot = parseId(td.id);
					self.setOwnership(spot.x, spot.y, localPlayerID);
				}
				td.onmousedown = function(e){
					const spot = parseId(td.id);
					if(self.validateConquer(spot.x, spot.y, localPlayerID))
					{
						holdingMouse = true;
						lastSpot = td;
						window.onmouseup = function()
						{
							holdingMouse = false;
							document.body.onmouseup = undefined;
						}
					}
				}
				td.onmouseover = function(e){
					if(holdingMouse === true)
					{
						const spot = parseId(lastSpot.id);
						self.setOwnership(spot.x, spot.y, localPlayerID);
						lastSpot = td;
					}
				}
				row.appendChild(td);
			}
		}

		for(let i = 0; i<players.length; i++)
		{
			this.setOwnership(players[i].start.x, players[i].start.y, i, true, false);
		}
	}
	///End constructor///

	validateConquer(x, y, playerID)
	{
		if(this.getOwnership(x + 1, y) == playerID
			|| this.getOwnership(x - 1, y) == playerID
			|| this.getOwnership(x, y + 1) == playerID
			|| this.getOwnership(x, y - 1) == playerID
			|| this.getOwnership(x, y) == playerID)
			return true;

		return false;
	}

	setOwnership(x, y, playerID, skipValidation = false, playSounds = true)
	{
		if(this.validateConquer(x, y, playerID) || skipValidation)
		{
			if(playSounds){
				this.sounds.success.play();
			}
			this.ownership[x][y] = playerID;
			document.getElementById(`${x}-${y}`).style["background-color"] = this.players[playerID].color;
		}
		else if(playSounds){
			this.sounds.fail.play();
		}
	}

	getOwnership(x, y)
	{
		if(x < 0)
			x = 0;
		if(y < 0)
			y = 0;
		return this.ownership[x][y];
	}

}

let buttonNum = 0;
const playerPickButton = function()
{
	if(startingTilesDummyData[buttonNum])
	{
		const button = document.createElement("button");
		const eventNum = buttonNum;
		button.onmouseup = function()
		{
			localPlayerID = eventNum;
			modalMessage.dismiss();
			//when this function is initialized it gets closure on the value of eventNum
			//which does not change when buttonNum changes.
		};
		button.style["background-color"] = startingTilesDummyData[buttonNum].color;
		button.style.color = "#fff";
		button.style["font-weight"] = "bold";
		button.style["border-radius"] = "15px";
		button.style.border = "1px solid #ccc";
		button.innerText = `Player ${buttonNum}`;
		buttonNum++;
		return button;
	}
}

window.onload = function()
{
	const board = new Board(100, 100, "board", startingTilesDummyData);
	modalMessage.show("Choose Player Number", "Which player do you want to be?", playerPickButton);
}