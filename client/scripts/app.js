// YOUR CODE HERE:

$( document ).ready(function() {

  if (!/(&|\?)username=/.test(window.location.search)) {
    var newSearch = window.location.search;
    if (newSearch !== '' & newSearch !== '?') {
      newSearch += '&';
    }
    
    window.username = prompt('What is your name?', 'anonymous');
  } else {
    //get window.username =  from querystring
  }

  window.messages = [];
  window.roomnames = ["Lobby"];
  window.currentRoom = "Lobby";

  var getMessages = function() {
    getQuery("limit=1000;order=-createdAt", function(results) {
      getRoomnames({results});
      messages = results;
      logMessages(messages);
    });
  }

  var getQuery = function(queryString, callback) {
    console.log(queryString);
    $.ajax({
      url: 'https://api.parse.com/1/classes/chatterbox',
      type: 'GET',
      data: queryString,
      success: function(data) {
        callback(data.results);
      }
    });
  }


  var getRoomnames = function(data) {
    var newRoomnames = getData(data, "roomname");
    
    roomnames = roomnames.concat(_.difference(newRoomnames, roomnames));
    drawRoomsList();
  }

  var getData = function(data, prop) {
    return _.chain(data.results).map(function(result, key) {
      if (result[prop]) {
        return _.escape(result[prop].trim());
      }
    }).uniq().without(undefined).value();
  }

  var lastMessageDate =function() {
    return messages[0].createdAt;
  }

  getMessages();

  var update = function() {
  //   var query = {
  //     where: {
  //       createdAt: {
  //         $gt: {
  //           __type: "Date",
  //           iso: lastMessageDate()
  //         }
  //       }
  //     }
  //   }
    var queryString = 'where={"createdAt":{"$gt":{"__type":"Date","iso":"' + lastMessageDate() + '"}}}';

    var newMessages = getQuery(queryString, function(results) {
      console.log('# results: ' + results.length);
      if (results.length) {
        logMessages(results);
        getRoomnames({results});
        messages = results.concat(messages);
      }
    });
  }

  setInterval(update, 1000);

  var postMessage = function(message) {
    $.ajax({
      url: 'https://api.parse.com/1/classes/chatterbox',
      type: 'POST',
      data: JSON.stringify(message),
      contentType: 'application/json',
      success: function(data) {
      },
      error: function(data) {
        console.error('Failed to send. Error: ', data);
      }
    });
  }

  var selectRoom = function(room) {
    if (room === window.currentRoom) {
      return;
    }
    window.currentRoom = room;
    $('#divMessages').empty();
    logMessages(messages);
  }

/// JQUERY

  function logMessages(newMessages) {

    // Filter newMessages by room if it is set
    if (window.currentRoom === "Lobby") {
      newMessages = _.filter(newMessages, function(msg) {
        return (msg.roomname === "Lobby" || msg.roomname === undefined || msg.roomname === null);
      });
    } else {
      newMessages = _.where(newMessages, {roomname: window.currentRoom});
    } 
    
    var $messages = $('#divMessages');

    for (var i = newMessages.length - 1; i >= 0; i--) {
      $messages.prepend("<div></div>");

      var $newMessageContainer = $messages.children().first();

      var date = new Date(newMessages[i].createdAt);
      
      $newMessageContainer.append("<div>" + _.escape(newMessages[i].text) + "</div>");
      $newMessageContainer.append("<div>" + _.escape(newMessages[i].username) + "</div>");
      $newMessageContainer.append("<div>" + date.getFullYear()+'-' + (date.getMonth()+1) + '-'+ date.getDate() + ": " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "</div>");
    };
  }

  function drawRoomsList() {
    var $roomsList = $('#rooms-list');
    $roomsList.empty();

    for (var i = 0; i < roomnames.length; i++) {
      $roomsList.append("<li>" + roomnames[i] + "</li>");
    };

    $roomsList.children().click(function() {
      selectRoom($(this).text());
    });
  }

  $('#chatter-form').bind('keypress', function (e) {
    if (e.keyCode == 13) {
      e.preventDefault();

      var inputMessage = $('#chatter-box').val()

      var newMessage = {
        username: window.username,
        text: inputMessage,
        roomname: window.currentRoom
      }

      postMessage(newMessage);
    
      return false;
    }
  });

});

