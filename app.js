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


/*
 * キャラクター位置
 */

let characterX = 0;
let characterY = 0;

let scale = 1;


/*
 * ポインター管理
 */

const pointers = new Map();

let previousDistance = null;


/*
 * カメラ起動
 */

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

    }
    catch (error) {

      status.textContent =
        "カメラ起動失敗：" +
        error.name +
        " / " +
        error.message;

    }

  }
);


/*
 * キャラクター表示更新
 */

function updateCharacterTransform() {

  character.style.transform =
    `
      translate(-50%, -50%)
      translate(${characterX}px, ${characterY}px)
      scale(${scale})
    `;

}


/*
 * 初期位置
 */

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


/*
 * Pointer Events
 *
 * マウス・タッチ・ペンを共通処理
 */

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
      previousDistance !== null
    ) {

      const difference =
        distance /
        previousDistance;

      scale *= difference;


      /*
       * サイズ制限
       */

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


/*
 * 2点間距離
 */

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


/*
 * 撮影
 */

captureButton.addEventListener(
  "click",
  capture
);


function capture() {

  /*
   * カメラ映像そのものの
   * 解像度を取得
   */

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


  canvas.width =
    videoWidth;

  canvas.height =
    videoHeight;


  /*
   * cameraArea上の表示領域
   */

  const areaRect =
    cameraArea.getBoundingClientRect();

  const charRect =
    character.getBoundingClientRect();


  /*
   * object-fit: cover のため、
   * 表示されている映像範囲を計算
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
     * 横方向を切り取る
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
     * 縦方向を切り取る
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
   * カメラ映像をCanvasへ描画
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
   * ブラウザ画面上の座標を
   * Canvas座標に変換
   */

  const scaleX =
    canvas.width /
    areaRect.width;

  const scaleY =
    canvas.height /
    areaRect.height;


  const characterCanvasX =
    (
      charRect.left -
      areaRect.left
    ) *
    scaleX;

  const characterCanvasY =
    (
      charRect.top -
      areaRect.top
    ) *
    scaleY;


  const characterCanvasWidth =
    charRect.width *
    scaleX;

  const characterCanvasHeight =
    charRect.height *
    scaleY;


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
   * 結果画面へ
   */

  arScreen.classList.add(
    "hidden"
  );

  resultScreen.classList.remove(
    "hidden"
  );


  /*
   * 保存画像生成
   */

  canvas.toBlob(
    blob => {

      if (!blob) {
        return;
      }

      const url =
        URL.createObjectURL(
          blob
        );

      downloadButton.href =
        url;

    },
    "image/png"
  );

}


/*
 * 撮り直し
 */

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
