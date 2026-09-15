// ========================================
// DOM
// ========================================

const startScreen = document.getElementById("startScreen");
const arScreen = document.getElementById("arScreen");
const resultScreen = document.getElementById("resultScreen");

const startButton = document.getElementById("startButton");

const cameraWrapper = document.getElementById("cameraWrapper");
const cameraArea = document.getElementById("cameraArea");
const video = document.getElementById("camera");
const character = document.getElementById("character");

const resetButton = document.getElementById("resetButton");
const shutterButton = document.getElementById("shutterButton");
const switchButton = document.getElementById("switchButton");

const canvas = document.getElementById("canvas");
const retakeButton = document.getElementById("retakeButton");
const saveButton = document.getElementById("saveButton");

const zoomButtons = document.querySelectorAll(".zoomButton");


// ========================================
// カメラ関連
// ========================================

let stream = null;

let facingMode = "environment";

let cameraZoom = 1;


// ========================================
// キャラクター操作関連
// ========================================

let characterX = 0;
let characterY = 0;

let characterScale = 1;

let dragging = false;

let dragStartX = 0;
let dragStartY = 0;

let characterStartX = 0;
let characterStartY = 0;

let pinchStartDistance = 0;
let pinchStartScale = 1;


// ========================================
// ARデータ
// ========================================

let schoolId = null;
let contentId = null;

let schoolData = null;
let currentContent = null;
let currentCharacter = null;


// ========================================
// URLパラメータ取得
// ========================================

function getUrlParameters() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  schoolId =
    params.get("school");

  contentId =
    params.get("id");

  console.log(
    "school:",
    schoolId
  );

  console.log(
    "id:",
    contentId
  );

}


// ========================================
// ARデータ読み込み
// ========================================

async function loadArData() {

  if (!schoolId) {

    throw new Error(
      "URLにschoolが指定されていません。"
    );

  }

  if (!contentId) {

    throw new Error(
      "URLにidが指定されていません。"
    );

  }


  const dataUrl =
    `./schools/${encodeURIComponent(schoolId)}/data.json`;


  console.log(
    "data.json:",
    dataUrl
  );


  const response =
    await fetch(
      dataUrl,
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `data.jsonを取得できませんでした。HTTP ${response.status}`
    );

  }


  schoolData =
    await response.json();


  console.log(
    "schoolData:",
    schoolData
  );


  if (
    !Array.isArray(
      schoolData.contents
    )
  ) {

    throw new Error(
      "data.jsonのcontentsが正しくありません。"
    );

  }


  currentContent =
    schoolData.contents.find(
      item =>
        item.id === contentId
    );


  if (!currentContent) {

    throw new Error(
      `ID「${contentId}」のデータが見つかりません。`
    );

  }


  if (
    !Array.isArray(
      currentContent.characters
    ) ||
    currentContent.characters.length === 0
  ) {

    throw new Error(
      `ID「${contentId}」にキャラクターが設定されていません。`
    );

  }


  // 今回は最初の1体だけ使用
  currentCharacter =
    currentContent.characters[0];


  if (!currentCharacter.image) {

    throw new Error(
      "キャラクター画像が設定されていません。"
    );

  }


  const imageUrl =
    `./schools/${encodeURIComponent(schoolId)}/${currentCharacter.image}`;


  console.log(
    "character image:",
    imageUrl
  );


  character.src =
    imageUrl;


  // JSONに初期サイズがある場合
  if (
    currentCharacter.size !== undefined
  ) {

    const size =
      Number(
        currentCharacter.size
      );

    if (
      Number.isFinite(size) &&
      size > 0
    ) {

      characterScale =
        size / 100;

    }

  }


  updateCharacterTransform();


  console.log(
    "currentContent:",
    currentContent
  );

  console.log(
    "currentCharacter:",
    currentCharacter
  );

}


// ========================================
// 初期化
// ========================================

