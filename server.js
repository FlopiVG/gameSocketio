/**
 * Created by FlopiVG on 01/04/2016.
 */
var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/client/index.html');
});
app.use(express.static(__dirname + '/client'));

serv.listen(5000);
console.log("Server started http://localhost:2000");

var Entity = function(){
    var self = {
        x:250,
        y:250,
        spdX: 0,
        spdY: 0,
        id: ""
    };

    self.update = function(){
        self.updatePosition();
    };

    self.updatePosition = function(){
        self.x += self.spdX;
        self.y += self.spdY;
    };

    return self;
};

var Player = function(id){
    var self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.maxSpd = 10;
    self.turn = 'right';

    var super_update = self.update;
    self.update = function(){
        self.updateSpd();
        super_update();
    };

    self.updateSpd = function(){
        if (self.pressingRight) self.spdX = self.maxSpd;
        else if (self.pressingLeft) self.spdX = -self.maxSpd;
        else self.spdX = 0;

        if (self.pressingUp) self.spdY = -self.maxSpd;
        else if (self.pressingDown) self.spdY = self.maxSpd;
        else self.spdY = 0;
    };

    Player.list[id] = self;

    return self;
};
Player.list = {};
Player.onConnect = function(socket){
    var player = Player(socket.id);

    socket.on('keyPress', function(data){
        if(data.inputId === 'left') {
            player.pressingLeft = data.state;
            player.turn = 'left';
        }
        else if(data.inputId === 'right') {
            player.pressingRight = data.state;
            player.turn = 'right';
        }
        else if(data.inputId === 'up') {
            player.pressingUp = data.state;
            player.turn = 'up';
        }
        else if(data.inputId === 'down') {
            player.pressingDown = data.state;
            player.turn = 'down';
        }
    });

    socket.on('clickPress', function(){
        socket.emit('basicAttack', player);
    });
};
Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
}
Player.update = function(socket){
    var pack = [];
    for (var i in Player.list){
        var player = Player.list[i];
        player.update();
        pack.push({
            x: player.x,
            y: player.y,
            number: player.number
        });
    }
    return pack;
}

SOCKET_LIST = {};

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    Player.onConnect(socket);

    socket.on('disconnect', function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });
});

setInterval(function(){
    var pack = {
        player: Player.update()
    };

    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack)
    }

},1000/25);