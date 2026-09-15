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
   ARデータ
======================================== */

let schoolId = null;
let contentId = null;

let schoolData = null;
let currentContent = null;
let currentCharacter = null;

let arDataReady = false;


/* ========================================
   カメラ
======================================== */

let stream = null;

let facingMode =
  "environment";

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
   演出タイマー
======================================== */

let entryTimer = null;
let idleTimer = null;


/* ========================================
   URLパラメータ取得
======================================== */

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
    "school =",
    schoolId
  );


  console.log(
    "id =",
    contentId
  );


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

}


/* ========================================
   キャラクター画像読込確認
======================================== */

function waitForImage(
  imageElement
) {

  return new Promise(
    (resolve, reject) => {

      if (
        imageElement.complete &&
        imageElement.naturalWidth > 0
      ) {

        resolve();

        return;

      }


      imageElement.onload =
        () => {

          resolve();

        };


      imageElement.onerror =
        () => {

          reject(
            new Error(
              "キャラクター画像を読み込めませんでした。"
            )
          );

        };

    }
  );

}


/* ========================================
   JSON読込
======================================== */

async function loadArData() {

  const dataUrl =
    `./schools/${encodeURIComponent(schoolId)}/data.json`;


  console.log(
    "data.json URL =",
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
    "schoolData =",
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
        String(item.id) ===
        String(contentId)
    );


  if (!currentContent) {

    throw new Error(
      `「${contentId}」のデータが見つかりません。`
    );

  }


  console.log(
    "currentContent =",
    currentContent
  );


  if (
    !Array.isArray(
      currentContent.characters
    ) ||
    currentContent.characters.length === 0
  ) {

    throw new Error(
      "キャラクターが設定されていません。"
    );

  }


  /*
   * 現段階では1体目だけ使用
   */
  currentCharacter =
    currentContent.characters[0];


  console.log(
    "currentCharacter =",
    currentCharacter
  );


  if (
    !currentCharacter.image
  ) {

    throw new Error(
      "キャラクター画像が設定されていません。"
    );

  }


  const imageUrl =
    `./schools/${encodeURIComponent(schoolId)}/${currentCharacter.image}`;


  console.log(
    "character image URL =",
    imageUrl
  );


  character.src =
    imageUrl;


  await waitForImage(
    character
  );


  console.log(
    "character image loaded"
  );


  arDataReady =
    true;

}


/* ========================================
   アプリ初期化
======================================== */

async function initializeApp() {

  startButton.disabled =
    true;


  status.textContent =
    "ARデータを読み込んでいます...";


  try {

    getUrlParameters();


    await loadArData();


    status.textContent =
      `${schoolData.projectName || "学校AR"} / ${currentContent.place || contentId}`;


    startButton.disabled =
      false;


    console.log(
      "AR data ready"
    );

  }
  catch (error) {

    console.error(
      "ARデータ読込エラー:",
      error
    );


    arDataReady =
      false;


    startButton.disabled =
      true;


    status.textContent =
      "ARデータ読込エラー：" +
      error.message;

  }

}


/* ========================================
   撮影フレーム計算
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
  else {

    cameraArea.style.width =
      `${Math.floor(availableWidth)}px`;


    cameraArea.style.height =
      `${Math.floor(availableHeight)}px`;

  }

}


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


  console.log(
    "Camera settings:",
    stream
      .getVideoTracks()[0]
      .getSettings()
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


  stream =
    null;

}


/* ========================================
   擬似ズーム
======================================== */

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


/* ========================================
   ズームボタン
======================================== */

zoomButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        setCameraZoom(
          Number(
            button.dataset.zoom
          )
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


      setCameraZoom(1);


      requestAnimationFrame(
        fitCameraFrame
      );

    }
    catch (error) {

      console.error(
        error
      );


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
   演出クラス削除
======================================== */

function clearCharacterEffects() {

  character.classList.remove(

    "entry-fade",
    "entry-pop",
    "entry-from-left",
    "entry-from-right",
    "entry-from-bottom",
    "entry-from-top",

    "idle-float",
    "idle-jump",
    "idle-rotate",
    "idle-sway"

  );


  character.style.animationDuration =
    "";


  character.style.animationTimingFunction =
    "";


  character.style.animationFillMode =
    "";


  if (entryTimer) {

    clearTimeout(
      entryTimer
    );

    entryTimer =
      null;

  }


  if (idleTimer) {

    clearTimeout(
      idleTimer
    );

    idleTimer =
      null;

  }

}


/* ========================================
   JSON設定をキャラクターへ反映
======================================== */

function applyCharacterSettings() {

  if (!currentCharacter) {

    return;

  }


  clearCharacterEffects();


  /* =====================================
     位置
  ===================================== */

  const x =
    Number(
      currentCharacter.x ?? 50
    );


  const y =
    Number(
      currentCharacter.y ?? 50
    );


  character.style.left =
    `${x}%`;


  character.style.top =
    `${y}%`;


  /* =====================================
     サイズ
  ===================================== */

  const size =
    Number(
      currentCharacter.size ?? 100
    );


  characterScale =
    size / 100;


  characterX = 0;

  characterY = 0;


  updateCharacterTransform();


  /* =====================================
     登場タイミング
  ===================================== */

  const delay =
    Number(
      currentCharacter.delay ?? 0
    );


  const duration =
    Number(
      currentCharacter.duration ?? 700
    );


  /* =====================================
     登場演出
  ===================================== */

  const entryClassMap = {

    fade:
      "entry-fade",

    pop:
      "entry-pop",

    "from-left":
      "entry-from-left",

    "from-right":
      "entry-from-right",

    "from-bottom":
      "entry-from-bottom",

    "from-top":
      "entry-from-top"

  };


  /* =====================================
     登場後の動き
  ===================================== */

  const idleClassMap = {

    float:
      "idle-float",

    jump:
      "idle-jump",

    rotate:
      "idle-rotate",

    sway:
      "idle-sway"

  };


  const entryClass =
    entryClassMap[
      currentCharacter.entryEffect
    ];


  const idleClass =
    idleClassMap[
      currentCharacter.idleEffect
    ];


  /*
   * 登場までは非表示
   */

  character.style.opacity =
    "0";


  entryTimer =
    setTimeout(
      () => {

        character.style.opacity =
          "1";


        /*
         * 登場演出あり
         */

        if (entryClass) {

          character.classList.add(
            entryClass
          );


          character.style.animationDuration =
            `${duration}ms`;


          character.style.animationTimingFunction =
            "ease-out";


          character.style.animationFillMode =
            "both";

        }


        /*
         * 登場演出終了後
         */

        idleTimer =
          setTimeout(
            () => {

              if (entryClass) {

                character.classList.remove(
                  entryClass
                );

              }


              character.style.animationDuration =
                "";


              character.style.animationTimingFunction =
                "";


              character.style.animationFillMode =
                "";


              /*
               * 登場後の動き
               */

              if (idleClass) {

                character.classList.add(
                  idleClass
                );

              }

            },

            entryClass
              ? duration
              : 0

          );

      },

      delay
    );

}


/* ========================================
   キャラクターリセット
======================================== */

function resetCharacter() {

  /*
   * 位置・サイズ・演出を
   * JSONの設定値へ戻す
   */

  applyCharacterSettings();


  previousDistance =
    null;


  pointers.clear();

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


function pointerDown(
  event
) {

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


function pointerMove(
  event
) {

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


function pointerUp(
  event
) {

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
   AR開始
======================================== */

startButton.addEventListener(
  "click",
  async () => {

    if (
      !arDataReady ||
      !currentContent ||
      !currentCharacter
    ) {

      alert(
        "ARデータの読み込みが完了していません。"
      );

      return;

    }


    try {

      status.textContent =
        "カメラを起動しています...";


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

          /*
           * ★ここでJSON設定を反映
           */
          applyCharacterSettings();

          setCameraZoom(1);

        }
      );

    }
    catch (error) {

      console.error(
        error
      );


      status.textContent =
        "カメラ起動失敗：" +
        error.name +
        " / " +
        error.message;

    }

  }
);


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


  /*
   * 擬似ズーム
   */

  if (
    cameraZoom > 1
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
   * 保存用
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


      downloadButton.download =
        `${schoolId}_${contentId}.jpg`;

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
   リサイズ
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


/* ========================================
   起動時
======================================== */

initializeApp();
