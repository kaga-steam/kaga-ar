/* ========================================
   DOM
======================================== */

const startScreen =
  document.getElementById("startScreen");

const arScreen =
  document.getElementById("arScreen");

const resultScreen =
  document.getElementById("resultScreen");

const startButton =
  document.getElementById("startButton");

const resetButton =
  document.getElementById("resetButton");

const captureButton =
  document.getElementById("captureButton");

const switchCameraButton =
  document.getElementById("switchCameraButton");

const backButton =
  document.getElementById("backButton");

const downloadButton =
  document.getElementById("downloadButton");

const status =
  document.getElementById("status");

const cameraWrapper =
  document.getElementById("cameraWrapper");

const cameraArea =
  document.getElementById("cameraArea");

const video =
  document.getElementById("camera");

const character =
  document.getElementById("character");

const zoomControl =
  document.getElementById("zoomControl");

const zoomSlider =
  document.getElementById("zoomSlider");

const canvas =
  document.getElementById("captureCanvas");

const ctx =
  canvas.getContext("2d");


/* ========================================
   カメラ
======================================== */

let stream = null;

let facingMode =
  "environment";


/* ========================================
   キャラクター
======================================== */

let characterX = 0;

let characterY = 0;

let characterScale = 1;


/* ========================================
   Pointer
======================================== */

const pointers =
  new Map();

let previousDistance =
  null;


/* ========================================
   撮影フレーム計算

   縦：3:4
   横：4:3
======================================== */

function fitCameraFrame() {

  const style =
    getComputedStyle(
      cameraWrapper
    );


  const paddingX =
    parseFloat(
      style.paddingLeft
    ) +
    parseFloat(
      style.paddingRight
    );


  const paddingY =
    parseFloat(
      style.paddingTop
    ) +
    parseFloat(
      style.paddingBottom
    );


  const availableWidth =
    Math.max(
      1,
      cameraWrapper.clientWidth -
      paddingX
    );


  const availableHeight =
    Math.max(
      1,
      cameraWrapper.clientHeight -
      paddingY
    );


  const portrait =
    window.matchMedia(
      "(orientation: portrait)"
    ).matches;


  const targetAspect =
    portrait
      ? 3 / 4
      : 4 / 3;


  const availableAspect =
    availableWidth /
    availableHeight;


  let frameWidth;
  let frameHeight;


  if (
    availableAspect >
    targetAspect
  ) {

    frameHeight =
      availableHeight;


    frameWidth =
      frameHeight *
      targetAspect;

  }
  else {

    frameWidth =
      availableWidth;


    frameHeight =
      frameWidth /
      targetAspect;

  }


  cameraArea.style.width =
    `${Math.floor(frameWidth)}px`;


  cameraArea.style.height =
    `${Math.floor(frameHeight)}px`;

}


/* ========================================
   スタート
======================================== */

startButton.addEventListener(
  "click",
  async () => {

    status.textContent =
      "カメラを起動しています...";


    try {

      await startCamera();


      startScreen.classList.add(
        "hidden"
      );


      arScreen.classList.remove(
        "hidden"
      );


      requestAnimationFrame(
        () => {

          fitCameraFrame();

          resetCharacter();

        }
      );

    }
    catch (error) {

      console.error(error);


      status.textContent =
        "カメラ起動失敗：" +
        error.name +
        " / " +
        error.message;

    }

  }
);


/* ========================================
   カメラ開始
======================================== */

async function startCamera() {

  stopCamera();


  /*
   * 4:3を優先して要求
   */

  const constraints = {

    video: {

      facingMode: {
        ideal: facingMode
      },

      aspectRatio: {
        ideal: 4 / 3
      },

      width: {
        ideal: 1920
      },

      height: {
        ideal: 1440
      }

    },

    audio: false

  };


  stream =
    await navigator.mediaDevices.getUserMedia(
      constraints
    );


  video.srcObject =
    stream;


  await video.play();


  /*
   * 実際に選択された
   * カメラ情報
   */

  const track =
    stream.getVideoTracks()[0];


  console.log(
    "Camera settings:",
    track.getSettings()
  );


  /*
   * ズーム確認
   */

  setupCameraZoom();

}


/* ========================================
   カメラ停止
======================================== */

function stopCamera() {

  if (!stream) {
    return;
  }


  stream
    .getTracks()
    .forEach(
      track => {

        track.stop();

      }
    );


  stream = null;

}


/* ========================================
   カメラズーム設定
======================================== */

