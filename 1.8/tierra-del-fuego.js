var ws = require('nodejs-websocket');
var mqtt = require('mqtt');
var MQTT = "tcp://1.tcp.ngrok.io:22194";

process.on('uncaughtException', function (err) {
  console.error(err.stack);
  console.log("Node NOT Exiting...");
}); 

var wsServer = ws.createServer();
wsServer.listen(8006);

wsServer.on('connection', function(conn){
    console.log("New connection");
});

wsServer.on('error', function(errObj){
    console.log("Error Web Socket");
});

wsServer.on('close', function(){
    console.log("Close Web Socket. Retrying...");
    wsServer.listen(8006);
});

var mqttClient  = mqtt.connect(MQTT);
mqttClient.on('connect', function () {
    console.log('mqtt (re)connected');
    mqttClient.subscribe('AmbientTemperature');
    mqttClient.subscribe('BoilerTemperature');
    mqttClient.subscribe('WaterLevel');
    mqttClient.subscribe('LightLevel');
});

mqttClient.on('message', function (topic, message) {
    // message is Buffer
    console.log('MQTT Topic:' + topic + ' message:' + message.toString());
    var msg = new Object();
    msg.topic = topic;
    msg.data = JSON.parse(message.toString());
    broadcast(msg);
});

mqttClient.on('error', function (message) {
    console.log('MQTT Client Error:' + message.toString());
});


function broadcast(msg) {
    wsServer.connections.forEach(function (conn) {
        conn.sendText(JSON.stringify(msg));
    });
}  
