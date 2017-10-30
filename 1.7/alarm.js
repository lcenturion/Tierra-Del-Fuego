const express = require('express');
var ws = require('nodejs-websocket');
var aws = require('aws-sdk');
aws.config.region = 'us-west-2';
var ses = new aws.SES({"accessKeyId": "AKIAIORLELU2YA2NBUIA", "secretAccessKey": "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", "region": "us-west-2"});

var sns = new aws.SNS({"accessKeyId": "AKIAIORLELU2YA2NBUIA", "secretAccessKey": "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", "region": "us-west-2"});



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

function call(phoneNotificar,phoneResponsable, ruta)
{
    console.log("Init Call...");
    broadcast({type:'info',message:'Iniciando Llamada'});
    var myCall = {
      url: '',
      to: phoneNotificar,
      from: '+17632252263',
      statusCallback: 'http://llamada.ngrok.io/status',
      statusCallbackMethod: 'POST',
      statusCallbackEvents: ['initiated', 'ringing', 'answered', 'completed']  
    };
    switch (ruta)
    {
      case "voice":
        myCall.url = 'http://llamada.ngrok.io/voice';
        break;
      case "tierradelfuego":
        myCall.url = 'http://llamada.ngrok.io/tierradelfuego';
        break;
      case "piso19":
        myCall.url = 'http://llamada.ngrok.io/piso19';
        break;
      case "piso20":
        myCall.url = 'http://llamada.ngrok.io/piso20';
        break;
    }

    client.calls.create(myCall)
    .then((call) => {callsid = call.sid; console.log(call.sid); calling = false});
}


// Parse incoming POST params with Express middleware
app.use(urlencoded({extended: false}));// Create a route that will handle Twilio webhook requests, sent as an
// HTTP POST to /voice in our application

/*
-------------------------------------------------------------------------------VOICE-------------------------------------------------------------------------------------------
*/

app.post('/voice', (request, response) => {
  // Use the Twilio Node.js SDK to build an XML response
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: '/gather',
  });
  
  //gather.say('The temperature has reach 35 degrees on the Computer Center Floor 19. For Support, press 1.');
  //gather.play('http://logicalis.cc/twilio/hola-carlos-1.mp3');  
  gather.play('http://logicalis.cc/twilio/se-ha-detectado-1.mp3');  
  twiml.redirect('/voice');
  response.type('text/xml');
  response.send(twiml.toString());
});

app.post('/gather', (request, response) => {
  const twiml = new VoiceResponse();

  // If the user entered digits, process their request
  if (request.body.Digits) {
    switch (request.body.Digits) {
      case '1': 
        broadcast({type:'info',message:'Redireccionando al Responsable'});
        twiml.play('http://logicalis.cc/twilio/segovia-transfer.mp3');

        //twiml.say('Wait. Redirect call of Logicalis!'); 
        twiml.dial(phoneResponsable);
        twiml.play('http://logicalis.cc/twilio/esta-ha-sido-demo-1.mp3');
        const gather = twiml.gather({
            numDigits: 1,
            action: '/vote',
            });
            gather.play('http://logicalis.cc/twilio/califique-1.mp3');
            twiml.play('http://logicalis.cc/twilio/muchas-gracias-1.mp3');
            break;
      default:
        twiml.play('http://logicalis.cc/twilio/no-escucho-1.mp3');
        twiml.redirect('/voice');
        break;
    }
  } else {
    // If no input was sent, redirect to the /voice route
    twiml.redirect('/voice');
  }

  // Render the response as XML in reply to the webhook request
  response.type('text/xml');
  response.send(twiml.toString());
});
app.post('/vote', (request, response) => {
  const twiml = new VoiceResponse();

  // If the user entered digits, process their request
  if (request.body.Digits) {
      broadcast({type:'rating',message:'CALIFICACION:' + request.body.Digits,"value":request.body.Digits});

    switch (request.body.Digits) {
      case '1': 
      case '2': 
      case '3': 
      case '4': 
      case '5': 
        twiml.play('http://logicalis.cc/twilio/muchas-gracias-1.mp3');
        break;
      default:
        twiml.play('http://logicalis.cc/twilio/muchas-gracias-1.mp3');
        break;
    }
  } else {
        twiml.play('http://logicalis.cc/twilio/muchas-gracias-1.mp3');
  }

  // Render the response as XML in reply to the webhook request
  response.type('text/xml');
  response.send(twiml.toString());
});

