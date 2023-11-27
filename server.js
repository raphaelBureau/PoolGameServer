const { Server } = require("socket.io");
const { readFileSync } = require("fs");
const { createServer } = require("https");


const httpServer = createServer({
    key: readFileSync("./certs/privkey.pem"),
    cert: readFileSync("./certs/fullchain.pem")
});

const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});

var games = {}; //jsp si cest une bonne idée mais javascript cest magique
games["pool"] = {}; //list de pool
games["pool"]["waiting"] = [] //array de socket.id pour l'instant ya surement une meuilleure maniere
games["pool"]["playing"] = [] //dictionaire ou [(player1) socket.id] = (player2) socket.id et [(player2) socket.id] = (player1) socket.id  encore, il y a surement une meuilleure maniere

var privateQueue = []; //partie privee

var playerInfoList = []; //contient les infos des joueurs {name:"nom",profile:"url"}

io.on("connection", (socket) => {
    socket.emit("connected", "args");

    socket.on("disconnect", (reason) => {
        if (games["pool"]["waiting"].includes(socket.id)) {

            games["pool"]["waiting"].splice(games["pool"]["waiting"].indexOf(socket.id), 1);
            console.log("waiting player removed : " + socket.id);
        }
        if (games["pool"]["playing"].hasOwnProperty(socket.id)) {

            let id = games["pool"]["playing"][socket.id];

            socket.to(id).emit("playerLeave", "args");

            delete games["pool"]["playing"][id];
            delete games["pool"]["playing"][socket.id];

            console.log("Left game, player: " + socket.id + " , disconnecting: " + id);
        }
    });

    socket.on("joinGame", (userInfo) => {
        //validation
        console.log(userInfo);
        userInfo = JSON.parse(userInfo);
        if(userInfo.hasOwnProperty("id") && userInfo.hasOwnProperty("gamertag") && userInfo.hasOwnProperty("img")) {
         //   let profileData = {};
         //   profileData.lobbyID = userInfo.lobbyID;
         //   if(userInfo.token == "none") {
        //    console.log("guest user join request id:" + socket.id + ", GuestName: " + userInfo.id + ", token: " + userInfo.token + ", lobbyID:" + userInfo.lobbyID);
        //    profileData.name = userInfo.id;
       //     }
       //     else{
                //a faire plus tard authentification
          //  console.log("registered user join request id:" + socket.id + ", userID: " + userInfo.id + ", token: " + userInfo.token + ", lobbyID:" + userInfo.lobbyID);
        //    profileData.name = 
       //     }

       playerInfoList[socket.id] = JSON.stringify(userInfo);

        if (games["pool"]["waiting"].length >= 1) {

            let p2Id = games["pool"]["waiting"][0];

            games["pool"]["playing"][p2Id] = socket.id; //player 1
            games["pool"]["playing"][socket.id] = p2Id; //player 2

            socket.to(p2Id).emit("opponentInfo", playerInfoList[socket.id])//player1
            socket.to(p2Id).emit("gameStart", "true"); //player1
            socket.emit("opponentInfo", playerInfoList[p2Id])//player2
            socket.emit("gameStart", "false"); //player2

            console.log("Match Found p1: " + p2Id + " p2: " + socket.id);

            games["pool"]["waiting"].splice(0, 1); //possiblement vraiment dangereux
        }
        else {
            games["pool"]["waiting"].push(socket.id); //waiting for players

            console.log("Waiting: " + socket.id);
        }
    }
    })
    socket.on("sendPos", (arg) => {
        socket.to(games["pool"]["playing"][socket.id]).volatile.emit("positions", arg);
    });
    socket.on("giveControl", () => {
        socket.to(games["pool"]["playing"][socket.id]).emit("control", true);
        console.log("player: " + socket.id + " gave control to: " + games["pool"]["playing"][socket.id]);
    });
    socket.on("updateBalls", (arg) => {
        socket.to(games["pool"]["playing"][socket.id]).emit("updateBalls", arg);
        console.log("player: " + socket.id + " updated ball status");
    });
    socket.on("updateTrajectory", (arg) => {
        socket.to(games["pool"]["playing"][socket.id]).volatile.emit("trajectory", arg);
    });

    socket.on("sendMessage", (message) => {
        //message format, message.nom, message.text, message.channel
        let messageObj = JSON.parse(message);
        if(messageObj.hasOwnProperty("nom") && messageObj.hasOwnProperty("text") && messageObj.hasOwnProperty("channel")) { //validity check
            switch(messageObj.channel) {
                case 0:
                io.emit("sendMessage", message); //all, global chat
                break;
                case 1:
                socket.to(games["pool"]["playing"][socket.id]).emit("sendMessage", message); //game chat
                break;
                default:
                socket.to(messageObj.channel).emit("sendMessage", message);
                break;
            }
        }
        else{
            console.log("invalid message from " + socket.id);
        } 
    });
    socket.on("joinChannel", (channel) => {
        socket.join(channel);
    });
    socket.on("leaveChannel", (channel) => {
        socket.leave(channel);
    });

});

httpServer.listen(3000);