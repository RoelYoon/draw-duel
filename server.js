const express = require("express")
const path = require("path")
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
require('dotenv').config();
const bTime = 60;

app.use(express.json());
app.use(express.static(path.join(__dirname,"./public")));
app.use(express.static(path.join(__dirname,"./src")));
app.use(express.static(path.join(__dirname,"./node_modules")));

let lobby = {};
app.get('/api/lobby',(req,res)=>{
    const safeLobby = {};
    for (const [roomName, room] of Object.entries(lobby)) {
        const { isPublic, password, players, drawings, inBattle, timeLeft } = room;
        safeLobby[roomName] = { isPublic, password, players, drawings, inBattle, timeLeft };
    }
    res.status(200).json(safeLobby);
})
app.post('/api/lobby',(req,res)=>{
    const {name, isPublic,password} = req.body;
    if(name in lobby){
        return res.status(400).json({error: "Room name exists in lobby"});
    }
    lobby[name]={
        isPublic: isPublic,
        password: isPublic?'':password,
        players: {},
        drawings: {},
        inBattle: false,
        timer: null,
        timeLeft: bTime
    };
    return res.status(200).json(lobby);
})
/*
app.post("/api/start-battle", (req, res) => {
    const {roomName,playerName} = req.body;
    if (!(roomName in lobby)){
        res.status(500);
        return;
    }
    lobby[roomName].players.push(playerName);
    socket.join(playerName);
});*/
// socket.io connection
function dataURLToBuffer(dataURL) {
  const parts = dataURL.split(';base64,');
  const base64Data = parts[1];
  return Buffer.from(base64Data, 'base64');
}
io.on('connection',(socket)=>{
    socket.on('joinRoom',({roomName,playerName})=>{
        if (!(roomName in lobby) && roomName!==playerName){
            socket.emit('joinError', 'Room does not exist');
            return;
        }
        lobby[roomName].players[socket.id]=playerName;
        socket.join(roomName);
        socket.roomName = roomName;
        if(Object.keys(lobby[socket.roomName].players).length===2){
            // game starts
            lobby[roomName].inBattle=true;
            io.to(roomName).emit("battleStart",{timeLeft:bTime});
            lobby[roomName].timer = setInterval(() => {
                lobby[roomName].timeLeft--;
                // broadcast remaining time
                io.to(roomName).emit("timerUpdate", { timeLeft: lobby[roomName].timeLeft });
                if (lobby[roomName].timeLeft <= 0) {
                        clearInterval(lobby[roomName].timer);
                        lobby[roomName].timer = null;
                        io.to(roomName).emit("timerEnded",{isDisconnect: false});
                    }
            }, 1000);
        }
    })
    socket.on("drawSubmit", async (dataURL) => {
        const buffer = dataURLToBuffer(dataURL);
        const playerName = lobby[socket.roomName].players[socket.id];
        const filePath = path.join(__dirname, `${playerName}.jpg`);
        fs.writeFile(filePath, buffer, (err) => {});

        /*
        Implement image-to-text model here
        */
    });
    socket.on("disconnect", async () => {
        if(lobby)
        try{
            const filePath = path.join(__dirname, `${lobby[socket.roomName].players[socket.id]}.jpg`);
            fs.unlink(filePath, (err) => {});
        }catch(err){}
        delete lobby[socket.roomName].players[socket.id];
        clearInterval(lobby[socket.roomName].timer);
        lobby[socket.roomName].timer=null;
        io.to(socket.roomName).emit("timerEnded", {isDisconnect: true});
        setTimeout(() => {
            delete lobby[socket.roomName];
        }, 10000);
    });
});

//http.listen(3000,()=>{console.log("Listening at 3000")});
http.listen(process.env.PORT, process.env.INTERNAL_IP, ()=>{console.log(`Listening at ${process.env.ADDRESS}`)});
