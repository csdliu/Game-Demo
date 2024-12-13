// =============== 全局变量定义 ===============

// 游戏核心配置
let cols = 4, rows = 4;  
let cardWidth = 160, cardHeight = 160, padding = 10;  
let maxClicks = 20, remainingClicks = maxClicks;  

// 游戏状态变量
let cards;              // 卡牌矩阵
let revealed;          // 卡牌是否被翻开
let matched;           // 卡牌是否已匹配
let flipProgress;      // 卡牌翻转动画进度
let firstCardX = -1, firstCardY = -1;     // 第一张选中卡牌的坐标
let secondCardX = -1, secondCardY = -1;   // 第二张选中卡牌的坐标
let gameOver = false;                     // 游戏是否结束
let checking = false;                     // 是否正在检查匹配
let checkDelayStart = -1;                 // 检查匹配的延迟开始时间
let matchMessage = "";                    // 匹配提示信息
let currentScreen = "menu";               // 当前界面
let debug = false;                        // 调试模式
let gameStage = "matching";              // 游戏阶段（matching/arranging）
let hasActuallyDragged = false; // 添加一个新的变量来追踪是否发生了实际的拖动

// 拖拽相关变量
let draggingCard = null;                 // 当前拖拽的卡牌
let dragOffsetX = 0, dragOffsetY = 0;    // 拖拽偏移量
let pairedCardsPositions = [];           // 配对卡牌位置信息
let activePairIndex = -1;  // -1 means no pair is active
// 在全局变量定义部分修改/添加
let snapDistance = 50;  // 吸附触发距离
let snapThreshold = 30;  // 最终吸附阈值
let cardSpacing = 10;         // 同一对中卡牌之间的间距
let pairSpacing = 2;         // 不同卡牌对之间的外边距


// 游戏资源
let cardFrontImages = [];                // 卡牌正面图像数组
let cardBackImage;                       // 卡牌背面图像
let myFont;                              // 游戏字体

// 游戏配置信息
let gameVersion = "ver.0.3_12_13";  
let aboutInfo = [  
  "Game developed by: XUIAOHU SUN",
  "card design by: WENLAN YANG, FU YULONG",  
  "Inspired by classic memory games."
];  

// 配对提示信息
let predefinedMessages = [  
  "This is the first pair: 0&1", "This is the second pair: 2&3",  
  "This is the third pair: 4&5", "This is the fourth pair: 6&7",  
  "This is the fifth pair: 8&9", "This is the sixth pair: 10&11",  
  "This is the seventh pair: 12&13", "This is the eighth pair: 14&15"  
];  

// =============== 初始化函数 ===============

// 画布大小更新
function updateCanvasSize() {
  canvasWidth = constrain(windowWidth * 0.8, 1100, 1600);
  canvasHeight = constrain(windowHeight * 0.8, 800, 1000);
}

// 窗口大小调整响应
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

// 资源预加载
function preload() {  
  myFont = loadFont('assets/font/AppleSDGothicNeo-Bold.ttf');
  for (let i = 0; i < 16; i++) {
    cardFrontImages.push(loadImage(`assets/pictures/${i}.png`));
  }
  cardBackImage = loadImage('assets/pictures/back.png');
}  

// 游戏初始化设置
function setup() {  
  updateCanvasSize();
  createCanvas(canvasWidth, canvasHeight, WEBGL);
  textFont(myFont);
  noCursor();
}  

// 游戏状态初始化
function initGame() {
  // 初始化游戏数据结构
  cards = Array(rows).fill().map(() => Array(cols).fill(0));
  revealed = Array(rows).fill().map(() => Array(cols).fill(false));
  matched = Array(rows).fill().map(() => Array(cols).fill(false));
  flipProgress = Array(rows).fill().map(() => Array(cols).fill(0));

  // 洗牌并分配卡牌
  let cardImages = [...Array(16).keys()];
  let cardDeck = shuffle(cardImages);
  let index = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      cards[i][j] = cardDeck[index++];
    }
  }

  // 重置游戏状态
  gameStage = "matching";
  gameOver = false;
  remainingClicks = maxClicks;
  pairedCards = [];
  draggingCard = null;
}

// =============== 主循环渲染 ===============

function draw() {
  background(200);

  switch (currentScreen) {
    case "menu":
      drawMenu();
      break;
    case "about":
      drawAbout();
      break;
    case "game":
      if (gameStage === "matching") {
        drawGame();
        if (gameOver) drawGameOver();
        checkMatching();
      } else if (gameStage === "arranging") {
        drawArrangingStage();
      }
      break;
  }
  
  drawCustomCursor();
  drawVersion();
}

