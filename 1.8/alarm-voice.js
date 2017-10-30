const express = require('express');
var ws = require('nodejs-websocket');
var aws = require('aws-sdk');
aws.config.region = 'us-west-2';
var ses = new aws.SES({"accessKeyId": "AKIAIQZ7BZSHGASPK2SQ", "secretAccessKey": "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", "region": "us-west-2"});

var sns = new aws.SNS({"accessKeyId": "AKIAIQZ7BZSHGASPK2SQ", "secretAccessKey": "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", "region": "us-west-2"});



var WS_PORT = 8084;
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const urlencoded = require('body-parser').urlencoded;
const app = express();

var accountSid = 'AC99b9c13f2b94374e3ab40a37ae9142be'; // Your Account SID from www.twilio.com/console
var authToken = '2fc390e0eb62dd6b2c056a3bbaa77011';   // Your Auth Token from www.twilio.com/console// Twilio Credentials
const client = require('twilio')(accountSid, authToken);

var callsid;
var phoneNotificar;
var phoneResponsable;
var motivo;

function call(phoneNotificar)
{
    console.log("Init Call...");
    var myCall = {
      url: 'http://llamada.ngrok.io/tierradelfuego',
      to: phoneNotificar,
      from: '+17632252263'
    };

    client.calls.create(myCall)
    .then((call) => {callsid = call.sid; console.log(call.sid); calling = false});
}


// Parse incoming POST params with Express middleware
app.use(urlencoded({extended: false}));// Create a route that will handle Twilio webhook requests, sent as an
// HTTP POST to /voice in our application


/*
-------------------------------------------------------------------------------TIERRA DEL FUEGO-------------------------------------------------------------------------------------------
*/

app.post('/tierradelfuego', (request, response) => {
  // Use the Twilio Node.js SDK to build an XML response
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    input: 'speech',
    language: 'es-AR',
    timeout: 5,
    hints:"uno",
    action: '/gathertdf',
  });
  
  //gather.say('The temperature has reach 35 degrees on the Computer Center Floor 19. For Support, press 1.');
  //gather.play('http://logicalis.cc/twilio/hola-carlos-1.mp3');  

  switch(motivo)
  {
    case "agua":
      gather.say(
        {voice: "alice", language: "es-ES"},
        'Se ha detectado que el nivel de agua de cisterna se encuentra fuera de los rangos de normalidad. Diga uno para poner el caso en tratamiento.'
                );
      break;
    case "caldera":
      gather.say(
          {voice: "alice", language: "es-ES"},
          'Se ha detectado que la temperatura de caldera se encuentra fuera de los rangos de normalidad. Diga uno para poner el caso en tratamiento.'
                );
      break;
    case "ambiente":
      gather.say(
        {voice: "alice", language: "es-ES"},
        'Se ha detectado que la temperatura ambiente se encuentra fuera de los rangos de normalidad. Diga uno para poner el caso en tratamiento.'
                );
      break;
    case "luz":
      gather.say(
        {voice: "alice", language: "es-ES"},
        'Se ha detectado que el nivel de luminosidad se encuentra fuera de los rangos de normalidad. Diga uno para poner el caso en tratamiento.'
                );
      break;

    // case "demo":
    //   gather.say(
    //     {voice: "alice", language: "es-ES"},
    //     'Se ha detectado que la temperatura ambiente ha sobrepasado el máximo permitido. Presione uno para contactarse con un responsable.'
    //             );
    //   break;
  }

  twiml.redirect('/tierradelfuego');
  response.type('text/xml');
  response.send(twiml.toString());
});

app.post('/gathertdf', (request, response) => {
  const twiml = new VoiceResponse();
  // If the user entered digits, process their request
  if (request.body.SpeechResult) 
  {
    if(request.body.SpeechResult.toLowerCase().trim() == "uno") 
    {	
        broadcast({response: "tratamiento"});
        twiml.say({voice: "alice", language: "es-ES"}, 'Muchas gracias, su caso ya se encuentra en tratamiento.');
        twiml.hangup();
     }
     else
     {
        twiml.say({voice: "alice", language: "es-ES"}, request.body.SpeechResult + ' no es una opción válida.');
        twiml.redirect('/tierradelfuego');
     }
  }
  else
  {
    // If no input was sent, redirect to the /voice route
    twiml.say({voice: "alice", language: "es-ES"}, 'No escucho su respuesta.');
    twiml.redirect('/tierradelfuego');
  }

  // Render the response as XML in reply to the webhook request
  response.type('text/xml');
  response.send(twiml.toString());
});

console.log("Listen...");
app.listen(8080);

function setCallSid(sid)
{
    callsid = sid;
}
var calling = false;
var wsServer = ws.createServer(function (conn) {
    console.log("New connection");
    conn.on("text", function (message) {
        try{
            console.log("Received " + message);
            r = JSON.parse(message);
              switch (r.cmd)
              {
                case 'call':
                  if(r.notificar){
                    console.log('calling:'+calling);
                    if(calling)
                        console.log("Demostración en proceso");
                    else
                    {
                        calling = true;
                        phoneNotificar = r.notificar;
                        console.log('notificar:' + r.notificar);
                        motivo = r.motivo;
                        call(r.notificar);
                    }
                  }
                  else
                    console.log('Debe setear el campo notificar.');
                  break;
                case 'sms':
                  if(r.numero){
                    var params = {
                      Message: 'Alerta: se encuentra fuera de los rangos de normalidad' + r.motivo,
                      MessageStructure: 'string',
                      PhoneNumber: r.numero
                    };

                    sns.publish(params, function(err, data) {
                        if (err) console.log(err, err.stack); // an error occurred
                        else     console.log(data);           // successful response
                    });
                  }
                  else
                    console.log('Debe setear el campo número');
                  break;
                case 'email':
                  var eparam = {
                      Destination: {
                        ToAddresses: ["logicalis.cono@gmail.com"]
                      },
                      Message: {
                        Body: {
                          Html: {
                            Data: "<p>Hello, this is a test email!</p>"
                          },
                          Text: {
                            Data: "Hello, this is a test email!"
                          }
                        },
                        Subject: {
                          Data: "SES email test"
                        }
                      },
                      Source: "lucas.centurion@la.logicalis.com",
                      ReplyToAddresses: ["lucas.centurion@la.logicalis.com"],
                      ReturnPath: "lucas.centurion@la.logicalis.com"
                  };
                   
                  ses.sendEmail(eparam, function (err, data) {
                    if (err) console.log(err);
                    else console.log(data);
                  });
                break;
              }
        }catch(e)
        {
            console.log("Web Socket Receive Error. JSON malformed Message:" + message);
        }
    });
    conn.on("close", function (code, reason) {
        console.log("Connection closed");
    });
    conn.on("error", function (errObj) {
        console.log("Error");
    });
}).listen(WS_PORT);

function broadcast(msg) {
    wsServer.connections.forEach(function (conn) {
        conn.sendText(JSON.stringify(msg));
    })
} 


/*
client.calls(callsid)
  .fetch()
  .then((call) => console.log('Call to:' + call.to));

*/
//+541152820308 MLR Escritorio
//+5511972758802 Dany Marquesim
//+56944071634 Suga
//+5491150170327 Tasin
//+56944071635 Marquesim
//+5491166773762 Guille Imbrogno
//+5491144350188 Nico Laurutis
//+5491132830973 Guido Lescano