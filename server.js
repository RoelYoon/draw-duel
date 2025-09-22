const express = require("express")
const path = require("path")
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const md = require("moondream");
const hf = require("@huggingface/inference");
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
        const { isPublic, password, players, drawings, inBattle, result,timeLeft } = room;
        safeLobby[roomName] = { isPublic, password, players, drawings, result,inBattle, timeLeft };
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
        result: "",
        timer: null,
        timeLeft: bTime
    };
    return res.status(200).json(lobby);
})

app.get('/api/drawings/:roomName',(req,res)=>{
    const roomName = req.params["roomName"];
    if(!(roomName in lobby)){
        res.status(400).json({error: "No drawing data"});
        return;
    }
    res.status(200).json(lobby[roomName].drawings);
})

app.get('/api/ai/:player1/:player2/:roomName',async (req,res)=>{
    if(lobby[req.params["roomName"]].inBattle){
        lobby[req.params["roomName"]].inBattle=false;
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.DEEP_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": "x-ai/grok-4-fast:free",
            "messages": [
            {
                "role": "user",
                "content": `Who would win in a fight and why: ${req.params["player1"]} or ${req.params["player2"]}. Quickly explain in a single, brief sentence.`,
            }
            ]
        })
        });
        const completion = await response.json()
        lobby[req.params["roomName"]].result = completion.choices[0].message.content;
        await res.status(200).json({"answer": completion.choices[0].message.content});
    }else{
        async function waitUntil(conditionFunction, timeout = 10000, interval = 100) {
            return new Promise((resolve, reject) => {
                const checkCondition = () => {
                if (conditionFunction()) {
                    clearInterval(intervalId);
                    resolve();
                }
                };
                const intervalId = setInterval(checkCondition, interval);
                setTimeout(() => {
                clearInterval(intervalId);
                reject(new Error("Timeout waiting for condition"));
                }, timeout);
            });
        }
        try {
            await waitUntil(() => lobby[req.params["roomName"]].result !== "");
            // Proceed with processing the data
            res.status(200).json({"answer": lobby[req.params["roomName"]].result});
        } catch (error) {
            res.status(500).json({"answer":"Draw"}); //timeout
        }
    }
});

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

const model = new md.vl({ apiKey: `${process.env.API_KEY}` });
const client = new hf.InferenceClient(process.env.HF_TOKEN);
io.on('connection',(socket)=>{
    socket.on('joinRoom',({roomName,playerName})=>{
        if (!(roomName in lobby)){
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
        fs.writeFileSync(filePath, buffer, (err) => {});
        const image = fs.readFileSync(filePath);
        const aiResponse = await model.query({ image: image, question: "What is this a drawing of in 5 or less words?", stream: false });

        lobby[socket.roomName].drawings[playerName]={
            image: dataURL,
            caption: aiResponse["answer"]
        }; 

        if(Object.keys(lobby[socket.roomName].drawings).length===2){
            io.to(socket.roomName).emit("processDone",{"roomName":socket.roomName});
        }
    });
    socket.on("disconnect", async () => {
        if(!(socket.roomName in lobby)){return;}
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