// =============== 界面绘制函数 ===============

// 菜单界面绘制
function drawMenu() {  
  textAlign(CENTER, CENTER);  
  textSize(48);  
  fill(0);  
  text("Memory Game Demo", 0, -200);  

  drawButton("Start Game", 0, -50, () => {  
    initGame();
    currentScreen = "game";
  });  

  drawButton("About", 0, 50, () => {  
    currentScreen = "about";
  });  
}  

// 关于界面绘制
function drawAbout() {  
  textAlign(CENTER, CENTER);  
  textSize(36);  
  fill(0);  
  text("About the Game", 0, -150);  
  textSize(24);  
  for (let i = 0; i < aboutInfo.length; i++) {
    text(aboutInfo[i], 0, -50 + i * 50);  
  }

  drawButton("Back to Menu", 0, 170, () => {  
    currentScreen = "menu";
  });  
}  

// 游戏界面绘制
function drawGame() {
  drawBoard();
  drawInfo();
  if (gameOver) drawGameOver();
  checkMatching();
  drawReturnButton();
}

// 第二阶段（排列阶段）界面绘制
function drawArrangingStage() {
  background(200);
  
  textAlign(RIGHT, CENTER);
  textSize(24);
  fill(0);
  text("Arrange the matched cards", width/2 - 20, -height/2 + 50);

  // Initialize card positions if needed
  if (!pairedCardsPositions || pairedCardsPositions.length === 0) {
    initializePairedCardsPositions();
  }

  // Draw all paired cards
  drawAllPairedCards();
  
  // Draw predefined messages with highlighting
  textAlign(LEFT, CENTER);
  textSize(16);
  let messageX = width/2 - 250;
  let messageStartY = -height/2 + 250;
  let messageSpacing = 40;
  
  for (let i = 0; i < predefinedMessages.length; i++) {
    // Set color based on whether this message corresponds to the active pair
    if (i === activePairIndex) {
      fill(0); // Black for active message
    } else {
      fill(180); // Light gray for inactive messages
    }
    text(predefinedMessages[i], messageX, messageStartY + i * messageSpacing);
  }
  
  drawReturnButton();
}

// =============== UI组件绘制函数 ===============

// 按钮绘制
function drawButton(label, x, y, onClick) {  
  let w = 200, h = 80;  
  let hovered = mouseX > width / 2 + x - w / 2 && mouseX < width / 2 + x + w / 2 &&  
                mouseY > height / 2 + y - h / 2 && mouseY < height / 2 + y + h / 2;  

  fill(hovered ? '#87CEEB' : '#ADD8E6');  
  rectMode(CENTER);  
  rect(x, y, w, h, 20);  

  fill(0);  
  textSize(24);  
  textAlign(CENTER, CENTER);  
  text(label, x, y);  

  if (hovered && mouseIsPressed) onClick();  
}  

// 返回按钮绘制
function drawReturnButton() {
  drawButton("Back", -width / 2 + 40, -height / 2 + 50, () => {
    currentScreen = "menu";
    initGame();
  });
}

// 版本信息绘制
function drawVersion() {  
  textAlign(RIGHT, BOTTOM);
  textSize(16);  
  fill(0);  
  text(`Version: ${gameVersion}`, width / 2 - 20, height / 2 - 20);
}  

// 自定义光标绘制
function drawCustomCursor() {  
  noStroke();  
  fill(255, 200);  
  let mx = mouseX - width / 2, my = mouseY - height / 2;  
  ellipse(mx, my, 20);
}



// =============== 游戏核心绘制函数 ===============

// 游戏信息绘制
function drawInfo() {  
  fill(0);  
  textAlign(LEFT, CENTER);  
  textSize(16);  
  text(`Life: ${remainingClicks}`, -width / 2 + 10, height / 2 - 40);  
}  

// 游戏结束界面绘制
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

// 绘制游戏卡牌主面板
function drawBoard() {
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let x = j * (cardWidth + padding) - cols * (cardWidth + padding) / 2 + cardWidth / 2;
      let y = i * (cardHeight + padding) - rows * (cardHeight + padding) / 2 + cardHeight / 2;
      let progress = flipProgress[i][j];

      if (revealed[i][j] && progress < 1) {
        flipProgress[i][j] = min(progress + 0.1, 1);
      } else if (!revealed[i][j] && progress > 0) {
        flipProgress[i][j] = max(progress - 0.1, 0);
      }

      push();
      translate(x, y, 0);

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

  if (matchMessage) {  
    fill(0);  
    textAlign(CENTER, CENTER);  
    textSize(24);  
    text(matchMessage, 0, height / 2 - 50);  
  }  
}

