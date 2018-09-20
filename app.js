var express = require('express'),
    port = process.env.PORT || 3000,
    app = express(),
    bodyParser = require('body-parser'),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    users = {},
    onlineUsers = {};

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function (req, res) {
    res.redirect('/chat');
});

app.get('/chat', function (req, res) {
    res.sendfile(__dirname + '/chat.html');
});

server.listen(port, () => {
    console.log(`server open ${port}`);
});


io.sockets.on('connection', function (socket) {
    socket.on("join user", function (data, cb) {
        if (loginCheck(data)) {
            cb({result: false, data: "이미 존재하는 회원입니다."});
            return false;
        } else {
            users[data.id] = {id: data.id, pw: data.pw};
            cb({result: true, data: "회원가입에 성공하였습니다."});

        }
    });

    socket.on("login user", function (data, cb) {
        if (loginCheck(data)) {
            onlineUsers[data.id] = {roomId: 1, socketId: socket.id};
            socket.join('room' + data.roomId);
            cb({result: true, data: "로그인에 성공하였습니다."});
            updateUserList();
        } else {
            cb({result: false, data: "등록된 회원이 없습니다. 회원가입을 진행해 주세요."});
            return false;
        }
    });

    socket.on("send message", function (data) {
        io.sockets.in('room' + data.roomId).emit('new message', {
            name: getUserBySocketId(socket.id),
            socketId: socket.id,
            msg: data.msg
        });
    });

    socket.on('logout', function () {
        if (!socket.id) return;
        delete onlineUsers[getUserBySocketId(socket.id)];
        updateUserList();
    });

    socket.on('disconnect', function () {
        if (!socket.id) return;
        delete onlineUsers[getUserBySocketId(socket.id)];
        updateUserList();
    });

    socket.on('join room', function (data) {
        socket.leave('room' + onlineUsers[getUserBySocketId(socket.id)].roomId);
        socket.join('room' + data.roomId);
        onlineUsers[getUserBySocketId(socket.id)].roomId = data.roomId;
        updateUserList();
    });

    function updateUserList() {
        io.sockets.in('room1').emit("userlist", getUsersByRoomId(1));
        io.sockets.in('room2').emit("userlist", getUsersByRoomId(2));
        io.sockets.in('room3').emit("userlist", getUsersByRoomId(3));
        io.sockets.in('room4').emit("userlist", getUsersByRoomId(4));
    }

    function loginCheck(data) {
        if (users.hasOwnProperty(data.id) && users[data.id].pw === data.pw) {
            return true;
        } else {
            return false;
        }
    }

    function getUserBySocketId(id) {
        return Object.keys(onlineUsers).find(key => onlineUsers[key].socketId === id);
    }

    function getUsersByRoomId(roomId) {
        let userstemp = [];
        Object.keys(onlineUsers).forEach((el) => {
            if (onlineUsers[el].roomId === roomId) {
                userstemp.push({
                    socketId: onlineUsers[el].socketId,
                    name: el
                });
            }
        });
        return userstemp;
    }
});