function setupCameraZoom() {

  if (!stream) {

    zoomControl.classList.add(
      "hidden"
    );

    return;

  }


  const track =
    stream.getVideoTracks()[0];


  /*
   * getCapabilities非対応なら
   * ズームUIを出さない
   */

  if (
    typeof track.getCapabilities !==
    "function"
  ) {

    zoomControl.classList.add(
      "hidden"
    );

    return;

  }


  const capabilities =
    track.getCapabilities();


  const settings =
    track.getSettings();


  console.log(
    "Camera capabilities:",
    capabilities
  );


  /*
   * zoom非対応
   */

  if (
    !capabilities.zoom ||
    capabilities.zoom.min === undefined ||
    capabilities.zoom.max === undefined
  ) {

    zoomControl.classList.add(
      "hidden"
    );

    return;

  }


  /*
   * ズーム対応
   */

  const minZoom =
    capabilities.zoom.min;


  const maxZoom =
    capabilities.zoom.max;


  const stepZoom =
    capabilities.zoom.step ||
    0.1;


  const currentZoom =
    settings.zoom !== undefined
      ? settings.zoom
      : minZoom;


  zoomSlider.min =
    minZoom;


  zoomSlider.max =
    maxZoom;


  zoomSlider.step =
    stepZoom;


  zoomSlider.value =
    currentZoom;


  zoomControl.classList.remove(
    "hidden"
  );

}


/* ========================================
   ズーム変更
======================================== */

zoomSlider.addEventListener(
  "input",
  async () => {

    if (!stream) {
      return;
    }


    const track =
      stream.getVideoTracks()[0];


    const zoom =
      Number(
        zoomSlider.value
      );


    try {

      await track.applyConstraints({

        advanced: [
          {
            zoom: zoom
          }
        ]

      });

    }
    catch (error) {

      console.error(
        "カメラズーム変更失敗:",
        error
      );

    }

  }
);


/* ========================================
   カメラ切替
======================================== */

switchCameraButton.addEventListener(
  "click",
  async () => {

    const previousMode =
      facingMode;


    facingMode =
      facingMode ===
      "environment"
        ? "user"
        : "environment";


    try {

      await startCamera();


      requestAnimationFrame(
        fitCameraFrame
      );

    }
    catch (error) {

      console.error(error);


      /*
       * 元に戻す
       */

      facingMode =
        previousMode;


      try {

        await startCamera();

      }
      catch (secondError) {

        console.error(
          secondError
        );

      }

    }

  }
);


/* ========================================
   キャラクター表示更新
======================================== */

function updateCharacterTransform() {

  character.style.transform =
    `
      translate(-50%, -50%)
      translate(
        ${characterX}px,
        ${characterY}px
      )
      scale(${characterScale})
    `;

}


/* ========================================
   キャラクターリセット
======================================== */

function resetCharacter() {

  characterX = 0;

  characterY = 0;

  characterScale = 1;

  previousDistance = null;

  pointers.clear();

  updateCharacterTransform();

}


resetButton.addEventListener(
  "click",
  resetCharacter
);


/* ========================================
   Pointer Down
======================================== */

character.addEventListener(
  "pointerdown",
  pointerDown
);


character.addEventListener(
  "pointermove",
  pointerMove
);


character.addEventListener(
  "pointerup",
  pointerUp
);


character.addEventListener(
  "pointercancel",
  pointerUp
);


function pointerDown(event) {

  event.preventDefault();


  character.setPointerCapture(
    event.pointerId
  );


  pointers.set(
    event.pointerId,
    {
      x: event.clientX,
      y: event.clientY
    }
  );


  /*
   * 2本指になった瞬間の距離
   */

  if (
    pointers.size === 2
  ) {

    const points =
      Array.from(
        pointers.values()
      );


    previousDistance =
      getDistance(
        points[0],
        points[1]
      );

  }

}


/* ========================================
   Pointer Move
======================================== */

function pointerMove(event) {

  if (
    !pointers.has(
      event.pointerId
    )
  ) {
    return;
  }


  event.preventDefault();


  const previous =
    pointers.get(
      event.pointerId
    );


  pointers.set(
    event.pointerId,
    {
      x: event.clientX,
      y: event.clientY
    }
  );


  /*
   * 1本指
   * キャラクター移動
   */

  if (
    pointers.size === 1
  ) {

    characterX +=
      event.clientX -
      previous.x;


    characterY +=
      event.clientY -
      previous.y;


    updateCharacterTransform();

  }


  /*
   * 2本指
   * キャラクター拡大縮小
   */

  if (
    pointers.size === 2
  ) {

    const points =
      Array.from(
        pointers.values()
      );


    const distance =
      getDistance(
        points[0],
        points[1]
      );


    if (
      previousDistance !== null &&
      previousDistance > 0
    ) {

      characterScale *=
        distance /
        previousDistance;


      characterScale =
        Math.max(
          0.3,
          Math.min(
            characterScale,
            4
          )
        );


      updateCharacterTransform();

    }


    previousDistance =
      distance;

  }

}


