// 初始化游戏的行列数和卡牌尺寸
let cols = 4, rows = 4;  
let cardWidth = 160, cardHeight = 160, padding = 10;  

// 最大点击次数和剩余点击次数
let maxClicks = 20, remainingClicks = maxClicks;  

// 游戏状态变量
let cards, revealed, matched, flipProgress;  
let firstCardX = -1, firstCardY = -1, secondCardX = -1, secondCardY = -1;  
let gameOver = false, checking = false, checkDelayStart = -1;  
let matchMessage = "", currentScreen = "menu";  

// 预定义的配对提示信息
let predefinedMessages = [  
  "This is the first pair: 0&1", "This is the second pair: 2&3",  
  "This is the third pair: 4&5", "This is the fourth pair: 6&7",  
  "This is the fifth pair: 8&9", "This is the sixth pair: 10&11",  
  "This is the seventh pair: 12&13", "This is the eighth pair: 14&15"  
];  

// 卡牌的正面和背面图像，字体
let cardFrontImages = [], cardBackImage, myFont;  

// 游戏版本信息
let gameVersion = "0.1";  

// 游戏的关于信息
let aboutInfo = [  
  "Game developed by: XIAOHU SUN",
  "card design by: WENLAN YANG, FU YULONG",  
  "Inspired by classic memory games."
];  

// 预加载资源
function preload() {  
  myFont = loadFont('assets/font/AppleSDGothicNeo-Bold.ttf');  // 加载字体
  // 加载16张卡牌的正面图像
  for (let i = 0; i < 16; i++) cardFrontImages.push(loadImage(`assets/pictures/${i}.png`));  
  // 加载卡牌背面图像
  cardBackImage = loadImage('assets/pictures/back.png');  
}  

// 初始化画布和字体
function setup() {  
  createCanvas(1600, 1000, WEBGL);  // 创建WebGL画布
  textFont(myFont);  // 设置字体
  noCursor();  // 可选：隐藏鼠标光标
}  

// 绘制游戏的不同屏幕
function draw() {  
  background(200);  

  // 根据当前屏幕显示不同内容
  if (currentScreen === "menu") drawMenu();  
  else if (currentScreen === "about") drawAbout();  
  else if (currentScreen === "game") {  
    drawGame()
    if (gameOver) drawGameOver();  // 如果游戏结束，绘制结束界面
    checkMatching();  // 检查卡牌配对
  }  
  drawCustomCursor();  // 绘制自定义光标
  drawVersion();  // 绘制游戏版本信息
}  

// 绘制菜单界面
function drawMenu() {  
  textAlign(CENTER, CENTER);  
  textSize(48);  
  fill(0);  
  text("Memory Game Demo", 0, -200);  

  // 绘制开始游戏按钮
  drawButton("Start Game", 0, -50, () => {  
    initGame();  // 初始化游戏
    currentScreen = "game";  // 切换到游戏界面
  });  

  // 绘制关于按钮
  drawButton("About", 0, 50, () => {  
    currentScreen = "about";  // 切换到关于界面
  });  
}  

//绘制游戏页
function drawGame() {
  drawBoard();  // 绘制游戏板
  drawInfo();   // 绘制游戏信息
  if (gameOver) drawGameOver();  // 如果游戏结束，绘制结束界面
  checkMatching();  // 检查卡牌配对

  // 添加返回按钮
  drawReturnButton();  // 绘制返回按钮
}

// 绘制返回按钮，位于左上角
function drawReturnButton() {
  drawButton("Back to Menu", -width / 2 + 170, -height / 2 + 50, () => {
    currentScreen = "menu";  // 切换到菜单界面
    initGame();  // 重置游戏状态
  });
}

// 绘制关于界面
function drawAbout() {  
  textAlign(CENTER, CENTER);  
  textSize(36);  
  fill(0);  
  text("About the Game", 0, -150);  
  textSize(24);  
  for (let i = 0; i < aboutInfo.length; i++)  
    text(aboutInfo[i], 0, -50 + i * 50);  

  // 绘制返回菜单按钮
  drawButton("Back to Menu", 0, 170, () => {  
    currentScreen = "menu";  // 返回到菜单界面
  });  
}  

// 绘制按钮
function drawButton(label, x, y, onClick) {  
  let w = 300, h = 80;  
  let hovered = mouseX > width / 2 + x - w / 2 && mouseX < width / 2 + x + w / 2 &&  
                mouseY > height / 2 + y - h / 2 && mouseY < height / 2 + y + h / 2;  

  // 设置按钮颜色
  fill(hovered ? '#87CEEB' : '#ADD8E6');  
  rectMode(CENTER);  
  rect(x, y, w, h, 20);  

  fill(0);  
  textSize(24);  
  textAlign(CENTER, CENTER);  
  text(label, x, y);  

  // 如果按钮被点击，执行点击事件
  if (hovered && mouseIsPressed) onClick();  
}  

// 绘制游戏版本信息，位于屏幕右下角
function drawVersion() {  
  textAlign(RIGHT, BOTTOM);  // 修改为右下角对齐
  textSize(16);  
  fill(0);  
  text(`Version: ${gameVersion}`, width / 2 - 20, height / 2 - 20);  // 在右下角显示版本信息
}  

