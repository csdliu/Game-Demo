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
let correctlyPlacedPairs = [];  // 存储正确放置的卡牌对的索引
let matchSoundPlayed = false;   // 匹配音效是否已播放的标志
let cursorY = 0;       // 光标当前Y位置
let targetCursorY = 0; // 光标目标Y位置
let cursorLerpSpeed = 0.1; // 光标移动插值速度

// 添加到全局变量定义部分
let arrangementGrid = {
  cols: 2,                // 改为2列
  rows: 4,               // 改为4行
  x: 160,                // 左边距
  y: 100,                // 顶部边距
  cellWidth: 350,        // 增加单元格宽度以适应一对卡片
  cellHeight: 180,       // 调整单元格高度
  padding: 10,           // 单元格内边距
  cells: [],             // 存储每个格子的状态
  highlightColor: 'rgba(100, 149, 237, 0.2)'  // 高亮颜色
};

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
let gameVersion = "test_0.2";  
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


// 音效管理器类
class SoundManager {
  constructor() {
    this.sounds = new Map();
    this.isMuted = false;
    this.volume = 1.0;
  }

  // 加载音效
  async loadSound(key, path) {
    try {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.sounds.set(key, audio);
      return new Promise((resolve) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
      });
    } catch (error) {
      console.error(`Error loading sound ${key}:`, error);
    }
  }

  // 播放音效，支持自定义参数
  play(key, options = {}) {
    if (this.isMuted) return;
    
    const sound = this.sounds.get(key);
    if (sound) {
      // 创建新的Audio实例来允许重叠播放
      const newSound = new Audio(sound.src);
      
      // 应用基础音量
      newSound.volume = this.volume * (options.volume || 1.0);
      
      // 应用播放速率（影响音高和速度）
      if (options.playbackRate) {
        newSound.playbackRate = options.playbackRate;
      }

      // 应用音调偏移（单位：音分，100音分 = 1半音）
      if (options.detune) {
        if (newSound.mozPreservesPitch !== undefined) { // Firefox
          newSound.mozPreservesPitch = false;
        } else if (newSound.preservesPitch !== undefined) { // Chrome
          newSound.preservesPitch = false;
        }
        // 将detune转换为playbackRate
        const detuneRate = Math.pow(2, options.detune / 1200);
        newSound.playbackRate *= detuneRate;
      }

      newSound.play().catch(error => {
        console.error(`Error playing sound ${key}:`, error);
      });

      return newSound;
    }
  }

  // 设置音量
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
  }

  // 静音/取消静音
  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // 预加载所有音效
  async preloadAll() {
    const soundFiles = {
      buttonDown: 'assets/sounds/button_down.mp3',
      buttonUp: 'assets/sounds/button_up.mp3',
      flip: 'assets/sounds/flip.mp3',
      put: 'assets/sounds/put.mp3',
      ding: 'assets/sounds/ding.mp3'
    };

    const loadPromises = Object.entries(soundFiles).map(([key, path]) => 
      this.loadSound(key, path)
    );

    try {
      await Promise.all(loadPromises);
      console.log('All sounds loaded successfully');
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  }
}

// 创建全局音效管理器实例
window.soundManager = new SoundManager();

// 创建全局音效管理器实例
window.soundManager = new SoundManager();

// =============== 初始化函数 ===============

// 画布大小更新
function updateCanvasSize() {
  // 计算最小所需宽度
  const gridWidth = arrangementGrid.cols * arrangementGrid.cellWidth; // 网格宽度
  const messageWidth = 200; // 提示信息区域宽度
  const cardPairWidth = cardWidth * 2 + cardSpacing; // 一对卡片的宽度
  const minContentWidth = gridWidth + messageWidth + cardPairWidth + 200; // 增加额外边距到200
  
  // 确保最小宽度能容纳所有内容
  const minWidth = Math.max(1400, minContentWidth); // 增加最小宽度到1400
  
  // 更新画布宽度，使用更大的比例和更大的最大值
  canvasWidth = constrain(windowWidth * 0.9, minWidth, 2000);  // 增加最大宽度到2000
  canvasHeight = constrain(windowHeight * 0.9, 900, 1200);     // 增加最大高度到1200
}

// 窗口大小调整响应
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
}

