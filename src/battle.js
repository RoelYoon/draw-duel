// establishing socket
const socket = io();
const params = new URLSearchParams(window.location.search);
const roomName = params.get("room");
const playerName = params.get("player");

joinRoom(roomName,playerName);
function joinRoom(roomName, playerName){
    socket.emit('joinRoom',{roomName,playerName});
    socket.on('joinError', (msg)=>alert(msg));
}

const battleMessage = document.getElementById("battleMessage");

const colorA = { r: 77, g: 176, b: 203 }; 
const colorB = { r: 197, g: 122, b: 64 };

animateTextColor(battleMessage, colorA, colorB, 3000);

// To make it loop back and forth:
let isForward = false;
setInterval(() => {
  if (isForward) {
    animateTextColor(battleMessage, colorA, colorB, 3000);
  } else {
    animateTextColor(battleMessage, colorB, colorA, 3000);
  }
  isForward = !isForward;
}, 3000);

const canvas = document.getElementById("drawWidget");

const signaturePad = new SignaturePad(canvas, {
  backgroundColor: 'white',  // makes exported images white instead of transparent
  penColor: "#ff0000",
  minWidth: 1,
  maxWidth: 3
});
signaturePad.off();

const picker = document.getElementById("colorPicker");
const value = document.getElementById("colorValue");

picker.addEventListener("input", (e) => {
    value.textContent = e.target.value;
    value.style.color = e.target.value;
    signaturePad.penColor = e.target.value;
});

//timer 

const timerLabel = document.getElementById("timerLabel");
const timerDisplay = document.getElementById("timerDisplay");

socket.on("battleStart", ({ timeLeft }) => {
    signaturePad.on();
    timerLabel.textContent="Battle Time";
    timerDisplay.textContent = timeLeft;
});

socket.on("timerUpdate", ({ timeLeft }) => {
    timerDisplay.textContent = timeLeft;
});


socket.on("timerEnded", async ({isDisconnect}) => {
    signaturePad.off();
    timerDisplay.textContent="";
    if(isDisconnect){
        timerLabel.innerHTML="<p>Battle has ended!<br>Disconnected :(</p>"
        setTimeout(() => {
            window.location.href=`/`;
        }, 5000);
        
    }else{
        timerLabel.innerHTML="<p>Battle has ended!<br>Waiting for result...</p>"
        const dataURL = signaturePad.toDataURL("image/jpeg");
        socket.emit("drawSubmit",dataURL);
    }
});

socket.on("processDone",({drawings})=>{
    /*
    const drawingsJSON = encodeURIComponent(JSON.stringify(drawings));
    window.location.href=`/end.html?room=${encodeURIComponent(drawingsJSON)}`;
    */
   const players = Object.keys(drawings);
   const endPage =
`
    <!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>Draw Duel</title>
        <link rel="stylesheet" href="/styles.css"/>
    </head>
    <body>
        <p style="text-align: center; margin-top:12vh">I'm not done yet!!!<br>But nice drawings :)</p>
        <div id="drawingResults">
            <label>Player 1: </label>
            <img src="${drawings[players[0]]}" id="player1Drawing" alt="drawing 1" width="500">
            <label>Player 2: </label>
            <img src="${drawings[players[1]]}" id="player2Drawing" alt="drawing 2" width="500">
        </div>  
    </body>
</html>`
document.open();
document.write(endPage);
document.close();
});