// 绘制自定义鼠标光标
function drawCustomCursor() {  
  noStroke();  
  fill(255, 200);  
  let mx = mouseX - width / 2, my = mouseY - height / 2;  
  ellipse(mx, my, 20);  // 绘制光标
}  

// 初始化游戏状态
function initGame() {  
  // 初始化卡牌、卡牌状态、匹配状态等
  cards = Array(rows).fill().map(() => Array(cols).fill(0));  
  revealed = Array(rows).fill().map(() => Array(cols).fill(false));  
  matched = Array(rows).fill().map(() => Array(cols).fill(false));  
  flipProgress = Array(rows).fill().map(() => Array(cols).fill(0));  

  // 创建16张卡牌，随机排列
  let cardImages = [...Array(16).keys()];  
  let cardDeck = shuffle(cardImages);  

  let index = 0;  
  for (let i = 0; i < rows; i++)  
    for (let j = 0; j < cols; j++) cards[i][j] = cardDeck[index++];  
}  

// 检查两张卡牌是否匹配
function checkMatching() {
  if (checking && millis() - checkDelayStart > 600) {  // 延迟600ms检查配对
    let firstCard = cards[firstCardY][firstCardX];
    let secondCard = cards[secondCardY][secondCardX];

    // 判断两张卡牌是否为配对（相邻的数字，属于同一组）
    if (Math.abs(firstCard - secondCard) === 1 && Math.floor(firstCard / 2) === Math.floor(secondCard / 2)) {
      // 配对成功
      matched[firstCardY][firstCardX] = true;
      matched[secondCardY][secondCardX] = true;

      // 获取提示语的索引
      let messageIndex = Math.floor(firstCard / 2); 

      // 显示配对提示
      matchMessage = predefinedMessages[messageIndex];
    } else {
      // 配对失败，翻回卡片
      revealed[firstCardY][firstCardX] = false;
      revealed[secondCardY][secondCardX] = false;
      remainingClicks--;  // 错误配对扣除点击次数
      matchMessage = "";  // 清空提示信息
    }

    // 重置第一张和第二张卡片的坐标
    firstCardX = -1;
    firstCardY = -1;
    secondCardX = -1;
    secondCardY = -1;
    checking = false;
    checkGameOver();  // 检查游戏是否结束
  }
}

// 绘制游戏的卡牌
function drawBoard() {
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      // 计算每张卡牌的位置
      let x = j * (cardWidth + padding) - cols * (cardWidth + padding) / 2 + cardWidth / 2;
      let y = i * (cardHeight + padding) - rows * (cardHeight + padding) / 2 + cardHeight / 2;
      let progress = flipProgress[i][j];

      // 更新卡牌的翻转进度
      if (revealed[i][j] && progress < 1) flipProgress[i][j] = min(progress + 0.1, 1);
      else if (!revealed[i][j] && progress > 0) flipProgress[i][j] = max(progress - 0.1, 0);

      push();
      translate(x, y, 0);

      // 根据进度翻转卡牌
      if (progress > 0.5) {
        rotateY(PI * (progress - 1));
        texture(cardFrontImages[cards[i][j]]);
      } else {
        rotateY(PI * progress);
        texture(cardBackImage);
      }

      plane(cardWidth, cardHeight);
      pop();
    }
  }

  // 显示配对提示信息
  if (matchMessage) {  
    fill(0);  
    textAlign(CENTER, CENTER);  
    textSize(24);  
    text(matchMessage, 0, height / 2 - 50);  
  }  
}  

// 绘制游戏信息（例如剩余点击次数）
function drawInfo() {  
  fill(0);  
  textAlign(LEFT, CENTER);  
  textSize(16);  
  text(`Life: ${remainingClicks}`, -width / 2 + 10, height / 2 - 40);  
}  



// 游戏结束界面
function drawGameOver() {  
  fill(0, 150);  
  rectMode(CENTER);  
  rect(0, 0, width, height);  
  fill(255);  
  textAlign(CENTER, CENTER);  
  textSize(35);  
  text(remainingClicks === 0 ? "Fail" : "Pass!", 0, -20);  
  textSize(18);  
  text("Click mouse to restart", 0, 20);  
}  

// 鼠标点击事件
function mousePressed() {
  if (currentScreen === "game" && !gameOver && !checking) {
    let mx = mouseX - width / 2, my = mouseY - height / 2;  // 转换为以中心为参考系
    let cardX = floor((mx + cols * (cardWidth + padding) / 2 - padding / 2) / (cardWidth + padding));  
    let cardY = floor((my + rows * (cardHeight + padding) / 2 - padding / 2) / (cardHeight + padding));  

    // 如果点击的是有效卡牌并且未翻开或已匹配，则翻开卡牌
    if (cardX >= 0 && cardX < cols && cardY >= 0 && cardY < rows && !revealed[cardY][cardX] && !matched[cardY][cardX]) {
      revealed[cardY][cardX] = true;
      if (firstCardX === -1) {
        firstCardX = cardX;
        firstCardY = cardY;
      } else {
        secondCardX = cardX;
        secondCardY = cardY;
        checking = true;  // 开始检查卡牌配对
        checkDelayStart = millis();
      }
    }
  }
}

// 检查游戏是否结束
function checkGameOver() {
  let allMatched = true;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!matched[i][j]) {
        allMatched = false;
        break;
      }
    }
  }

  if (allMatched || remainingClicks <= 0) {
    gameOver = true;  // 游戏结束
  }
}