async function initializeApp() {

  try {

    getUrlParameters();

    await loadArData();

  }
  catch (error) {

    console.error(
      error
    );

    alert(
      "ARデータの読み込みに失敗しました。\n\n" +
      error.message
    );

  }

}


// ========================================
// カメラ枠サイズ
// ========================================

function fitCameraFrame() {

  if (
    !cameraWrapper ||
    !cameraArea
  ) {
    return;
  }


  const wrapperRect =
    cameraWrapper.getBoundingClientRect();


  const availableWidth =
    wrapperRect.width;

  const availableHeight =
    wrapperRect.height;


  if (
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    return;
  }


  const portrait =
    window.innerHeight >
    window.innerWidth;


  if (portrait) {

    // 縦画面は3:4
    const targetAspect =
      3 / 4;


    let width =
      availableWidth;

    let height =
      width / targetAspect;


    if (
      height >
      availableHeight
    ) {

      height =
        availableHeight;

      width =
        height *
        targetAspect;

    }


    cameraArea.style.width =
      `${width}px`;

    cameraArea.style.height =
      `${height}px`;

  }
  else {

    // 横画面は利用可能領域いっぱい
    cameraArea.style.width =
      `${availableWidth}px`;

    cameraArea.style.height =
      `${availableHeight}px`;

  }

}


// ========================================
// カメラ開始
// ========================================

async function startCamera() {

  if (stream) {

    stream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

    stream = null;

  }


  const constraints = {

    audio: false,

    video: {

      facingMode: {
        ideal: facingMode
      },

      width: {
        ideal: 1920
      },

      height: {
        ideal: 1440
      }

    }

  };


  stream =
    await navigator.mediaDevices.getUserMedia(
      constraints
    );


  video.srcObject =
    stream;


  await video.play();


  fitCameraFrame();

}


// ========================================
// カメラ切替
// ========================================

async function switchCamera() {

  facingMode =
    facingMode === "environment"
      ? "user"
      : "environment";


  setCameraZoom(1);


  try {

    await startCamera();

  }
  catch (error) {

    console.error(
      error
    );

    alert(
      "カメラの切り替えに失敗しました。"
    );

  }

}


// ========================================
// 疑似ズーム
// ========================================

function setCameraZoom(
  zoom
) {

  cameraZoom =
    Number(
      zoom
    );


  video.style.transform =
    `scale(${cameraZoom})`;


  zoomButtons.forEach(
    button => {

      const value =
        Number(
          button.dataset.zoom
        );

      button.classList.toggle(
        "active",
        value === cameraZoom
      );

    }
  );

}


// ========================================
// キャラクター位置更新
// ========================================

function updateCharacterTransform() {

  character.style.transform =
    `translate(${characterX}px, ${characterY}px) scale(${characterScale})`;

}


// ========================================
// キャラクターリセット
// ========================================

function resetCharacter() {

  characterX = 0;
  characterY = 0;

  characterScale = 1;


  // JSONにサイズ指定があれば使用
  if (
    currentCharacter &&
    currentCharacter.size !== undefined
  ) {

    const size =
      Number(
        currentCharacter.size
      );

    if (
      Number.isFinite(size) &&
      size > 0
    ) {

      characterScale =
        size / 100;

    }

  }


  updateCharacterTransform();

}


// ========================================
// 2点間距離
// ========================================

function getDistance(
  touch1,
  touch2
) {

  const dx =
    touch2.clientX -
    touch1.clientX;

  const dy =
    touch2.clientY -
    touch1.clientY;


  return Math.sqrt(
    dx * dx +
    dy * dy
  );

}


// ========================================
// Pointer操作
// ========================================

character.addEventListener(
  "pointerdown",
  event => {

    if (
      event.pointerType ===
      "touch"
    ) {
      return;
    }


    dragging = true;


    dragStartX =
      event.clientX;

    dragStartY =
      event.clientY;


    characterStartX =
      characterX;

    characterStartY =
      characterY;


    character.setPointerCapture(
      event.pointerId
    );

  }
);