/* ========================================
   Pointer Up
======================================== */

function pointerUp(event) {

  pointers.delete(
    event.pointerId
  );


  if (
    pointers.size < 2
  ) {

    previousDistance =
      null;

  }

}


/* ========================================
   2点間距離
======================================== */

function getDistance(
  a,
  b
) {

  return Math.hypot(

    a.x - b.x,

    a.y - b.y

  );

}


/* ========================================
   撮影
======================================== */

captureButton.addEventListener(
  "click",
  capture
);


function capture() {

  const videoWidth =
    video.videoWidth;


  const videoHeight =
    video.videoHeight;


  if (
    !videoWidth ||
    !videoHeight
  ) {

    alert(
      "カメラ映像を取得できません。"
    );

    return;

  }


  /*
   * 画面上の撮影範囲
   */

  const areaRect =
    cameraArea.getBoundingClientRect();


  const charRect =
    character.getBoundingClientRect();


  /*
   * 撮影フレームと
   * 完全に同じ比率にする
   */

  const frameAspect =
    areaRect.width /
    areaRect.height;


  const longSide =
    1440;


  if (
    areaRect.height >
    areaRect.width
  ) {

    /*
     * 縦
     */

    canvas.height =
      longSide;


    canvas.width =
      Math.round(
        longSide *
        frameAspect
      );

  }
  else {

    /*
     * 横
     */

    canvas.width =
      longSide;


    canvas.height =
      Math.round(
        longSide /
        frameAspect
      );

  }


  /*
   * 実際のvideo比率
   */

  const videoAspect =
    videoWidth /
    videoHeight;


  /*
   * object-fit: coverと
   * 完全に同じ切り取りを計算
   */

  let sourceX = 0;

  let sourceY = 0;

  let sourceWidth =
    videoWidth;

  let sourceHeight =
    videoHeight;


  if (
    videoAspect >
    frameAspect
  ) {

    /*
     * videoの方が横長
     * → 左右をカット
     */

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

    /*
     * videoの方が縦長
     * → 上下をカット
     */

    sourceHeight =
      videoWidth /
      frameAspect;


    sourceY =
      (
        videoHeight -
        sourceHeight
      ) / 2;

  }


  /*
   * Canvas初期化
   */

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  /*
   * カメラ映像
   */

  ctx.drawImage(
    video,

    sourceX,
    sourceY,

    sourceWidth,
    sourceHeight,

    0,
    0,

    canvas.width,
    canvas.height
  );


  /*
   * ブラウザ座標
   * ↓
   * Canvas座標
   */

  const scaleX =
    canvas.width /
    areaRect.width;


  const scaleY =
    canvas.height /
    areaRect.height;


  /*
   * キャラクター
   */

  ctx.drawImage(
    character,

    (
      charRect.left -
      areaRect.left
    ) *
      scaleX,

    (
      charRect.top -
      areaRect.top
    ) *
      scaleY,

    charRect.width *
      scaleX,

    charRect.height *
      scaleY
  );


  /*
   * 保存データ生成
   */

  canvas.toBlob(

    blob => {

      if (!blob) {
        return;
      }


      if (
        downloadButton.dataset.url
      ) {

        URL.revokeObjectURL(
          downloadButton.dataset.url
        );

      }


      const url =
        URL.createObjectURL(
          blob
        );


      downloadButton.href =
        url;


      downloadButton.dataset.url =
        url;

    },

    "image/jpeg",

    0.92

  );


  /*
   * 結果画面
   */

  arScreen.classList.add(
    "hidden"
  );


  resultScreen.classList.remove(
    "hidden"
  );

}


/* ========================================
   撮り直す
======================================== */

backButton.addEventListener(
  "click",
  () => {

    resultScreen.classList.add(
      "hidden"
    );


    arScreen.classList.remove(
      "hidden"
    );


    requestAnimationFrame(
      fitCameraFrame
    );

  }
);


/* ========================================
   サイズ変更
======================================== */

window.addEventListener(
  "resize",
  () => {

    if (
      !arScreen.classList.contains(
        "hidden"
      )
    ) {

      fitCameraFrame();

    }

  }
);


/* ========================================
   画面回転
======================================== */

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
