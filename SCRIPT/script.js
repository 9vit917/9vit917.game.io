(function () {
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var player, score, stop, ticker;
  var ground = [], tintacley = [], enemies = [], environment = [];

  var platformHeight, platformLength, gapLength;
  var platformWidth = 32;
  var platformBase = canvas.height - platformWidth;
  var platformSpacer = 64;

  function rand(low, high) {
    return Math.floor( Math.random() * (high - low + 1) + low );
  }
  function bound(num, low, high) {
    return Math.max( Math.min(num, high), low);
  }

  var assetLoader = (function() {
    this.imgs        = {
      'bg'            : 'imgs/source.gif',
      'asteroid'      : 'imgs/asteroid.png',
      'backdrop'      : 'imgs/backdrop.png',
      'grass'         : 'imgs/grass.png',
      'avatar_normal' : 'imgs/normal_walk.png',
      'tintacley'     : 'imgs/tintacley.png',
      'grass1'        : 'imgs/grassMid1.png',
      'grass2'        : 'imgs/grassMid2.png',
      'bridge'        : 'imgs/bridge.png',
      'fire'          : 'imgs/fire.png',
      'cliff'         : 'imgs/grassCliffRight.png',
      'spikes'        : 'imgs/spikes.png',
      'box'           : 'imgs/boxCoin.png',
      'pingvin'         : 'imgs/pingvin.png'
    };

    var assetsLoaded = 0;
    var numImgs = Object.keys(this.imgs).length;
    this.totalAssest = numImgs;

    function assetLoaded(dic, name) {
      if (this[dic][name].status !== 'loading') {
        return;
      }

      this[dic][name].status = 'loaded';
      assetsLoaded++;

      if (assetsLoaded === this.totalAssest && typeof this.finished === 'function') {
        this.finished();
      }
    }

    this.downloadAll = function() {
      var _this = this;
      var src;

      for (var img in this.imgs) {
        if (this.imgs.hasOwnProperty(img)) {
          src = this.imgs[img];

          (function(_this, img) {
            _this.imgs[img] = new Image();
            _this.imgs[img].status = 'loading';
            _this.imgs[img].name = img;
            _this.imgs[img].onload = function() { assetLoaded.call(_this, 'imgs', img) };
            _this.imgs[img].src = src;
          })(_this, img);
        }
      }
    }

    return {
      imgs: this.imgs,
      totalAssest: this.totalAssest,
      downloadAll: this.downloadAll
    };
  })();

  assetLoader.finished = function() {
    startGame();
  }

  function SpriteSheet(path, frameWidth, frameHeight) {
    this.image = new Image();
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;

    var self = this;
    this.image.onload = function() {
      self.framesPerRow = Math.floor(self.image.width / self.frameWidth);
    };

    this.image.src = path;
  }

  function Animation(spritesheet, frameSpeed, startFrame, endFrame) {

    var animationSequence = [];
    var currentFrame = 0;
    var counter = 0;


    for (var frameNumber = startFrame; frameNumber <= endFrame; frameNumber++)
      animationSequence.push(frameNumber);

    this.update = function() {


      if (counter == (frameSpeed - 1))
        currentFrame = (currentFrame + 1) % animationSequence.length;
      counter = (counter + 1) % frameSpeed;
    };

    this.draw = function(x, y) {
      var row = Math.floor(animationSequence[currentFrame] / spritesheet.framesPerRow);
      var col = Math.floor(animationSequence[currentFrame] % spritesheet.framesPerRow);

      ctx.drawImage(
        spritesheet.image,
        col * spritesheet.frameWidth, row * spritesheet.frameHeight,
        spritesheet.frameWidth, spritesheet.frameHeight,
        x, y,
        spritesheet.frameWidth, spritesheet.frameHeight);
    };
  }

  var background = (function() {
    var asteroid   = {};
    var backdrop = {};

    this.draw = function() {
      ctx.drawImage(assetLoader.imgs.bg, 0, 0, 1000, 500);


      asteroid.x -= asteroid.speed;
      backdrop.x -= backdrop.speed;

      ctx.drawImage(assetLoader.imgs.asteroid, asteroid.x+200, asteroid.y+100,400,200);
      ctx.drawImage(assetLoader.imgs.asteroid, asteroid.x+200 + canvas.width, asteroid.y+100,400,200);

      ctx.drawImage(assetLoader.imgs.backdrop, backdrop.x, backdrop.y-20);
      ctx.drawImage(assetLoader.imgs.backdrop, backdrop.x + canvas.width, backdrop.y-20);

      ctx.drawImage(assetLoader.imgs.asteroid, asteroid.x, asteroid.y,400,200);
      ctx.drawImage(assetLoader.imgs.asteroid, asteroid.x + canvas.width, asteroid.y,400,200);

      ctx.drawImage(assetLoader.imgs.asteroid, asteroid.x+400, asteroid.y,400,200);
      ctx.drawImage(assetLoader.imgs.asteroid, asteroid.x+400 + canvas.width, asteroid.y,400,200);
      ctx.drawImage(assetLoader.imgs.asteroid, asteroid.x+600, asteroid.y+150,400,200);
      ctx.drawImage(assetLoader.imgs.asteroid, asteroid.x+600 + canvas.width, asteroid.y+150,400,200);

      if (asteroid.x + assetLoader.imgs.asteroid.width <= 0)
        asteroid.x = 0;
      if (backdrop.x + assetLoader.imgs.backdrop.width <= 0)
        backdrop.x = 0;
    };

    this.reset = function()  {
      asteroid.x = 0;
      asteroid.y = 0;
      asteroid.speed = 2;

      backdrop.x = 0;
      backdrop.y = 0;
      backdrop.speed = 0.4;

    }

    return {
      draw: this.draw,
      reset: this.reset
    };
  })();

  function Vector(x, y, dx, dy) {
    this.x = x || 0;
    this.y = y || 0;
    this.dx = dx || 0;
    this.dy = dy || 0;
  }

  Vector.prototype.advance = function() {
    this.x += this.dx;
    this.y += this.dy;
  };

  Vector.prototype.minDist = function(vec) {
    var minDist = Infinity;
    var max = Math.max( Math.abs(this.dx), Math.abs(this.dy),
                            Math.abs(vec.dx ), Math.abs(vec.dy ) );
    var slice   = 1 / max;

    var x, y, distSquared;


    var vec1 = {}, vec2 = {};
    vec1.x = this.x + this.width/2;
    vec1.y = this.y + this.height/2;
    vec2.x = vec.x + vec.width/2;
    vec2.y = vec.y + vec.height/2;
    for (var percent = 0; percent < 1; percent += slice) {
      x = (vec1.x + this.dx * percent) - (vec2.x + vec.dx * percent);
      y = (vec1.y + this.dy * percent) - (vec2.y + vec.dy * percent);
      distSquared = x * x + y * y;

      minDist = Math.min(minDist, distSquared);
    }

    return Math.sqrt(minDist);
  };

  var player = (function(player) {
    player.width     = 60;
    player.height    = 96;
    player.speed     = 6;
    player.gravity   = 1;
    player.dy        = 0;
    player.jumpDy    = -10;
    player.isFalling = false;
    player.isJumping = false;

    player.sheet = new SpriteSheet('imgs/normal_walk.png', player.width, player.height);
    player.walkAnim  = new Animation(player.sheet, 4, 0, 15);
    player.jumpAnim  = new Animation(player.sheet, 4, 15, 15);
    player.fallAnim  = new Animation(player.sheet, 4, 11, 11);
    player.anim      = player.walkAnim;

    Vector.call(player, 0, 0, 0, player.dy);

    var jumpCounter = 0;

    player.update = function() {

      if (KEY_STATUS.space && player.dy === 0 && !player.isJumping) {
        player.isJumping = true;
        player.dy = player.jumpDy;
        jumpCounter = 12;
      }

      if (KEY_STATUS.space && jumpCounter) {
        player.dy = player.jumpDy;
      }

      jumpCounter = Math.max(jumpCounter-1, 0);

      this.advance();

      if (player.isFalling || player.isJumping) {
        player.dy += player.gravity;
      }

      if (player.dy > 0) {
        player.anim = player.fallAnim;
      }
      else if (player.dy < 0) {
        player.anim = player.jumpAnim;
      }
      else {
        player.anim = player.walkAnim;
      }

      player.anim.update();
    };

    player.draw = function() {
      player.anim.draw(player.x, player.y);
    };

    player.reset = function() {
      player.x = 64;
      player.y = 250;
    };

    return player;
  })(Object.create(Vector.prototype));

  function Sprite(x, y, type) {
    this.x = x;
    this.y = y;
    this.width = platformWidth;
    this.height = platformWidth;
    this.type = type;
    Vector.call(this, x, y, 0, 0);

    this.update = function() {
      this.dx = -player.speed;
      this.advance();
    };

    this.draw = function() {
      ctx.save();
      ctx.translate(0.5,0.5);
      ctx.drawImage(assetLoader.imgs[this.type], this.x, this.y);
      ctx.restore();
    };
  }

  Sprite.prototype = Object.create(Vector.prototype);

  function getType() {
    var type;
    switch (platformHeight) {
      case 0:
      case 1:
        type = Math.random() > 0.5 ? 'grass1' : 'grass2';
        break;
      case 2:
        type = 'grass';
        break;
      case 3:
        type = 'bridge';
        break;
      case 4:
        type = 'box';
        break;
    }
    if (platformLength === 1 && platformHeight < 3 && rand(0, 3) === 0) {
      type = 'cliff';
    }

    return type;
  }

  function updateGround() {
    player.isFalling = true;
    for (var i = 0; i < ground.length; i++) {
      ground[i].update();
      ground[i].draw();

      var angle;
      if (player.minDist(ground[i]) <= player.height/2 + platformWidth/2 &&
          (angle = Math.atan2(player.y - ground[i].y, player.x - ground[i].x) * 180/Math.PI) > -130 &&
          angle < -50) {
        player.isJumping = false;
        player.isFalling = false;
        player.y = ground[i].y - player.height + 5;
        player.dy = 0;
      }
    }

    if (ground[0] && ground[0].x < -platformWidth) {
      ground.splice(0, 1);
    }
  }

  function updateTintacley() {
    for (var i = 0; i < tintacley.length; i++) {
      tintacley[i].update();
      tintacley[i].draw();
    }

    if (tintacley[0] && tintacley[0].x < -platformWidth) {
      var w = tintacley.splice(0, 1)[0];
      w.x = tintacley[tintacley.length-1].x + platformWidth;
      tintacley.push(w);
    }
  }

  function updateEnvironment() {
    for (var i = 0; i < environment.length; i++) {
      environment[i].update();
      environment[i].draw();
    }

    if (environment[0] && environment[0].x < -platformWidth) {
      environment.splice(0, 1);
    }
  }

  function updateEnemies() {
    for (var i = 0; i < enemies.length; i++) {
      enemies[i].update();
      enemies[i].draw();

      if (player.minDist(enemies[i]) <= player.width - platformWidth/2) {
        gameOver();
      }
    }

    if (enemies[0] && enemies[0].x < -platformWidth) {
      enemies.splice(0, 1);
    }
  }

  function updatePlayer() {
    player.update();
    player.draw();

    if (player.y + player.height >= canvas.height) {
      gameOver();
    }
  }

  function spawnSprites() {
    score++;

    if (gapLength > 0) {
      gapLength--;
    }
    else if (platformLength > 0) {
      var type = getType();

      ground.push(new Sprite(
        canvas.width + platformWidth % player.speed,
        platformBase - platformHeight * platformSpacer,
        type
      ));
      platformLength--;

      spawnEnvironmentSprites();

      spawnEnemySprites();
    }
    else {
      gapLength = rand(player.speed - 2, player.speed);
      platformHeight = bound(rand(0, platformHeight + rand(0, 2)), 0, 4);
      platformLength = rand(Math.floor(player.speed/2), player.speed * 4);
    }
  }

  function spawnEnvironmentSprites() {
    if (score > 40 && rand(0, 20) === 0 && platformHeight < 3) {
      if (Math.random() > 0.5) {
        environment.push(new Sprite(
          canvas.width + platformWidth % player.speed,
          platformBase - platformHeight * platformSpacer - platformWidth,
          'fire'
        ));
      }
    }
  }

  function spawnEnemySprites() {
    if (score > 100 && Math.random() > 0.95 && enemies.length < 3 && platformLength > 5 &&
        (enemies.length ? canvas.width - enemies[enemies.length-1].x >= platformWidth * 3 ||
         canvas.width - enemies[enemies.length-1].x < platformWidth : true)) {
      enemies.push(new Sprite(
        canvas.width + platformWidth % player.speed,
        platformBase - platformHeight * platformSpacer - platformWidth,
        Math.random() > 0.5 ? 'spikes' : 'pingvin'
      ));
    }
  }


   function animate() {
     if (!stop) {
       requestAnimFrame( animate );
       ctx.clearRect(0, 0, canvas.width, canvas.height);

       background.draw();

       updateTintacley();
       updateEnvironment();
       updatePlayer();
       updateGround();
       updateEnemies();

       ctx.fillText('Score: ' + score + 'm', canvas.width - 140, 30);
       ctx.fillStyle = "green";
       if (ticker % Math.floor(platformWidth / player.speed) === 0) {
         spawnSprites();
       }

       if (ticker > (Math.floor(platformWidth / player.speed) * player.speed * 20)
        && player.dy !== 0) {
         player.speed = bound(++player.speed, 0, 15);
         player.walkAnim.frameSpeed = Math.floor(platformWidth / player.speed) - 1;

         ticker = 0;

         if (gapLength === 0) {
           var type = getType();
           ground.push(new Sprite(
             canvas.width + platformWidth % player.speed,
             platformBase - platformHeight * platformSpacer,
             type
           ));
           platformLength--;
         }
       }

       ticker++;
     }
   }

  var requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
             function(callback, element){
              window.setTimeout(callback, 1000 / 60);
            };
  })();

  var KEY_CODES = {
    32: 'space'
  };
  var KEY_STATUS = {};
  for (var code in KEY_CODES) {
    if (KEY_CODES.hasOwnProperty(code)) {
       KEY_STATUS[KEY_CODES[code]] = false;
    }
  }
  document.onkeydown = function(e) {
    var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
    if (KEY_CODES[keyCode]) {
      e.preventDefault();
      KEY_STATUS[KEY_CODES[keyCode]] = true;
    }
  };
  document.onkeyup = function(e) {
    var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
    if (KEY_CODES[keyCode]) {
      e.preventDefault();
      KEY_STATUS[KEY_CODES[keyCode]] = false;
    }
  };

  function startGame() {
    document.getElementById('game-over').style.display = 'none';
    ground = [];
    tintacley = [];
    environment = [];
    enemies = [];
    player.reset();
    ticker = 0;
    stop = false;
    score = 0;
    platformHeight = 2;
    platformLength = 15;
    gapLength = 0;

    ctx.font = '16px arial, sans-serif';

    for (var i = 0; i < 30; i++) {
      ground.push(new Sprite(i * (platformWidth-3), platformBase - platformHeight * platformSpacer, 'grass'));
    }

    for (i = 0; i < canvas.width / 32 + 2; i++) {
      tintacley.push(new Sprite(i * platformWidth, platformBase, 'tintacley'));
    }

    background.reset();

    animate();
  }

  function gameOver() {
    stop = true;
    document.getElementById('game-over').style.display = 'block';
  }

  document.getElementById('restart').addEventListener('click', startGame);

  assetLoader.downloadAll();
})();