// 初始化配对卡牌位置
function initializePairedCardsPositions() {
  pairedCardsPositions = [];
  for (let pairIndex = 0; pairIndex < pairedCards.length; pairIndex++) {
    let pair = pairedCards[pairIndex];
    let baseX = -width/2 + 300;
    let baseY = -height/2 + 100 + pairIndex * 100;
    
    let pairPositions = [];
    for (let i = 0; i < pair.length; i++) {
      pairPositions.push({
        card: pair[i],
        baseX: baseX + i * (cardWidth + 10),
        baseY: baseY,
        dragX: 0,
        dragY: 0
      });
    }
    pairedCardsPositions.push(pairPositions);
  }
}

// 绘制所有配对卡牌
function drawAllPairedCards() {
  // 反转循环顺序，使后面的卡牌绘制在上层
  for (let pairIndex = pairedCardsPositions.length - 1; pairIndex >= 0; pairIndex--) {
    let pairPositions = pairedCardsPositions[pairIndex];
    for (let i = pairPositions.length - 1; i >= 0; i--) {
      let cardPos = pairPositions[i];
      push();
      translate(cardPos.baseX + cardPos.dragX, cardPos.baseY + cardPos.dragY);
      texture(cardPos.card.image);
      plane(cardWidth, cardHeight);
      pop();
    }
  }
}

// 检查卡牌匹配
function checkMatching() {
  if (checking && millis() - checkDelayStart > 600) {
    let firstCard = cards[firstCardY][firstCardX];
    let secondCard = cards[secondCardY][secondCardX];

    if (Math.abs(firstCard - secondCard) === 1 && Math.floor(firstCard / 2) === Math.floor(secondCard / 2)) {
      matched[firstCardY][firstCardX] = true;
      matched[secondCardY][secondCardX] = true;
      matchMessage = predefinedMessages[Math.floor(firstCard / 2)];
    } else {
      revealed[firstCardY][firstCardX] = false;
      revealed[secondCardY][secondCardX] = false;
      remainingClicks--;
      matchMessage = "";
    }

    firstCardX = -1;
    firstCardY = -1;
    secondCardX = -1;
    secondCardY = -1;
    checking = false;
    checkGameOver();
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
    if (gameStage === "matching") {
      gameStage = "arranging";
      arrangePairedCards();
    } else if (remainingClicks <= 0) {
      gameOver = true;
    }
  }
}

// 整理配对卡牌
function arrangePairedCards() {
  pairedCards = [];
  // 找出所有配对的卡牌
  for (let i = 0; i < 8; i++) {
    let pair = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (Math.floor(cards[row][col] / 2) === i) {
          pair.push({
            image: cardFrontImages[cards[row][col]],
            width: cardWidth,
            height: cardHeight,
            originalIndex: cards[row][col]
          });
        }
      }
    }
    pairedCards.push(pair);
  }
}

// =============== 事件处理函数 ===============

// 鼠标按下事件处理
function mousePressed() {
  if (currentScreen === "game" && gameStage === "arranging") {
    let mx = mouseX - width / 2, my = mouseY - height / 2;
    activePairIndex = -1;
    hasActuallyDragged = false;
    
    // 从前向后检查（与渲染顺序相反），这样最上层的卡牌会先被检测到
    for (let pairIndex = 0; pairIndex < pairedCardsPositions.length; pairIndex++) {
      let pairPositions = pairedCardsPositions[pairIndex];
      
      for (let i = 0; i < pairPositions.length; i++) {
        let cardPos = pairPositions[i];
        let cardX = cardPos.baseX + cardPos.dragX;
        let cardY = cardPos.baseY + cardPos.dragY;

        if (mx > cardX - cardWidth/2 && mx < cardX + cardWidth/2 &&
            my > cardY - cardHeight/2 && my < cardY + cardHeight/2) {
          // 找到点击的卡牌后立即返回，确保只选择最上层的卡牌
          activePairIndex = Math.floor(cardPos.card.originalIndex / 2);
          draggingCard = {
            pair: pairPositions,
            clickedIndex: i,
            initialDragX: pairPositions[0].dragX,
            initialDragY: pairPositions[0].dragY
          };
          dragOffsetX = mx - cardX;
          dragOffsetY = my - cardY;
          return;
        }
      }
    }
    
    draggingCard = null;
  } else if (currentScreen === "game" && gameStage === "matching") {
    if (!gameOver && !checking) {
      let mx = mouseX - width / 2, my = mouseY - height / 2;
      let cardX = floor((mx + cols * (cardWidth + padding) / 2 - padding / 2) / (cardWidth + padding));
      let cardY = floor((my + rows * (cardHeight + padding) / 2 - padding / 2) / (cardHeight + padding));

      if (cardX >= 0 && cardX < cols && cardY >= 0 && cardY < rows && !revealed[cardY][cardX] && !matched[cardY][cardX]) {
        revealed[cardY][cardX] = true;
        if (firstCardX === -1) {
          firstCardX = cardX;
          firstCardY = cardY;
        } else {
          secondCardX = cardX;
          secondCardY = cardY;
          checking = true;
          checkDelayStart = millis();
        }
      }
    }
  }
}

