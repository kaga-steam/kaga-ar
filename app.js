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

const zoomButtons =
  document.querySelectorAll(".zoomButton");

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
   擬似ズーム

   1 / 1.5 / 2
======================================== */

let cameraZoom = 1;


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
   横：利用可能領域いっぱい
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


  /* ====================================
     縦
     3:4
  ==================================== */

  if (portrait) {

    const targetAspect =
      3 / 4;


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


  /* ====================================
     横

     操作ボタン以外の領域を
     最大限使用
  ==================================== */

  else {

    cameraArea.style.width =
      `${Math.floor(availableWidth)}px`;


    cameraArea.style.height =
      `${Math.floor(availableHeight)}px`;

  }

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

          setCameraZoom(1);

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
    "Camera settings:",
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
      track => {

        track.stop();

      }
    );


  stream = null;

}


/* ========================================
   擬似ズーム
======================================== */

function setCameraZoom(zoom) {

  cameraZoom =
    zoom;


  /*
   * 画面表示
   */

  video.style.transform =
    `scale(${cameraZoom})`;


  /*
   * 選択中ボタン
   */

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


/* ========================================
   ズームボタン
======================================== */

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


      /*
       * カメラ切替時は
       * 1xへ戻す
       */

      setCameraZoom(1);


      requestAnimationFrame(
        fitCameraFrame
      );

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


  /* 1本指：移動 */

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


  /* 2本指：キャラクター拡大縮小 */

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
   距離
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


  const areaRect =
    cameraArea.getBoundingClientRect();


  const charRect =
    character.getBoundingClientRect();


  /*
   * 撮影枠の実際の比率
   */

  const frameAspect =
    areaRect.width /
    areaRect.height;


  /*
   * 出力サイズ
   */

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
   * videoの実際の比率
   */

  const videoAspect =
    videoWidth /
    videoHeight;


  /*
   * object-fit: cover 相当の
   * 基本切り取り
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


  /* ====================================
     擬似ズームを撮影結果にも反映

     1.5xなら中央の1/1.5
     2xなら中央の1/2を使用
  ==================================== */

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
   * キャラクター座標
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
   * 保存データ
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
