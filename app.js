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

const video =
  document.getElementById("camera");

const cameraArea =
  document.getElementById("cameraArea");

const character =
  document.getElementById("character");

const canvas =
  document.getElementById("captureCanvas");

const ctx =
  canvas.getContext("2d");


/* ========================================
   カメラ
======================================== */

let stream = null;

/*
 * environment = 背面
 * user = 前面
 */

let facingMode = "environment";


/* ========================================
   キャラクター
======================================== */

let characterX = 0;
let characterY = 0;

let characterScale = 1;


/* ========================================
   Pointer管理
======================================== */

const pointers = new Map();

let previousDistance = null;


/* ========================================
   カメラ起動
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

      resetCharacter();

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

  /*
   * 既存ストリーム停止
   */

  stopCamera();


  const constraints = {

    video: {

      facingMode: {
        ideal: facingMode
      },

      /*
       * 可能なら高めの解像度
       */

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
      track => track.stop()
    );


  stream = null;

}


/* ========================================
   前面・背面カメラ切替
======================================== */

switchCameraButton.addEventListener(
  "click",
  async () => {

    facingMode =
      facingMode === "environment"
        ? "user"
        : "environment";


    try {

      await startCamera();

    }
    catch (error) {

      console.error(error);

      /*
       * 切替できなかった場合は
       * 元に戻す
       */

      facingMode =
        facingMode === "environment"
          ? "user"
          : "environment";


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
   キャラクター初期化
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
   Pointer Events
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


/* ========================================
   Pointer Down
======================================== */

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
   * 2本指になった瞬間の
   * 初期距離を取得
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
   * ドラッグ
   */

  if (
    pointers.size === 1
  ) {

    const dx =
      event.clientX -
      previous.x;

    const dy =
      event.clientY -
      previous.y;


    characterX += dx;
    characterY += dy;


    updateCharacterTransform();

  }


  /*
   * 2本指
   * ピンチ拡大縮小
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

      const ratio =
        distance /
        previousDistance;


      characterScale *=
        ratio;


      /*
       * 最小30%
       * 最大400%
       */

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
  pointA,
  pointB
) {

  const dx =
    pointA.x -
    pointB.x;

  const dy =
    pointA.y -
    pointB.y;


  return Math.hypot(
    dx,
    dy
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
    videoWidth === 0 ||
    videoHeight === 0
  ) {

    alert(
      "カメラ映像を取得できません。"
    );

    return;

  }


  /*
   * 画面上の撮影領域
   */

  const areaRect =
    cameraArea.getBoundingClientRect();

  const charRect =
    character.getBoundingClientRect();


  /*
   * 撮影結果は
   * cameraAreaと完全に同じ比率
   */

  const isPortrait =
    areaRect.height >=
    areaRect.width;


  /*
   * 縦：
   * 1080 × 1440
   *
   * 横：
   * 1440 × 1080
   */

  if (isPortrait) {

    canvas.width =
      1080;

    canvas.height =
      1440;

  }
  else {

    canvas.width =
      1440;

    canvas.height =
      1080;

  }


  /*
   * カメラ映像の
   * object-fit: cover 相当
   */

  const videoAspect =
    videoWidth /
    videoHeight;

  const areaAspect =
    areaRect.width /
    areaRect.height;


  let sourceX = 0;
  let sourceY = 0;

  let sourceWidth =
    videoWidth;

  let sourceHeight =
    videoHeight;


  if (
    videoAspect >
    areaAspect
  ) {

    /*
     * 左右を切り取る
     */

    sourceWidth =
      videoHeight *
      areaAspect;


    sourceX =
      (
        videoWidth -
        sourceWidth
      ) / 2;

  }
  else {

    /*
     * 上下を切り取る
     */

    sourceHeight =
      videoWidth /
      areaAspect;


    sourceY =
      (
        videoHeight -
        sourceHeight
      ) / 2;

  }


  /*
   * Canvasクリア
   */

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  /*
   * カメラ映像描画
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

  const canvasScaleX =
    canvas.width /
    areaRect.width;

  const canvasScaleY =
    canvas.height /
    areaRect.height;


  const characterCanvasX =
    (
      charRect.left -
      areaRect.left
    ) *
    canvasScaleX;


  const characterCanvasY =
    (
      charRect.top -
      areaRect.top
    ) *
    canvasScaleY;


  const characterCanvasWidth =
    charRect.width *
    canvasScaleX;


  const characterCanvasHeight =
    charRect.height *
    canvasScaleY;


  /*
   * キャラクター描画
   */

  ctx.drawImage(
    character,

    characterCanvasX,
    characterCanvasY,

    characterCanvasWidth,
    characterCanvasHeight
  );


  /*
   * 保存用URL生成
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

    "image/png"
  );


  /*
   * 撮影結果表示
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

  }
);


/* ========================================
   画面回転
======================================== */

window.addEventListener(
  "orientationchange",
  () => {

    /*
     * 回転後にブラウザサイズが
     * 確定するまで少し待つ
     */

    setTimeout(
      () => {

        updateCharacterTransform();

      },
      250
    );

  }
);