// p按键事件处理,跳过阶段1
function keyPressed() {
  if (currentScreen === "game" && !gameOver) {
    if (key === ' ') {
      gameOver = true; // 按空格通过游戏
    } else if (key === 'p' || key === 'P') {
      // 直接进入第二阶段
      gameStage = "arranging";
      
      // 标记所有卡牌为已匹配状态
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          matched[i][j] = true;
        }
      }
      
      // 初始化配对卡牌
      arrangePairedCards();
    }
  }
}

// 添加 mouseMoved 函数来检测拖动开始
function mouseMoved() {
  if (draggingCard) {
    draggingCard.isDragging = true;
  }
}

// 添加 mouseReleased 函数
// 添加 mouseReleased 函数
// 修改 mouseReleased 函数，添加释放时的吸附检查
function mouseReleased() {
  if (currentScreen === "game" && gameStage === "arranging" && draggingCard) {
    // 只在实际发生拖动时才检查吸附
    if (hasActuallyDragged) {
      let pair = draggingCard.pair;
      let snapResult = checkSnapToOtherPairs(pair, 0, 0);
      
      if (snapResult.deltaX !== 0 || snapResult.deltaY !== 0) {
        for (let card of pair) {
          card.dragX += snapResult.deltaX;
          card.dragY += snapResult.deltaY;
        }
      }
    }
  }
  
  draggingCard = null;
  hasActuallyDragged = false; // 重置拖动状态
}

// 鼠标拖动事件处理
// 修改 mouseDragged 函数
function mouseDragged() {
  if (currentScreen === "game" && gameStage === "arranging" && draggingCard) {
    hasActuallyDragged = true;
    
    let mx = mouseX - width / 2;
    let my = mouseY - height / 2;
    
    let pair = draggingCard.pair;
    let clickedCard = pair[draggingCard.clickedIndex];
    
    // 计算卡牌尺寸和间距
    let pairWidth = cardWidth * 2 + cardSpacing;
    
    // 设置不同的边距值
    let leftMargin = 20;
    let rightMargin = 300;  // 增大右边距，避免遮挡提示文字
    let topMargin = 20;
    let bottomMargin = 20;
    
    // 计算新的拖拽偏移量
    let newDragX = mx - dragOffsetX - clickedCard.baseX;
    let newDragY = my - dragOffsetY - clickedCard.baseY;
    
    // 计算移动增量
    let deltaX = newDragX - clickedCard.dragX;
    let deltaY = newDragY - clickedCard.dragY;

    // 计算第一张卡牌的位置（考虑卡牌宽度的一半）
    let nextLeftX = pair[0].baseX + pair[0].dragX + deltaX - cardWidth/2;
    let nextRightX = nextLeftX + pairWidth + cardWidth/2;
    let nextTopY = pair[0].baseY + pair[0].dragY + deltaY - cardHeight/2;
    let nextBottomY = nextTopY + cardHeight;

    // 应用边界约束
    // 左边界
    if (nextLeftX < -width/2 + leftMargin) {
        deltaX += (-width/2 + leftMargin) - nextLeftX;
    }
    // 右边界 - 使用更大的边距
    if (nextRightX > width/2 - rightMargin) {
        deltaX += (width/2 - rightMargin) - nextRightX;
    }
    // 上边界
    if (nextTopY < -height/2 + topMargin) {
        deltaY += (-height/2 + topMargin) - nextTopY;
    }
    // 下边界
    if (nextBottomY > height/2 - bottomMargin) {
        deltaY += (height/2 - bottomMargin) - nextBottomY;
    }

    // 应用移动到对子中的所有卡牌
    for (let card of pair) {
        card.dragX += deltaX;
        card.dragY += deltaY;
    }
    
    // 更新初始拖拽位置
    draggingCard.initialDragX = pair[0].dragX;
    draggingCard.initialDragY = pair[0].dragY;
  }
}