character.addEventListener(
  "pointermove",
  event => {

    if (!dragging) {
      return;
    }


    if (
      event.pointerType ===
      "touch"
    ) {
      return;
    }


    characterX =
      characterStartX +
      (
        event.clientX -
        dragStartX
      );


    characterY =
      characterStartY +
      (
        event.clientY -
        dragStartY
      );


    updateCharacterTransform();

  }
);


character.addEventListener(
  "pointerup",
  event => {

    dragging = false;


    try {

      character.releasePointerCapture(
        event.pointerId
      );

    }
    catch (error) {

      // 何もしない

    }

  }
);


character.addEventListener(
  "pointercancel",
  () => {

    dragging = false;

  }
);


// ========================================
// タッチ操作
// ========================================

character.addEventListener(
  "touchstart",
  event => {

    event.preventDefault();


    if (
      event.touches.length === 1
    ) {

      dragging = true;


      dragStartX =
        event.touches[0].clientX;

      dragStartY =
        event.touches[0].clientY;


      characterStartX =
        characterX;

      characterStartY =
        characterY;

    }


    if (
      event.touches.length === 2
    ) {

      dragging = false;


      pinchStartDistance =
        getDistance(
          event.touches[0],
          event.touches[1]
        );


      pinchStartScale =
        characterScale;

    }

  },
  {
    passive: false
  }
);


character.addEventListener(
  "touchmove",
  event => {

    event.preventDefault();


    if (
      event.touches.length === 1 &&
      dragging
    ) {

      characterX =
        characterStartX +
        (
          event.touches[0].clientX -
          dragStartX
        );


      characterY =
        characterStartY +
        (
          event.touches[0].clientY -
          dragStartY
        );


      updateCharacterTransform();

    }


    if (
      event.touches.length === 2
    ) {

      const distance =
        getDistance(
          event.touches[0],
          event.touches[1]
        );


      if (
        pinchStartDistance >
        0
      ) {

        characterScale =
          pinchStartScale *
          (
            distance /
            pinchStartDistance
          );


        characterScale =
          Math.max(
            0.2,
            Math.min(
              characterScale,
              5
            )
          );


        updateCharacterTransform();

      }

    }

  },
  {
    passive: false
  }
);


character.addEventListener(
  "touchend",
  event => {

    event.preventDefault();


    if (
      event.touches.length === 0
    ) {

      dragging = false;

    }


    if (
      event.touches.length === 1
    ) {

      dragging = true;


      dragStartX =
        event.touches[0].clientX;

      dragStartY =
        event.touches[0].clientY;


      characterStartX =
        characterX;

      characterStartY =
        characterY;

    }

  },
  {
    passive: false
  }
);


// ========================================
// 撮影
// ========================================

