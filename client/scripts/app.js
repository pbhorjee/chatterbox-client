// YOUR CODE HERE:

function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

$( document ).ready(function() {

  if (!/(&|\?)username=/.test(window.location.search)) {
    var newSearch = window.location.search;
    if (newSearch !== '' & newSearch !== '?') {
      newSearch += '&';
    }
    window.username = (prompt('What is your name?') || 'anonymous')
    newSearch += 'username=' + window.username;
    window.location.search = newSearch;
  }

  window.username = getUrlVars().username;

  var $tweetStreamContainer = $('#tweet-stream');
  $('#tweet').focus();

  window.messages = [];
  window.friends = [];
  window.roomnames = ["Lobby"];
  window.currentRoom = "Lobby";
  $("#room-name").text(window.currentRoom);

  var getMessages = function() {
    getQuery("limit=1000;order=-createdAt", function(results) {
      getRoomnames({results});
      messages = results;
      logMessages(messages);
    });
  }

  var getQuery = function(queryString, callback) {
    // console.log(queryString);
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
    var queryString = 'where={"createdAt":{"$gt":{"__type":"Date","iso":"' + lastMessageDate() + '"}}}';

    var newMessages = getQuery(queryString, function(results) {
      if (results.length) {
        var newRooms = false;
        logMessages(results);
        getRoomnames({results});
        messages = results.concat(messages);
      }
    });
  }

  var refresh = function() { setInterval(update, 5000) };

  var postMessage = function(message, newRoom) {
    clearInterval(refresh);

    newRoom = newRoom || false;
    $.ajax({
      url: 'https://api.parse.com/1/classes/chatterbox',
      type: 'POST',
      data: JSON.stringify(message),
      contentType: 'application/json',
      success: function(data) {
        if ($('#newroomname').val()) {
          if (newRoom){
            selectRoom($('#newroomname').val());
            $('#rooms-list').val($('#newroomname').val());
            $('#newroomname').val('');
          }
        }
      },
      error: function(data) {
        console.error('Failed to send. Error: ', data);
      }
    });

    refresh();
  }

  var selectRoom = function(room) {
    if (room === window.currentRoom) {
      return;
    }
    window.currentRoom = room;
    $('#tweet-stream').empty();

    logMessages(messages);
    $("#room-name").text(window.currentRoom);
  }

  function logMessages(newMessages) {
    // Filter newMessages by room if it is set
    if (window.currentRoom === "Lobby") {
      newMessages = _.filter(newMessages, function(msg) {
        return (msg.roomname === "Lobby" || msg.roomname === undefined || msg.roomname === null);
      });
    } else {
      newMessages = _.where(newMessages, {roomname: window.currentRoom});
    } 

    for (var i = newMessages.length - 1; i >= 0; i--) {
      var message = newMessages[i];
      var username = message.username;

      var $tweetContainer = $(document.createElement('div'));

      var $tweetUser = $(document.createElement('div'));
      $tweetUser.text('@' + _.unescape(username));
      $tweetUser.addClass('user-link-clickable red');
      $tweetUser.data('user', username);
      $tweetUser.on("click", function () {
        onUserClick($(this).data('user'));
      });

      var $tweetText = $(document.createElement('div'));
      if (_.contains(window.friends, username)) {
        $tweetText.addClass('friend-message');
      }
      $tweetText.text(_.unescape(message.text));

      var $tweetTimeSpacer = $(document.createElement('span'));
      $tweetTimeSpacer.text(' - ');
      $tweetTimeSpacer.addClass('ital small-text')

      var $tweetTime = $(document.createElement('span'));
      $tweetTime.text(moment(message.createdAt).startOf('minute').fromNow());
      $tweetTime.addClass('date-time ital small-text');
      $tweetTime.data('create_at', message.createdAt);

      $tweetContainer.append($tweetUser);
      $tweetContainer.append($tweetTimeSpacer);
      $tweetContainer.append($tweetTime);
      $tweetContainer.append($tweetText);

      $tweetContainer.prependTo($tweetStreamContainer);
      $tweetContainer.fadeIn();
    }

    updateUserTimes();
  }

  function updateUserTimes() {
    var allTimes = $tweetStreamContainer.find('.date-time');

    for (var t = 0; t < allTimes.length; t++) {
      var $time = $(allTimes[t]);
      var dt = $time.data('create_at');
      var newDtStr = moment(dt).startOf('minute').fromNow()
      var oldDtStr = $time.text();

      if (newDtStr !== oldDtStr) {
          $time.fadeOut(10);
          $time.text(newDtStr);
          $time.fadeIn(10);
      }
    }
  };

  setInterval(updateUserTimes, 5000);

  function onUserClick(user, remove) {
    if (remove) {
      window.friends.splice(window.friends.indexOf(user), 1);
    } else {
      if (window.friends.indexOf(user) > -1) {
        return;
      }
      window.friends.push(user);
      window.friends.sort(function (a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
      });
    }

    $('#tweet-stream').empty();

    if (window.friends.length === 0) {
      $('#friends-box').hide();
    } else {
      $('#friends-box').show();
    }

    logMessages(messages);

    $friends = $('#friends');
    $friends.empty();

    for (var f in window.friends) {
      var $tweetUser = $(document.createElement('li'));
      $tweetUser.text('@' + _.escape(window.friends[f]));
      $tweetUser.addClass('friends user-link-clickable red');
      $tweetUser.data('user', window.friends[f]);
      $tweetUser.on("click", function () {
        onUserClick($(this).data('user'), true);
      });
      $friends.append($tweetUser);
    }
  }

  function drawRoomsList() {
    var $roomsList = $('#rooms-list');
    $roomsList.empty();

    for (var i = 0; i < roomnames.length; i++) {
      $roomsList.append("<option>" + roomnames[i] + "</option>");
    };

    $roomsList.val(window.currentRoom)

    $roomsList.change(function() {
      selectRoom($(this).val());
    });
  }

  $('#tweetform').bind('keypress', function (e) {
    if (e.keyCode == 13) {
      e.preventDefault();

      var newMessage = {
        username: window.username,
        text: $('#tweet').val(),
        roomname: window.currentRoom
      }
      var newRoom = false;
      if ($('#newroomname').val()) {
        newRoom = true;
        newMessage.roomname = $('#newroomname').val();
      }

      postMessage(newMessage, newRoom);
      $('#tweet').val('');
    
      return false;
    }
  });

  $('#tweet').bind('change keyup', function (e) {
      var tweetLength = $('#tweet').val().length;
      var $charLeft = $('#to-go');
      if (tweetLength > 0) {
          $charLeft.text(160 - tweetLength + ' left!')
          $charLeft.css("visibility", "visible")
      } else {
          $charLeft.css("visibility", "hidden");
      }
  });

});

