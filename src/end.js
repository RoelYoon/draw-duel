const params = new URLSearchParams(window.location.search);
const roomName = params.get("room");
const p1Drawing = document.getElementById("player1Drawing");
const p2Drawing = document.getElementById("player2Drawing");
const p1Label = document.getElementById("player1Label");
const p2Label = document.getElementById("player2Label");
const result = document.getElementById("result");
async function getDrawings(){
  try {
    response = await fetch(`/api/drawings/${roomName}`, {
      method: 'GET'
    });
    if (!response.ok){throw new Error((await response.json()).error);}
    drawings = await response.json();
    players = Object.keys(drawings);
    p1Label.textContent=`${players[0]}'s drawing: ${drawings[players[0]]["caption"]}`;
    p1Drawing.src=drawings[players[0]]["image"];
    p2Label.textContent=`${players[1]}'s drawing: ${drawings[players[1]]["caption"]}`;
    p2Drawing.src=drawings[players[1]]["image"];

    response = await fetch(`/api/ai/${drawings[players[0]]["caption"]}/${drawings[players[1]]["caption"]}/${roomName}`, {
      method: 'GET'
    });
    if (!response.ok){throw new Error((await response.json()).error);}
    const answer = await response.json()
    console.log(answer);
    result.textContent=answer["answer"];

  } catch (err) {
    alert(err.message);
  }
}
getDrawings();