function capturePhoto() {

  if (
    !video.videoWidth ||
    !video.videoHeight
  ) {

    alert(
      "カメラの準備ができていません。"
    );

    return;

  }


  const areaRect =
    cameraArea.getBoundingClientRect();


  const frameAspect =
    areaRect.width /
    areaRect.height;


  // 長辺1440px
  let outputWidth;
  let outputHeight;


  if (
    frameAspect >= 1
  ) {

    outputWidth =
      1440;

    outputHeight =
      Math.round(
        outputWidth /
        frameAspect
      );

  }
  else {

    outputHeight =
      1440;

    outputWidth =
      Math.round(
        outputHeight *
        frameAspect
      );

  }


  canvas.width =
    outputWidth;

  canvas.height =
    outputHeight;


  const context =
    canvas.getContext(
      "2d"
    );


  const videoWidth =
    video.videoWidth;

  const videoHeight =
    video.videoHeight;


  const videoAspect =
    videoWidth /
    videoHeight;


  let sourceX = 0;
  let sourceY = 0;

  let sourceWidth =
    videoWidth;

  let sourceHeight =
    videoHeight;


  // object-fit: cover と同じ範囲を計算
  if (
    videoAspect >
    frameAspect
  ) {

    sourceWidth =
      videoHeight *
      frameAspect;

    sourceX =
      (
        videoWidth -
        sourceWidth
      ) / 2;

  }
  else {

    sourceHeight =
      videoWidth /
      frameAspect;

    sourceY =
      (
        videoHeight -
        sourceHeight
      ) / 2;

  }


  // 疑似ズーム
  if (
    cameraZoom >
    1
  ) {

    const zoomWidth =
      sourceWidth /
      cameraZoom;

    const zoomHeight =
      sourceHeight /
      cameraZoom;


    sourceX +=
      (
        sourceWidth -
        zoomWidth
      ) / 2;


    sourceY +=
      (
        sourceHeight -
        zoomHeight
      ) / 2;


    sourceWidth =
      zoomWidth;

    sourceHeight =
      zoomHeight;

  }


  // カメラ画像
  context.drawImage(
    video,

    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,

    0,
    0,
    outputWidth,
    outputHeight
  );


  // ========================================
  // キャラクター描画
  // ========================================

  const characterRect =
    character.getBoundingClientRect();


  const scaleX =
    outputWidth /
    areaRect.width;

  const scaleY =
    outputHeight /
    areaRect.height;


  const drawX =
    (
      characterRect.left -
      areaRect.left
    ) *
    scaleX;


  const drawY =
    (
      characterRect.top -
      areaRect.top
    ) *
    scaleY;


  const drawWidth =
    characterRect.width *
    scaleX;


  const drawHeight =
    characterRect.height *
    scaleY;


  context.drawImage(
    character,

    drawX,
    drawY,
    drawWidth,
    drawHeight
  );


  arScreen.classList.add(
    "hidden"
  );


  resultScreen.classList.remove(
    "hidden"
  );

}


// ========================================
// 撮り直し
// ========================================

function retakePhoto() {

  resultScreen.classList.add(
    "hidden"
  );


  arScreen.classList.remove(
    "hidden"
  );


  requestAnimationFrame(
    () => {

      fitCameraFrame();

    }
  );

}


// ========================================
// 保存
// ========================================

function savePhoto() {

  const dataUrl =
    canvas.toDataURL(
      "image/jpeg",
      0.92
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    dataUrl;


  link.download =
    `${schoolId || "ar"}_${contentId || "photo"}.jpg`;


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();

}


// ========================================
// AR開始
// ========================================

async function startAR() {

  // データが読み込めていない場合
  if (
    !currentContent ||
    !currentCharacter
  ) {

    alert(
      "ARデータが読み込まれていません。"
    );

    return;

  }


  try {

    startScreen.classList.add(
      "hidden"
    );


    arScreen.classList.remove(
      "hidden"
    );


    await startCamera();


    resetCharacter();


    setCameraZoom(1);

  }
  catch (error) {

    console.error(
      error
    );


    arScreen.classList.add(
      "hidden"
    );


    startScreen.classList.remove(
      "hidden"
    );


    alert(
      "カメラを起動できませんでした。\n\n" +
      error.name +
      "\n" +
      error.message
    );

  }

}


// ========================================
// イベント
// ========================================

startButton.addEventListener(
  "click",
  startAR
);


resetButton.addEventListener(
  "click",
  resetCharacter
);


shutterButton.addEventListener(
  "click",
  capturePhoto
);


switchButton.addEventListener(
  "click",
  switchCamera
);


retakeButton.addEventListener(
  "click",
  retakePhoto
);


saveButton.addEventListener(
  "click",
  savePhoto
);


zoomButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        const zoom =
          Number(
            button.dataset.zoom
          );


        setCameraZoom(
          zoom
        );

      }
    );

  }
);


// ========================================
// 画面サイズ変更
// ========================================

window.addEventListener(
  "resize",
  () => {

    fitCameraFrame();

  }
);


window.addEventListener(
  "orientationchange",
  () => {

    setTimeout(
      () => {

        fitCameraFrame();

      },
      300
    );

  }
);


// ========================================
// 起動
// ========================================

initializeApp();