app.post('/status', (request, response) => {
    broadcast({type:'info',message:request.body.CallStatus});
    if(request.body.CallStatus == 'completed')
    {
        broadcast({type:'info', message:'Duración de la llamada:' + request.body.CallDuration + ' segundos'});
        
        var price = 0;

        client.calls(callsid).fetch()
        .then((call) => 
              {
                console.log("call price: " + Math.abs(call.price));
                price += Math.abs(call.price);
                
                client.calls.each({parentCallSid: callsid}, (child) => 
                      {
                        price += Math.abs(child.price); 
                        console.log("child price: " + Math.abs(child.price));
                        console.log("total price: " + price);
                        broadcast({type:'info', message:'Costo de la llamada:' + price + ' USD'});
                        broadcast({type:'info-background', message:'Final. Gracias por su atención'});
                        calling = false;
                      }
                )
              }
        )
    }
    console.log(request.body);
    

});

/*
-------------------------------------------------------------------------------PISO 19-------------------------------------------------------------------------------------------
*/

app.post('/piso19', (request, response) => {
  // Use the Twilio Node.js SDK to build an XML response
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: '/gather19',
  });
  
  //gather.say('The temperature has reach 35 degrees on the Computer Center Floor 19. For Support, press 1.');
  //gather.play('http://logicalis.cc/twilio/hola-carlos-1.mp3');  
  gather.play('http://logicalis.cc/twilio/se-ha-detectado-1.mp3');  
  twiml.redirect('/piso19');
  response.type('text/xml');
  response.send(twiml.toString());
});

app.post('/gather19', (request, response) => {
  const twiml = new VoiceResponse();

  // If the user entered digits, process their request
  if (request.body.Digits) {
    switch (request.body.Digits) {
      case '1': 
        broadcast({type:'info',message:'Redireccionando al Responsable'});
        twiml.play('http://logicalis.cc/twilio/segovia-transfer.mp3');

        //twiml.say('Wait. Redirect call of Logicalis!'); 
        twiml.dial(phoneResponsable);
        break;
      default:
        twiml.play('http://logicalis.cc/twilio/no-escucho-1.mp3');
        twiml.redirect('/piso19');
        break;
    }
  } else {
    // If no input was sent, redirect to the /voice route
    twiml.redirect('/piso19');
  }

  // Render the response as XML in reply to the webhook request
  response.type('text/xml');
  response.send(twiml.toString());
});

/*
-------------------------------------------------------------------------------PISO 20-------------------------------------------------------------------------------------------
*/

app.post('/piso20', (request, response) => {
  // Use the Twilio Node.js SDK to build an XML response
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: '/gather20',
  });
  
  //gather.say('The temperature has reach 35 degrees on the Computer Center Floor 19. For Support, press 1.');
  //gather.play('http://logicalis.cc/twilio/hola-carlos-1.mp3');  
  gather.play('http://logicalis.cc/twilio/se-ha-detectado-1.mp3');  //=====poner audio piso 20======
  twiml.redirect('/piso20');
  response.type('text/xml');
  response.send(twiml.toString());
});

