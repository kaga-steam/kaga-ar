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

let facingMode = "environment";


/* ========================================
   キャラクター
======================================== */

let characterX = 0;
let characterY = 0;
let characterScale = 1;


/* ========================================
   Pointer
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

  stopCamera();


  /*
   * スマホカメラで4:3を優先
   *
   * exact にすると対応していない端末で
   * エラーになる可能性があるため ideal。
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
   * 実際にブラウザが選択した
   * カメラ解像度を確認
   */

  const track =
    stream.getVideoTracks()[0];

  const settings =
    track.getSettings();


  console.log(
    "Camera settings:",
    settings
  );

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
   前面・背面切替
======================================== */

switchCameraButton.addEventListener(
  "click",
  async () => {

    const oldFacingMode =
      facingMode;


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
       * 切替失敗時は元へ戻す
       */

      facingMode =
        oldFacingMode;


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
   キャラクター更新
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
   * 移動
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
   * 拡大縮小
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
   距離
======================================== */

function getDistance(
  pointA,
  pointB
) {

  return Math.hypot(

    pointA.x -
      pointB.x,

    pointA.y -
      pointB.y

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
   * 現在画面上に表示されている
   * 撮影フレーム
   */

  const areaRect =
    cameraArea.getBoundingClientRect();

  const charRect =
    character.getBoundingClientRect();


  /*
   * ★重要
   *
   * 1080×1440などに固定しない。
   *
   * cameraAreaと完全に同じ
   * 縦横比でCanvasを作る。
   */


  const areaAspect =
    areaRect.width /
    areaRect.height;


  const longSide = 1440;


  if (
    areaRect.height >=
    areaRect.width
  ) {

    /*
     * 縦画面
     */

    canvas.height =
      longSide;

    canvas.width =
      Math.round(
        longSide *
        areaAspect
      );

  }
  else {

    /*
     * 横画面
     */

    canvas.width =
      longSide;

    canvas.height =
      Math.round(
        longSide /
        areaAspect
      );

  }


  /*
   * videoの実際の縦横比
   */

  const videoAspect =
    videoWidth /
    videoHeight;


  /*
   * object-fit: cover と
   * 同じ範囲を計算
   */

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
     * videoが撮影枠より横長
     *
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
     * videoが撮影枠より縦長
     *
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


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  /*
   * カメラ画像
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
   * キャラクター座標変換
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
   * 保存用Blob
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

        updateCharacterTransform();

      },
      300
    );

  }
);
