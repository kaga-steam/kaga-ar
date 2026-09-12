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
   撮影フレームサイズ計算

   縦 → 3:4
   横 → 4:3

   cameraWrapperの中に
   必ず完全に収める
======================================== */

function fitCameraFrame() {

  const style =
    getComputedStyle(
      cameraWrapper
    );


  const paddingX =
    parseFloat(style.paddingLeft) +
    parseFloat(style.paddingRight);


  const paddingY =
    parseFloat(style.paddingTop) +
    parseFloat(style.paddingBottom);


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


  /*
   * width / height
   */

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

    /*
     * 横幅に余裕がある
     * → 高さ基準
     */

    frameHeight =
      availableHeight;

    frameWidth =
      frameHeight *
      targetAspect;

  }
  else {

    /*
     * 高さに余裕がある
     * → 横幅基準
     */

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


      /*
       * AR画面表示後に計算
       */

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


  const track =
    stream.getVideoTracks()[0];


  console.log(
    "Camera:",
    track.getSettings()
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
   カメラ切替
======================================== */

switchCameraButton.addEventListener(
  "click",
  async () => {

    const previousMode =
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
   キャラクター
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
   Pointer
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


  const areaRect =
    cameraArea.getBoundingClientRect();


  const charRect =
    character.getBoundingClientRect();


  /*
   * ★重要
   *
   * 現在の撮影枠そのものの比率で
   * Canvasを作る
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

    canvas.height =
      longSide;


    canvas.width =
      Math.round(
        longSide *
        frameAspect
      );

  }
  else {

    canvas.width =
      longSide;


    canvas.height =
      Math.round(
        longSide /
        frameAspect
      );

  }


  /*
   * object-fit: coverと
   * 同じ切り取り
   */

  const videoAspect =
    videoWidth /
    videoHeight;


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


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  /*
   * 背景
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
   * キャラクター
   */

  const scaleX =
    canvas.width /
    areaRect.width;


  const scaleY =
    canvas.height /
    areaRect.height;


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
   * 保存
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


  arScreen.classList.add(
    "hidden"
  );


  resultScreen.classList.remove(
    "hidden"
  );

}


/* ========================================
   撮り直し
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
   画面サイズ・回転変更

   アドレスバーの開閉も
   resizeで再計算される
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


window.addEventListener(
  "orientationchange",
  () => {

    setTimeout(
      fitCameraFrame,
      300
    );

  }
);