// 资源预加载
async function preload() {  
  myFont = loadFont('assets/font/AppleSDGothicNeo-Bold.ttf');
  for (let i = 0; i < 16; i++) {
    cardFrontImages.push(loadImage(`assets/pictures/${i}.png`));
  }
  cardBackImage = loadImage('assets/pictures/back.png');
  // 预加载所有音效
  if (window.soundManager) {
    await window.soundManager.preloadAll();
  }
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
  correctlyPlacedPairs = [];  // 重置正确放置的数组
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

// 绘制网格系统
// 修改绘制网格函数，添加标签
function drawArrangementGrid() {
  stroke(100);
  strokeWeight(2);
  noFill();
  rectMode(CENTER);
  
  // 计算网格的总高度
  const totalGridHeight = arrangementGrid.rows * arrangementGrid.cellHeight;
  
  // 计算垂直居中的起始Y坐标
  // 从画布中心开始，减去网格总高度的一半
  let startY = -totalGridHeight / 2;
  let startX = -width/2 + arrangementGrid.x;
  
  // 定义每个格子的标签
  const gridLabels = [
    "(0-1)",   // 第一格
    "(4-5)",   // 第二格
    "(2-3)",   // 第三格
    "(6-7)",   // 第四格
    "(8-9)",   // 第五格
    "(12-13)", // 第六格
    "(10-11)", // 第七格
    "(14-15)"  // 第八格
  ];
  
  // 绘制网格
  for (let row = 0; row < arrangementGrid.rows; row++) {
    for (let col = 0; col < arrangementGrid.cols; col++) {
      // 计算网格中心点
      let centerX = startX + col * arrangementGrid.cellWidth + arrangementGrid.cellWidth/2;
      let centerY = startY + row * arrangementGrid.cellHeight + arrangementGrid.cellHeight/2;
      
      // 绘制网格背景
      noStroke();
      fill(190); // 格子背景色
      rect(centerX, centerY, 
           arrangementGrid.cellWidth - arrangementGrid.padding * 2,
           arrangementGrid.cellHeight - arrangementGrid.padding * 2);
           
      // 添加标签
      fill(0); // 文字颜色为黑色
      textSize(16);
      textAlign(CENTER, CENTER);
      let labelIndex = row * arrangementGrid.cols + col;
      text(gridLabels[labelIndex], centerX, centerY - arrangementGrid.cellHeight/3);
    }
  }
}

// 检查是否在网格单元格内
function checkGridCell(x, y) {
  // 计算网格的总高度
  const totalGridHeight = arrangementGrid.rows * arrangementGrid.cellHeight;
  // 计算垂直居中的起始位置
  let startY = -totalGridHeight / 2;
  let startX = -width/2 + arrangementGrid.x;
  
  // 检查是否在整个网格区域内
  if (x < startX || x > startX + arrangementGrid.cols * arrangementGrid.cellWidth ||
      y < startY || y > startY + totalGridHeight) {
    return -1;
  }
  
  // 计算所在格子
  let col = Math.floor((x - startX) / arrangementGrid.cellWidth);
  let row = Math.floor((y - startY) / arrangementGrid.cellHeight);
  
  // 确保在有效范围内
  if (col >= 0 && col < arrangementGrid.cols && row >= 0 && row < arrangementGrid.rows) {
    return row * arrangementGrid.cols + col;
  }
  
  return -1;
}

// 第二阶段（排列阶段）界面绘制
// 更新绘制函数以显示边界
function drawArrangingStage() {
  background(200);

  // 绘制标题
  textAlign(CENTER, CENTER);
  textSize(24);
  fill(0);
  text("Arrange the matched cards", 0, -height/2 + 30);
  
  // 初始化卡牌位置
  if (!pairedCardsPositions || pairedCardsPositions.length === 0) {
    initializePairedCardsPositions();
  }

  // 绘制网格
  drawArrangementGrid();
  
  // 绘制所有卡片对
  drawAllPairedCards();
  
  // 计算提示信息的位置 - 使用相对于画布的定位
  const relativeX = width * 0.15; // 从画布右侧15%的位置开始
  const messageX = width/2 - relativeX; // 转换为以中心为原点的坐标系
  
  // 消息区域的垂直位置和间距
  const messageStartY = -height * 0.3; // 从画布顶部30%的位置开始
  const messageSpacing = height * 0.05; // 每条消息间隔为画布高度的5%
  
  // 绘制提示信息
  textAlign(LEFT, CENTER);
  
  // 查找当前激活的提示语索引
  let activeMessageIndex = pairedCards.findIndex(pair => pair.pairIndex === activePairIndex);
  
  // 更新光标目标位置
  if (activeMessageIndex !== -1) {
    targetCursorY = messageStartY + activeMessageIndex * messageSpacing;
  }
  
  // 平滑移动光标
  cursorY = lerp(cursorY, targetCursorY, cursorLerpSpeed);
  
  // 绘制光标
  if (activeMessageIndex !== -1) {
    fill(0);
    noStroke();
    ellipse(messageX - 15, cursorY + 4, 5, 5);
  }
  
  // 绘制所有消息
  for (let i = 0; i < pairedCards.length; i++) {
    let messageY = messageStartY + i * messageSpacing;
    let isActive = pairedCards[i].pairIndex === activePairIndex;
    
    // 设置文字大小
    textSize(isActive ? 18 : 16);
    
    // 绘制消息
    fill(isActive ? 0 : 150);
    text(pairedCards[i].message, messageX, messageY);
  }
  
  // 绘制返回按钮和还原按钮
  drawReturnButton();
  drawResetButton();
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

  if (hovered && mouseIsPressed) {
    if (window.soundManager) {
      window.soundManager.play('buttonDown',{
        volume: 0.4,         // 稍微降低音量
        playbackRate: 1    // 正常播放速率
      });
    }
    onClick();
  }  
}  

// 添加还原按钮绘制函数
function drawResetButton() {
  let buttonX = width/2 - 100;  // 右上角位置
  let buttonY = -height/2 + 50;  // 顶部位置
  let w = 80, h = 40;  // 按钮尺寸比普通按钮小一些
  
  // 检查鼠标悬停
  let hovered = mouseX > width/2 + buttonX - w/2 && 
                mouseX < width/2 + buttonX + w/2 &&
                mouseY > height/2 + buttonY - h/2 && 
                mouseY < height/2 + buttonY + h/2;

  // 绘制按钮
  fill(hovered ? '#87CEEB' : '#ADD8E6');
  rectMode(CENTER);
  rect(buttonX, buttonY, w, h, 10);  // 圆角矩形

  // 绘制文字
  fill(0);
  textSize(16);  // 文字大小比普通按钮小
  textAlign(CENTER, CENTER);
  text("Reset", buttonX, buttonY);

  // 点击处理
  if (hovered && mouseIsPressed && !isResetButtonPressed) {
    isResetButtonPressed = true;
    resetCardPositions();
  } else if (!mouseIsPressed) {
    isResetButtonPressed = false;
  }
}

// 添加重置卡片位置的函数
function resetCardPositions() {
  if (window.soundManager) {
    window.soundManager.play('put',{
      volume: 0.5,
      playbackRate: 2.0
    });
  }
  initializePairedCardsPositions();
  arrangementGrid.cells = Array(arrangementGrid.rows * arrangementGrid.cols).fill(null);
  draggingCard = null;
  activePairIndex = -1;
  hasActuallyDragged = false;
  correctlyPlacedPairs = [];  // 重置正确放置的数组
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

// 添加新的函数用于打乱卡片对和提示语
// 修改打乱函数
function shuffleCardsAndMessages() {
  // 创建索引数组
  let indices = [...Array(8).keys()];
  
  // 使用Fisher-Yates算法打乱索引
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  // 根据打乱的索引重新排列卡片对
  let shuffledPairs = indices.map(i => pairedCards[i]);
  pairedCards = shuffledPairs;
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


// 修改初始化卡片位置函数
function initializePairedCardsPositions() {
  pairedCardsPositions = [];
  
  // 使用相对位置计算
  const config = {
    startX: width * 0.6,              // 使用画布宽度的60%作为起始位置
    verticalSpacing: cardHeight * -0.5, // 垂直间距
  };
  
  // 计算实际的起始X坐标（相对于画布中心）
  const actualStartX = -width/2 + config.startX;
  
  // 计算所有卡片对的总高度
  const totalPairsHeight = pairedCards.length * cardHeight + // 所有卡片的高度
                          (pairedCards.length - 1) * config.verticalSpacing; // 间距总和
  
  // 计算起始Y坐标，使卡片垂直居中
  const startY = -totalPairsHeight / 2;
  
  // 遍历所有配对的卡片
  for (let pairIndex = 0; pairIndex < pairedCards.length; pairIndex++) {
    let pair = pairedCards[pairIndex].cards;
    let pairPositions = [];
    
    // 计算卡片对的中心点位置
    let pairCenterX = actualStartX + cardWidth + cardSpacing/2;
    // 从中心点开始，依次向下排列
    let pairCenterY = startY + (pairIndex * (cardHeight + config.verticalSpacing)) + cardHeight/2;
    
    // 创建卡片对位置信息，基于中心点定位
    for (let i = 0; i < pair.length; i++) {
      let offsetX = (i - 0.5) * (cardWidth + cardSpacing);
      pairPositions.push({
        card: pair[i],
        baseX: pairCenterX + offsetX,
        baseY: pairCenterY,
        dragX: 0,
        dragY: 0
      });
    }
    pairedCardsPositions.push(pairPositions);
  }
  
  arrangementGrid.cells = Array(arrangementGrid.rows * arrangementGrid.cols).fill(null);
}

// 绘制所有配对卡牌
function drawAllPairedCards() {
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
      
      // 只有在声音还没播放时才播放
      if (window.soundManager && !matchSoundPlayed) {
        window.soundManager.play('ding', {
          volume: 0.5,
          playbackRate: 1.0
        });
        matchSoundPlayed = true;
      }
    } else {
      revealed[firstCardY][firstCardX] = false;
      revealed[secondCardY][secondCardX] = false;
      remainingClicks--;
      matchMessage = "";
      
      if (window.soundManager) {
        window.soundManager.play('flip', {
          volume: 0.8,
          playbackRate: 0.9
        });
      }
    }

    firstCardX = -1;
    firstCardY = -1;
    secondCardX = -1;
    secondCardY = -1;
    checking = false;
    matchSoundPlayed = false; // 重置声音标志
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
// 修改arrangePairedCards函数来包含打乱功能
// 修改卡片对的数据结构，添加原始索引
function arrangePairedCards() {
  pairedCards = [];
  // 找出所有配对的卡牌，并记录原始索引
  for (let i = 0; i < 8; i++) {
    let pair = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (Math.floor(cards[row][col] / 2) === i) {
          pair.push({
            image: cardFrontImages[cards[row][col]],
            width: cardWidth,
            height: cardHeight,
            originalIndex: cards[row][col],
            pairIndex: i  // 添加原始配对索引
          });
        }
      }
    }
    pairedCards.push({
      cards: pair,
      pairIndex: i,      // 保存原始索引
      message: predefinedMessages[i]  // 保存对应的提示语
    });
  }
  
  // 打乱卡片对
  shuffleCardsAndMessages();
}


// 格子验证函数
// 验证网格位置函数
function verifyGridPlacement(cellIndex, pairCards) {
  let originalPairIndex = Math.floor(pairCards[0].card.originalIndex / 2);
  
  // 定义每个格子对应的卡片对
  const correctPositions = {
    0: 0,  // 0-1对
    1: 2,  // 4-5对
    2: 1,  // 2-3对
    3: 3,  // 6-7对
    4: 4,  // 8-9对
    5: 6,  // 12-13对
    6: 5,  // 10-11对
    7: 7   // 14-15对
  };

  // 检查是否放在正确位置
  if (cellIndex === correctPositions[originalPairIndex]) {
    if (!correctlyPlacedPairs.includes(originalPairIndex)) {
      correctlyPlacedPairs.push(originalPairIndex);
      reorderMessages();
    }
    return true;
  }
  return false;
}


// 重新排序提示消息的函数
function reorderMessages() {
  // 定义期望的显示顺序
  const displayOrder = [
    0,  // 0-1
    1,  // 4-5
    2,  // 2-3
    3,  // 6-7
    4,  // 8-9
    5,  // 12-13
    6,  // 10-11
    7   // 14-15
  ];

  // 创建一个临时数组，长度与pairedCards相同，初始化为null
  let reorderedPairedCards = new Array(pairedCards.length).fill(null);
  
  // 首先处理正确放置的卡牌对
  for (let correctPairIndex of correctlyPlacedPairs) {
    let correctPair = pairedCards.find(pair => 
      Math.floor(pair.cards[0].originalIndex / 2) === correctPairIndex
    );
    
    if (correctPair) {
      // 找到这对卡片应该显示的位置
      let displayIndex = displayOrder.indexOf(correctPairIndex);
      if (displayIndex !== -1) {
        reorderedPairedCards[displayIndex] = correctPair;
      }
    }
  }
  
  // 获取所有未正确放置的卡牌对
  let unplacedPairs = pairedCards.filter(pair => 
    !correctlyPlacedPairs.includes(Math.floor(pair.cards[0].originalIndex / 2))
  );
  
  // 将未正确放置的卡牌对填充到空位中
  let unplacedIndex = 0;
  for (let i = 0; i < reorderedPairedCards.length; i++) {
    if (reorderedPairedCards[i] === null && unplacedPairs[unplacedIndex]) {
      reorderedPairedCards[i] = unplacedPairs[unplacedIndex];
      unplacedIndex++;
    }
  }
  
  // 更新pairedCards数组，过滤掉可能的null值
  pairedCards = reorderedPairedCards.filter(pair => pair !== null);

  // Debug输出
  if (debug) {
    console.log('Correctly placed pairs:', correctlyPlacedPairs);
    console.log('Reordered messages:', pairedCards.map(p => Math.floor(p.cards[0].originalIndex / 2)));
  }
}

// =============== 事件处理函数 ===============

// 鼠标按下事件处理
// 修改鼠标事件相关函数，保持原有的激活功能
// 修改鼠标按下事件处理函数
function mousePressed() {
  if (currentScreen === "game" && gameStage === "arranging") {
    let mx = mouseX - width/2;
    let my = mouseY - height/2;
    activePairIndex = -1;
    hasActuallyDragged = false;
    
    // 从前往后（从最上层到最下层）检查卡片对
    for (let pairIndex = 0; pairIndex < pairedCardsPositions.length; pairIndex++) {
      let pairPositions = pairedCardsPositions[pairIndex];
      
      // 计算这对卡片的边界框
      let pairBounds = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity
      };
      
      // 计算整个卡片对的边界
      for (let pos of pairPositions) {
        let cardX = pos.baseX + pos.dragX;
        let cardY = pos.baseY + pos.dragY;
        
        pairBounds.minX = Math.min(pairBounds.minX, cardX - cardWidth/2);
        pairBounds.maxX = Math.max(pairBounds.maxX, cardX + cardWidth/2);
        pairBounds.minY = Math.min(pairBounds.minY, cardY - cardHeight/2);
        pairBounds.maxY = Math.max(pairBounds.maxY, cardY + cardHeight/2);
      }
      
      // 如果点击在这对卡片的范围内，选中这对卡片
      if (mx >= pairBounds.minX && mx <= pairBounds.maxX &&
          my >= pairBounds.minY && my <= pairBounds.maxY) {
        
        // 找到被点击的具体卡片
        for (let i = 0; i < pairPositions.length; i++) {
          let cardPos = pairPositions[i];
          let cardX = cardPos.baseX + cardPos.dragX;
          let cardY = cardPos.baseY + cardPos.dragY;
          
          if (mx > cardX - cardWidth/2 && mx < cardX + cardWidth/2 &&
              my > cardY - cardHeight/2 && my < cardY + cardHeight/2) {
            
            activePairIndex = Math.floor(cardPos.card.originalIndex / 2);
            draggingCard = {
              pair: pairPositions,
              clickedIndex: i,
              initialDragX: cardPos.dragX,
              initialDragY: cardPos.dragY
            };
            dragOffsetX = mx - cardX;
            dragOffsetY = my - cardY;
            return;
          }
        }
      }
    }
    draggingCard = null;
  } else if (currentScreen === "game" && gameStage === "matching") {
    if (!gameOver && !checking) {
      let mx = mouseX - width/2;
      let my = mouseY - height/2;
      let cardX = floor((mx + cols * (cardWidth + padding) / 2 - padding / 2) / (cardWidth + padding));
      let cardY = floor((my + rows * (cardHeight + padding) / 2 - padding / 2) / (cardHeight + padding));

      if (cardX >= 0 && cardX < cols && cardY >= 0 && cardY < rows && 
          !revealed[cardY][cardX] && !matched[cardY][cardX]) {
        revealed[cardY][cardX] = true;
        //播放声音
        if (window.soundManager) {
          window.soundManager.play('flip',{
            volume: 0.5,         // 稍微降低音量
            playbackRate: 1    // 正常播放速率
          });
        }
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
      console.log(`pass the first stage`);
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


// 修改mouseReleased函数，添加验证逻辑

function mouseReleased() {
  if (currentScreen === "game" && gameStage === "arranging" && draggingCard && hasActuallyDragged) {
    let pair = draggingCard.pair;
    
    // 计算卡片对的几何中心
    let pairCenterX = (pair[0].baseX + pair[0].dragX + pair[1].baseX + pair[1].dragX) / 2;
    let pairCenterY = (pair[0].baseY + pair[0].dragY + pair[1].baseY + pair[1].dragY) / 2;
    
    // 检查是否在网格内
    let cellIndex = checkGridCell(pairCenterX, pairCenterY);
    
    if (cellIndex !== -1) {
      let row = Math.floor(cellIndex / arrangementGrid.cols);
      let col = cellIndex % arrangementGrid.cols;
      
      // 计算网格的总高度
      const totalGridHeight = arrangementGrid.rows * arrangementGrid.cellHeight;
      // 计算垂直居中的起始位置
      let startY = -totalGridHeight / 2;
      let startX = -width/2 + arrangementGrid.x;
      
      // 计算目标网格中心位置，使用相同的坐标参考系统
      let cellCenterX = startX + col * arrangementGrid.cellWidth + arrangementGrid.cellWidth/2;
      let cellCenterY = startY + row * arrangementGrid.cellHeight + arrangementGrid.cellHeight/2;
      
      // 计算需要的偏移量使卡片对中心与网格中心对齐
      let offsetX = cellCenterX - pairCenterX;
      let offsetY = cellCenterY - pairCenterY;
      
      // 应用偏移到卡片对
      for (let card of pair) {
        card.dragX += offsetX;
        card.dragY += offsetY;
      }
      
      // 更新网格状态
      arrangementGrid.cells[cellIndex] = {
        pairIndex: Math.floor(pair[0].card.originalIndex / 2),
        pair: pair
      };
      
      verifyGridPlacement(cellIndex, pair);
      
      if (window.soundManager) {
        window.soundManager.play('put', {
          volume: 0.4,
          playbackRate: 1.0
        });
      }
    }
  }
  
  draggingCard = null;
  hasActuallyDragged = false;
}


// 鼠标拖动事件处理
// 修改 mouseDragged 函数
// 更新鼠标拖动函数以保持卡片对的相对位置
// 更新鼠标拖动函数以确保卡片在画布内
// 修改鼠标拖动函数，完善边界限制
function mouseDragged() {
  if (currentScreen === "game" && gameStage === "arranging" && draggingCard) {
    hasActuallyDragged = true;
    
    let mx = mouseX - width/2;
    let my = mouseY - height/2;
    
    let pair = draggingCard.pair;
    
    // 计算当前卡片对的中心点
    let pairCenterX = (pair[0].baseX + pair[0].dragX + pair[1].baseX + pair[1].dragX) / 2;
    let pairCenterY = (pair[0].baseY + pair[0].dragY + pair[1].baseY + pair[1].dragY) / 2;
    
    // 计算新的拖拽偏移量
    let deltaX = mx - pairCenterX;
    let deltaY = my - pairCenterY;
    
    // 应用边界约束
    let leftMargin = 20;
    let rightMargin = 300;
    let topMargin = 20;
    let bottomMargin = 20;
    
    // 计算边界约束
    let pairWidth = cardWidth * 2 + cardSpacing;
    let pairHeight = cardHeight;
    
    // 左边界
    if (pairCenterX - pairWidth/2 + deltaX < -width/2 + leftMargin) {
      deltaX = (-width/2 + leftMargin) - (pairCenterX - pairWidth/2);
    }
    // 右边界
    if (pairCenterX + pairWidth/2 + deltaX > width/2 - rightMargin) {
      deltaX = (width/2 - rightMargin) - (pairCenterX + pairWidth/2);
    }
    // 上边界
    if (pairCenterY - pairHeight/2 + deltaY < -height/2 + topMargin) {
      deltaY = (-height/2 + topMargin) - (pairCenterY - pairHeight/2);
    }
    // 下边界
    if (pairCenterY + pairHeight/2 + deltaY > height/2 - bottomMargin) {
      deltaY = (height/2 - bottomMargin) - (pairCenterY + pairHeight/2);
    }
    
    // 应用移动到对子中的所有卡牌
    for (let card of pair) {
      card.dragX += deltaX;
      card.dragY += deltaY;
    }
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

