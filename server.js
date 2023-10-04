const { Server } = require("socket.io");


const io = new Server({ 
    cors: {
        origin: "http://127.0.0.1:5500"
      }
 });

io.on("connection", (socket) => {
    socket.on("test",(arg) => {
        console.log(arg);
        });
    
    socket.on("share", (arg) => {
        socket.broadcast.emit("res", arg);
    });

  console.log("un packet est arrivé");
  socket.emit("res", "reponse du serveur");
});

io.listen(3000);