app.post('/gather20', (request, response) => {
  const twiml = new VoiceResponse();

  // If the user entered digits, process their request
  if (request.body.Digits) {
    switch (request.body.Digits) {
      case '1': 
        broadcast({type:'info',message:'Redireccionando al Responsable'});
        twiml.play('http://logicalis.cc/twilio/segovia-transfer.mp3');

        //twiml.say('Wait. Redirect call of Logicalis!'); 
        twiml.dial(phoneResponsable);
        break;
      default:
        twiml.play('http://logicalis.cc/twilio/no-escucho-1.mp3');
        twiml.redirect('/piso20');
        break;
    }
  } else {
    // If no input was sent, redirect to the /voice route
    twiml.redirect('/piso20');
  }

  // Render the response as XML in reply to the webhook request
  response.type('text/xml');
  response.send(twiml.toString());
});

/*
-------------------------------------------------------------------------------TIERRA DEL FUEGO-------------------------------------------------------------------------------------------
*/

app.post('/tierradelfuego', (request, response) => {
  // Use the Twilio Node.js SDK to build an XML response
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: '/gathertdf',
  });
  
  //gather.say('The temperature has reach 35 degrees on the Computer Center Floor 19. For Support, press 1.');
  //gather.play('http://logicalis.cc/twilio/hola-carlos-1.mp3');  

  switch(motivo)
  {
    case "agua":
      gather.say(
        {voice: "alice", language: "es-ES"},
        'Se ha detectado que el nivel de agua de cisterna se encuentra fuera de los rangos de normalidad. Presione uno para contactarse con un responsable.'
                );
      break;
    case "caldera":
      gather.say(
          {voice: "alice", language: "es-ES"},
          'Se ha detectado que la temperatura de caldera se encuentra fuera de los rangos de normalidad. Presione uno para contactarse con un responsable.'
                );
      break;
    case "ambiente":
      gather.say(
        {voice: "alice", language: "es-ES"},
        'Se ha detectado que la temperatura ambiente se encuentra fuera de los rangos de normalidad. Presione uno para contactarse con un responsable.'
                );
      break;
    case "luz":
      gather.say(
        {voice: "alice", language: "es-ES"},
        'Se ha detectado que el nivel de luminosidad se encuentra fuera de los rangos de normalidad. Presione uno para contactarse con un responsable.'
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
  if (request.body.Digits) {
    console.log("digito " + request.body.Digits)
    switch (request.body.Digits) {
      case '1': 
        broadcast({type:'info',message:'Redireccionando al Responsable'});
        twiml.say({voice: "alice", language: "es-ES"}, 'Soy Ális, voy a transferir la llamada.');

        //twiml.say('Wait. Redirect call of Logicalis!'); 
        twiml.dial(phoneResponsable);
        twiml.say({voice: "alice", language: "es-ES"}, 'Esto ha sido una demostración para el ministerio de salud de Tierra Del Fuego.');
        twiml.say({voice: "alice", language: "es-ES"}, 'Muchas gracias por su atención.');
            break;
      default:
        twiml.play({voice: "alice", language: "es-ES"}, 'No escucho su respuesta.');
        twiml.redirect('/tierradelfuego');
        break;
    }
  } else {
    // If no input was sent, redirect to the /voice route
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
            isTdf = r.tdf;
            isReal =r.real
            if (r.password == "Cocos")
            {
              broadcast({type:'info', message:'Contraseña aceptada'});
              switch (r.cmd)
              {
                case 'call':
                  if(r.notificar && r.responsable){
                    console.log('calling:'+calling);
                    if(calling)
                        broadcast({type:'info', message:'Demostración en proceso'});
                    else
                    {
                        calling = true;
                        phoneNotificar = r.notificar;
                        phoneResponsable = r.responsable;
                        console.log('notificar:' + r.notificar + ' responsable:' + r.responsable + ' ruta:' + r.ruta);
                        motivo = r.motivo;
                        call(r.notificar,r.responsable, r.ruta);
                    }
                  }
                  else
                    broadcast({type:'error', message:'Debe setear los campos notificar y responsable'});
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
                    broadcast({type:'error', message:'Debe setear el campo número'});
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
            }
            else
            {
              broadcast({type:'error', message:'Contraseña incorrecta'});
            }
            //conn.sendText("hello");
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