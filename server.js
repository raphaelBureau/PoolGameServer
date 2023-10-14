const { Server } = require("socket.io");
const { readFileSync } = require("fs");
const { createServer } = require("https");


const httpServer = createServer({
    key: readFileSync("/etc/letsencrypt/live/bureau.blue/privkey.pem"),
    cert: readFileSync("/etc/letsencrypt/live/bureau.blue/fullchain.pem")
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

io.on("connection", (socket) => {

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

    socket.on("joinGame", (arg) => {
        if (games["pool"]["waiting"].length >= 1) {

            let p2Id = games["pool"]["waiting"][0];

            games["pool"]["playing"][p2Id] = socket.id; //player 1
            games["pool"]["playing"][socket.id] = p2Id; //player 2

            socket.to(p2Id).emit("gameStart", "true"); //player1
            socket.emit("gameStart", "false"); //player2

            console.log("Match Found p1: " + p2Id + " p2: " + socket.id);

            games["pool"]["waiting"].splice(0, 1); //possiblement vraiment dangereux
        }
        else {
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
    socket.on("updateTrajectory", (arg) => {
        socket.to(games["pool"]["playing"][socket.id]).volatile.emit("trajectory", arg);
    });
});

httpServer.listen(3000);