function checkSnapToOtherPairs(currentPair, deltaX, deltaY) {
  if (!draggingCard) return { deltaX, deltaY };

  let bestSnapX = deltaX;
  let bestSnapY = deltaY;
  let minDistance = snapDistance;

  // 计算当前对的中心点
  let currentLeft = currentPair[0].baseX + currentPair[0].dragX + deltaX;
  let currentRight = currentLeft + (cardWidth * 2) + cardSpacing;
  let currentY = currentPair[0].baseY + currentPair[0].dragY + deltaY;
  let currentCenterX = currentLeft + ((cardWidth * 2) + cardSpacing) / 2;

  // 遍历所有卡牌对
  for (let pairIndex = 0; pairIndex < pairedCardsPositions.length; pairIndex++) {
    let targetPair = pairedCardsPositions[pairIndex];
    if (targetPair === currentPair) continue;

    let targetLeft = targetPair[0].baseX + targetPair[0].dragX;
    let targetRight = targetLeft + (cardWidth * 2) + cardSpacing;
    let targetY = targetPair[0].baseY + targetPair[0].dragY;
    let targetCenterX = targetLeft + ((cardWidth * 2) + cardSpacing) / 2;

    // 计算水平吸附距离
    let rightSnapDist = Math.abs((targetRight + pairSpacing) - currentLeft);
    let leftSnapDist = Math.abs((targetLeft - pairSpacing - (cardWidth * 2 + cardSpacing)) - currentLeft);
    // 计算中心对齐的距离
    let centerAlignDist = Math.abs(targetCenterX - currentCenterX);

    // 计算垂直吸附距离
    let topSnapDist = Math.abs((targetY - pairSpacing) - (currentY + cardHeight + cardSpacing));
    let bottomSnapDist = Math.abs((targetY + pairSpacing + cardHeight + cardSpacing) - currentY);
    
    // 检查水平吸附
    if ((rightSnapDist < snapDistance || leftSnapDist < snapDistance || centerAlignDist < snapDistance) &&
        Math.abs(currentY - targetY) < snapDistance) {
      // 左右吸附
      if (rightSnapDist < leftSnapDist && rightSnapDist < minDistance) {
        minDistance = rightSnapDist;
        bestSnapX = (targetRight + pairSpacing) - currentLeft;
        bestSnapY = targetY - currentY;
      } else if (leftSnapDist < minDistance) {
        minDistance = leftSnapDist;
        bestSnapX = (targetLeft - pairSpacing - (cardWidth * 2 + cardSpacing)) - currentLeft;
        bestSnapY = targetY - currentY;
      }
      // 中心对齐
      else if (centerAlignDist < minDistance) {
        minDistance = centerAlignDist;
        bestSnapX = (targetCenterX - ((cardWidth * 2 + cardSpacing) / 2)) - currentLeft;
        bestSnapY = targetY - currentY;
      }
    }
    
    // 检查垂直吸附
    if (Math.abs(currentCenterX - targetCenterX) < snapDistance) {
      // 上方吸附
      if (topSnapDist < snapDistance && topSnapDist < minDistance) {
        minDistance = topSnapDist;
        bestSnapX = (targetCenterX - ((cardWidth * 2 + cardSpacing) / 2)) - currentLeft;
        bestSnapY = (targetY - pairSpacing - cardHeight - cardSpacing) - currentY;
      }
      // 下方吸附
      else if (bottomSnapDist < snapDistance && bottomSnapDist < minDistance) {
        minDistance = bottomSnapDist;
        bestSnapX = (targetCenterX - ((cardWidth * 2 + cardSpacing) / 2)) - currentLeft;
        bestSnapY = (targetY + pairSpacing + cardHeight + cardSpacing) - currentY;
      }
    }
  }

  // 应用吸附
  if (minDistance < snapThreshold) {
    return {
      deltaX: bestSnapX,
      deltaY: bestSnapY
    };
  }

  return { deltaX, deltaY };
}
