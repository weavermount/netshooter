"use strict";
(function() {
  var NetshooterClient = (function() {
    var NetshooterClient = function(optionsArg) {
      let options = (typeof optionsArg !== "object") ? {} : optionsArg;


      let host = (!("host" in options)) ? null : options["host"];

      let sharedPlayControls = {
        leftDown: false,
        rightDown: false,
        upDown: false
      }

      let myPlayControls = {
        leftDown: false,
        rightDown: false,
        upDown: false
      }

      var IO = {
        init: function() {

            // Connect to socket.io server
            if(host == null)
            {
              IO.socket = io.connect();
            }
            else
            {
              IO.socket = io.connect(host);
            }

            IO.bindEvents();
        },

        /**
         * While connected, Socket.IO will listen to the following events emitted
         * by the Socket.IO server, then run the appropriate function.
         */
        bindEvents : function() {
            IO.socket.on('connect', IO.onConnect );
            //IO.socket.on('newGameCreated', IO.onNewGameCreated );
            IO.socket.on('playerJoinedRoom', IO.onPlayerJoinedRoom );
            IO.socket.on('move', IO.onMove );
            //IO.socket.on('beginNewGame', IO.beginNewGame );
            //IO.socket.on('newWordData', IO.onNewWordData);
            //IO.socket.on('hostCheckAnswer', IO.hostCheckAnswer);
            //IO.socket.on('gameOver', IO.gameOver);
            IO.socket.on('error', IO.error );
        },

        /**
         * The client is successfully connected!
         */
        onConnect : function() {
            // Cache a copy of the client's socket.IO session ID on the App
            IO.mySocketId = IO.socket.id;
            console.log("Connected with socket ID: " + IO.mySocketId);

            IO.socket.emit('playerJoinedRoom', 'default', IO.mySocketId);
        },

        /**
         * A player has successfully joined the game.
         * @param data {{playerName: string, gameId: int, mySocketId: int}}
         */
        onPlayerJoinedRoom : function(data) {
            // When a player joins a room, do the updateWaitingScreen funciton.
            // There are two versions of this function: one for the 'host' and
            // another for the 'player'.
            //
            // So on the 'host' browser window, the App.Host.updateWiatingScreen function is called.
            // And on the player's browser, App.Player.updateWaitingScreen is called.
            //App[App.myRole].updateWaitingScreen(data);
        },

        /**
         * An error has occurred.
         * @param data
         */
        onError : function(data) {
            console.log("Error: " + data.message);
        },

        sendMove : function(move) {
          console.log("Sending move: ");
          console.log(move);

          IO.socket.emit('move', move, IO.mySocketId);
        },

        onMove : function(data) {
          console.log("Move from server:");
          console.log(data);

          if(("move" in data))
          {
            let move = data["move"];
            if(("input" in move))
            {
              let input = move["input"];
              console.log("input: " + input);

              if(input == "rightDown")
              {
                sharedPlayControls.rightDown = true;
              }
              else if(input == "rightUp")
              {
                sharedPlayControls.rightDown = false;
              }

              else if(input == "leftDown")
              {
                sharedPlayControls.leftDown = true;
              }
              else if(input == "leftUp")
              {
                sharedPlayControls.leftDown = false;
              }

              else if(input == "upDown")
              {
                sharedPlayControls.upDown = true;
              }
              else if(input == "upUp")
              {
                sharedPlayControls.upDown = false;
              }

            }
          }
        }

      }

      IO.init();


      var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

      function preload() {

          game.load.image('sky', 'assets/sky.png');
          game.load.image('ground', 'assets/platform.png');
          game.load.image('star', 'assets/star.png');
          game.load.spritesheet('dude', 'assets/dude.png', 32, 48);
      }

      var player;
      var platforms;
      var cursors;

      var stars;
      var score = 0;
      var scoreText;
      var winText;

      function create() {

          game.stage.disableVisibilityChange = true;

          //  We're going to be using physics, so enable the Arcade Physics system
          game.physics.startSystem(Phaser.Physics.ARCADE);

          //  A simple background for our game
          game.add.sprite(0, 0, 'sky');

          //  The platforms group contains the ground and the 2 ledges we can jump on
          platforms = game.add.group();

          //  We will enable physics for any object that is created in this group
          platforms.enableBody = true;

          // Here we create the ground.
          var ground = platforms.create(0, game.world.height - 64, 'ground');

          //  Scale it to fit the width of the game (the original sprite is 400x32 in size)
          ground.scale.setTo(2, 2);

          //  This stops it from falling away when you jump on it
          ground.body.immovable = true;

          //  Now let's create two ledges
          var ledge = platforms.create(400, 400, 'ground');
          ledge.body.immovable = true;

          ledge = platforms.create(-150, 250, 'ground');
          ledge.body.immovable = true;

          // The player and its settings
          player = game.add.sprite(32, game.world.height - 150, 'dude');

          //  We need to enable physics on the player
          game.physics.arcade.enable(player);

          //  Player physics properties. Give the little guy a slight bounce.
          player.body.gravity.y = 1200;
          player.body.collideWorldBounds = true;

          //  Our two animations, walking left and right.
          player.animations.add('left', [0, 1, 2, 3], 10, true);
          player.animations.add('right', [5, 6, 7, 8], 10, true);

          //  Finally some stars to collect
          stars = game.add.group();

          //  We will enable physics for any star that is created in this group
          stars.enableBody = true;

          //  Here we'll create 12 of them evenly spaced apart
          for (var i = 0; i < 12; i++)
          {
              //  Create a star inside of the 'stars' group
              var star = stars.create(i * 70, 0, 'star');

              //  Let gravity do its thing
              star.body.gravity.y = 1200;

              //  This just gives each star a slightly random bounce value
              //star.body.bounce.y = 0.7 + Math.random() * 0.2;
          }

          //  The score
          scoreText = game.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

          //  Winning text. Shown when all stars are gone.
          winText = game.add.text(350, 150, 'You win!', { font: 'bold 20pt Arial', fill: '#0F0' });
          winText.visible = false;

          //  Our controls.
          cursors = game.input.keyboard.createCursorKeys();
          
      }

      function update() {

          //  Collide the player and the stars with the platforms
          game.physics.arcade.collide(player, platforms);
          game.physics.arcade.collide(stars, platforms, starBounce, null, this);

          //  Checks to see if the player overlaps with any of the stars, if he does call the collectStar function
          game.physics.arcade.overlap(player, stars, collectStar, null, this);

          //  Reset the players velocity (movement)
          player.body.velocity.x = 0;

          if (cursors.left.isDown || sharedPlayControls.leftDown)
          {
              //  Move to the left
              player.body.velocity.x = -350;

              player.animations.play('left');

              // If we just pressed it...
              if(!myPlayControls.leftDown && cursors.left.isDown)
              {
                myPlayControls.leftDown = true; 
                IO.sendMove({"input":"leftDown"});
              }
          }
          else if (cursors.right.isDown || sharedPlayControls.rightDown)
          {
              //  Move to the right
              player.body.velocity.x = 350;

              player.animations.play('right');

              // If we just pressed it...
              if(!myPlayControls.rightDown && cursors.right.isDown)
              {
                myPlayControls.rightDown = true; 
                IO.sendMove({"input":"rightDown"});
              }
          }
          else
          {
              //  Stand still
              player.animations.stop();

              player.frame = 4;
          }
          
          //  Allow the player to jump if they are touching the ground.
          if ((cursors.up.isDown && player.body.touching.down) || sharedPlayControls.upDown)
          {
              player.body.velocity.y = -750;

              // If we just pressed it...
              if(!myPlayControls.upDown && cursors.up.isDown)
              {
                myPlayControls.upDown = true; 
                IO.sendMove({"input":"upDown"});
              }
          }

          // If we just released left...
          if(myPlayControls.leftDown && !cursors.left.isDown)
          {
            myPlayControls.leftDown = false;
            IO.sendMove({"input":"leftUp"});
          }

          // If we just released right...
          if(myPlayControls.rightDown && !cursors.right.isDown)
          {
            myPlayControls.rightDown = false;
            IO.sendMove({"input":"rightUp"});
          }


          // If we just released up...
          if(myPlayControls.upDown && !cursors.up.isDown)
          {
            myPlayControls.upDown = false;
            IO.sendMove({"input":"upUp"});
          }
      }

      function collectStar (player, star) {
          
          // Removes the star from the screen
          star.kill();
          stars.remove(star);


          //  Add and update the score
          score += 10;
          scoreText.text = 'Score: ' + score;

          console.log("Stars remaining: " + stars.length);
          if(stars.length <= 0)
          {
              scoreText.visible = false;
              winText.visible = true;
          }

      }

      var starPrinted = false;
      var platformPrinted = false;

      function starBounce (star, platform)
      {
          if(!starPrinted)
          {
              console.log("Star: ");
              console.log(star);
              starPrinted = true;
          }

          if(!platformPrinted)
          {
              console.log("Platform: ");
              console.log(platform);
              platformPrinted = true;
          }

          star.body.velocity.y = -1 * 1200 * Math.random();

      }

    };

    return NetshooterClient;
  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = NetshooterClient;
  }
  else {
    if (typeof define === 'function' && define.amd) {
      define([], function() {
        return NetshooterClient;
      });
    }
    else {
      window.NetshooterClient = NetshooterClient;
    }
  }
})();