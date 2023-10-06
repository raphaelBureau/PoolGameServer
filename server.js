const { Server } = require("socket.io");
var client1;
var clientC = false;
var client2;

var games = {}; //jsp si cest une bonne idée mais javascript cest magique
games["pool"] = {}; //list de pool
games["pool"]["waiting"] = [] //array de socket.id pour l'instant ya surement une meuilleure maniere
games["pool"]["playing"] = {} //dictionaire ou [(player1) socket.id] = (player2) socket.id et [(player2) socket.id] = (player1) socket.id  encore, il y a surement une meuilleure maniere


const io = new Server({
    cors: {
        origin: "*"
    }
});

io.on("connection", (socket) => {

    socket.on("joinGame", (arg) => {
        if(games["pool"]["waiting"].length >= 1) {

            games["pool"]["playing"][ games["pool"]["waiting"][0] ] = socket.id; //player 1
            games["pool"]["playing"][socket.id] = games["pool"]["waiting"][0]; //player 2

            socket.to(games["pool"]["waiting"][0]).emit("gameStart", "true"); //player1
            socket.emit("gameStart", "false"); //player2

            console.log("Match Found p1: " + games["pool"]["waiting"][0] + " p2: " + socket.id);


            games["pool"]["waiting"].splice(0,1); //possiblement vraiment dangereux
        }
        else{
            games["pool"]["waiting"].push(socket.id); //waiting for players
            console.log("Waiting: " + socket.id);
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
});

io.listen(3000);