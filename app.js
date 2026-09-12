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


let stream = null;


/* =========================
   キャラクター設定
========================= */

let characterX = 0;
let characterY = 0;

let scale = 1;


/* =========================
   タッチ操作管理
========================= */

const pointers = new Map();

let previousDistance = null;


/* =========================
   カメラ起動
========================= */

startButton.addEventListener(
  "click",
  async () => {

    status.textContent =
      "カメラを起動しています...";

    try {

      stream =
        await navigator.mediaDevices.getUserMedia({

          video: {
            facingMode: {
              ideal: "environment"
            }
          },

          audio: false

        });

      video.srcObject = stream;

      await video.play();

      startScreen.classList.add("hidden");

      arScreen.classList.remove("hidden");

      resetCharacter();

    } catch (error) {

      status.textContent =
        "カメラ起動失敗：" +
        error.name +
        " / " +
        error.message;

      console.error(error);

    }

  }
);


/* =========================
   キャラクター位置更新
========================= */

function updateCharacterTransform() {

  character.style.transform =
    `
      translate(-50%, -50%)
      translate(${characterX}px, ${characterY}px)
      scale(${scale})
    `;

}


/* =========================
   キャラクター初期位置
========================= */

function resetCharacter() {

  characterX = 0;
  characterY = 0;

  scale = 1;

  updateCharacterTransform();

}


resetButton.addEventListener(
  "click",
  resetCharacter
);


/* =========================
   Pointer Events
========================= */

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

}


function pointerMove(event) {

  if (
    !pointers.has(
      event.pointerId
    )
  ) {
    return;
  }


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


  /* 1本指：移動 */

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


  /* 2本指：ピンチ拡大縮小 */

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
      previousDistance !== null
    ) {

      const ratio =
        distance /
        previousDistance;

      scale *= ratio;


      /* サイズ制限 */

      scale =
        Math.max(
          0.3,
          Math.min(
            scale,
            4
          )
        );


      updateCharacterTransform();

    }


    previousDistance =
      distance;

  }

}


function pointerUp(event) {

  pointers.delete(
    event.pointerId
  );


  if (
    pointers.size < 2
  ) {

    previousDistance = null;

  }

}


/* =========================
   2点間距離
========================= */

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


  return Math.sqrt(
    dx * dx +
    dy * dy
  );

}


/* =========================
   撮影
========================= */

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
   * 実際に画面で見えている
   * カメラ領域
   */

  const areaRect =
    cameraArea.getBoundingClientRect();

  const charRect =
    character.getBoundingClientRect();


  /*
   * 撮影画像は、
   * 画面で見えている縦横比にする
   */

  const outputWidth = 1080;

  const outputHeight =
    Math.round(
      outputWidth *
      areaRect.height /
      areaRect.width
    );


  canvas.width =
    outputWidth;

  canvas.height =
    outputHeight;


  /*
   * object-fit: cover に合わせて
   * カメラ映像の切り取り範囲を計算
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
     * カメラ映像の方が横長
     * → 左右を切り取る
     */

    sourceWidth =
      videoHeight *
      areaAspect;

    sourceX =
      (
        videoWidth -
        sourceWidth
      ) / 2;

  } else {

    /*
     * カメラ映像の方が縦長
     * → 上下を切り取る
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
   * カメラ映像を描画
   */

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


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
   * ブラウザ上の位置を
   * Canvas座標へ変換
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
   * キャラクターを描画
   */

  ctx.drawImage(
    character,

    characterCanvasX,
    characterCanvasY,

    characterCanvasWidth,
    characterCanvasHeight
  );


  /*
   * 撮影結果画面へ
   */

  arScreen.classList.add(
    "hidden"
  );

  resultScreen.classList.remove(
    "hidden"
  );


  /*
   * 保存用画像を生成
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

}


/* =========================
   撮り直し
========================= */

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


/* =========================
   画面回転時
========================= */

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
